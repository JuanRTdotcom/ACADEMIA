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
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../comun/prisma.service";
import { GRUPO_TIPOS_DOCUMENTO } from "../../domain/entities/grupos-parametros";
import type {
  ComandoAgregarDocumento,
  ComandoEliminarDocumento,
  ComandoModificarDocumento,
  DocumentoPersona,
  DocumentosPerfil,
  ResultadoGestionDocumentos,
} from "../../domain/entities/documento-persona";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";

type ClientePrisma = PrismaService | Prisma.TransactionClient;

@Injectable()
export class FuenteDatosDocumentosPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly configuracion: ConfigService,
  ) {}

  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<DocumentosPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [documentos, catalogo] = await Promise.all([
      this.listarActivos(this.prisma, idPersona),
      this.catalogoActivo(this.prisma),
    ]);
    return { documentos, catalogo };
  }

  async agregar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const cantidad = await tx.personas_documentos.count({
          where: { fid_personas: idPersona, estado: 1 },
        });
        const maximo = this.configuracion.getOrThrow<number>(
          "PROFILE_MAX_DOCUMENTS",
        );
        if (cantidad >= maximo)
          throw new BadRequestException({
            message: "profile.documents.limit",
            args: { max: maximo },
          });
        const datos = await this.validarDatos(tx, comando);
        const duplicadoOrganizacion = await tx.personas_documentos.findFirst({
          where: {
            fid_organizaciones: idOrganizacion,
            codigo_tipo_documento: datos.codigo_tipo_documento,
            numero_documento: {
              equals: datos.numero_documento,
              mode: "insensitive",
            },
            estado: 1,
          },
          select: { id_personas_documentos: true },
        });
        if (duplicadoOrganizacion)
          throw new ConflictException("profile.documents.duplicate");

        const anterior = await tx.personas_documentos.findFirst({
          where: {
            fid_personas: idPersona,
            codigo_tipo_documento: datos.codigo_tipo_documento,
            numero_documento: {
              equals: datos.numero_documento,
              mode: "insensitive",
            },
            estado: 0,
          },
          orderBy: { updated_at: "desc" },
          select: { id_personas_documentos: true },
        });
        const documento = anterior
          ? await tx.personas_documentos.update({
              where: {
                id_personas_documentos: anterior.id_personas_documentos,
              },
              data: { ...datos, estado: 1, updated_by: idUsuario },
              select: { id_personas_documentos: true },
            })
          : await tx.personas_documentos.create({
              data: {
                fid_personas: idPersona,
                fid_organizaciones: idOrganizacion,
                ...datos,
                created_by: idUsuario,
                updated_by: idUsuario,
              },
              select: { id_personas_documentos: true },
            });

        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_DOCUMENTO_AGREGADO.codigo,
            entidad: "personas_documentos",
            id_entidad: documento.id_personas_documentos,
            fid_organizaciones: idOrganizacion,
            fid_usuarios: idUsuario,
            peticion: contexto,
            metadatos: { codigo_tipo_documento: datos.codigo_tipo_documento },
          },
          tx,
        );
        return {
          ok: true,
          documentos: await this.listarActivos(tx, idPersona),
        };
      });
    } catch (error: unknown) {
      if (this.esUnicoDuplicado(error))
        throw new ConflictException("profile.documents.duplicate");
      throw error;
    }
  }

  async eliminar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const documento = await tx.personas_documentos.findFirst({
        where: {
          id_personas_documentos: comando.id_personas_documentos,
          fid_personas: idPersona,
          fid_organizaciones: idOrganizacion,
          estado: 1,
        },
        select: { id_personas_documentos: true, codigo_tipo_documento: true },
      });
      if (!documento) throw new NotFoundException("profile.documents.notFound");
      await tx.personas_documentos.update({
        where: { id_personas_documentos: documento.id_personas_documentos },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.auditoria.registrarConEvento(
        {
          accion: EVENTOS_FUNCIONALES.PERFIL_DOCUMENTO_ELIMINADO.codigo,
          entidad: "personas_documentos",
          id_entidad: documento.id_personas_documentos,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuario,
          peticion: contexto,
          metadatos: { codigo_tipo_documento: documento.codigo_tipo_documento },
        },
        tx,
      );
      return { ok: true, documentos: await this.listarActivos(tx, idPersona) };
    });
  }

  async modificar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const actual = await tx.personas_documentos.findFirst({
          where: {
            id_personas_documentos: comando.id_personas_documentos,
            fid_personas: idPersona,
            fid_organizaciones: idOrganizacion,
            estado: 1,
          },
          select: {
            id_personas_documentos: true,
            codigo_tipo_documento: true,
            numero_documento: true,
          },
        });
        if (!actual) throw new NotFoundException("profile.documents.notFound");

        const datos = await this.validarDatos(tx, comando);
        if (
          actual.codigo_tipo_documento === datos.codigo_tipo_documento &&
          actual.numero_documento.toLocaleUpperCase() ===
            datos.numero_documento.toLocaleUpperCase()
        ) {
          throw new BadRequestException("profile.documents.noChanges");
        }

        const duplicado = await tx.personas_documentos.findFirst({
          where: {
            id_personas_documentos: { not: actual.id_personas_documentos },
            fid_organizaciones: idOrganizacion,
            codigo_tipo_documento: datos.codigo_tipo_documento,
            numero_documento: {
              equals: datos.numero_documento,
              mode: "insensitive",
            },
            estado: 1,
          },
          select: { id_personas_documentos: true },
        });
        if (duplicado)
          throw new ConflictException("profile.documents.duplicate");

        await tx.personas_documentos.update({
          where: { id_personas_documentos: actual.id_personas_documentos },
          data: { ...datos, updated_by: idUsuario },
        });
        await this.auditoria.registrarConEvento(
          {
            accion: EVENTOS_FUNCIONALES.PERFIL_DOCUMENTO_MODIFICADO.codigo,
            entidad: "personas_documentos",
            id_entidad: actual.id_personas_documentos,
            fid_organizaciones: idOrganizacion,
            fid_usuarios: idUsuario,
            peticion: contexto,
            metadatos: { codigo_tipo_documento: datos.codigo_tipo_documento },
          },
          tx,
        );
        return {
          ok: true,
          documentos: await this.listarActivos(tx, idPersona),
        };
      });
    } catch (error: unknown) {
      if (this.esUnicoDuplicado(error))
        throw new ConflictException("profile.documents.duplicate");
      throw error;
    }
  }

  private async validarDatos(
    tx: Prisma.TransactionClient,
    comando: ComandoAgregarDocumento,
  ) {
    const maestro = await tx.parametros.findFirst({
      where: {
        codigo_grupo: GRUPO_TIPOS_DOCUMENTO,
        codigo: comando.codigo_tipo_documento,
        estado: 1,
      },
      select: { codigo: true },
    });
    if (!maestro)
      throw new BadRequestException("profile.documents.invalidType");
    return {
      codigo_tipo_documento: maestro.codigo,
      numero_documento: comando.numero_documento
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase(),
    };
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
    if (!usuario) throw new NotFoundException("profile.documents.unavailable");
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
    if (!persona) throw new NotFoundException("profile.documents.unavailable");
    return persona.id_personas;
  }

  private async listarActivos(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<DocumentoPersona[]> {
    const filas = await cliente.personas_documentos.findMany({
      where: { fid_personas: idPersona, estado: 1 },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
      select: {
        id_personas_documentos: true,
        codigo_tipo_documento: true,
        numero_documento: true,
      },
    });
    const parametros = await cliente.parametros.findMany({
      where: {
        codigo_grupo: GRUPO_TIPOS_DOCUMENTO,
        codigo: { in: filas.map((fila) => fila.codigo_tipo_documento) },
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
      tipo_documento: {
        codigo: fila.codigo_tipo_documento,
        etiqueta:
          maestros.get(fila.codigo_tipo_documento)?.etiqueta ??
          fila.codigo_tipo_documento,
        traducciones:
          maestros.get(fila.codigo_tipo_documento)?.traducciones ?? {},
      },
    }));
  }

  private catalogoActivo(cliente: ClientePrisma) {
    return cliente.parametros
      .findMany({
        where: { codigo_grupo: GRUPO_TIPOS_DOCUMENTO, estado: 1 },
        orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
        select: {
          codigo: true,
          etiqueta: true,
          traducciones: seleccionarTraduccionesParametro,
        },
      })
      .then((filas) => filas.map(mapearParametroTraducible));
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
