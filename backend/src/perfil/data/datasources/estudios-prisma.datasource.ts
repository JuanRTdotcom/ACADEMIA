import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "../../../../prisma/generated/client/client";
import { EVENTOS_FUNCIONALES } from "../../../comun/auditoria/eventos-funcionales";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../comun/prisma.service";
import type {
  ComandoGuardarEstudioComplementario,
  ComandoGuardarEstudioRealizado,
  ComandoModificarEstudioComplementario,
  ComandoModificarEstudioRealizado,
  EstudioComplementario,
  EstudioRealizado,
  EstudiosPerfil,
  ResultadoEstudios,
} from "../../domain/entities/estudio-persona";
import {
  CODIGO_PARAMETRO_OTRO,
  GRUPO_GRADOS_OBTENIDOS,
  GRUPO_NIVELES_INSTRUCCION,
  GRUPO_PROFESIONES,
  GRUPO_TIPOS_ESTUDIO_COMPLEMENTARIO,
} from "../../domain/entities/grupos-parametros";
import {
  mapearParametroTraducible,
  seleccionarTraduccionesParametro,
} from "../mappers/parametro-traducible";

type ClientePrisma = PrismaService | Prisma.TransactionClient;
type TipoEventoEstudio =
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_AGREGADO.codigo
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_MODIFICADO.codigo
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_ELIMINADO.codigo
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_AGREGADO.codigo
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_MODIFICADO.codigo
  | typeof EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_ELIMINADO.codigo;

