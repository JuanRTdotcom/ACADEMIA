import { Injectable, Logger } from "@nestjs/common"; // NestJS: DI y logger interno
import type { Request } from "express"; // Express: petición HTTP (para extraer ip y navegador)
import type { Prisma } from "../../../prisma/generated/client/client";
import type { ContextoSolicitud } from "../domain/entities/contexto-solicitud";
import { PrismaService } from "../prisma.service";
import {
  obtenerIdentificadorEvento,
  type CodigoEventoFuncional,
} from "./eventos-funcionales";

/** Permite incluir el registro dentro de la transacción del cambio de negocio. */
type ClientePrisma = Prisma.TransactionClient;

/** Datos de un evento de auditoría. Genérico: lo usa cualquier módulo del sistema. */
export interface DatosAuditoria {
  accion: string; // qué pasó, ej. "autenticacion.ingreso.exito" | "empresas.baja"
  entidad: string; // tabla/recurso afectado, ej. "usuarios" | "organizaciones"
  id_entidad?: string | null; // id del registro afectado
  fid_organizaciones?: string; // organización (la tabla la exige; sin ella no se inserta)
  fid_usuarios?: string; // usuario que ejecutó la acción
  metadatos?: Prisma.InputJsonValue; // detalle libre (JSON), ej. { motivo }
  peticion?: Request | ContextoSolicitud; // HTTP se adapta antes de entrar en aplicación
  ip?: string | null;
  agente_usuario?: string | null;
}

/** Solo códigos declarados en el catálogo pueden llegar al historial funcional. */
type DatosEvento = Omit<DatosAuditoria, "accion"> & {
  accion: CodigoEventoFuncional;
};

/** Servicio transversal. Auditoría y evento son destinos distintos y explícitos. */
@Injectable()
export class ServicioAuditoria {
  private readonly logger = new Logger(ServicioAuditoria.name);

  constructor(private prisma: PrismaService) {}

  /** Extrae ip y agente de usuario de una petición (reutilizable). */
  metadatosPeticion(peticion: Request | ContextoSolicitud): {
    ip: string | null;
    agente_usuario: string | null;
  } {
    if ("agente_usuario" in peticion) {
      return { ip: peticion.ip, agente_usuario: peticion.agente_usuario };
    }
    return {
      ip: peticion.ip ?? peticion.socket?.remoteAddress ?? null,
      agente_usuario:
        (peticion.headers?.["user-agent"] as string)?.slice(0, 255) ?? null,
    };
  }

  async registrar(
    datos: DatosAuditoria,
    cliente?: ClientePrisma,
  ): Promise<void> {
    if (!cliente) {
      await this.prisma.$transaction((tx) => this.registrar(datos, tx));
      return;
    }

    const desdePeticion = datos.peticion
      ? this.metadatosPeticion(datos.peticion)
      : { ip: null, agente_usuario: null };
    const ip = datos.ip ?? desdePeticion.ip;
    const agente_usuario = datos.agente_usuario ?? desdePeticion.agente_usuario;

    // La tabla exige organización (FK). Sin ella no se puede insertar: se deja el
    // evento en el log de la aplicación sin inventar una FK.
    if (!datos.fid_organizaciones) {
      this.logger.warn(
        `Auditoría sin organización: accion=${datos.accion}; ip=${ip ?? "desconocida"}`,
      );
      return;
    }

    // No se atrapa el error: dentro de una transacción debe provocar rollback.
    await cliente.auditoria.create({
      data: {
        fid_organizaciones: datos.fid_organizaciones,
        fid_usuarios: datos.fid_usuarios,
        accion: datos.accion,
        entidad: datos.entidad,
        id_entidad: datos.id_entidad ?? datos.fid_usuarios,
        ip,
        agente_usuario,
        metadatos: datos.metadatos,
        created_by: datos.fid_usuarios,
      },
    });
  }

  /**
   * Registra auditoría y además un evento funcional visible en el historial.
   * Debe usarse solo para acciones relevantes, nunca para trabajo técnico rutinario.
   */
  async registrarConEvento(
    datos: DatosEvento,
    cliente?: ClientePrisma,
  ): Promise<void> {
    if (!cliente) {
      await this.prisma.$transaction((tx) =>
        this.registrarConEvento(datos, tx),
      );
      return;
    }

    await this.registrar(datos, cliente);
    if (!datos.fid_organizaciones) return;

    const desdePeticion = datos.peticion
      ? this.metadatosPeticion(datos.peticion)
      : { ip: null, agente_usuario: null };
    const ip = datos.ip ?? desdePeticion.ip;
    const agente_usuario = datos.agente_usuario ?? desdePeticion.agente_usuario;
    const identificador = obtenerIdentificadorEvento(datos.accion);

    const maestro = await cliente.eventos_maestro.findUnique({
      where: {
        codigo_version: {
          codigo: identificador.codigo,
          version: identificador.version,
        },
      },
      select: {
        id_eventos_maestro: true,
        tipo_agregado: true,
        estado: true,
      },
    });
    if (
      !maestro ||
      maestro.estado !== 1 ||
      maestro.tipo_agregado !== datos.entidad
    ) {
      throw new Error(
        `Contrato de evento inválido: ${identificador.codigo}@${identificador.version}`,
      );
    }

    await cliente.eventos.create({
      data: {
        fid_organizaciones: datos.fid_organizaciones,
        fid_usuarios: datos.fid_usuarios,
        fid_eventos_maestro: maestro.id_eventos_maestro,
        id_agregado:
          datos.id_entidad ?? datos.fid_usuarios ?? datos.fid_organizaciones,
        datos: datos.metadatos ?? {},
        metadatos: { ip, agente_usuario },
        created_by: datos.fid_usuarios,
      },
    });
  }
}
