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
import {
  GRUPO_FRECUENCIAS_HOBBY,
  GRUPO_HOBBIES,
  HOBBY_OTROS,
} from "../../domain/entities/grupos-parametros";
import type {
  ComandoAgregarHobby,
  ComandoEliminarHobby,
  ComandoModificarHobby,
  HobbyPersona,
  HobbiesPerfil,
  ResultadoGestionHobbies,
} from "../../domain/entities/hobby-persona";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";

type ClientePrisma = PrismaService | Prisma.TransactionClient;
type DatosHobbyValidados = {
  codigo_hobby: string;
  hobby_personalizado: string | null;
  codigo_frecuencia: string;
};

@Injectable()
export class FuenteDatosHobbiesPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly configuracion: ConfigService,
  ) {}

  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<HobbiesPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [hobbies, catalogoHobbies, catalogoFrecuencias] = await Promise.all([
      this.listarActivos(this.prisma, idPersona),
      this.catalogoActivo(this.prisma, GRUPO_HOBBIES),
      this.catalogoActivo(this.prisma, GRUPO_FRECUENCIAS_HOBBY),
    ]);
    return { hobbies, catalogoHobbies, catalogoFrecuencias };
  }

  async agregar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const cantidad = await tx.personas_hobbies.count({
        where: { fid_personas: idPersona, estado: 1 },
      });
      const maximo = this.configuracion.getOrThrow<number>(
        "PROFILE_MAX_HOBBIES",
      );
      if (cantidad >= maximo)
        throw new BadRequestException({
          message: "profile.hobbies.limit",
          args: { max: maximo },
        });
      const datos = await this.validarDatos(tx, comando);
      const existente = await this.buscarDuplicado(tx, idPersona, datos, null);
      if (existente?.estado === 1)
        throw new ConflictException("profile.hobbies.duplicate");

      const hobby = existente
        ? await tx.personas_hobbies.update({
            where: { id_personas_hobbies: existente.id_personas_hobbies },
            data: { ...datos, estado: 1, updated_by: idUsuario },
            select: { id_personas_hobbies: true },
          })
        : await tx.personas_hobbies.create({
            data: {
              fid_personas: idPersona,
              ...datos,
              created_by: idUsuario,
              updated_by: idUsuario,
            },
            select: { id_personas_hobbies: true },
          });

      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_HOBBY_AGREGADO.codigo,
        hobby.id_personas_hobbies,
        idUsuario,
        idOrganizacion,
        contexto,
        datos,
      );
      return { ok: true, hobbies: await this.listarActivos(tx, idPersona) };
    });
  }

  async modificar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const actual = await tx.personas_hobbies.findFirst({
        where: {
          id_personas_hobbies: comando.id_personas_hobbies,
          fid_personas: idPersona,
          estado: 1,
        },
        select: {
          id_personas_hobbies: true,
          codigo_hobby: true,
          hobby_personalizado: true,
          codigo_frecuencia: true,
        },
      });
      if (!actual) throw new NotFoundException("profile.hobbies.notFound");

      const datos = await this.validarDatos(tx, comando);
      if (
        actual.codigo_hobby === datos.codigo_hobby &&
        (actual.hobby_personalizado ?? "").toLocaleLowerCase() ===
          (datos.hobby_personalizado ?? "").toLocaleLowerCase() &&
        actual.codigo_frecuencia === datos.codigo_frecuencia
      ) {
        throw new BadRequestException("profile.hobbies.noChanges");
      }
      const duplicado = await this.buscarDuplicado(
        tx,
        idPersona,
        datos,
        actual.id_personas_hobbies,
      );
      if (duplicado) throw new ConflictException("profile.hobbies.duplicate");

      await tx.personas_hobbies.update({
        where: { id_personas_hobbies: actual.id_personas_hobbies },
        data: { ...datos, updated_by: idUsuario },
      });
      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_HOBBY_MODIFICADO.codigo,
        actual.id_personas_hobbies,
        idUsuario,
        idOrganizacion,
        contexto,
        datos,
      );
      return { ok: true, hobbies: await this.listarActivos(tx, idPersona) };
    });
  }

  async eliminar(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const hobby = await tx.personas_hobbies.findFirst({
        where: {
          id_personas_hobbies: comando.id_personas_hobbies,
          fid_personas: idPersona,
          estado: 1,
        },
        select: {
          id_personas_hobbies: true,
          codigo_hobby: true,
          codigo_frecuencia: true,
        },
      });
      if (!hobby) throw new NotFoundException("profile.hobbies.notFound");

      await tx.personas_hobbies.update({
        where: { id_personas_hobbies: hobby.id_personas_hobbies },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_HOBBY_ELIMINADO.codigo,
        hobby.id_personas_hobbies,
        idUsuario,
        idOrganizacion,
        contexto,
        {
          codigo_hobby: hobby.codigo_hobby,
          codigo_frecuencia: hobby.codigo_frecuencia,
          hobby_personalizado: null,
        },
      );
      return { ok: true, hobbies: await this.listarActivos(tx, idPersona) };
    });
  }

  private async validarDatos(
    tx: Prisma.TransactionClient,
    comando: ComandoAgregarHobby,
  ): Promise<DatosHobbyValidados> {
    const [hobby, frecuencia] = await Promise.all([
      tx.parametros.findFirst({
        where: {
          codigo_grupo: GRUPO_HOBBIES,
          codigo: comando.codigo_hobby,
          estado: 1,
        },
        select: { codigo: true },
      }),
      tx.parametros.findFirst({
        where: {
          codigo_grupo: GRUPO_FRECUENCIAS_HOBBY,
          codigo: comando.codigo_frecuencia,
          estado: 1,
        },
        select: { codigo: true },
      }),
    ]);
    if (!hobby) throw new BadRequestException("profile.hobbies.invalidHobby");
    if (!frecuencia)
      throw new BadRequestException("profile.hobbies.invalidFrequency");

    const personalizado =
      comando.hobby_personalizado?.trim().replace(/\s+/g, " ") || null;
    if (hobby.codigo === HOBBY_OTROS && !personalizado)
      throw new BadRequestException("profile.hobbies.customRequired");
    if (hobby.codigo !== HOBBY_OTROS && personalizado)
      throw new BadRequestException("profile.hobbies.customNotAllowed");

    return {
      codigo_hobby: hobby.codigo,
      hobby_personalizado: hobby.codigo === HOBBY_OTROS ? personalizado : null,
      codigo_frecuencia: frecuencia.codigo,
    };
  }

  private buscarDuplicado(
    tx: Prisma.TransactionClient,
    idPersona: string,
    datos: DatosHobbyValidados,
    excluirId: string | null,
  ) {
    return tx.personas_hobbies.findFirst({
      where: {
        fid_personas: idPersona,
        codigo_hobby: datos.codigo_hobby,
        hobby_personalizado:
          datos.hobby_personalizado === null
            ? null
            : { equals: datos.hobby_personalizado, mode: "insensitive" },
        ...(excluirId ? { id_personas_hobbies: { not: excluirId } } : {}),
      },
      orderBy: { updated_at: "desc" },
      select: { id_personas_hobbies: true, estado: true },
    });
  }

  private registrar(
    tx: Prisma.TransactionClient,
    accion:
      | typeof EVENTOS_FUNCIONALES.PERFIL_HOBBY_AGREGADO.codigo
      | typeof EVENTOS_FUNCIONALES.PERFIL_HOBBY_MODIFICADO.codigo
      | typeof EVENTOS_FUNCIONALES.PERFIL_HOBBY_ELIMINADO.codigo,
    idEntidad: string,
    idUsuario: string,
    idOrganizacion: string,
    contexto: ContextoSolicitud,
    datos: DatosHobbyValidados,
  ) {
    return this.auditoria.registrarConEvento(
      {
        accion,
        entidad: "personas_hobbies",
        id_entidad: idEntidad,
        fid_organizaciones: idOrganizacion,
        fid_usuarios: idUsuario,
        peticion: contexto,
        metadatos: {
          codigo_hobby: datos.codigo_hobby,
          codigo_frecuencia: datos.codigo_frecuencia,
        },
      },
      tx,
    );
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
    if (!usuario) throw new NotFoundException("profile.hobbies.unavailable");
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
    if (!persona) throw new NotFoundException("profile.hobbies.unavailable");
    return persona.id_personas;
  }

  private async listarActivos(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<HobbyPersona[]> {
    const filas = await cliente.personas_hobbies.findMany({
      where: { fid_personas: idPersona, estado: 1 },
      orderBy: { updated_at: "desc" },
      select: {
        id_personas_hobbies: true,
        codigo_hobby: true,
        hobby_personalizado: true,
        codigo_frecuencia: true,
      },
    });
    const parametros = await cliente.parametros.findMany({
      where: {
        OR: [
          { codigo_grupo: GRUPO_HOBBIES },
          { codigo_grupo: GRUPO_FRECUENCIAS_HOBBY },
        ],
      },
      select: {
        codigo_grupo: true,
        codigo: true,
        etiqueta: true,
        traducciones: seleccionarTraduccionesParametro,
      },
    });
    const hobbies = new Map(
      parametros
        .filter((item) => item.codigo_grupo === GRUPO_HOBBIES)
        .map((fila) => {
          const item = mapearParametroTraducible(fila);
          return [item.codigo, item] as const;
        }),
    );
    const frecuencias = new Map(
      parametros
        .filter((item) => item.codigo_grupo === GRUPO_FRECUENCIAS_HOBBY)
        .map((fila) => {
          const item = mapearParametroTraducible(fila);
          return [item.codigo, item] as const;
        }),
    );
    return filas.map((fila) => ({
      ...fila,
      hobby: hobbies.get(fila.codigo_hobby) ?? {
        codigo: fila.codigo_hobby,
        etiqueta: fila.codigo_hobby,
        traducciones: {},
      },
      frecuencia: frecuencias.get(fila.codigo_frecuencia) ?? {
        codigo: fila.codigo_frecuencia,
        etiqueta: fila.codigo_frecuencia,
        traducciones: {},
      },
    }));
  }

  private catalogoActivo(cliente: ClientePrisma, grupo: string) {
    return cliente.parametros
      .findMany({
        where: { codigo_grupo: grupo, estado: 1 },
        orderBy: [{ orden: "asc" }, { etiqueta: "asc" }],
        select: {
          codigo: true,
          etiqueta: true,
          traducciones: seleccionarTraduccionesParametro,
        },
      })
      .then((filas) => filas.map(mapearParametroTraducible));
  }
}
