import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import type {
  DatosCrearAtencion,
  DatosRegistroAtencion,
  ArchivoAdjuntoAtencion,
  AdjuntoAtencionGuardado,
  FiltrosAtenciones,
} from "../../domain/entities/atencion";
import { AlmacenAdjuntosAtencionR2 } from "./adjuntos-atencion-r2.datasource";
import {
  camposRegistroAtencion,
  validarRegistroAtencion,
} from "../../domain/entities/atencion";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosAtencionesPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
    private config: ConfigService,
    private adjuntos: AlmacenAdjuntosAtencionR2,
  ) {}

  private async guardarAdjuntos(
    organizacion: string,
    atencion: string,
    registro: string,
    tipoId: string,
    archivos: ArchivoAdjuntoAtencion[],
  ) {
    const tipo = await this.prisma.tipos_registro_atencion.findFirst({
      where: { id_tipos_registro_atencion: tipoId, estado: 1 },
      select: { acepta_adjuntos: true, max_adjuntos: true },
    });
    if (!tipo) throw new BadRequestException("attentions.invalidRecordType");
    if (archivos.length && !tipo.acepta_adjuntos)
      throw new BadRequestException("attentions.attachmentsNotAllowed");
    const maximo = this.maximoAdjuntos(tipo.max_adjuntos);
    if (archivos.length > maximo)
      throw new BadRequestException({
        message: "attentions.attachmentLimit",
        args: { max: maximo },
      });
    const guardados: AdjuntoAtencionGuardado[] = [];
    try {
      for (const archivo of archivos)
        guardados.push(
          await this.adjuntos.guardar(
            organizacion,
            atencion,
            registro,
            archivo,
          ),
        );
      return guardados;
    } catch (error) {
      await this.adjuntos.eliminarTodos(
        guardados.map((item) => item.clave_objeto),
      );
      throw error;
    }
  }

  private maximoAdjuntos(maximoTipo: number | null) {
    return Math.min(
      this.config.getOrThrow<number>("ATTENTION_ATTACHMENT_MAX_FILES"),
      maximoTipo ?? Number.MAX_SAFE_INTEGER,
    );
  }

  private async validarContexto(tx: Tx, organizacion: string, usuario: string) {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
    const actor = await tx.usuarios.findFirst({
      where: {
        id_usuarios: usuario,
        fid_organizaciones: organizacion,
        estado: 1,
        estado_cuenta: "activo",
        eliminado_en: null,
      },
      select: { id_usuarios: true },
    });
    if (!actor) throw new NotFoundException("attentions.unavailable");
  }

  private async tiempoTenant(tx: Tx, organizacion: string) {
    const [tiempo] = await tx.$queryRaw<
      Array<{ fecha: Date; fecha_anterior: Date; zona: string }>
    >`
      SELECT (CURRENT_TIMESTAMP AT TIME ZONE zona.nombre_iana)::date AS fecha,
             ((CURRENT_TIMESTAMP AT TIME ZONE zona.nombre_iana)::date - 1) AS fecha_anterior,
             zona.nombre_iana AS zona
      FROM nucleo.organizaciones organizacion
      JOIN nucleo.perfil_organizacion perfil
        ON perfil.fid_organizaciones = organizacion.id_organizaciones
       AND perfil.estado = 1
      JOIN system.zonas_horarias zona
        ON zona.id_zonas_horarias = perfil.fid_zonas_horarias
       AND zona.estado = 1
      WHERE organizacion.id_organizaciones = ${organizacion}::uuid
        AND organizacion.estado = 1
        AND organizacion.eliminado_en IS NULL
    `;
    if (!tiempo)
      throw new BadRequestException("attentions.invalidConfiguration");
    return tiempo;
  }

  private async atencionExistente(tx: Tx, id: string, organizacion: string) {
    await tx.$queryRaw`SELECT id_atenciones FROM personas.atenciones WHERE id_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
    const atencion = await tx.atenciones.findFirst({
      where: {
        id_atenciones: id,
        fid_organizaciones: organizacion,
        eliminado_en: null,
      },
      include: { estado_atencion: { select: { codigo: true } } },
    });
    if (!atencion) throw new NotFoundException("attentions.notFound");
    return atencion;
  }

  private async fechaCivil(tx: Tx, valor: string | null) {
    if (!valor) return null;
    const [resultado] = await tx.$queryRaw<Array<{ fecha: Date }>>`
      SELECT ${valor}::date AS fecha
    `;
    if (!resultado) throw new BadRequestException("attentions.invalidRecord");
    return resultado.fecha;
  }

  private async instanteTenant(tx: Tx, valor: string | null, zona: string) {
    if (!valor) return null;
    const [resultado] = await tx.$queryRaw<Array<{ instante: Date }>>`
      SELECT (${valor}::timestamp AT TIME ZONE ${zona}) AS instante
    `;
    if (!resultado) throw new BadRequestException("attentions.invalidRecord");
    return resultado.instante;
  }

  private async crearRegistro(
    tx: Tx,
    atencion: string,
    organizacion: string,
    datos: DatosRegistroAtencion,
    usuario: string,
    zona: string,
    registroId: string,
    archivos: AdjuntoAtencionGuardado[],
  ) {
    const tipo = await tx.tipos_registro_atencion.findFirst({
      where: {
        id_tipos_registro_atencion: datos.fid_tipos_registro_atencion,
        estado: 1,
      },
    });
    if (!tipo) throw new BadRequestException("attentions.invalidRecordType");
    if (archivos.length && !tipo.acepta_adjuntos)
      throw new BadRequestException("attentions.attachmentsNotAllowed");
    const maximoAdjuntos = this.maximoAdjuntos(tipo.max_adjuntos);
    if (archivos.length > maximoAdjuntos)
      throw new BadRequestException({
        message: "attentions.attachmentLimit",
        args: { max: maximoAdjuntos },
      });
    const validado = validarRegistroAtencion(tipo.campos, datos.detalle);
    if (!validado) throw new BadRequestException("attentions.invalidRecord");
    let motivo: { id_motivos_consulta: string; nombre: string } | null = null;
    let vacuna: { id_vacunas: string; nombre: string } | null = null;
    let tipoDesparasitacion: {
      id_parametros: string;
      etiqueta: string;
    } | null = null;
    let tipoHospitalizacion: {
      id_tipos_hospitalizacion: string;
      nombre: string;
    } | null = null;
    let motivoSalidaHospitalizacion: {
      id_parametros: string;
      etiqueta: string;
    } | null = null;
    let procedimiento: {
      id_procedimientos_veterinarios: string;
      nombre: string;
    } | null = null;
    let pruebasLaboratorio: Array<{
      fid_pruebas_laboratorio: string;
      fid_usuarios_profesional: string;
      cantidad: number;
      cantidad_adjuntos: number;
      nombre: string;
    }> = [];
    if (tipo.codigo === "consulta") {
      const motivoId = validado.detalle.fid_motivos_consulta;
      if (typeof motivoId !== "string")
        throw new BadRequestException("attentions.invalidReason");
      motivo = await tx.motivos_consulta.findFirst({
        where: {
          id_motivos_consulta: motivoId,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_motivos_consulta: true, nombre: true },
      });
      if (!motivo) throw new BadRequestException("attentions.invalidReason");
    }
    if (tipo.codigo === "vacunacion") {
      const vacunaId = validado.detalle.fid_vacunas;
      if (typeof vacunaId !== "string")
        throw new BadRequestException("attentions.invalidVaccine");
      vacuna = await tx.vacunas.findFirst({
        where: {
          id_vacunas: vacunaId,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_vacunas: true, nombre: true },
      });
      if (!vacuna) throw new BadRequestException("attentions.invalidVaccine");
    }
    if (tipo.codigo === "desparasitacion") {
      const tipoId = validado.detalle.fid_parametros_tipo_desparasitacion;
      if (typeof tipoId !== "string")
        throw new BadRequestException("attentions.invalidRecord");
      tipoDesparasitacion = await tx.parametros.findFirst({
        where: {
          id_parametros: tipoId,
          codigo_grupo: "tipos_desparasitacion",
          estado: 1,
        },
        select: { id_parametros: true, etiqueta: true },
      });
      if (!tipoDesparasitacion)
        throw new BadRequestException("attentions.invalidRecord");
    }
    if (tipo.codigo === "hospitalizacion_ambulatorio") {
      const tipoId = validado.detalle.fid_tipos_hospitalizacion;
      if (typeof tipoId !== "string")
        throw new BadRequestException("attentions.invalidHospitalizationType");
      tipoHospitalizacion = await tx.tipos_hospitalizacion.findFirst({
        where: {
          id_tipos_hospitalizacion: tipoId,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_tipos_hospitalizacion: true, nombre: true },
      });
      if (!tipoHospitalizacion)
        throw new BadRequestException("attentions.invalidHospitalizationType");
      const motivoSalidaId =
        validado.detalle.fid_parametros_motivo_salida_hospitalizacion;
      if (motivoSalidaId !== undefined) {
        if (typeof motivoSalidaId !== "string")
          throw new BadRequestException("attentions.invalidDischargeReason");
        motivoSalidaHospitalizacion = await tx.parametros.findFirst({
          where: {
            id_parametros: motivoSalidaId,
            codigo_grupo: "motivos_salida_hospitalizacion",
            estado: 1,
          },
          select: { id_parametros: true, etiqueta: true },
        });
        if (!motivoSalidaHospitalizacion)
          throw new BadRequestException("attentions.invalidDischargeReason");
      }
    }
    if (tipo.codigo === "cirugia_procedimiento") {
      const procedimientoId = validado.detalle.fid_procedimientos_veterinarios;
      if (typeof procedimientoId !== "string")
        throw new BadRequestException("attentions.invalidProcedure");
      procedimiento = await tx.procedimientos_veterinarios.findFirst({
        where: {
          id_procedimientos_veterinarios: procedimientoId,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_procedimientos_veterinarios: true, nombre: true },
      });
      if (!procedimiento)
        throw new BadRequestException("attentions.invalidProcedure");
    }
    if (tipo.codigo === "laboratorio") {
      const items = validado.detalle.pruebas;
      if (!Array.isArray(items) || items.length === 0)
        throw new BadRequestException("attentions.invalidLaboratoryTests");
      const recibidos = items.map((item) => ({
        fid_pruebas_laboratorio: item.fid_pruebas_laboratorio,
        fid_usuarios_profesional: item.fid_usuarios_profesional,
        cantidad: item.cantidad,
        cantidad_adjuntos: item.cantidad_adjuntos,
      }));
      if (
        recibidos.some(
          (item) =>
            typeof item.fid_pruebas_laboratorio !== "string" ||
            typeof item.fid_usuarios_profesional !== "string" ||
            typeof item.cantidad !== "number" ||
            typeof item.cantidad_adjuntos !== "number",
        )
      )
        throw new BadRequestException("attentions.invalidLaboratoryTests");
      const normalizados = recibidos.map((item) => ({
        fid_pruebas_laboratorio: item.fid_pruebas_laboratorio as string,
        fid_usuarios_profesional: item.fid_usuarios_profesional as string,
        cantidad: item.cantidad as number,
        cantidad_adjuntos: item.cantidad_adjuntos as number,
      }));
      if (
        normalizados.reduce(
          (total, item) => total + item.cantidad_adjuntos,
          0,
        ) !== archivos.length
      )
        throw new BadRequestException("attentions.invalidLaboratoryResults");
      const [pruebas, profesionales] = await Promise.all([
        tx.pruebas_laboratorio.findMany({
          where: {
            id_pruebas_laboratorio: {
              in: normalizados.map((item) => item.fid_pruebas_laboratorio),
            },
            fid_organizaciones: organizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: { id_pruebas_laboratorio: true, nombre: true },
        }),
        tx.usuarios.findMany({
          where: {
            id_usuarios: {
              in: normalizados.map((item) => item.fid_usuarios_profesional),
            },
            fid_organizaciones: organizacion,
            estado: 1,
            estado_cuenta: "activo",
            eliminado_en: null,
          },
          select: { id_usuarios: true },
        }),
      ]);
      const nombres = new Map(
        pruebas.map((prueba) => [prueba.id_pruebas_laboratorio, prueba.nombre]),
      );
      const usuarios = new Set(
        profesionales.map((profesional) => profesional.id_usuarios),
      );
      if (
        normalizados.some(
          (item) =>
            !nombres.has(item.fid_pruebas_laboratorio) ||
            !usuarios.has(item.fid_usuarios_profesional),
        )
      )
        throw new BadRequestException("attentions.invalidLaboratoryTests");
      pruebasLaboratorio = normalizados.map((item) => ({
        ...item,
        nombre: nombres.get(item.fid_pruebas_laboratorio)!,
      }));
    }
    const [fechaProgramada, programadoPara] = await Promise.all([
      this.fechaCivil(tx, validado.fecha_programada),
      this.instanteTenant(tx, validado.programado_local, zona),
    ]);
    const registro = await tx.registros_atencion.create({
      data: {
        id_registros_atencion: registroId,
        fid_organizaciones: organizacion,
        fid_atenciones: atencion,
        fid_tipos_registro_atencion: tipo.id_tipos_registro_atencion,
        fid_motivos_consulta: motivo?.id_motivos_consulta ?? null,
        fid_vacunas: vacuna?.id_vacunas ?? null,
        fid_parametros_tipo_desparasitacion:
          tipoDesparasitacion?.id_parametros ?? null,
        fid_tipos_hospitalizacion:
          tipoHospitalizacion?.id_tipos_hospitalizacion ?? null,
        fid_parametros_motivo_salida_hospitalizacion:
          motivoSalidaHospitalizacion?.id_parametros ?? null,
        fid_procedimientos_veterinarios:
          procedimiento?.id_procedimientos_veterinarios ?? null,
        resumen:
          motivo?.nombre.slice(0, 160) ??
          vacuna?.nombre.slice(0, 160) ??
          tipoHospitalizacion?.nombre.slice(0, 160) ??
          procedimiento?.nombre.slice(0, 160) ??
          (pruebasLaboratorio.length
            ? `${pruebasLaboratorio[0].nombre}${pruebasLaboratorio.length > 1 ? ` +${pruebasLaboratorio.length - 1}` : ""}`.slice(
                0,
                160,
              )
            : null) ??
          (tipo.codigo === "desparasitacion" &&
          typeof validado.detalle.producto === "string"
            ? validado.detalle.producto.slice(0, 160)
            : null) ??
          validado.resumen,
        detalle: validado.detalle,
        fecha_programada: fechaProgramada,
        programado_para: programadoPara,
        created_by: usuario,
        updated_by: usuario,
      },
      select: { id_registros_atencion: true },
    });
    if (tipo.codigo === "laboratorio") {
      let offset = 0;
      for (const [orden, item] of pruebasLaboratorio.entries()) {
        const pruebaRegistro = await tx.pruebas_registro_laboratorio.create({
          data: {
            fid_organizaciones: organizacion,
            fid_registros_atencion: registroId,
            fid_pruebas_laboratorio: item.fid_pruebas_laboratorio,
            fid_usuarios_profesional: item.fid_usuarios_profesional,
            cantidad: item.cantidad,
            orden,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_pruebas_registro_laboratorio: true },
        });
        const resultados = archivos.slice(
          offset,
          offset + item.cantidad_adjuntos,
        );
        offset += item.cantidad_adjuntos;
        if (resultados.length)
          await tx.adjuntos_registro_atencion.createMany({
            data: resultados.map((archivo) => ({
              ...archivo,
              fid_organizaciones: organizacion,
              fid_registros_atencion: registroId,
              fid_pruebas_registro_laboratorio:
                pruebaRegistro.id_pruebas_registro_laboratorio,
              created_by: usuario,
              updated_by: usuario,
            })),
          });
      }
    } else if (archivos.length)
      await tx.adjuntos_registro_atencion.createMany({
        data: archivos.map((archivo) => ({
          ...archivo,
          fid_organizaciones: organizacion,
          fid_registros_atencion: registroId,
          created_by: usuario,
          updated_by: usuario,
        })),
      });
    return { registro, tipo };
  }

  private seleccionAtencion() {
    return {
      id_atenciones: true,
      fecha_atencion: true,
      llegada_en: true,
      inicio_en: true,
      finalizada_en: true,
      estado_atencion: {
        select: {
          id_parametros: true,
          codigo: true,
          etiqueta: true,
          color_hex: true,
          traducciones: { select: { codigo_idioma: true, etiqueta: true } },
        },
      },
      propietario: {
        select: {
          id_propietarios: true,
          nombre_completo: true,
          numero_documento: true,
          celular: true,
          direccion: true,
          organizacion: { select: { nombre: true } },
          tipo_documento: { select: { etiqueta: true } },
          admin_level_3: {
            select: {
              nombre: true,
              admin_level_1: { select: { nombre: true } },
              admin_level_2: { select: { nombre: true } },
            },
          },
        },
      },
      mascota: {
        select: {
          id_mascotas: true,
          nombre: true,
          foto_url: true,
          animal_servicio: true,
          apoyo_emocional: true,
          codigo_chip: true,
          fecha_nacimiento: true,
          peso: true,
          alimento: true,
          especie: { select: { nombre_es: true, nombre_en: true } },
          raza: { select: { nombre_es: true, nombre_en: true } },
          subespecie: { select: { nombre_es: true, nombre_en: true } },
          genero: { select: { etiqueta: true } },
          color: { select: { etiqueta: true, color_hex: true } },
          unidad_peso: { select: { etiqueta: true } },
          talla: { select: { etiqueta: true } },
          estado_reproductivo: { select: { etiqueta: true } },
          temperamento: { select: { etiqueta: true, color_hex: true } },
        },
      },
      responsable: {
        select: {
          usuario: true,
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
      registros: {
        where: { estado: 1, eliminado_en: null },
        orderBy: [
          { created_at: "desc" as const },
          { id_registros_atencion: "desc" as const },
        ],
        select: {
          id_registros_atencion: true,
          resumen: true,
          detalle: true,
          fecha_programada: true,
          programado_para: true,
          created_at: true,
          motivo_consulta: { select: { nombre: true } },
          vacuna: { select: { nombre: true } },
          tipo_desparasitacion: {
            select: {
              etiqueta: true,
              traducciones: {
                select: { codigo_idioma: true, etiqueta: true },
              },
            },
          },
          tipo_hospitalizacion: { select: { nombre: true } },
          motivo_salida_hospitalizacion: {
            select: {
              etiqueta: true,
              traducciones: {
                select: { codigo_idioma: true, etiqueta: true },
              },
            },
          },
          procedimiento_veterinario: { select: { nombre: true } },
          pruebas_laboratorio: {
            where: { estado: 1 },
            orderBy: [
              { orden: "asc" },
              { id_pruebas_registro_laboratorio: "asc" },
            ],
            select: {
              cantidad: true,
              prueba: {
                select: {
                  nombre: true,
                  categoria: { select: { nombre: true } },
                },
              },
              profesional: {
                select: {
                  usuario: true,
                  persona: {
                    select: {
                      nombres: true,
                      apellido_paterno: true,
                      apellido_materno: true,
                    },
                  },
                },
              },
              adjuntos: {
                where: { estado: 1, eliminado_en: null },
                orderBy: [
                  { created_at: "asc" },
                  { id_adjuntos_registro_atencion: "asc" },
                ],
                select: {
                  id_adjuntos_registro_atencion: true,
                  nombre_original: true,
                  tipo_mime: true,
                  bytes: true,
                },
              },
            },
          },
          adjuntos: {
            where: { estado: 1, eliminado_en: null },
            orderBy: [
              { created_at: "asc" },
              { id_adjuntos_registro_atencion: "asc" },
            ],
            select: {
              id_adjuntos_registro_atencion: true,
              nombre_original: true,
              tipo_mime: true,
              bytes: true,
            },
          },
          tipo: {
            select: {
              id_tipos_registro_atencion: true,
              codigo: true,
              nombre_es: true,
              nombre_en: true,
              descripcion_es: true,
              descripcion_en: true,
              icono: true,
              color_hex: true,
            },
          },
        },
      },
    } satisfies Prisma.atencionesSelect;
  }

  private presentar<
    T extends {
      estado_atencion: {
        etiqueta: string;
        traducciones: Array<{ codigo_idioma: string; etiqueta: string }>;
      };
      mascota: {
        foto_url: string | null;
        peso: Prisma.Decimal | null;
        especie: { nombre_es: string; nombre_en: string };
        raza: { nombre_es: string; nombre_en: string } | null;
        subespecie: { nombre_es: string; nombre_en: string } | null;
      };
      registros: Array<{
        detalle: Prisma.JsonValue;
        motivo_consulta: { nombre: string } | null;
        vacuna: { nombre: string } | null;
        tipo_desparasitacion: {
          etiqueta: string;
          traducciones: Array<{ codigo_idioma: string; etiqueta: string }>;
        } | null;
        tipo_hospitalizacion: { nombre: string } | null;
        motivo_salida_hospitalizacion: {
          etiqueta: string;
          traducciones: Array<{ codigo_idioma: string; etiqueta: string }>;
        } | null;
        procedimiento_veterinario: { nombre: string } | null;
        pruebas_laboratorio: Array<{
          cantidad: number;
          prueba: { nombre: string; categoria: { nombre: string } };
          profesional: {
            usuario: string;
            persona: {
              nombres: string;
              apellido_paterno: string;
              apellido_materno: string | null;
            };
          };
          adjuntos: Array<{
            id_adjuntos_registro_atencion: string;
            nombre_original: string;
            tipo_mime: string;
            bytes: number;
          }>;
        }>;
        tipo: {
          nombre_es: string;
          nombre_en: string;
          descripcion_es: string;
          descripcion_en: string;
        };
      }>;
    },
  >(item: T, idioma: string) {
    const clasificacion = item.mascota.raza ?? item.mascota.subespecie;
    return {
      ...item,
      estado_atencion: {
        ...item.estado_atencion,
        etiqueta:
          item.estado_atencion.traducciones.find(
            (t) => t.codigo_idioma === idioma,
          )?.etiqueta ?? item.estado_atencion.etiqueta,
        traducciones: undefined,
      },
      mascota: {
        ...item.mascota,
        peso: item.mascota.peso?.toString() ?? null,
        foto_version: item.mascota.foto_url?.split("/").at(-1) ?? null,
        foto_url: undefined,
        especie: {
          ...item.mascota.especie,
          nombre:
            idioma === "en"
              ? item.mascota.especie.nombre_en
              : item.mascota.especie.nombre_es,
        },
        clasificacion: clasificacion
          ? idioma === "en"
            ? clasificacion.nombre_en
            : clasificacion.nombre_es
          : null,
      },
      registros: item.registros.map((registro) => {
        const detalle = { ...(registro.detalle as Record<string, unknown>) };
        if (registro.motivo_consulta)
          detalle.fid_motivos_consulta = registro.motivo_consulta.nombre;
        if (registro.vacuna) detalle.fid_vacunas = registro.vacuna.nombre;
        if (registro.tipo_desparasitacion)
          detalle.fid_parametros_tipo_desparasitacion =
            registro.tipo_desparasitacion.traducciones.find(
              (traduccion) => traduccion.codigo_idioma === idioma,
            )?.etiqueta ?? registro.tipo_desparasitacion.etiqueta;
        if (registro.tipo_hospitalizacion)
          detalle.fid_tipos_hospitalizacion =
            registro.tipo_hospitalizacion.nombre;
        if (registro.motivo_salida_hospitalizacion)
          detalle.fid_parametros_motivo_salida_hospitalizacion =
            registro.motivo_salida_hospitalizacion.traducciones.find(
              (traduccion) => traduccion.codigo_idioma === idioma,
            )?.etiqueta ?? registro.motivo_salida_hospitalizacion.etiqueta;
        if (registro.procedimiento_veterinario)
          detalle.fid_procedimientos_veterinarios =
            registro.procedimiento_veterinario.nombre;
        if (registro.pruebas_laboratorio.length)
          detalle.pruebas = registro.pruebas_laboratorio.map((item) => ({
            prueba: item.prueba.nombre,
            categoria: item.prueba.categoria.nombre,
            profesional:
              [
                item.profesional.persona.nombres,
                item.profesional.persona.apellido_paterno,
                item.profesional.persona.apellido_materno,
              ]
                .filter(Boolean)
                .join(" ") || item.profesional.usuario,
            cantidad: item.cantidad,
            resultados: item.adjuntos.map((adjunto) => adjunto.nombre_original),
          }));
        return {
          ...registro,
          detalle,
          motivo_consulta: undefined,
          vacuna: undefined,
          tipo_desparasitacion: undefined,
          tipo_hospitalizacion: undefined,
          motivo_salida_hospitalizacion: undefined,
          procedimiento_veterinario: undefined,
          pruebas_laboratorio: undefined,
          tipo: {
            ...registro.tipo,
            nombre:
              idioma === "en"
                ? registro.tipo.nombre_en
                : registro.tipo.nombre_es,
            descripcion:
              idioma === "en"
                ? registro.tipo.descripcion_en
                : registro.tipo.descripcion_es,
          },
        };
      }),
    };
  }

  async listarHoy(
    organizacion: string,
    filtros: FiltrosAtenciones,
    idioma: string,
  ) {
    const { fecha, fecha_anterior } = await this.tiempoTenant(
      this.prisma,
      organizacion,
    );
    const q = filtros.q?.trim();
    const items = await this.prisma.atenciones.findMany({
      where: {
        fid_organizaciones: organizacion,
        fecha_atencion: filtros.incluir_ayer
          ? { gte: fecha_anterior, lte: fecha }
          : fecha,
        estado: 1,
        eliminado_en: null,
        ...(q
          ? {
              OR: [
                { mascota: { nombre: { contains: q, mode: "insensitive" } } },
                {
                  propietario: {
                    nombre_completo: { contains: q, mode: "insensitive" },
                  },
                },
                {
                  propietario: {
                    numero_documento: { contains: q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        { fecha_atencion: "desc" },
        { llegada_en: "desc" },
        { id_atenciones: "desc" },
      ],
      select: this.seleccionAtencion(),
    });
    return {
      fecha,
      fecha_desde: filtros.incluir_ayer ? fecha_anterior : fecha,
      atenciones: items.map((item) => this.presentar(item, idioma)),
      total: items.length,
    };
  }

  async opciones(organizacion: string, idioma: string) {
    const tiempo = await this.tiempoTenant(this.prisma, organizacion);
    const [
      tipos,
      estados,
      pruebasLaboratorio,
      profesionales,
      tiposHospitalizacion,
      procedimientos,
      motivosSalidaHospitalizacion,
      motivos,
      vacunas,
      tiposDesparasitacion,
    ] = await Promise.all([
      this.prisma.tipos_registro_atencion.findMany({
        where: { estado: 1 },
        orderBy: [{ orden: "asc" }, { nombre_es: "asc" }],
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "estados_atencion", estado: 1 },
        orderBy: { orden: "asc" },
        select: {
          id_parametros: true,
          codigo: true,
          etiqueta: true,
          color_hex: true,
          traducciones: {
            where: { codigo_idioma: idioma },
            select: { etiqueta: true },
            take: 1,
          },
        },
      }),
      this.prisma.pruebas_laboratorio.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
        select: {
          id_pruebas_laboratorio: true,
          fid_categorias_pruebas_laboratorio: true,
          nombre: true,
          categoria: { select: { nombre: true } },
        },
      }),
      this.prisma.usuarios.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          estado_cuenta: "activo",
          eliminado_en: null,
        },
        orderBy: [{ persona: { apellido_paterno: "asc" } }, { usuario: "asc" }],
        select: {
          id_usuarios: true,
          usuario: true,
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      }),
      this.prisma.tipos_hospitalizacion.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ nombre: "asc" }, { id_tipos_hospitalizacion: "asc" }],
        select: { id_tipos_hospitalizacion: true, nombre: true },
      }),
      this.prisma.procedimientos_veterinarios.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ nombre: "asc" }, { id_procedimientos_veterinarios: "asc" }],
        select: {
          id_procedimientos_veterinarios: true,
          nombre: true,
          descripcion_guia: true,
        },
      }),
      this.prisma.parametros.findMany({
        where: {
          codigo_grupo: "motivos_salida_hospitalizacion",
          estado: 1,
        },
        orderBy: [{ orden: "asc" }, { codigo: "asc" }],
        select: {
          id_parametros: true,
          etiqueta: true,
          traducciones: {
            where: { codigo_idioma: idioma },
            select: { etiqueta: true },
            take: 1,
          },
        },
      }),
      this.prisma.motivos_consulta.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ nombre: "asc" }, { id_motivos_consulta: "asc" }],
        select: { id_motivos_consulta: true, nombre: true },
      }),
      this.prisma.vacunas.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ nombre: "asc" }, { id_vacunas: "asc" }],
        select: { id_vacunas: true, nombre: true },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "tipos_desparasitacion", estado: 1 },
        orderBy: [{ orden: "asc" }, { codigo: "asc" }],
        select: {
          id_parametros: true,
          etiqueta: true,
          traducciones: {
            where: { codigo_idioma: idioma },
            select: { etiqueta: true },
            take: 1,
          },
        },
      }),
    ]);
    const maximoGlobalAdjuntos = this.config.getOrThrow<number>(
      "ATTENTION_ATTACHMENT_MAX_FILES",
    );
    return {
      tipos: tipos.map((tipo) => ({
        id_tipos_registro_atencion: tipo.id_tipos_registro_atencion,
        codigo: tipo.codigo,
        nombre_es: tipo.nombre_es,
        nombre_en: tipo.nombre_en,
        descripcion_es: tipo.descripcion_es,
        descripcion_en: tipo.descripcion_en,
        nombre: idioma === "en" ? tipo.nombre_en : tipo.nombre_es,
        descripcion:
          idioma === "en" ? tipo.descripcion_en : tipo.descripcion_es,
        icono: tipo.icono,
        color_hex: tipo.color_hex,
        acepta_adjuntos: tipo.acepta_adjuntos,
        max_adjuntos: tipo.acepta_adjuntos
          ? Math.min(
              tipo.max_adjuntos ?? maximoGlobalAdjuntos,
              maximoGlobalAdjuntos,
            )
          : 0,
        campos: (camposRegistroAtencion(tipo.campos) ?? []).map((campo) => ({
          clave: campo.clave,
          etiqueta_es: campo.etiqueta_es,
          etiqueta_en: campo.etiqueta_en,
          etiqueta: idioma === "en" ? campo.etiqueta_en : campo.etiqueta_es,
          tipo: campo.tipo,
          requerido: campo.requerido,
          min: campo.min,
          max: campo.max,
          max_items: campo.max_items,
          valor_predeterminado:
            campo.clave === "fecha" && campo.tipo === "date"
              ? tiempo.fecha.toISOString().slice(0, 10)
              : undefined,
          precarga: campo.precarga,
          ayuda_precarga_es: campo.ayuda_precarga_es,
          ayuda_precarga_en: campo.ayuda_precarga_en,
          campos: campo.campos?.map((subcampo) => ({
            clave: subcampo.clave,
            etiqueta_es: subcampo.etiqueta_es,
            etiqueta_en: subcampo.etiqueta_en,
            etiqueta:
              idioma === "en" ? subcampo.etiqueta_en : subcampo.etiqueta_es,
            tipo: subcampo.tipo,
            requerido: subcampo.requerido,
            min: subcampo.min,
            max: subcampo.max,
            opciones:
              subcampo.fuente === "pruebas_laboratorio"
                ? pruebasLaboratorio.map((prueba) => ({
                    id: prueba.id_pruebas_laboratorio,
                    etiqueta: prueba.nombre,
                    grupo: prueba.categoria.nombre,
                    grupo_id: prueba.fid_categorias_pruebas_laboratorio,
                  }))
                : subcampo.fuente === "usuarios_organizacion"
                  ? profesionales.map((profesional) => ({
                      id: profesional.id_usuarios,
                      etiqueta:
                        [
                          profesional.persona.nombres,
                          profesional.persona.apellido_paterno,
                          profesional.persona.apellido_materno,
                        ]
                          .filter(Boolean)
                          .join(" ") || profesional.usuario,
                    }))
                  : undefined,
          })),
          opciones:
            campo.fuente === "motivos_consulta"
              ? motivos.map((motivo) => ({
                  id: motivo.id_motivos_consulta,
                  etiqueta: motivo.nombre,
                }))
              : campo.fuente === "vacunas"
                ? vacunas.map((vacuna) => ({
                    id: vacuna.id_vacunas,
                    etiqueta: vacuna.nombre,
                  }))
                : campo.fuente === "tipos_desparasitacion"
                  ? tiposDesparasitacion.map((tipoDesparasitacion) => ({
                      id: tipoDesparasitacion.id_parametros,
                      etiqueta:
                        tipoDesparasitacion.traducciones[0]?.etiqueta ??
                        tipoDesparasitacion.etiqueta,
                    }))
                  : campo.fuente === "tipos_hospitalizacion"
                    ? tiposHospitalizacion.map((tipoHospitalizacion) => ({
                        id: tipoHospitalizacion.id_tipos_hospitalizacion,
                        etiqueta: tipoHospitalizacion.nombre,
                      }))
                    : campo.fuente === "procedimientos_veterinarios"
                      ? procedimientos.map((procedimiento) => ({
                          id: procedimiento.id_procedimientos_veterinarios,
                          etiqueta: procedimiento.nombre,
                          descripcion: procedimiento.descripcion_guia,
                        }))
                      : campo.fuente === "motivos_salida_hospitalizacion"
                        ? motivosSalidaHospitalizacion.map((motivoSalida) => ({
                            id: motivoSalida.id_parametros,
                            etiqueta:
                              motivoSalida.traducciones[0]?.etiqueta ??
                              motivoSalida.etiqueta,
                          }))
                        : undefined,
        })),
      })),
      estados: estados.map(({ traducciones, ...estado }) => ({
        ...estado,
        etiqueta: traducciones[0]?.etiqueta ?? estado.etiqueta,
      })),
      fecha_actual: tiempo.fecha.toISOString().slice(0, 10),
      adjunto_max_bytes: this.config.getOrThrow<number>(
        "ATTENTION_ATTACHMENT_MAX_BYTES",
      ),
      adjunto_max_archivos: this.config.getOrThrow<number>(
        "ATTENTION_ATTACHMENT_MAX_FILES",
      ),
    };
  }

  async buscarPropietarios(organizacion: string, q: string) {
    return {
      propietarios: await this.prisma.propietarios.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
          OR: [
            { nombre_completo: { contains: q, mode: "insensitive" } },
            { numero_documento: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { nombre_completo: "asc" },
        take: 20,
        select: {
          id_propietarios: true,
          nombre_completo: true,
          numero_documento: true,
          celular: true,
          correo: true,
          sin_correo: true,
          telefono_fijo: true,
          direccion: true,
          contacto_alternativo_nombre: true,
          contacto_alternativo_telefono: true,
          organizacion: { select: { id_organizaciones: true, nombre: true } },
          tipo_documento: { select: { id_parametros: true, etiqueta: true } },
          admin_level_3: {
            select: {
              nombre: true,
              admin_level_1: { select: { nombre: true } },
              admin_level_2: { select: { nombre: true } },
            },
          },
        },
      }),
    };
  }

  async mascotasPropietario(
    organizacion: string,
    propietario: string,
    idioma: string,
  ) {
    const existe = await this.prisma.propietarios.findFirst({
      where: {
        id_propietarios: propietario,
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: { id_propietarios: true },
    });
    if (!existe) throw new NotFoundException("attentions.ownerNotFound");
    const mascotas = await this.prisma.mascotas.findMany({
      where: {
        fid_organizaciones: organizacion,
        fid_propietarios: propietario,
        estado: 1,
        eliminado_en: null,
      },
      orderBy: [{ created_at: "desc" }, { id_mascotas: "desc" }],
      select: {
        id_mascotas: true,
        nombre: true,
        foto_url: true,
        codigo_chip: true,
        peso: true,
        especie: { select: { nombre_es: true, nombre_en: true } },
        raza: { select: { nombre_es: true, nombre_en: true } },
        subespecie: { select: { nombre_es: true, nombre_en: true } },
        genero: { select: { etiqueta: true } },
        unidad_peso: { select: { etiqueta: true } },
        temperamento: { select: { etiqueta: true, color_hex: true } },
      },
    });
    return {
      mascotas: mascotas.map(
        ({ foto_url, raza, subespecie, peso, ...mascota }) => ({
          ...mascota,
          peso: peso?.toString() ?? null,
          foto_version: foto_url?.split("/").at(-1) ?? null,
          especie: {
            ...mascota.especie,
            nombre:
              idioma === "en"
                ? mascota.especie.nombre_en
                : mascota.especie.nombre_es,
          },
          clasificacion:
            raza || subespecie
              ? idioma === "en"
                ? (raza ?? subespecie)!.nombre_en
                : (raza ?? subespecie)!.nombre_es
              : null,
        }),
      ),
    };
  }

  async ultimoRegistroMascota(
    organizacion: string,
    mascota: string,
    tipoId: string,
  ) {
    const [mascotaActiva, tipo] = await Promise.all([
      this.prisma.mascotas.findFirst({
        where: {
          id_mascotas: mascota,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_mascotas: true },
      }),
      this.prisma.tipos_registro_atencion.findFirst({
        where: { id_tipos_registro_atencion: tipoId, estado: 1 },
        select: { campos: true },
      }),
    ]);
    if (!mascotaActiva) throw new NotFoundException("attentions.invalidPet");
    const campo = camposRegistroAtencion(tipo?.campos)?.find(
      (item) => item.precarga === "fecha_ultimo_registro",
    );
    if (!tipo || !campo)
      throw new BadRequestException("attentions.invalidRecordType");
    const [ultimo] = await this.prisma.$queryRaw<Array<{ fecha: Date }>>`
      SELECT (registro.created_at AT TIME ZONE zona.nombre_iana)::date AS fecha
      FROM personas.registros_atencion registro
      JOIN personas.atenciones atencion
        ON atencion.id_atenciones = registro.fid_atenciones
       AND atencion.fid_organizaciones = registro.fid_organizaciones
      JOIN nucleo.perfil_organizacion perfil
        ON perfil.fid_organizaciones = registro.fid_organizaciones
       AND perfil.estado = 1
      JOIN system.zonas_horarias zona
        ON zona.id_zonas_horarias = perfil.fid_zonas_horarias
       AND zona.estado = 1
      WHERE registro.fid_organizaciones = ${organizacion}::uuid
        AND atencion.fid_mascotas = ${mascota}::uuid
        AND registro.fid_tipos_registro_atencion = ${tipoId}::uuid
        AND registro.estado = 1
        AND registro.eliminado_en IS NULL
        AND atencion.estado = 1
        AND atencion.eliminado_en IS NULL
      ORDER BY registro.created_at DESC, registro.id_registros_atencion DESC
      LIMIT 1
    `;
    return {
      campo: campo.clave,
      valor: ultimo?.fecha.toISOString().slice(0, 10) ?? null,
    };
  }

  async obtener(id: string, organizacion: string, idioma: string) {
    const item = await this.prisma.atenciones.findFirst({
      where: {
        id_atenciones: id,
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: this.seleccionAtencion(),
    });
    if (!item) throw new NotFoundException("attentions.notFound");
    return { atencion: this.presentar(item, idioma) };
  }

  async crear(
    organizacion: string,
    datos: DatosCrearAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const idAtencion = randomUUID();
    const idRegistro = randomUUID();
    const guardados = await this.guardarAdjuntos(
      organizacion,
      idAtencion,
      idRegistro,
      datos.registro.fid_tipos_registro_atencion,
      adjuntos,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const mascota = await tx.mascotas.findFirst({
          where: {
            id_mascotas: datos.fid_mascotas,
            fid_organizaciones: organizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: { id_mascotas: true, fid_propietarios: true, nombre: true },
        });
        if (!mascota) throw new BadRequestException("attentions.invalidPet");
        const estado = await tx.parametros.findFirst({
          where: {
            codigo_grupo: "estados_atencion",
            codigo: "en_espera",
            estado: 1,
          },
          select: { id_parametros: true },
        });
        if (!estado)
          throw new BadRequestException("attentions.invalidConfiguration");
        const tiempo = await this.tiempoTenant(tx, organizacion);
        const atencion = await tx.atenciones.create({
          data: {
            id_atenciones: idAtencion,
            fid_organizaciones: organizacion,
            fid_mascotas: mascota.id_mascotas,
            fid_propietarios: mascota.fid_propietarios,
            fid_usuarios_responsable: usuario,
            fid_parametros_estado: estado.id_parametros,
            fecha_atencion: tiempo.fecha,
            created_by: usuario,
            updated_by: usuario,
          },
          select: { id_atenciones: true },
        });
        const { registro, tipo } = await this.crearRegistro(
          tx,
          atencion.id_atenciones,
          organizacion,
          datos.registro,
          usuario,
          tiempo.zona,
          idRegistro,
          guardados,
        );
        await this.auditoria.registrar(
          {
            accion: "atenciones.creada",
            entidad: "atenciones",
            id_entidad: atencion.id_atenciones,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { mascota: mascota.id_mascotas },
          },
          tx,
        );
        await this.auditoria.registrar(
          {
            accion: "atenciones.registro_agregado",
            entidad: "registros_atencion",
            id_entidad: registro.id_registros_atencion,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: {
              atencion: atencion.id_atenciones,
              tipo: tipo.id_tipos_registro_atencion,
            },
          },
          tx,
        );
        return atencion;
      });
    } catch (error) {
      await this.adjuntos.eliminarTodos(
        guardados.map((item) => item.clave_objeto),
      );
      throw error;
    }
  }

  async agregarRegistro(
    id: string,
    organizacion: string,
    datos: DatosRegistroAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const idRegistro = randomUUID();
    const guardados = await this.guardarAdjuntos(
      organizacion,
      id,
      idRegistro,
      datos.fid_tipos_registro_atencion,
      adjuntos,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.validarContexto(tx, organizacion, usuario);
        const atencion = await this.atencionExistente(tx, id, organizacion);
        if (
          ["finalizada", "cancelada"].includes(atencion.estado_atencion.codigo)
        )
          throw new BadRequestException("attentions.closed");
        const tiempo = await this.tiempoTenant(tx, organizacion);
        const { registro, tipo } = await this.crearRegistro(
          tx,
          id,
          organizacion,
          datos,
          usuario,
          tiempo.zona,
          idRegistro,
          guardados,
        );
        await this.auditoria.registrar(
          {
            accion: "atenciones.registro_agregado",
            entidad: "registros_atencion",
            id_entidad: registro.id_registros_atencion,
            fid_organizaciones: organizacion,
            fid_usuarios: usuario,
            peticion: contexto,
            metadatos: { atencion: id, tipo: tipo.id_tipos_registro_atencion },
          },
          tx,
        );
        return registro;
      });
    } catch (error) {
      await this.adjuntos.eliminarTodos(
        guardados.map((item) => item.clave_objeto),
      );
      throw error;
    }
  }

  async cambiarEstado(
    id: string,
    organizacion: string,
    estadoId: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario);
      const atencion = await this.atencionExistente(tx, id, organizacion);
      if (["finalizada", "cancelada"].includes(atencion.estado_atencion.codigo))
        throw new BadRequestException("attentions.closed");
      const estado = await tx.parametros.findFirst({
        where: {
          id_parametros: estadoId,
          codigo_grupo: "estados_atencion",
          estado: 1,
        },
        select: { id_parametros: true, codigo: true },
      });
      if (!estado) throw new BadRequestException("attentions.invalidStatus");
      if (estado.id_parametros === atencion.fid_parametros_estado)
        throw new BadRequestException("attentions.noChanges");
      await tx.$executeRaw`
        UPDATE personas.atenciones
        SET fid_parametros_estado = ${estado.id_parametros}::uuid,
            inicio_en = CASE WHEN ${estado.codigo} = 'en_atencion' THEN COALESCE(inicio_en, CURRENT_TIMESTAMP) ELSE inicio_en END,
            finalizada_en = CASE WHEN ${estado.codigo} IN ('finalizada', 'cancelada') THEN CURRENT_TIMESTAMP ELSE finalizada_en END,
            updated_by = ${usuario}
        WHERE id_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid
      `;
      await this.auditoria.registrar(
        {
          accion: "atenciones.estado_cambiado",
          entidad: "atenciones",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
          metadatos: {
            anterior: atencion.fid_parametros_estado,
            siguiente: estado.id_parametros,
          },
        },
        tx,
      );
    });
  }

  async eliminarRegistro(
    id: string,
    registroId: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const claves = await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario);
      const atencion = await this.atencionExistente(tx, id, organizacion);
      if (["finalizada", "cancelada"].includes(atencion.estado_atencion.codigo))
        throw new BadRequestException("attentions.closed");
      await tx.$queryRaw`SELECT id_registros_atencion FROM personas.registros_atencion WHERE id_registros_atencion = ${registroId}::uuid AND fid_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
      const registro = await tx.registros_atencion.findFirst({
        where: {
          id_registros_atencion: registroId,
          fid_atenciones: id,
          fid_organizaciones: organizacion,
          eliminado_en: null,
        },
        select: {
          id_registros_atencion: true,
          adjuntos: {
            where: { eliminado_en: null },
            select: { clave_objeto: true },
          },
        },
      });
      if (!registro) throw new NotFoundException("attentions.recordNotFound");
      await tx.$executeRaw`UPDATE personas.adjuntos_registro_atencion SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE fid_registros_atencion = ${registroId}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await tx.$executeRaw`UPDATE personas.registros_atencion SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_registros_atencion = ${registroId}::uuid AND fid_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid`;
      await this.auditoria.registrar(
        {
          accion: "atenciones.registro_eliminado",
          entidad: "registros_atencion",
          id_entidad: registroId,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
          metadatos: { atencion: id },
        },
        tx,
      );
      return registro.adjuntos.map((adjunto) => adjunto.clave_objeto);
    });
    await this.adjuntos.eliminarTodos(claves);
  }

  async obtenerAdjunto(
    id: string,
    registro: string,
    adjunto: string,
    organizacion: string,
  ) {
    const encontrado = await this.prisma.adjuntos_registro_atencion.findFirst({
      where: {
        id_adjuntos_registro_atencion: adjunto,
        fid_registros_atencion: registro,
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
        registro: {
          fid_atenciones: id,
          estado: 1,
          eliminado_en: null,
          atencion: { estado: 1, eliminado_en: null },
        },
      },
      select: {
        clave_objeto: true,
        nombre_original: true,
        tipo_mime: true,
        checksum_sha256: true,
      },
    });
    if (!encontrado)
      throw new NotFoundException("attentions.attachmentNotFound");
    return {
      contenido: await this.adjuntos.leer(
        encontrado.clave_objeto,
        encontrado.tipo_mime,
      ),
      nombre: encontrado.nombre_original,
      tipoMime: encontrado.tipo_mime,
      checksum: encontrado.checksum_sha256,
    };
  }

  async eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    const claves = await this.prisma.$transaction(async (tx) => {
      await this.validarContexto(tx, organizacion, usuario);
      const atencion = await this.atencionExistente(tx, id, organizacion);
      if (["finalizada", "cancelada"].includes(atencion.estado_atencion.codigo))
        throw new BadRequestException("attentions.closed");
      const adjuntos = await tx.adjuntos_registro_atencion.findMany({
        where: {
          fid_organizaciones: organizacion,
          eliminado_en: null,
          registro: { fid_atenciones: id },
        },
        select: { clave_objeto: true },
      });
      await tx.$executeRaw`UPDATE personas.adjuntos_registro_atencion SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL AND fid_registros_atencion IN (SELECT id_registros_atencion FROM personas.registros_atencion WHERE fid_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid)`;
      await tx.$executeRaw`UPDATE personas.registros_atencion SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE fid_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid AND eliminado_en IS NULL`;
      await tx.$executeRaw`UPDATE personas.atenciones SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${usuario}::uuid, updated_by = ${usuario} WHERE id_atenciones = ${id}::uuid AND fid_organizaciones = ${organizacion}::uuid`;
      await this.auditoria.registrar(
        {
          accion: "atenciones.eliminada",
          entidad: "atenciones",
          id_entidad: id,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
        },
        tx,
      );
      return adjuntos.map((adjunto) => adjunto.clave_objeto);
    });
    await this.adjuntos.eliminarTodos(claves);
  }
}