@Injectable()
export class FuenteDatosEstudiosPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly configuracion: ConfigService,
  ) {}

  async listar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<EstudiosPerfil> {
    const idPersona = await this.obtenerPersonaActiva(
      idUsuario,
      idOrganizacion,
    );
    const [realizados, complementarios, niveles, grados, profesiones, tipos] =
      await Promise.all([
        this.listarRealizados(this.prisma, idPersona),
        this.listarComplementarios(this.prisma, idPersona),
        this.catalogo(this.prisma, GRUPO_NIVELES_INSTRUCCION),
        this.catalogo(this.prisma, GRUPO_GRADOS_OBTENIDOS),
        this.catalogo(this.prisma, GRUPO_PROFESIONES),
        this.catalogo(this.prisma, GRUPO_TIPOS_ESTUDIO_COMPLEMENTARIO),
      ]);
    return {
      realizados,
      complementarios,
      catalogos: {
        niveles_instruccion: niveles,
        grados_obtenidos: grados,
        profesiones,
        tipos_estudio_complementario: tipos,
      },
    };
  }

  async agregarRealizado(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioRealizado,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.controlarDuplicado(async () =>
      this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const cantidad = await tx.personas_estudios_realizados.count({
          where: { fid_personas: idPersona, estado: 1 },
        });
        const maximo = this.configuracion.getOrThrow<number>(
          "PROFILE_MAX_ACADEMIC_STUDIES",
        );
        if (cantidad >= maximo)
          throw new BadRequestException({
            message: "profile.studies.academicLimit",
            args: { max: maximo },
          });
        const datos = await this.validarRealizado(tx, comando);
        const duplicado = await tx.personas_estudios_realizados.findFirst({
          where: {
            fid_personas: idPersona,
            codigo_nivel_instruccion: datos.codigo_nivel_instruccion,
            codigo_grado_obtenido: datos.codigo_grado_obtenido,
            codigo_profesion: datos.codigo_profesion,
            fecha_inicio: datos.fecha_inicio,
            estado: 1,
          },
          select: { id_personas_estudios_realizados: true },
        });
        if (duplicado) throw new ConflictException("profile.studies.duplicate");
        const creado = await tx.personas_estudios_realizados.create({
          data: {
            fid_personas: idPersona,
            ...datos,
            created_by: idUsuario,
            updated_by: idUsuario,
          },
          select: { id_personas_estudios_realizados: true },
        });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_AGREGADO.codigo,
          "personas_estudios_realizados",
          creado.id_personas_estudios_realizados,
          idUsuario,
          idOrganizacion,
          contexto,
        );
        return this.resultado(tx, idPersona);
      }),
    );
  }

  async modificarRealizado(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioRealizado,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.controlarDuplicado(async () =>
      this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const actual = await tx.personas_estudios_realizados.findFirst({
          where: {
            id_personas_estudios_realizados:
              comando.id_personas_estudios_realizados,
            fid_personas: idPersona,
            estado: 1,
          },
        });
        if (!actual) throw new NotFoundException("profile.studies.notFound");
        const datos = await this.validarRealizado(tx, comando);
        if (this.igualesRealizado(actual, datos))
          throw new BadRequestException("profile.studies.noChanges");
        await tx.personas_estudios_realizados.update({
          where: {
            id_personas_estudios_realizados:
              actual.id_personas_estudios_realizados,
          },
          data: { ...datos, updated_by: idUsuario },
        });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_MODIFICADO.codigo,
          "personas_estudios_realizados",
          actual.id_personas_estudios_realizados,
          idUsuario,
          idOrganizacion,
          contexto,
        );
        return this.resultado(tx, idPersona);
      }),
    );
  }

  async eliminarRealizado(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const actual = await tx.personas_estudios_realizados.findFirst({
        where: {
          id_personas_estudios_realizados: id,
          fid_personas: idPersona,
          estado: 1,
        },
        select: { id_personas_estudios_realizados: true },
      });
      if (!actual) throw new NotFoundException("profile.studies.notFound");
      await tx.personas_estudios_realizados.update({
        where: { id_personas_estudios_realizados: id },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_REALIZADO_ELIMINADO.codigo,
        "personas_estudios_realizados",
        id,
        idUsuario,
        idOrganizacion,
        contexto,
      );
      return this.resultado(tx, idPersona);
    });
  }

  async agregarComplementario(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioComplementario,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.controlarDuplicado(async () =>
      this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const cantidad = await tx.personas_estudios_complementarios.count({
          where: { fid_personas: idPersona, estado: 1 },
        });
        const maximo = this.configuracion.getOrThrow<number>(
          "PROFILE_MAX_COMPLEMENTARY_STUDIES",
        );
        if (cantidad >= maximo)
          throw new BadRequestException({
            message: "profile.studies.complementaryLimit",
            args: { max: maximo },
          });
        const datos = await this.validarComplementario(tx, comando);
        const duplicado = await tx.personas_estudios_complementarios.findFirst({
          where: {
            fid_personas: idPersona,
            codigo_tipo_estudio: datos.codigo_tipo_estudio,
            nombre_estudio: {
              equals: datos.nombre_estudio,
              mode: "insensitive",
            },
            institucion: { equals: datos.institucion, mode: "insensitive" },
            fecha_inicio: datos.fecha_inicio,
            estado: 1,
          },
          select: { id_personas_estudios_complementarios: true },
        });
        if (duplicado) throw new ConflictException("profile.studies.duplicate");
        const creado = await tx.personas_estudios_complementarios.create({
          data: {
            fid_personas: idPersona,
            ...datos,
            created_by: idUsuario,
            updated_by: idUsuario,
          },
          select: { id_personas_estudios_complementarios: true },
        });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_AGREGADO.codigo,
          "personas_estudios_complementarios",
          creado.id_personas_estudios_complementarios,
          idUsuario,
          idOrganizacion,
          contexto,
        );
        return this.resultado(tx, idPersona);
      }),
    );
  }

  async modificarComplementario(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioComplementario,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.controlarDuplicado(async () =>
      this.prisma.$transaction(async (tx) => {
        const idPersona = await this.bloquearPersona(
          tx,
          idUsuario,
          idOrganizacion,
        );
        const actual = await tx.personas_estudios_complementarios.findFirst({
          where: {
            id_personas_estudios_complementarios:
              comando.id_personas_estudios_complementarios,
            fid_personas: idPersona,
            estado: 1,
          },
        });
        if (!actual) throw new NotFoundException("profile.studies.notFound");
        const datos = await this.validarComplementario(tx, comando);
        if (this.igualesComplementario(actual, datos))
          throw new BadRequestException("profile.studies.noChanges");
        await tx.personas_estudios_complementarios.update({
          where: {
            id_personas_estudios_complementarios:
              actual.id_personas_estudios_complementarios,
          },
          data: { ...datos, updated_by: idUsuario },
        });
        await this.registrar(
          tx,
          EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_MODIFICADO.codigo,
          "personas_estudios_complementarios",
          actual.id_personas_estudios_complementarios,
          idUsuario,
          idOrganizacion,
          contexto,
        );
        return this.resultado(tx, idPersona);
      }),
    );
  }

  async eliminarComplementario(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios> {
    return this.prisma.$transaction(async (tx) => {
      const idPersona = await this.bloquearPersona(
        tx,
        idUsuario,
        idOrganizacion,
      );
      const actual = await tx.personas_estudios_complementarios.findFirst({
        where: {
          id_personas_estudios_complementarios: id,
          fid_personas: idPersona,
          estado: 1,
        },
        select: { id_personas_estudios_complementarios: true },
      });
      if (!actual) throw new NotFoundException("profile.studies.notFound");
      await tx.personas_estudios_complementarios.update({
        where: { id_personas_estudios_complementarios: id },
        data: { estado: 0, updated_by: idUsuario },
      });
      await this.registrar(
        tx,
        EVENTOS_FUNCIONALES.PERFIL_ESTUDIO_COMPLEMENTARIO_ELIMINADO.codigo,
        "personas_estudios_complementarios",
        id,
        idUsuario,
        idOrganizacion,
        contexto,
      );
      return this.resultado(tx, idPersona);
    });
  }

  private async validarRealizado(
    tx: Prisma.TransactionClient,
    comando: ComandoGuardarEstudioRealizado,
  ) {
    const [nivel, grado, profesion] = await Promise.all([
      this.maestro(
        tx,
        GRUPO_NIVELES_INSTRUCCION,
        comando.codigo_nivel_instruccion,
      ),
      this.maestro(tx, GRUPO_GRADOS_OBTENIDOS, comando.codigo_grado_obtenido),
      this.maestro(tx, GRUPO_PROFESIONES, comando.codigo_profesion),
    ]);
    if (!nivel || !grado || !profesion)
      throw new BadRequestException("profile.studies.invalidCatalog");
    const gradoOtro = this.validarOtro(
      grado.codigo,
      comando.grado_obtenido_otro,
    );
    const profesionOtro = this.validarOtro(
      profesion.codigo,
      comando.profesion_otro,
    );
    return {
      codigo_nivel_instruccion: nivel.codigo,
      codigo_grado_obtenido: grado.codigo,
      grado_obtenido_otro: gradoOtro,
      codigo_profesion: profesion.codigo,
      profesion_otro: profesionOtro,
      ...this.validarPeriodo(comando),
    };
  }

  private async validarComplementario(
    tx: Prisma.TransactionClient,
    comando: ComandoGuardarEstudioComplementario,
  ) {
    const tipo = await this.maestro(
      tx,
      GRUPO_TIPOS_ESTUDIO_COMPLEMENTARIO,
      comando.codigo_tipo_estudio,
    );
    if (!tipo) throw new BadRequestException("profile.studies.invalidCatalog");
    return {
      codigo_tipo_estudio: tipo.codigo,
      tipo_estudio_otro: this.validarOtro(
        tipo.codigo,
        comando.tipo_estudio_otro,
      ),
      nombre_estudio: comando.nombre_estudio.trim().replace(/\s+/g, " "),
      institucion: comando.institucion.trim().replace(/\s+/g, " "),
      ...this.validarPeriodo(comando),
    };
  }

  private validarPeriodo(comando: {
    fecha_inicio: string;
    fecha_fin?: string;
    en_curso: boolean;
  }) {
    const fecha_inicio = new Date(`${comando.fecha_inicio}T00:00:00.000Z`);
    const fecha_fin = comando.fecha_fin
      ? new Date(`${comando.fecha_fin}T00:00:00.000Z`)
      : null;
    if (comando.en_curso && fecha_fin)
      throw new BadRequestException("profile.studies.currentHasEnd");
    if (!comando.en_curso && !fecha_fin)
      throw new BadRequestException("profile.studies.endRequired");
    if (fecha_fin && fecha_fin <= fecha_inicio)
      throw new BadRequestException("profile.studies.invalidPeriod");
    return { fecha_inicio, fecha_fin, en_curso: comando.en_curso };
  }

  private validarOtro(codigo: string, valor?: string) {
    const limpio = valor?.trim().replace(/\s+/g, " ") || null;
    if (codigo === CODIGO_PARAMETRO_OTRO && !limpio)
      throw new BadRequestException("profile.studies.otherRequired");
    if (codigo !== CODIGO_PARAMETRO_OTRO && limpio)
      throw new BadRequestException("profile.studies.otherNotAllowed");
    return codigo === CODIGO_PARAMETRO_OTRO ? limpio : null;
  }

  private maestro(tx: Prisma.TransactionClient, grupo: string, codigo: string) {
    return tx.parametros.findFirst({
      where: { codigo_grupo: grupo, codigo, estado: 1 },
      select: { codigo: true },
    });
  }

  private async resultado(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<ResultadoEstudios> {
    const [realizados, complementarios] = await Promise.all([
      this.listarRealizados(cliente, idPersona),
      this.listarComplementarios(cliente, idPersona),
    ]);
    return { ok: true, realizados, complementarios };
  }

  private async listarRealizados(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<EstudioRealizado[]> {
    const filas = await cliente.personas_estudios_realizados.findMany({
      where: { fid_personas: idPersona, estado: 1 },
      orderBy: [{ fecha_inicio: "desc" }, { updated_at: "desc" }],
    });
    const maestros = await this.mapaMaestros(cliente, [
      GRUPO_NIVELES_INSTRUCCION,
      GRUPO_GRADOS_OBTENIDOS,
      GRUPO_PROFESIONES,
    ]);
    return filas.map((fila) => ({
      id_personas_estudios_realizados: fila.id_personas_estudios_realizados,
      fecha_inicio: this.fecha(fila.fecha_inicio)!,
      fecha_fin: this.fecha(fila.fecha_fin),
      en_curso: fila.en_curso,
      codigo_nivel_instruccion: fila.codigo_nivel_instruccion,
      codigo_grado_obtenido: fila.codigo_grado_obtenido,
      grado_obtenido_otro: fila.grado_obtenido_otro,
      codigo_profesion: fila.codigo_profesion,
      profesion_otro: fila.profesion_otro,
      nivel_instruccion: this.opcion(
        maestros,
        GRUPO_NIVELES_INSTRUCCION,
        fila.codigo_nivel_instruccion,
      ),
      grado_obtenido: this.opcion(
        maestros,
        GRUPO_GRADOS_OBTENIDOS,
        fila.codigo_grado_obtenido,
      ),
      profesion: this.opcion(
        maestros,
        GRUPO_PROFESIONES,
        fila.codigo_profesion,
      ),
    }));
  }

  private async listarComplementarios(
    cliente: ClientePrisma,
    idPersona: string,
  ): Promise<EstudioComplementario[]> {
    const filas = await cliente.personas_estudios_complementarios.findMany({
      where: { fid_personas: idPersona, estado: 1 },
      orderBy: [{ fecha_inicio: "desc" }, { updated_at: "desc" }],
    });
    const maestros = await this.mapaMaestros(cliente, [
      GRUPO_TIPOS_ESTUDIO_COMPLEMENTARIO,
    ]);
    return filas.map((fila) => ({
      id_personas_estudios_complementarios:
        fila.id_personas_estudios_complementarios,
      codigo_tipo_estudio: fila.codigo_tipo_estudio,
      tipo_estudio_otro: fila.tipo_estudio_otro,
      nombre_estudio: fila.nombre_estudio,
      institucion: fila.institucion,
      fecha_inicio: this.fecha(fila.fecha_inicio)!,
      fecha_fin: this.fecha(fila.fecha_fin),
      en_curso: fila.en_curso,
      tipo_estudio: this.opcion(
        maestros,
        GRUPO_TIPOS_ESTUDIO_COMPLEMENTARIO,
        fila.codigo_tipo_estudio,
      ),
    }));
  }

  private async mapaMaestros(cliente: ClientePrisma, grupos: string[]) {
    const filas = await cliente.parametros.findMany({
      where: { codigo_grupo: { in: grupos } },
      select: {
        codigo_grupo: true,
        codigo: true,
        etiqueta: true,
        traducciones: seleccionarTraduccionesParametro,
      },
    });
    return new Map(
      filas.map((fila) => [
        `${fila.codigo_grupo}:${fila.codigo}`,
        mapearParametroTraducible(fila),
      ]),
    );
  }

  private opcion(
    maestros: Awaited<ReturnType<FuenteDatosEstudiosPrisma["mapaMaestros"]>>,
    grupo: string,
    codigo: string,
  ) {
    return (
      maestros.get(`${grupo}:${codigo}`) ?? {
        codigo,
        etiqueta: codigo,
        traducciones: {},
      }
    );
  }

  private catalogo(cliente: ClientePrisma, grupo: string) {
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

  private fecha(valor: Date | null) {
    return valor?.toISOString().slice(0, 10) ?? null;
  }

  private igualesRealizado(
    actual: Record<string, unknown>,
    datos: Record<string, unknown>,
  ) {
    return (
      [
        "codigo_nivel_instruccion",
        "codigo_grado_obtenido",
        "grado_obtenido_otro",
        "codigo_profesion",
        "profesion_otro",
        "en_curso",
      ].every((campo) => actual[campo] === datos[campo]) &&
      this.fecha(actual.fecha_inicio as Date) ===
        this.fecha(datos.fecha_inicio as Date) &&
      this.fecha(actual.fecha_fin as Date | null) ===
        this.fecha(datos.fecha_fin as Date | null)
    );
  }

  private igualesComplementario(
    actual: Record<string, unknown>,
    datos: Record<string, unknown>,
  ) {
    return (
      [
        "codigo_tipo_estudio",
        "tipo_estudio_otro",
        "nombre_estudio",
        "institucion",
        "en_curso",
      ].every((campo) => actual[campo] === datos[campo]) &&
      this.fecha(actual.fecha_inicio as Date) ===
        this.fecha(datos.fecha_inicio as Date) &&
      this.fecha(actual.fecha_fin as Date | null) ===
        this.fecha(datos.fecha_fin as Date | null)
    );
  }

  private registrar(
    tx: Prisma.TransactionClient,
    accion: TipoEventoEstudio,
    entidad:
      "personas_estudios_realizados" | "personas_estudios_complementarios",
    idEntidad: string,
    idUsuario: string,
    idOrganizacion: string,
    contexto: ContextoSolicitud,
  ) {
    return this.auditoria.registrarConEvento(
      {
        accion,
        entidad,
        id_entidad: idEntidad,
        fid_organizaciones: idOrganizacion,
        fid_usuarios: idUsuario,
        peticion: contexto,
        metadatos: {},
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
    if (!usuario) throw new NotFoundException("profile.studies.unavailable");
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
        AND o.eliminado_en IS NULL AND p.estado = 1
        AND p.fid_organizaciones = ${idOrganizacion}::uuid
      FOR UPDATE OF p
    `;
    if (!persona) throw new NotFoundException("profile.studies.unavailable");
    return persona.id_personas;
  }

  private async controlarDuplicado<T>(operacion: () => Promise<T>) {
    try {
      return await operacion();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        throw new ConflictException("profile.studies.duplicate");
      throw error;
    }
  }
}
