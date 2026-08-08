import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { EVENTOS_FUNCIONALES } from "../../../comun/auditoria/eventos-funcionales";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import { GRUPO_TIPOS_TELEFONO } from "../../domain/entities/grupos-parametros";
import type {
  ComandoAgregarTelefono,
  ComandoEliminarTelefono,
  ComandoModificarTelefono,
  ResultadoGestionTelefonos,
  TelefonoPersona,
  TelefonosPerfil,
} from "../../domain/entities/telefono-persona";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";

type ClientePrisma = PrismaService | Prisma.TransactionClient;
type DatosTelefono = Omit<ComandoAgregarTelefono, never>;

@Injectable()
export class FuenteDatosTelefonosPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
  ) {}

  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<TelefonosPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [telefonos, catalogo] = await Promise.all([
      this.listarActivos(this.prisma, idPersona),
      this.catalogoActivo(this.prisma),
    ]);
    return { telefonos, catalogo };
  }

  async agregar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const datos = await this.validarDatos(tx, comando);
        const existente = await this.buscarMismoNumero(
          tx,
          idPersona,
          datos.numero,
          null,
        );
        if (existente?.estado === 1)
          throw new ConflictException("profile.phones.duplicate");

        const telefono = existente
          ? await tx.personas_telefonos.update({
              where: { id_personas_telefonos: existente.id_personas_telefonos },
              data: { ...datos, estado: 1, updated_by: idUsuario },
              select: { id_personas_telefonos: true },
            })
          : await tx.personas_telefonos.create({
              data: {
                fid_personas: idPersona,
                ...datos,
                created_by: idUsuario,
                updated_by: idUsuario,
              },
              select: { id_personas_telefonos: true },
            });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_TELEFONO_AGREGADO.codigo,
          telefono.id_personas_telefonos,
          idUsuario,
          idOrganizacion,
          contexto,
          datos,
        );
        return { ok: true, telefonos: await this.listarActivos(tx, idPersona) };
      });
    } catch (error: unknown) {
      if (this.esUnicoDuplicado(error))
        throw new ConflictException("profile.phones.duplicate");
      throw error;
    }
  }

  async modificar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const actual = await tx.personas_telefonos.findFirst({
          where: {
            id_personas_telefonos: comando.id_personas_telefonos,
            fid_personas: idPersona,
            estado: 1,
          },
          select: {
            id_personas_telefonos: true,
            codigo_tipo_telefono: true,
            numero: true,
            titular: true,
            es_emergencia: true,
          },
        });
        if (!actual) throw new NotFoundException("profile.phones.notFound");
        const datos = await this.validarDatos(tx, comando);
        if (
          actual.codigo_tipo_telefono === datos.codigo_tipo_telefono &&
          this.claveNumero(actual.numero) === this.claveNumero(datos.numero) &&
          actual.titular.toLocaleLowerCase() ===
            datos.titular.toLocaleLowerCase() &&
          actual.es_emergencia === datos.es_emergencia
        ) {
          throw new BadRequestException("profile.phones.noChanges");
        }
        const duplicado = await this.buscarMismoNumero(
          tx,
          idPersona,
          datos.numero,
          actual.id_personas_telefonos,
        );
        if (duplicado?.estado === 1)
          throw new ConflictException("profile.phones.duplicate");
        await tx.personas_telefonos.update({
          where: { id_personas_telefonos: actual.id_personas_telefonos },
          data: { ...datos, updated_by: idUsuario },
        });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_TELEFONO_MODIFICADO.codigo,
          actual.id_personas_telefonos,
          idUsuario,
          idOrganizacion,
          contexto,
          datos,
        );
        return { ok: true, telefonos: await this.listarActivos(tx, idPersona) };
      });
    } catch (error: unknown) {
      if (this.esUnicoDuplicado(error))
        throw new ConflictException("profile.phones.duplicate");
      throw error;
    }
  }

  async eliminar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const telefono = await tx.personas_telefonos.findFirst({
        where: {
          id_personas_telefonos: comando.id_personas_telefonos,
          fid_personas: idPersona,
          estado: 1,
        },
        select: {
          id_personas_telefonos: true,
          codigo_tipo_telefono: true,
          es_emergencia: true,
        },
      });
      if (!telefono) throw new NotFoundException("profile.phones.notFound");
      await tx.personas_telefonos.update({
        where: { id_personas_telefonos: telefono.id_personas_telefonos },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_TELEFONO_ELIMINADO.codigo,
        telefono.id_personas_telefonos,
        idUsuario,
        idOrganizacion,
        contexto,
        {
          codigo_tipo_telefono: telefono.codigo_tipo_telefono,
          numero: "",
          titular: "",
          es_emergencia: telefono.es_emergencia,
        },
      );
      return { ok: true, telefonos: await this.listarActivos(tx, idPersona) };
    });
  }

  private async validarDatos(
    tx: Prisma.TransactionClient,
    comando: ComandoAgregarTelefono,
  ): Promise<DatosTelefono> {
    const maestro = await tx.parametros.findFirst({
      where: {
        codigo_grupo: GRUPO_TIPOS_TELEFONO,
        codigo: comando.codigo_tipo_telefono,
        estado: 1,
      },
      select: { codigo: true },
    });
    if (!maestro) throw new BadRequestException("profile.phones.invalidType");
    return {
      codigo_tipo_telefono: maestro.codigo,
      numero: comando.numero.trim().replace(/\s+/g, " "),
      titular: comando.titular.trim().replace(/\s+/g, " "),
      es_emergencia: comando.es_emergencia,
    };
  }

  private async buscarMismoNumero(
    tx: Prisma.TransactionClient,
    idPersona: string,
    numero: string,
    excluirId: string | null,
  ) {
    const candidatos = await tx.personas_telefonos.findMany({
      where: {
        fid_personas: idPersona,
        ...(excluirId ? { id_personas_telefonos: { not: excluirId } } : {}),
      },
      orderBy: { updated_at: "desc" },
      select: { id_personas_telefonos: true, numero: true, estado: true },
    });
    const clave = this.claveNumero(numero);
    return (
      candidatos.find((item) => this.claveNumero(item.numero) === clave) ?? null
    );
  }

  private claveNumero(numero: string) {
    return numero.replace(/\D/g, "");
  }

  private async obtenerPersonaActiva(
    idUsuario: string,
    idOrganizacion: string,
  ) {
    const usuario = await this.prisma.usuarios.findFirst({
      where: {
        id_usuarios: idUsuario,
        fid_organizaciones: idOrganizacion,
        estado: 1,
        estado_cuenta: "activo",
        organizacion: { estado: 1, eliminado_en: null },
        persona: { fid_organizaciones: idOrganizacion, estado: 1 },
      },
      select: { fid_personas: true },
    });
    if (!usuario) throw new NotFoundException("profile.phones.unavailable");
    return usuario.fid_personas;
  }

  private async bloquearPersona(
    tx: Prisma.TransactionClient,
    idUsuario: string,
    idOrganizacion: string,
  ) {
    const [persona] = await tx.$queryRaw<{ id_personas: string }[]>`
      SELECT p.id_personas
      FROM seguridad.usuarios AS u
      INNER JOIN nucleo.organizaciones AS o ON o.id_organizaciones = u.fid_organizaciones
      INNER JOIN personas.personas AS p ON p.id_personas = u.fid_personas
      WHERE u.id_usuarios = ${idUsuario}::uuid
        AND u.fid_organizaciones = ${idOrganizacion}::uuid
        AND u.estado = 1 AND u.estado_cuenta = 'activo'
        AND o.estado = 1
        AND o.eliminado_en IS NULL
        AND p.fid_organizaciones = ${idOrganizacion}::uuid AND p.estado = 1
      FOR UPDATE OF p
    `;
    if (!persona) throw new NotFoundException("profile.phones.unavailable");
    return persona.id_personas;
  }

  private async listarActivos(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<TelefonoPersona[]> {
    const filas = await cliente.personas_telefonos.findMany({
      where: { fid_personas: idPersona, estado: 1 },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
      select: {
        id_personas_telefonos: true,
        codigo_tipo_telefono: true,
        numero: true,
        titular: true,
        es_emergencia: true,
      },
    });
    const parametros = await cliente.parametros.findMany({
      where: {
        codigo_grupo: GRUPO_TIPOS_TELEFONO,
        codigo: { in: filas.map((fila) => fila.codigo_tipo_telefono) },
      },
      select: {
        codigo: true,
        etiqueta: true,
        traducciones: seleccionarTraduccionesParametro,
      },
    });
    const maestros = new Map(
      parametros.map((fila) => {
        const item = mapearParametroTraducible(fila);
        return [item.codigo, item] as const;
      }),
    );
    return filas.map((fila) => ({
      ...fila,
      tipo_telefono: {
        codigo: fila.codigo_tipo_telefono,
        etiqueta:
          maestros.get(fila.codigo_tipo_telefono)?.etiqueta ??
          fila.codigo_tipo_telefono,
        traducciones:
          maestros.get(fila.codigo_tipo_telefono)?.traducciones ?? {},
      },
    }));
  }

  private catalogoActivo(cliente: ClientePrisma) {
    return cliente.parametros
      .findMany({
        where: { codigo_grupo: GRUPO_TIPOS_TELEFONO, estado: 1 },
        orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
        select: {
          codigo: true,
          etiqueta: true,
          traducciones: seleccionarTraduccionesParametro,
        },
      })
      .then((filas) => filas.map(mapearParametroTraducible));
  }

  private registrar(
    tx: Prisma.TransactionClient,
    accion:
      | typeof EVENTOS_FUNCIONALES.PERFIL_TELEFONO_AGREGADO.codigo
      | typeof EVENTOS_FUNCIONALES.PERFIL_TELEFONO_MODIFICADO.codigo
      | typeof EVENTOS_FUNCIONALES.PERFIL_TELEFONO_ELIMINADO.codigo,
    idEntidad: string,
    idUsuario: string,
    idOrganizacion: string,
    contexto: ContextoSolicitud,
    datos: DatosTelefono,
  ) {
    return this.auditoria.registrarConEvento(
      {
        accion,
        entidad: "personas_telefonos",
        id_entidad: idEntidad,
        fid_organizaciones: idOrganizacion,
        fid_usuarios: idUsuario,
        peticion: contexto,
        metadatos: {
          codigo_tipo_telefono: datos.codigo_tipo_telefono,
          es_emergencia: datos.es_emergencia,
        },
      },
      tx,
    );
  }

  private esUnicoDuplicado(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
