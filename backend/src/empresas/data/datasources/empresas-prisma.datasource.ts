import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "../../../../prisma/generated/client/client";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { PrismaService } from "../../../comun/prisma.service";
import { parseDateInTimezone } from "../../../comun/fechas";
import { SERVICIOS_PELUQUERIA_SPA_INICIALES } from "../../../comun/catalogos/servicios-peluqueria-spa-iniciales";
import type {
  DatosCrearEmpresa,
  ListadoEmpresas,
} from "../../domain/entities/empresa";
import type {
  ResumenEmpresa,
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../../domain/entities/seccion-empresa";
import type {
  ComandoCompartirMedioEmpresa,
  ComandoEliminarMedioEmpresa,
  ComandoGuardarMedioEmpresa,
  ConsultaMedioEmpresa,
  MarcaEmpresa,
  MedioEmpresa,
} from "../../domain/entities/marca-empresa";
import { versionMedioEmpresa } from "../../domain/entities/medio-empresa";
import { AlmacenMediosEmpresaR2 } from "./company-media-r2.datasource";
import { PROCEDIMIENTOS_VETERINARIOS_INICIALES } from "../../../comun/catalogos/procedimientos-veterinarios-iniciales";
import { ESTUDIOS_DIAGNOSTICOS_INICIALES } from "../../../comun/catalogos/estudios-diagnosticos-iniciales";

type ClientePrisma = Prisma.TransactionClient;

type CampoMarca =
  | "escudo_url"
  | "escudo_oscuro_url"
  | "imagotipo_url"
  | "imagotipo_oscuro_url"
  | "login_escudo_url"
  | "login_escudo_oscuro_url";

const campoMarca = (tipo: ComandoGuardarMedioEmpresa["tipo"]): CampoMarca => {
  if (tipo === "escudo") return "escudo_url";
  if (tipo === "escudo_oscuro") return "escudo_oscuro_url";
  if (tipo === "imagotipo") return "imagotipo_url";
  if (tipo === "imagotipo_oscuro") return "imagotipo_oscuro_url";
  if (tipo === "login_escudo") return "login_escudo_url";
  if (tipo === "login_escudo_oscuro") return "login_escudo_oscuro_url";
  throw new BadRequestException("companies.media.invalidRequest");
};

@Injectable()
export class FuenteDatosEmpresasPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
    private medios: AlmacenMediosEmpresaR2,
    private configuracion: ConfigService,
  ) {}

  private urlPublica(slug: string): string {
    const url = new URL(
      this.configuracion.getOrThrow<string>("FRONTEND_ORIGIN"),
    );
    url.hostname = `${slug}.${this.configuracion.getOrThrow<string>("APP_BASE_DOMAIN")}`;
    return url.origin;
  }

  private async regionalizacionPredeterminada(tx: ClientePrisma) {
    const [idioma, zona, moneda] = await Promise.all([
      tx.parametros.findUnique({ where: { codigo_grupo_codigo: { codigo_grupo: "idiomas", codigo: "es" } }, select: { id_parametros: true } }),
      tx.zonas_horarias.findUnique({ where: { nombre_iana: "America/Lima" }, select: { id_zonas_horarias: true } }),
      tx.parametros.findUnique({ where: { codigo_grupo_codigo: { codigo_grupo: "monedas", codigo: "PEN" } }, select: { id_parametros: true } }),
    ]);
    if (!idioma || !zona || !moneda) throw new BadRequestException("companies.invalidRegionalization");
    return {
      fid_parametros_idioma: idioma.id_parametros,
      fid_zonas_horarias: zona.id_zonas_horarias,
      fid_parametros_moneda: moneda.id_parametros,
    };
  }

  private horariosDesde(
    filas: Array<{
      dia_semana: number;
      cerrado: boolean;
      hora_apertura: string | null;
      hora_cierre: string | null;
    }>,
  ): SeccionesEmpresa["comunicaciones"]["horarios"] {
    return Array.from({ length: 7 }, (_, indice) => {
      const dia = indice + 1;
      const fila = filas.find((horario) => horario.dia_semana === dia);
      return fila
        ? {
            dia_semana: dia,
            cerrado: fila.cerrado,
            hora_apertura: fila.hora_apertura,
            hora_cierre: fila.hora_cierre,
          }
        : {
            dia_semana: dia,
            cerrado: true,
            hora_apertura: null,
            hora_cierre: null,
          };
    });
  }

  private horariosAgendaDesde(
    filas: Array<{ dia_semana: number; turno: number; cerrado: boolean; hora_apertura: string | null; hora_cierre: string | null }>,
  ): SeccionesEmpresa["agenda"]["horarios"] {
    return filas.map((fila) => ({ ...fila, turno: fila.turno ?? 1 }));
  }

  /** Durante la construcción de módulos solo exige una organización de sesión activa. */
  private async validarOrganizacionActiva(
    tx: ClientePrisma | PrismaService,
    idOrganizacion: string,
  ): Promise<void> {
    const organizacion = await tx.organizaciones.findUnique({
      where: { id_organizaciones: idOrganizacion },
      select: { estado: true, eliminado_en: true },
    });
    if (
      !organizacion ||
      organizacion.estado !== 1 ||
      organizacion.eliminado_en
    ) {
      throw new NotFoundException("companies.notFound");
    }
  }

  private async validarEmpresaActual(
    tx: ClientePrisma | PrismaService,
    idOrganizacion: string,
  ): Promise<void> {
    const organizacion = await tx.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (!organizacion) throw new NotFoundException("companies.notFound");
  }

  /** Permite mostrar la marca de una empresa inactiva en el listado global. */
  private async validarEmpresaNoEliminada(
    tx: ClientePrisma | PrismaService,
    idOrganizacion: string,
  ): Promise<void> {
    const organizacion = await tx.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (!organizacion) throw new NotFoundException("companies.notFound");
  }

  private perfilDesde(datos: DatosCrearEmpresa) {
    return {
      razon_social: datos.razon_social,
      ruc_nif: datos.ruc_nif,
      telefono: datos.telefono,
      correo_contacto: datos.correo_contacto,
    };
  }

  async listar(
    idOrganizacionActual: string,
    busqueda?: string,
  ): Promise<ListadoEmpresas> {
    await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    // Incluye inactivas: la pantalla permite reactivarlas.
    const where = {
      eliminado_en: null,
      perfil: { is: { estado: 1 } },
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" as const } },
              { slug: { contains: busqueda, mode: "insensitive" as const } },
              {
                perfil: {
                  razon_social: {
                    contains: busqueda,
                    mode: "insensitive" as const,
                  },
                },
              },
              {
                perfil: {
                  ruc_nif: { contains: busqueda, mode: "insensitive" as const },
                },
              },
              {
                perfil: {
                  correo_contacto: {
                    contains: busqueda,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : {}),
    };
    const filas = await this.prisma.organizaciones.findMany({
      where,
      // La empresa creada más recientemente aparece primero, sin importar su estado.
      orderBy: [{ created_at: "desc" }, { id_organizaciones: "asc" }],
      select: {
        id_organizaciones: true,
        slug: true,
        nombre: true,
        estado: true,
        eliminado_en: true,
        created_at: true,
        suscripcion_inicia_en: true,
        suscripcion_expira_en: true,
        agenda_activa: true,
        duracion_cita_estimada: true,
        especies_atendidas: {
          where: { estado: 1 },
          select: { fid_parametros: true },
        },
        perfil: {
          select: {
            estado: true,
            razon_social: true,
            ruc_nif: true,
            telefono: true,
            correo_contacto: true,
            escudo_url: true,
            escudo_oscuro_url: true,
          },
        },
        plan: {
          select: {
            id_planes: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    });
    const empresas = filas.map(({ perfil, plan, ...empresa }) => {
      const mappedPlan = plan ? {
        id_planes: plan.id_planes,
        codigo: plan.codigo,
        nombre: plan.nombre,
      } : { id_planes: "", codigo: "FULL", nombre: "Plan Completo" };

      if (!perfil || perfil.estado !== 1) return { ...empresa, perfil: null, plan: mappedPlan };
      const {
        estado: _estado,
        escudo_url,
        escudo_oscuro_url,
        ...datosPerfil
      } = perfil;
      return {
        ...empresa,
        perfil: {
          ...datosPerfil,
          escudo_version: versionMedioEmpresa(escudo_url),
          escudo_oscuro_version: versionMedioEmpresa(escudo_oscuro_url),
        },
        plan: mappedPlan,
      };
    });
    return {
      empresas,
      total: empresas.length,
      id_organizacion_actual: idOrganizacionActual,
    };
  }

  async obtener(
    idOrganizacion: string,
    idOrganizacionActual: string,
  ): Promise<ListadoEmpresas["empresas"][number]> {
    await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    const empresa = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: {
        id_organizaciones: true,
        slug: true,
        nombre: true,
        estado: true,
        eliminado_en: true,
        created_at: true,
        especies_atendidas: { where: { estado: 1 }, select: { fid_parametros: true } },
        perfil: {
          select: {
            estado: true,
            razon_social: true,
            ruc_nif: true,
            direccion: true,
            sin_sede_fisica: true,
            telefono: true,
            telefono_secundario: true,
            correo_contacto: true,
            correo_contacto_secundario: true,
            sitio_web: true,
            facebook_url: true,
            instagram_url: true,
            tiktok_url: true,
            youtube_url: true,
            linkedin_url: true,
            x_url: true,
            fid_parametros_idioma: true,
            fid_zonas_horarias: true,
            latitud: true,
            longitud: true,
            fid_parametros_moneda: true,
            fid_parametros_tipo_persona_fiscal: true,
            fid_parametros_tipo_documento_fiscal: true,
            fiscal_numero_documento: true,
            fiscal_razon_social: true,
            fiscal_afecto_igv: true,
            fid_parametros_responsabilidad_fiscal: true,
            fiscal_telefono: true,
            fiscal_correo: true,
            fiscal_direccion: true,
            logo_url: true,
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            color_primario: true,
            ui_cabecera_claro: true,
            ui_cabecera_oscuro: true,
            ui_esquinero_claro: true,
            ui_esquinero_oscuro: true,
            ui_menu_claro: true,
            ui_menu_oscuro: true,
            ui_mostrar_escudo_menu: true,
            ui_mostrar_nombre_empresa_menu: true,
            ui_ocultar_esquinero_expandido: true,
            ui_esquinero_fondo_activo: true,
            ui_cabecera_ocultar_borde: true,
            ui_menu_ocultar_borde: true,
            ui_tamano_escudo_menu: true,
            correo_remitente_nombre: true,
            correo_remitente_direccion: true,
            cabecera_impresion: true,
            login_usar_filtro_color: true,
            login_mostrar_etiqueta: true,
            login_mostrar_destacados: true,
            login_mostrar_comunidad: true,
            login_mostrar_recuperar: true,
            login_mostrar_recordar: true,
            login_mostrar_google: true,
            login_mostrar_sso: true,
            login_mostrar_solicitud: true,
            login_mostrar_pie: true,
            login_etiqueta: true,
            login_titulo: true,
            login_subtitulo: true,
            login_destacado_1: true,
            login_destacado_2: true,
            login_destacado_3: true,
            login_destacado_icono_1: true,
            login_destacado_icono_2: true,
            login_destacado_icono_3: true,
            login_texto_comunidad: true,
            login_bienvenida_titulo: true,
            login_bienvenida_subtitulo: true,
          },
        },
        plan: {
          select: {
            id_planes: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    });
    if (!empresa) throw new NotFoundException("companies.notFound");
    
    const { perfil, plan, ...resto } = empresa;
    const mappedPlan = plan ? {
      id_planes: plan.id_planes,
      codigo: plan.codigo,
      nombre: plan.nombre,
    } : { id_planes: "", codigo: "FULL", nombre: "Plan Completo" };

    const mappedPerfil = perfil && perfil.estado === 1 ? {
      ...perfil,
      escudo_version: versionMedioEmpresa(perfil.escudo_url),
      escudo_oscuro_version: versionMedioEmpresa(perfil.escudo_oscuro_url),
    } : null;

    return {
      ...resto,
      perfil: mappedPerfil,
      plan: mappedPlan,
    } as any;
  }

  async obtenerResumen(
    idOrganizacion: string,
    idOrganizacionActual: string,
    propia = false,
  ): Promise<ResumenEmpresa> {
    if (propia)
      await this.validarEmpresaActual(this.prisma, idOrganizacionActual);
    else
      await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    const empresa = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: {
        id_organizaciones: true,
        nombre: true,
        slug: true,
        estado: true,
        perfil: {
          select: {
            estado: true,
            escudo_url: true,
            escudo_oscuro_url: true,
          },
        },
      },
    });
    if (!empresa) throw new NotFoundException("companies.notFound");
    return {
      id_organizaciones: empresa.id_organizaciones,
      nombre: empresa.nombre,
      slug: empresa.slug,
      estado: empresa.estado,
      escudo_version:
        empresa.perfil?.estado === 1
          ? versionMedioEmpresa(empresa.perfil.escudo_url)
          : null,
      escudo_oscuro_version:
        empresa.perfil?.estado === 1
          ? versionMedioEmpresa(empresa.perfil.escudo_oscuro_url)
          : null,
      url_publica: this.urlPublica(empresa.slug),
    };
  }

  async obtenerSeccion<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    idOrganizacionActual: string,
    propia = false,
  ): Promise<SeccionesEmpresa[S]> {
    if (propia)
      await this.validarEmpresaActual(this.prisma, idOrganizacionActual);
    else
      await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    const empresa = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: {
        nombre: true,
        slug: true,
        suscripcion_inicia_en: true,
        suscripcion_expira_en: true,
        agenda_activa: true,
        duracion_cita_estimada: true,
        plan: {
          select: {
            nombre: true,
          },
        },
        especies_atendidas: {
          where: { estado: 1 },
          select: { fid_parametros: true },
        },
        perfil: {
          select: {
            estado: true,
            razon_social: true,
            ruc_nif: true,
            direccion: true,
            sin_sede_fisica: true,
            referencia: true,
            fid_admin_level_0: true,
            admin_level_3: { select: { codigo: true } },
            telefono: true,
            telefono_secundario: true,
            correo_contacto: true,
            correo_contacto_secundario: true,
            sitio_web: true,
            facebook_url: true,
            instagram_url: true,
            tiktok_url: true,
            youtube_url: true,
            linkedin_url: true,
            x_url: true,
            logo_url: true,
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            color_primario: true,
            ui_cabecera_claro: true,
            ui_cabecera_oscuro: true,
            ui_esquinero_claro: true,
            ui_esquinero_oscuro: true,
            ui_menu_claro: true,
            ui_menu_oscuro: true,
            ui_mostrar_escudo_menu: true,
            ui_mostrar_nombre_empresa_menu: true,
            ui_ocultar_esquinero_expandido: true,
            ui_esquinero_fondo_activo: true,
            ui_cabecera_ocultar_borde: true,
            ui_menu_ocultar_borde: true,
            ui_tamano_escudo_menu: true,
            soporte_correo: true,
            soporte_telefono: true,
            soporte_whatsapp: true,
            fid_parametros_idioma: true,
            fid_zonas_horarias: true,
            latitud: true,
            longitud: true,
            fid_parametros_moneda: true,
            fid_parametros_tipo_persona_fiscal: true,
            fid_parametros_tipo_documento_fiscal: true,
            fiscal_numero_documento: true,
            fiscal_razon_social: true,
            fiscal_afecto_igv: true,
            fid_parametros_responsabilidad_fiscal: true,
            fiscal_telefono: true,
            fiscal_correo: true,
            fiscal_direccion: true,
            login_usar_filtro_color: true,
            login_mostrar_etiqueta: true,
            login_mostrar_destacados: true,
            login_mostrar_comunidad: true,
            login_mostrar_recuperar: true,
            login_mostrar_recordar: true,
            login_mostrar_google: true,
            login_mostrar_sso: true,
            login_mostrar_solicitud: true,
            login_mostrar_pie: true,
            login_etiqueta: true,
            login_titulo: true,
            login_subtitulo: true,
            login_destacado_1: true,
            login_destacado_2: true,
            login_destacado_3: true,
            login_destacado_icono_1: true,
            login_destacado_icono_2: true,
            login_destacado_icono_3: true,
            login_texto_comunidad: true,
            login_bienvenida_titulo: true,
            login_bienvenida_subtitulo: true,
            login_pie: true,
          },
        },
        horarios_atencion: {
          where: { estado: 1 },
          orderBy: { dia_semana: "asc" },
          select: {
            dia_semana: true,
            turno: true,
            cerrado: true,
            hora_apertura: true,
            hora_cierre: true,
          },
        },
      },
    });
    if (!empresa) throw new NotFoundException("companies.notFound");
    // Un perfil eliminado lógicamente no debe volver a exponer sus datos.
    const perfil = empresa.perfil?.estado === 1 ? empresa.perfil : null;
    const secciones: SeccionesEmpresa = {
      general: {
        nombre: empresa.nombre,
        slug: empresa.slug,
        razon_social: perfil?.razon_social ?? "",
        ruc_nif: perfil?.ruc_nif ?? "",
        plan_nombre: (empresa as any).plan?.nombre ?? "Plan Completo",
        suscripcion_inicia_en: (empresa as any).suscripcion_inicia_en ?? null,
        suscripcion_expira_en: (empresa as any).suscripcion_expira_en ?? null,
      },
      contacto: {
        sin_sede_fisica: perfil?.sin_sede_fisica ?? false,
        direccion: perfil?.direccion ?? "",
        referencia: perfil?.referencia ?? "",
        fid_admin_level_0: perfil?.fid_admin_level_0 ?? "",
        codigo_admin_level_3: perfil?.admin_level_3?.codigo ?? "",
        telefono: perfil?.telefono ?? "",
        telefono_secundario: perfil?.telefono_secundario ?? "",
        correo_contacto: perfil?.correo_contacto ?? "",
        correo_contacto_secundario: perfil?.correo_contacto_secundario ?? "",
        latitud: perfil?.latitud?.toString() ?? "",
        longitud: perfil?.longitud?.toString() ?? "",
      },
      digital: {
        sitio_web: perfil?.sitio_web ?? "",
        facebook_url: perfil?.facebook_url ?? "",
        instagram_url: perfil?.instagram_url ?? "",
        tiktok_url: perfil?.tiktok_url ?? "",
        youtube_url: perfil?.youtube_url ?? "",
        linkedin_url: perfil?.linkedin_url ?? "",
        x_url: perfil?.x_url ?? "",
      },
      identidad: {
        color_primario: perfil?.color_primario ?? "",
        ui_cabecera_claro: perfil?.ui_cabecera_claro ?? "",
        ui_cabecera_oscuro: perfil?.ui_cabecera_oscuro ?? "",
        ui_esquinero_claro: perfil?.ui_esquinero_claro ?? "",
        ui_esquinero_oscuro: perfil?.ui_esquinero_oscuro ?? "",
        ui_menu_claro: perfil?.ui_menu_claro ?? "",
        ui_menu_oscuro: perfil?.ui_menu_oscuro ?? "",
        ui_mostrar_escudo_menu: perfil?.ui_mostrar_escudo_menu ?? false,
        ui_mostrar_nombre_empresa_menu:
          perfil?.ui_mostrar_nombre_empresa_menu ?? true,
        ui_ocultar_esquinero_expandido:
          perfil?.ui_ocultar_esquinero_expandido ?? false,
        ui_esquinero_fondo_activo: perfil?.ui_esquinero_fondo_activo ?? false,
        ui_cabecera_ocultar_borde: perfil?.ui_cabecera_ocultar_borde ?? false,
        ui_menu_ocultar_borde: perfil?.ui_menu_ocultar_borde ?? false,
        ui_tamano_escudo_menu: perfil?.ui_tamano_escudo_menu ?? 100,
      },
      comunicaciones: {
        soporte_correo: perfil?.soporte_correo ?? "",
        soporte_telefono: perfil?.soporte_telefono ?? "",
        soporte_whatsapp: perfil?.soporte_whatsapp ?? "",
        horarios: this.horariosDesde(empresa.horarios_atencion),
      },
      region: {
        fid_parametros_idioma: perfil?.fid_parametros_idioma ?? "",
        fid_zonas_horarias: perfil?.fid_zonas_horarias ?? "",
        fid_parametros_moneda: perfil?.fid_parametros_moneda ?? "",
      },
      servicios: {
        fid_parametros_especies: empresa.especies_atendidas.map((fila) => fila.fid_parametros),
      },
      agenda: {
        agenda_activa: empresa.agenda_activa,
        duracion_cita_estimada: empresa.duracion_cita_estimada,
        horarios: this.horariosAgendaDesde(empresa.horarios_atencion),
      },
      fiscal: {
        fid_parametros_tipo_persona_fiscal: perfil?.fid_parametros_tipo_persona_fiscal ?? null,
        fid_parametros_tipo_documento_fiscal: perfil?.fid_parametros_tipo_documento_fiscal ?? null,
        fiscal_numero_documento: perfil?.fiscal_numero_documento ?? "",
        fiscal_razon_social: perfil?.fiscal_razon_social ?? "",
        fiscal_afecto_igv: perfil?.fiscal_afecto_igv ?? false,
        fid_parametros_responsabilidad_fiscal: perfil?.fid_parametros_responsabilidad_fiscal ?? null,
        fiscal_telefono: perfil?.fiscal_telefono ?? "",
        fiscal_correo: perfil?.fiscal_correo ?? "",
        fiscal_direccion: perfil?.fiscal_direccion ?? "",
      },
      login: {
        login_usar_filtro_color: perfil?.login_usar_filtro_color ?? true,
        login_mostrar_etiqueta: perfil?.login_mostrar_etiqueta ?? true,
        login_mostrar_destacados: perfil?.login_mostrar_destacados ?? true,
        login_mostrar_comunidad: perfil?.login_mostrar_comunidad ?? true,
        login_etiqueta: perfil?.login_etiqueta ?? "",
        login_titulo: perfil?.login_titulo ?? "",
        login_subtitulo: perfil?.login_subtitulo ?? "",
        login_destacado_1: perfil?.login_destacado_1 ?? "",
        login_destacado_2: perfil?.login_destacado_2 ?? "",
        login_destacado_3: perfil?.login_destacado_3 ?? "",
        login_destacado_icono_1: perfil?.login_destacado_icono_1 ?? "book",
        login_destacado_icono_2: perfil?.login_destacado_icono_2 ?? "users",
        login_destacado_icono_3: perfil?.login_destacado_icono_3 ?? "award",
        login_texto_comunidad: perfil?.login_texto_comunidad ?? "",
      },
    };
    return secciones[seccion];
  }

  async actualizarSeccion<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    propia = false,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        if (propia) await this.validarEmpresaActual(tx, idOrganizacionActual);
        else await this.validarOrganizacionActiva(tx, idOrganizacionActual);
        await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
        await this.validarEmpresaActual(tx, idOrganizacion);
        if (!propia && idOrganizacion === idOrganizacionActual) {
          throw new BadRequestException("companies.cannotEditSelf");
        }
        const actual = await tx.organizaciones.findFirst({
          where: {
            id_organizaciones: idOrganizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: {
            nombre: true,
            slug: true,
            plan: {
              select: {
                nombre: true,
              },
            },
            especies_atendidas: { where: { estado: 1 }, select: { fid_parametros: true } },
            perfil: {
              select: {
                estado: true,
                razon_social: true,
                ruc_nif: true,
                direccion: true,
                sin_sede_fisica: true,
                referencia: true,
                fid_admin_level_0: true,
                admin_level_3: { select: { codigo: true } },
                telefono: true,
                telefono_secundario: true,
                correo_contacto: true,
                correo_contacto_secundario: true,
                sitio_web: true,
                facebook_url: true,
                instagram_url: true,
                tiktok_url: true,
                youtube_url: true,
                linkedin_url: true,
                x_url: true,
                logo_url: true,
                escudo_url: true,
                escudo_oscuro_url: true,
                imagotipo_url: true,
                color_primario: true,
                ui_cabecera_claro: true,
                ui_cabecera_oscuro: true,
                ui_esquinero_claro: true,
                ui_esquinero_oscuro: true,
                ui_menu_claro: true,
                ui_menu_oscuro: true,
                ui_mostrar_escudo_menu: true,
                ui_mostrar_nombre_empresa_menu: true,
                ui_ocultar_esquinero_expandido: true,
                ui_esquinero_fondo_activo: true,
                ui_cabecera_ocultar_borde: true,
                ui_menu_ocultar_borde: true,
                ui_tamano_escudo_menu: true,
                soporte_correo: true,
                soporte_telefono: true,
                soporte_whatsapp: true,
                fid_parametros_idioma: true,
                fid_zonas_horarias: true,
                fid_parametros_moneda: true,
                fid_parametros_tipo_persona_fiscal: true,
                fid_parametros_tipo_documento_fiscal: true,
                fid_parametros_responsabilidad_fiscal: true,
                fiscal_numero_documento: true,
                fiscal_razon_social: true,
                fiscal_afecto_igv: true,
                fiscal_telefono: true,
                fiscal_correo: true,
                fiscal_direccion: true,
                login_usar_filtro_color: true,
                login_mostrar_etiqueta: true,
                login_mostrar_destacados: true,
                login_mostrar_comunidad: true,
                login_mostrar_recuperar: true,
                login_mostrar_recordar: true,
                login_mostrar_google: true,
                login_mostrar_sso: true,
                login_mostrar_solicitud: true,
                login_mostrar_pie: true,
                login_etiqueta: true,
                login_titulo: true,
                login_subtitulo: true,
                login_destacado_1: true,
                login_destacado_2: true,
                login_destacado_3: true,
                login_destacado_icono_1: true,
                login_destacado_icono_2: true,
                login_destacado_icono_3: true,
                login_texto_comunidad: true,
                login_bienvenida_titulo: true,
                login_bienvenida_subtitulo: true,
                login_pie: true,
              },
            },
            horarios_atencion: {
              where: { estado: 1 },
              orderBy: { dia_semana: "asc" },
              select: {
                dia_semana: true,
                cerrado: true,
                hora_apertura: true,
                hora_cierre: true,
              },
            },
          },
        });
        if (!actual) throw new NotFoundException("companies.notFound");

        if (seccion === "region") {
          const regional = datos as SeccionesEmpresa["region"];
          const [idioma, zona, moneda] = await Promise.all([
            tx.parametros.findFirst({ where: { id_parametros: regional.fid_parametros_idioma, codigo_grupo: "idiomas", estado: 1 }, select: { id_parametros: true } }),
            tx.zonas_horarias.findFirst({ where: { id_zonas_horarias: regional.fid_zonas_horarias, estado: 1 }, select: { id_zonas_horarias: true } }),
            tx.parametros.findFirst({ where: { id_parametros: regional.fid_parametros_moneda, codigo_grupo: "monedas", estado: 1 }, select: { id_parametros: true } }),
          ]);
          if (!idioma || !zona || !moneda) throw new BadRequestException("companies.invalidRegionalization");
        }

        if (seccion === "servicios") {
          const especies = (datos as SeccionesEmpresa["servicios"]).fid_parametros_especies;
          const catalogo = await tx.parametros.findMany({ where: { codigo_grupo: "especies_animales", id_parametros: { in: especies }, estado: 1 }, select: { id_parametros: true } });
          if (catalogo.length !== especies.length) throw new BadRequestException("companies.invalidData");
        }

        if (seccion === "fiscal") {
          const fiscal = datos as SeccionesEmpresa["fiscal"];
          const referencias = [
            [fiscal.fid_parametros_tipo_persona_fiscal, "tipos_persona_fiscal"],
            [fiscal.fid_parametros_tipo_documento_fiscal, "tipos_documento"],
            [fiscal.fid_parametros_responsabilidad_fiscal, "responsabilidades_fiscales"],
          ] as const;
          for (const [id, grupo] of referencias) {
            if (!id) continue;
            const parametro = await tx.parametros.findFirst({ where: { id_parametros: id, codigo_grupo: grupo, estado: 1 }, select: { id_parametros: true } });
            if (!parametro) throw new BadRequestException("companies.invalidData");
          }
        }

        if (seccion === "identidad") {
          const identidad = datos as SeccionesEmpresa["identidad"];
          if (
            identidad.ui_mostrar_escudo_menu &&
            !actual.perfil?.escudo_url &&
            !actual.perfil?.escudo_oscuro_url
          ) {
            throw new BadRequestException(
              "companies.appearance.shieldRequired",
            );
          }
          if (
            identidad.ui_ocultar_esquinero_expandido &&
            (!identidad.ui_mostrar_escudo_menu ||
              (!actual.perfil?.escudo_url && !actual.perfil?.escudo_oscuro_url))
          ) {
            throw new BadRequestException(
              "companies.appearance.cornerHideRequiresShield",
            );
          }
          const colorCompleto = /^#[0-9A-Fa-f]{6}$/;
          if (
            identidad.ui_esquinero_fondo_activo &&
            (!colorCompleto.test(
              identidad.ui_esquinero_claro || identidad.color_primario,
            ) ||
              !colorCompleto.test(
                identidad.ui_esquinero_oscuro || identidad.color_primario,
              ))
          ) {
            throw new BadRequestException(
              "companies.appearance.cornerBackgroundRequiresColor",
            );
          }
        }

        let ubicacion: {
          fid_admin_level_0: string | null;
          fid_admin_level_3: string | null;
        } | null = null;
        if (seccion === "contacto") {
          const contacto = datos as SeccionesEmpresa["contacto"];
          if (contacto.sin_sede_fisica) {
            if (contacto.direccion || contacto.referencia || contacto.latitud || contacto.longitud || contacto.fid_admin_level_0 || contacto.codigo_admin_level_3) throw new BadRequestException("companies.invalidLocation");
            ubicacion = { fid_admin_level_0: null, fid_admin_level_3: null };
          } else {
          const ambosVacios =
            !contacto.fid_admin_level_0 && !contacto.codigo_admin_level_3;
          if (
            !ambosVacios &&
            (!contacto.fid_admin_level_0 || !contacto.codigo_admin_level_3)
          ) {
            throw new BadRequestException("companies.invalidLocation");
          }
          if (ambosVacios) {
            ubicacion = { fid_admin_level_0: null, fid_admin_level_3: null };
          } else {
            const nivel3 = await tx.admin_level_3.findFirst({
              where: {
                codigo: contacto.codigo_admin_level_3,
                estado: 1,
                admin_level_1: {
                  estado: 1,
                  fid_admin_level_0: contacto.fid_admin_level_0,
                  admin_level_0: { estado: 1 },
                },
              },
              select: { id_admin_level_3: true },
            });
            if (!nivel3)
              throw new BadRequestException("companies.invalidLocation");
            ubicacion = {
              fid_admin_level_0: contacto.fid_admin_level_0,
              fid_admin_level_3: nivel3.id_admin_level_3,
            };
          }
          }
        }

        if (seccion === "comunicaciones") {
          const horarios = (datos as SeccionesEmpresa["comunicaciones"])
            .horarios;
          const dias = new Set(horarios.map((horario) => horario.dia_semana));
          const valido =
            horarios.length === 7 &&
            dias.size === 7 &&
            [...dias].every((dia) => dia >= 1 && dia <= 7) &&
            horarios.every((horario) =>
              horario.cerrado
                ? horario.hora_apertura === null && horario.hora_cierre === null
                : Boolean(
                    horario.hora_apertura &&
                    horario.hora_cierre &&
                    horario.hora_apertura < horario.hora_cierre,
                  ),
            );
          if (!valido)
            throw new BadRequestException("companies.invalidSchedule");
        }

        const perfilActual = actual.perfil;
        const camposPerfil = perfilActual
          ? (({ estado: _estado, ...resto }) => resto)(perfilActual)
          : null;
        const previo = await this.obtenerSeccionDesde(
          {
            ...actual,
            perfil:
              perfilActual?.estado === 1 && camposPerfil
                ? {
                    ...camposPerfil,
                    codigo_admin_level_3:
                      typeof camposPerfil.admin_level_3 === "object" &&
                      camposPerfil.admin_level_3
                        ? ((camposPerfil.admin_level_3 as { codigo?: string })
                            .codigo ?? null)
                        : null,
                    admin_level_3: null,
                  }
                : null,
            especies_atendidas: actual.especies_atendidas,
            horarios_atencion: actual.horarios_atencion,
          },
          seccion,
        );
        if (JSON.stringify(previo) === JSON.stringify(datos)) {
          throw new BadRequestException("companies.noChanges");
        }

        if (seccion === "general") {
          const general = datos as SeccionesEmpresa["general"];
          if (propia && general.slug !== actual.slug) {
            throw new BadRequestException("companies.slugManagedBySystem");
          }
          await tx.organizaciones.update({
            where: { id_organizaciones: idOrganizacion },
            data: {
              nombre: general.nombre,
              slug: general.slug,
              updated_by: idUsuarioActual,
            },
          });
          const regionalizacion = await this.regionalizacionPredeterminada(tx);
          await tx.perfil_organizacion.upsert({
            where: { fid_organizaciones: idOrganizacion },
            update: {
              estado: 1,
              razon_social: general.razon_social || null,
              ruc_nif: general.ruc_nif || null,
              updated_by: idUsuarioActual,
            },
            create: {
              fid_organizaciones: idOrganizacion,
              ...regionalizacion,
              estado: 1,
              razon_social: general.razon_social || null,
              ruc_nif: general.ruc_nif || null,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          });
        } else {
          const datosPerfil =
            seccion === "contacto"
              ? {
                  sin_sede_fisica: (datos as SeccionesEmpresa["contacto"]).sin_sede_fisica,
                  direccion: (datos as SeccionesEmpresa["contacto"]).direccion,
                  referencia: (datos as SeccionesEmpresa["contacto"])
                    .referencia,
                  telefono: (datos as SeccionesEmpresa["contacto"]).telefono,
                  telefono_secundario: (datos as SeccionesEmpresa["contacto"])
                    .telefono_secundario,
                  correo_contacto: (datos as SeccionesEmpresa["contacto"])
                    .correo_contacto,
                  correo_contacto_secundario: (
                    datos as SeccionesEmpresa["contacto"]
                  ).correo_contacto_secundario,
                  latitud: (datos as SeccionesEmpresa["contacto"]).latitud || null,
                  longitud: (datos as SeccionesEmpresa["contacto"]).longitud || null,
                  ...ubicacion,
                }
              : seccion === "agenda" || seccion === "servicios"
                ? {}
              : seccion === "comunicaciones"
                ? {
                    soporte_correo: (
                      datos as SeccionesEmpresa["comunicaciones"]
                    ).soporte_correo,
                    soporte_telefono: (
                      datos as SeccionesEmpresa["comunicaciones"]
                    ).soporte_telefono,
                    soporte_whatsapp: (
                      datos as SeccionesEmpresa["comunicaciones"]
                    ).soporte_whatsapp,
                  }
                : datos;
          const perfil = Object.fromEntries(
            Object.entries(datosPerfil).map(([campo, valor]) => [
              campo,
              typeof valor === "string" ? valor || null : valor,
            ]),
          );
          const regionalizacion = await this.regionalizacionPredeterminada(tx);
          await tx.perfil_organizacion.upsert({
            where: { fid_organizaciones: idOrganizacion },
            update: { ...perfil, estado: 1, updated_by: idUsuarioActual },
            create: {
              fid_organizaciones: idOrganizacion,
              ...regionalizacion,
              ...perfil,
              estado: 1,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          });
          if (seccion === "servicios") {
            const especies = (datos as SeccionesEmpresa["servicios"]).fid_parametros_especies;
            await tx.organizaciones_especies_atendidas.updateMany({
              where: { fid_organizaciones: idOrganizacion },
              data: { estado: 0, updated_by: idUsuarioActual },
            });
            for (const fidParametros of especies) {
              await tx.organizaciones_especies_atendidas.upsert({
                where: { fid_organizaciones_fid_parametros: { fid_organizaciones: idOrganizacion, fid_parametros: fidParametros } },
                update: { estado: 1, updated_by: idUsuarioActual },
                create: { fid_organizaciones: idOrganizacion, fid_parametros: fidParametros, estado: 1, created_by: idUsuarioActual, updated_by: idUsuarioActual },
              });
            }
          }
          if (seccion === "agenda") {
            const agenda = datos as SeccionesEmpresa["agenda"];
            const claves = new Set(agenda.horarios.map((h) => `${h.dia_semana}:${h.turno}`));
            if (claves.size !== agenda.horarios.length || agenda.horarios.some((h) => !h.cerrado && (!h.hora_apertura || !h.hora_cierre || h.hora_apertura >= h.hora_cierre))) {
              throw new BadRequestException("companies.invalidSchedule");
            }
            await tx.organizaciones.update({
              where: { id_organizaciones: idOrganizacion },
              data: { agenda_activa: agenda.agenda_activa, duracion_cita_estimada: agenda.duracion_cita_estimada, updated_by: idUsuarioActual },
            });
            await tx.horarios_atencion_organizacion.updateMany({
              where: { fid_organizaciones: idOrganizacion },
              data: { estado: 0, updated_by: idUsuarioActual },
            });
            for (const horario of agenda.horarios) {
              await tx.horarios_atencion_organizacion.upsert({
                where: { fid_organizaciones_dia_semana_turno: { fid_organizaciones: idOrganizacion, dia_semana: horario.dia_semana, turno: horario.turno } },
                update: { cerrado: horario.cerrado, hora_apertura: horario.hora_apertura, hora_cierre: horario.hora_cierre, estado: 1, updated_by: idUsuarioActual },
                create: { fid_organizaciones: idOrganizacion, ...horario, estado: 1, created_by: idUsuarioActual, updated_by: idUsuarioActual },
              });
            }
          }
          if (seccion === "comunicaciones") {
            for (const horario of (datos as SeccionesEmpresa["comunicaciones"])
              .horarios) {
              await tx.horarios_atencion_organizacion.upsert({
                where: {
                  fid_organizaciones_dia_semana_turno: {
                    fid_organizaciones: idOrganizacion,
                    dia_semana: horario.dia_semana,
                    turno: 1,
                  },
                },
                update: {
                  cerrado: horario.cerrado,
                  hora_apertura: horario.hora_apertura,
                  hora_cierre: horario.hora_cierre,
                  estado: 1,
                  updated_by: idUsuarioActual,
                },
                create: {
                  fid_organizaciones: idOrganizacion,
                  ...horario,
                  estado: 1,
                  created_by: idUsuarioActual,
                  updated_by: idUsuarioActual,
                },
              });
            }
          }
        }

        await this.auditoria.registrar(
          {
            accion: `empresas.${seccion}.modificada`,
            entidad: "organizaciones",
            id_entidad: idOrganizacion,
            fid_organizaciones: idOrganizacionActual,
            fid_usuarios: idUsuarioActual,
            peticion: contexto,
            metadatos: { seccion },
          },
          tx,
        );
      });
    } catch (error) {
      throw this.traducirConflictoSlug(error);
    }
  }

  private obtenerSeccionDesde<S extends SeccionEmpresa>(
    actual: {
      nombre: string;
      slug: string;
      plan?: { nombre: string } | null;
      perfil: Record<string, unknown> | null;
      especies_atendidas?: Array<{ fid_parametros: string }>;
      horarios_atencion?: Array<{
        dia_semana: number;
        cerrado: boolean;
        hora_apertura: string | null;
        hora_cierre: string | null;
      }>;
    },
    seccion: S,
  ): SeccionesEmpresa[S] {
    const p = actual.perfil ?? {};
    const texto = (campo: string, valorDefecto = "") =>
      typeof p[campo] === "string" ? p[campo] : valorDefecto;
    const bandera = (campo: string, valorDefecto: boolean) =>
      typeof p[campo] === "boolean" ? p[campo] : valorDefecto;
    const entero = (campo: string, valorDefecto: number) =>
      typeof p[campo] === "number" ? p[campo] : valorDefecto;
    const secciones: SeccionesEmpresa = {
      general: {
        nombre: actual.nombre,
        slug: actual.slug,
        razon_social: texto("razon_social"),
        ruc_nif: texto("ruc_nif"),
        plan_nombre: actual.plan?.nombre ?? "",
      },
      contacto: {
        sin_sede_fisica: bandera("sin_sede_fisica", false),
        direccion: texto("direccion"),
        referencia: texto("referencia"),
        fid_admin_level_0: texto("fid_admin_level_0"),
        codigo_admin_level_3: texto("codigo_admin_level_3"),
        telefono: texto("telefono"),
        telefono_secundario: texto("telefono_secundario"),
        correo_contacto: texto("correo_contacto"),
        correo_contacto_secundario: texto("correo_contacto_secundario"),
        latitud: texto("latitud"),
        longitud: texto("longitud"),
      },
      digital: {
        sitio_web: texto("sitio_web"),
        facebook_url: texto("facebook_url"),
        instagram_url: texto("instagram_url"),
        tiktok_url: texto("tiktok_url"),
        youtube_url: texto("youtube_url"),
        linkedin_url: texto("linkedin_url"),
        x_url: texto("x_url"),
      },
      identidad: {
        color_primario: texto("color_primario"),
        ui_cabecera_claro: texto("ui_cabecera_claro"),
        ui_cabecera_oscuro: texto("ui_cabecera_oscuro"),
        ui_esquinero_claro: texto("ui_esquinero_claro"),
        ui_esquinero_oscuro: texto("ui_esquinero_oscuro"),
        ui_menu_claro: texto("ui_menu_claro"),
        ui_menu_oscuro: texto("ui_menu_oscuro"),
        ui_mostrar_escudo_menu: bandera("ui_mostrar_escudo_menu", false),
        ui_mostrar_nombre_empresa_menu: bandera(
          "ui_mostrar_nombre_empresa_menu",
          true,
        ),
        ui_ocultar_esquinero_expandido: bandera(
          "ui_ocultar_esquinero_expandido",
          false,
        ),
        ui_esquinero_fondo_activo: bandera("ui_esquinero_fondo_activo", false),
        ui_cabecera_ocultar_borde: bandera("ui_cabecera_ocultar_borde", false),
        ui_menu_ocultar_borde: bandera("ui_menu_ocultar_borde", false),
        ui_tamano_escudo_menu: entero("ui_tamano_escudo_menu", 100),
      },
      comunicaciones: {
        soporte_correo: texto("soporte_correo"),
        soporte_telefono: texto("soporte_telefono"),
        soporte_whatsapp: texto("soporte_whatsapp"),
        horarios: this.horariosDesde(actual.horarios_atencion ?? []),
      },
      region: {
        fid_parametros_idioma: texto("fid_parametros_idioma"),
        fid_zonas_horarias: texto("fid_zonas_horarias"),
        fid_parametros_moneda: texto("fid_parametros_moneda"),
      },
      servicios: {
        fid_parametros_especies: (actual.especies_atendidas ?? []).map((fila) => fila.fid_parametros),
      },
      agenda: {
        agenda_activa: bandera("agenda_activa", true),
        duracion_cita_estimada: entero("duracion_cita_estimada", 20),
        horarios: this.horariosAgendaDesde((actual.horarios_atencion ?? []).map((h) => ({ ...h, turno: (h as { turno?: number }).turno ?? 1 }))),
      },
      fiscal: {
        fid_parametros_tipo_persona_fiscal: texto("fid_parametros_tipo_persona_fiscal") || null,
        fid_parametros_tipo_documento_fiscal: texto("fid_parametros_tipo_documento_fiscal") || null,
        fiscal_numero_documento: texto("fiscal_numero_documento"),
        fiscal_razon_social: texto("fiscal_razon_social"),
        fiscal_afecto_igv: bandera("fiscal_afecto_igv", false),
        fid_parametros_responsabilidad_fiscal: texto("fid_parametros_responsabilidad_fiscal") || null,
        fiscal_telefono: texto("fiscal_telefono"),
        fiscal_correo: texto("fiscal_correo"),
        fiscal_direccion: texto("fiscal_direccion"),
      },
      login: {
        login_usar_filtro_color: bandera("login_usar_filtro_color", true),
        login_mostrar_etiqueta: bandera("login_mostrar_etiqueta", true),
        login_mostrar_destacados: bandera("login_mostrar_destacados", true),
        login_mostrar_comunidad: bandera("login_mostrar_comunidad", true),
        login_etiqueta: texto("login_etiqueta"),
        login_titulo: texto("login_titulo"),
        login_subtitulo: texto("login_subtitulo"),
        login_destacado_1: texto("login_destacado_1"),
        login_destacado_2: texto("login_destacado_2"),
        login_destacado_3: texto("login_destacado_3"),
        login_destacado_icono_1: texto("login_destacado_icono_1", "book"),
        login_destacado_icono_2: texto("login_destacado_icono_2", "users"),
        login_destacado_icono_3: texto("login_destacado_icono_3", "award"),
        login_texto_comunidad: texto("login_texto_comunidad"),
      },
    };
    return secciones[seccion];
  }

  async crear(
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarOrganizacionActiva(tx, idOrganizacionActual);
        const regionalizacion = await this.regionalizacionPredeterminada(tx);
        const DEFAULT_PLAN_UUID = "40000000-0000-4000-8000-000000000003"; // Plan inicial / demo por defecto
        const organizacion = await tx.organizaciones.create({
          data: {
            slug: datos.slug,
            nombre: datos.nombre,
            estado: 1,
            fid_planes: DEFAULT_PLAN_UUID,
            suscripcion_inicia_en: null,
            suscripcion_expira_en: null,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
            perfil: {
              create: {
                ...regionalizacion,
                estado: 1,
                razon_social: datos.razon_social,
                ruc_nif: datos.ruc_nif,
                correo_contacto: datos.correo_contacto,
                telefono: datos.telefono,
                created_by: idUsuarioActual,
                updated_by: idUsuarioActual,
              },
            },
          },
          select: { id_organizaciones: true },
        });

        await tx.$executeRaw`
          INSERT INTO nucleo.tipos_hospitalizacion
            (fid_organizaciones, nombre, estado, created_by, updated_by)
          VALUES
            (${organizacion.id_organizaciones}::uuid, 'Hospitalización', 1, ${idUsuarioActual}, ${idUsuarioActual}),
            (${organizacion.id_organizaciones}::uuid, 'Ambulatorio', 1, ${idUsuarioActual}, ${idUsuarioActual})
        `;

        await tx.procedimientos_veterinarios.createMany({
          data: PROCEDIMIENTOS_VETERINARIOS_INICIALES.map((procedimiento) => ({
            ...procedimiento,
            fid_organizaciones: organizacion.id_organizaciones,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          })),
        });

        await tx.$executeRaw`
          INSERT INTO nucleo.pruebas_laboratorio
            (fid_organizaciones, fid_categorias_pruebas_laboratorio, nombre, estado, created_by, updated_by)
          SELECT ${organizacion.id_organizaciones}::uuid, base.fid_categorias_pruebas_laboratorio, base.nombre, 1, ${idUsuarioActual}, ${idUsuarioActual}
          FROM configuracion.catalogo_pruebas_laboratorio_base base
          WHERE base.estado = 1
        `;

        await tx.estudios_diagnosticos.createMany({
          data: ESTUDIOS_DIAGNOSTICOS_INICIALES.map((nombre) => ({
            fid_organizaciones: organizacion.id_organizaciones,
            nombre,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          })),
        });

        await tx.servicios_peluqueria_spa.createMany({
          data: SERVICIOS_PELUQUERIA_SPA_INICIALES.map((nombre) => ({
            fid_organizaciones: organizacion.id_organizaciones,
            nombre,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          })),
        });

        await this.auditoria.registrar(
          {
            accion: "empresas.creada",
            entidad: "organizaciones",
            id_entidad: organizacion.id_organizaciones,
            fid_organizaciones: idOrganizacionActual,
            fid_usuarios: idUsuarioActual,
            peticion: contexto,
            metadatos: {
              nombre: datos.nombre,
              slug: datos.slug,
              estado: 1,
            },
          },
          tx,
        );
      });
    } catch (error) {
      throw this.traducirConflictoSlug(error);
    }
  }

  async actualizar(
    idOrganizacion: string,
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarOrganizacionActiva(tx, idOrganizacionActual);
        // Bloquea la fila para serializar ediciones concurrentes del mismo tenant.
        await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
        const actual = await tx.organizaciones.findFirst({
          where: {
            id_organizaciones: idOrganizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: {
            nombre: true,
            slug: true,
            fid_planes: true,
            suscripcion_inicia_en: true,
            suscripcion_expira_en: true,
            perfil: {
              select: {
                estado: true,
                razon_social: true,
                ruc_nif: true,
                telefono: true,
                correo_contacto: true,
              },
            },
          },
        });
        if (!actual || actual.perfil?.estado !== 1) {
          throw new NotFoundException("companies.notFound");
        }

        const perfil = this.perfilDesde(datos);
        const cambiaOrg =
          actual.nombre !== datos.nombre ||
          actual.slug !== datos.slug;
        const cambiaPerfil = Object.entries(perfil).some(
          ([campo, valor]) =>
            (actual.perfil?.[campo as keyof typeof actual.perfil] ?? null) !==
            valor,
        );
        if (!cambiaOrg && !cambiaPerfil) {
          throw new BadRequestException("companies.noChanges");
        }

        await tx.organizaciones.update({
          where: { id_organizaciones: idOrganizacion },
          data: {
            nombre: datos.nombre,
            slug: datos.slug,
            updated_by: idUsuarioActual,
          },
        });
        await tx.$executeRaw`UPDATE nucleo.organizaciones
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id_organizaciones = ${idOrganizacion}::uuid`;
        // upsert: contempla organizaciones antiguas sin fila de perfil.
        const regionalizacion = await this.regionalizacionPredeterminada(tx);
        await tx.perfil_organizacion.upsert({
          where: { fid_organizaciones: idOrganizacion },
          update: { ...perfil, estado: 1, updated_by: idUsuarioActual },
          create: {
            fid_organizaciones: idOrganizacion,
            ...regionalizacion,
            ...perfil,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          },
        });
        await tx.$executeRaw`UPDATE nucleo.perfil_organizacion
          SET updated_at = CURRENT_TIMESTAMP
          WHERE fid_organizaciones = ${idOrganizacion}::uuid`;
        await this.auditoria.registrar(
          {
            accion: "empresas.modificada",
            entidad: "organizaciones",
            id_entidad: idOrganizacion,
            fid_organizaciones: idOrganizacionActual,
            fid_usuarios: idUsuarioActual,
            peticion: contexto,
            metadatos: { nombre: datos.nombre, slug: datos.slug },
          },
          tx,
        );
      });
    } catch (error) {
      throw this.traducirConflictoSlug(error);
    }
  }

  async cambiarEstado(
    idOrganizacion: string,
    activo: boolean,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarOrganizacionActiva(tx, idOrganizacionActual);
        const empresa = await tx.organizaciones.findFirst({
          where: { id_organizaciones: idOrganizacion, eliminado_en: null },
          select: {
            nombre: true,
            slug: true,
            perfil: { select: { estado: true } },
          },
        });
        if (!empresa || empresa.perfil?.estado !== 1) {
          throw new NotFoundException("companies.notFound");
        }

        const estadoAnterior = activo ? 0 : 1;
        const estadoNuevo = activo ? 1 : 0;
        // El filtro por estado hace idempotente la operación ante clics concurrentes.
        const cambio = await tx.organizaciones.updateMany({
          where: {
            id_organizaciones: idOrganizacion,
            estado: estadoAnterior,
            eliminado_en: null,
          },
          data: { estado: estadoNuevo, updated_by: idUsuarioActual },
        });
        if (cambio.count !== 1)
          throw new NotFoundException("companies.notFound");
        await tx.$executeRaw`UPDATE nucleo.organizaciones
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id_organizaciones = ${idOrganizacion}::uuid`;

        await this.auditoria.registrar(
          {
            accion: activo ? "empresas.activada" : "empresas.desactivada",
            entidad: "organizaciones",
            id_entidad: idOrganizacion,
            fid_organizaciones: idOrganizacionActual,
            fid_usuarios: idUsuarioActual,
            peticion: contexto,
            metadatos: {
              nombre: empresa.nombre,
              slug: empresa.slug,
              estado_anterior: estadoAnterior,
              estado_nuevo: estadoNuevo,
            },
          },
          tx,
        );
      });
    } catch (error) {
      throw this.traducirConflictoSlug(error);
    }
  }

  async eliminar(
    idOrganizacion: string,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarOrganizacionActiva(tx, idOrganizacionActual);
      const eliminadas = await tx.$queryRaw<
        Array<{ nombre: string; slug: string }>
      >`UPDATE nucleo.organizaciones AS o
        SET estado = 0,
            eliminado_en = CURRENT_TIMESTAMP,
            eliminado_por = ${idUsuarioActual},
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ${idUsuarioActual}
        WHERE o.id_organizaciones = ${idOrganizacion}::uuid
          AND o.estado = 1
          AND o.eliminado_en IS NULL
          AND EXISTS (
            SELECT 1
            FROM nucleo.perfil_organizacion p
            WHERE p.fid_organizaciones = o.id_organizaciones
              AND p.estado = 1
          )
        RETURNING o.nombre, o.slug`;
      const empresa = eliminadas[0];
      if (!empresa) throw new NotFoundException("companies.notFound");
      await this.auditoria.registrar(
        {
          accion: "empresas.eliminada",
          entidad: "organizaciones",
          id_entidad: idOrganizacion,
          fid_organizaciones: idOrganizacionActual,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: { nombre: empresa.nombre, slug: empresa.slug },
        },
        tx,
      );
    });
  }

  async renovar(
    idOrganizacion: string,
    datos: {
      fid_planes: string;
      fecha_inicio: Date;
      fecha_fin: Date;
      monto?: number;
      metodo_pago?: string;
    },
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarOrganizacionActiva(tx, idOrganizacionActual);

      await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;

      const actual = await tx.organizaciones.findFirst({
        where: {
          id_organizaciones: idOrganizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: {
          fid_planes: true,
          nombre: true,
          slug: true,
        },
      });

      if (!actual) {
        throw new NotFoundException("companies.notFound");
      }

      if (actual.fid_planes !== datos.fid_planes) {
        await tx.organizaciones_modulos.deleteMany({
          where: { fid_organizaciones: idOrganizacion },
        });

        const nuevosModulos = await tx.planes_modulos.findMany({
          where: { fid_planes: datos.fid_planes, estado: 1 },
          select: { fid_modulos: true },
        });

        if (nuevosModulos.length > 0) {
          await tx.organizaciones_modulos.createMany({
            data: nuevosModulos.map((pm) => ({
              fid_organizaciones: idOrganizacion,
              fid_modulos: pm.fid_modulos,
              habilitado: true,
              estado: 1,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            })),
          });
        }
      }

      await tx.organizaciones.update({
        where: { id_organizaciones: idOrganizacion },
        data: {
          fid_planes: datos.fid_planes,
          suscripcion_inicia_en: datos.fecha_inicio,
          suscripcion_expira_en: datos.fecha_fin,
          updated_by: idUsuarioActual,
        },
      });

      await tx.$executeRaw`UPDATE nucleo.organizaciones
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id_organizaciones = ${idOrganizacion}::uuid`;

      await tx.renovaciones.create({
        data: {
          fid_organizaciones: idOrganizacion,
          fid_planes: datos.fid_planes,
          fecha_inicio: datos.fecha_inicio,
          fecha_fin: datos.fecha_fin,
          monto: datos.monto,
          metodo_pago: datos.metodo_pago,
          created_by: idUsuarioActual,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "empresas.suscripcion_renovada",
          entidad: "organizaciones",
          id_entidad: idOrganizacion,
          fid_organizaciones: idOrganizacionActual,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: {
            nombre: actual.nombre,
            slug: actual.slug,
            fid_planes: datos.fid_planes,
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_fin,
            monto: datos.monto,
            metodo_pago: datos.metodo_pago,
          },
        },
        tx,
      );
    });
  }

  async listarRenovaciones(
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    q?: string,
    limit?: number,
    idOrganizacionFiltrar?: string,
  ): Promise<any[]> {
    await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);

    const where: any = {};

    if (idOrganizacionFiltrar) {
      where.fid_organizaciones = idOrganizacionFiltrar;
    }

    if (q) {
      const cleanQ = q.trim();
      where.OR = [
        {
          organizacion: {
            nombre: {
              contains: cleanQ,
              mode: 'insensitive',
            },
          },
        },
        {
          plan: {
            nombre: {
              contains: cleanQ,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const rows = await this.prisma.renovaciones.findMany({
      where,
      take: limit || 20,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        organizacion: {
          select: {
            nombre: true,
            slug: true,
            perfil: {
              select: {
                estado: true,
                escudo_url: true,
                escudo_oscuro_url: true,
              },
            },
          },
        },
        plan: {
          select: {
            nombre: true,
            codigo: true,
          },
        },
      },
    });

    return rows.map((r) => {
      const perfil = r.organizacion.perfil;
      const tienePerfilActivo = perfil && perfil.estado === 1;
      return {
        id_renovaciones: r.id_renovaciones,
        fid_organizaciones: r.fid_organizaciones,
        fid_planes: r.fid_planes,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        monto: r.monto ? Number(r.monto) : null,
        metodo_pago: r.metodo_pago,
        created_at: r.created_at,
        created_by: r.created_by,
        nombre_empresa: r.organizacion.nombre,
        slug_empresa: r.organizacion.slug,
        nombre_plan: r.plan.nombre,
        codigo_plan: r.plan.codigo,
        escudo_version: tienePerfilActivo ? versionMedioEmpresa(perfil.escudo_url) : null,
        escudo_oscuro_version: tienePerfilActivo ? versionMedioEmpresa(perfil.escudo_oscuro_url) : null,
      };
    });
  }

  private async marcaDesde(
    idOrganizacion: string,
    cliente: ClientePrisma | PrismaService = this.prisma,
  ): Promise<MarcaEmpresa> {
    const empresa = await cliente.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: {
        perfil: {
          select: {
            estado: true,
            escudo_url: true,
            escudo_oscuro_url: true,
            escudo_misma_imagen: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            imagotipo_misma_imagen: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
            login_escudo_misma_imagen: true,
          },
        },
        imagenes_login: {
          where: { estado: 1 },
          orderBy: [{ orden: "asc" }, { created_at: "asc" }],
          select: {
            id_imagenes_login_organizacion: true,
            clave_objeto: true,
            orden: true,
            texto_alternativo: true,
          },
        },
      },
    });
    if (!empresa) throw new NotFoundException("companies.notFound");
    const perfil = empresa.perfil?.estado === 1 ? empresa.perfil : null;
    return {
      escudo_version: versionMedioEmpresa(perfil?.escudo_url ?? null),
      escudo_oscuro_version: versionMedioEmpresa(
        perfil?.escudo_oscuro_url ?? null,
      ),
      escudo_misma_imagen: perfil?.escudo_misma_imagen ?? true,
      imagotipo_version: versionMedioEmpresa(perfil?.imagotipo_url ?? null),
      imagotipo_oscuro_version: versionMedioEmpresa(
        perfil?.imagotipo_oscuro_url ?? null,
      ),
      imagotipo_misma_imagen: perfil?.imagotipo_misma_imagen ?? true,
      login_escudo_version: versionMedioEmpresa(perfil?.login_escudo_url ?? null),
      login_escudo_oscuro_version: versionMedioEmpresa(
        perfil?.login_escudo_oscuro_url ?? null,
      ),
      login_escudo_misma_imagen: perfil?.login_escudo_misma_imagen ?? true,
      portadas: empresa.imagenes_login.map((imagen) => ({
        id: imagen.id_imagenes_login_organizacion,
        version: versionMedioEmpresa(imagen.clave_objeto)!,
        orden: imagen.orden,
        texto_alternativo: imagen.texto_alternativo ?? "",
      })),
    };
  }

  async obtenerMarca(
    idOrganizacion: string,
    idOrganizacionActual: string,
    propia = false,
  ): Promise<MarcaEmpresa> {
    if (propia)
      await this.validarEmpresaActual(this.prisma, idOrganizacionActual);
    else
      await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    return this.marcaDesde(idOrganizacion);
  }

  private async eliminarMarcaSinReferencia(
    idOrganizacion: string,
    candidatas: Iterable<string | null>,
  ): Promise<void> {
    const perfil = await this.prisma.perfil_organizacion.findUnique({
      where: { fid_organizaciones: idOrganizacion },
      select: {
        escudo_url: true,
        escudo_oscuro_url: true,
        imagotipo_url: true,
        imagotipo_oscuro_url: true,
        login_escudo_url: true,
        login_escudo_oscuro_url: true,
      },
    });
    const vigentes = new Set([
      perfil?.escudo_url,
      perfil?.escudo_oscuro_url,
      perfil?.imagotipo_url,
      perfil?.imagotipo_oscuro_url,
      perfil?.login_escudo_url,
      perfil?.login_escudo_oscuro_url,
    ]);
    for (const clave of new Set(candidatas)) {
      if (clave && !vigentes.has(clave))
        await this.medios.eliminarSeguro(clave);
    }
  }

  async guardarMedio(
    idOrganizacion: string,
    comando: ComandoGuardarMedioEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    propia = false,
  ): Promise<MarcaEmpresa> {
    if (propia)
      await this.validarEmpresaActual(this.prisma, idOrganizacionActual);
    else
      await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    if (!propia && idOrganizacion === idOrganizacionActual) {
      throw new BadRequestException("companies.cannotEditSelf");
    }
    const existe = await this.prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (!existe) throw new NotFoundException("companies.notFound");

    const nuevo = await this.medios.guardar(
      idOrganizacion,
      comando.tipo,
      comando.archivo,
    );
    const anteriores = new Set<string | null>();
    try {
      await this.prisma.$transaction(async (tx) => {
        if (propia) await this.validarEmpresaActual(tx, idOrganizacionActual);
        else await this.validarOrganizacionActiva(tx, idOrganizacionActual);
        await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
        await this.validarEmpresaActual(tx, idOrganizacion);
        if (comando.tipo === "portada") {
          const activas = await tx.imagenes_login_organizacion.count({
            where: { fid_organizaciones: idOrganizacion, estado: 1 },
          });
          if (activas >= 4)
            throw new BadRequestException("companies.media.coverLimit");
          const ultima = await tx.imagenes_login_organizacion.aggregate({
            where: { fid_organizaciones: idOrganizacion },
            _max: { orden: true },
          });
          await tx.imagenes_login_organizacion.create({
            data: {
              fid_organizaciones: idOrganizacion,
              clave_objeto: nuevo.clave,
              orden: (ultima._max.orden ?? 0) + 1,
              texto_alternativo: comando.texto_alternativo?.trim() || null,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          });
        } else {
          const perfil = await tx.perfil_organizacion.findUnique({
            where: { fid_organizaciones: idOrganizacion },
            select: {
              escudo_url: true,
              escudo_oscuro_url: true,
              escudo_misma_imagen: true,
              imagotipo_url: true,
              imagotipo_oscuro_url: true,
              imagotipo_misma_imagen: true,
              login_escudo_url: true,
              login_escudo_oscuro_url: true,
              login_escudo_misma_imagen: true,
            },
          });
          const campo = campoMarca(comando.tipo);
          const esEscudo = comando.tipo.startsWith("escudo");
          const esLoginEscudo = comando.tipo.startsWith("login_escudo");
          const esOscura = comando.tipo.endsWith("_oscuro");
          const mismaImagen = esEscudo
            ? (perfil?.escudo_misma_imagen ?? true)
            : esLoginEscudo
              ? (perfil?.login_escudo_misma_imagen ?? true)
              : (perfil?.imagotipo_misma_imagen ?? true);
          if (esOscura && mismaImagen) {
            throw new BadRequestException("companies.media.sharedVariant");
          }
          anteriores.add(perfil?.[campo] ?? null);
          const datos: Record<string, string | number> = {
            [campo]: nuevo.clave,
            estado: 1,
            updated_by: idUsuarioActual,
          };
          if (!esOscura && mismaImagen) {
            const campoOscuro = esEscudo
              ? "escudo_oscuro_url"
              : esLoginEscudo
                ? "login_escudo_oscuro_url"
                : "imagotipo_oscuro_url";
            anteriores.add(perfil?.[campoOscuro] ?? null);
            datos[campoOscuro] = nuevo.clave;
          }
          const regionalizacion = await this.regionalizacionPredeterminada(tx);
          await tx.perfil_organizacion.upsert({
            where: { fid_organizaciones: idOrganizacion },
            update: datos,
            create: {
              fid_organizaciones: idOrganizacion,
              ...regionalizacion,
              ...datos,
              created_by: idUsuarioActual,
            },
          });
        }
        await this.auditoria.registrar(
          {
            accion: `empresas.medio.${comando.tipo}.actualizado`,
            entidad: "organizaciones",
            id_entidad: idOrganizacion,
            fid_organizaciones: idOrganizacionActual,
            fid_usuarios: idUsuarioActual,
            peticion: contexto,
            metadatos: { tipo: comando.tipo, bytes: nuevo.bytes },
          },
          tx,
        );
      });
    } catch (error) {
      await this.medios.eliminarSeguro(nuevo.clave);
      throw error;
    }
    await this.eliminarMarcaSinReferencia(idOrganizacion, anteriores);
    return this.obtenerMarca(idOrganizacion, idOrganizacionActual);
  }

  async eliminarMedio(
    idOrganizacion: string,
    comando: ComandoEliminarMedioEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    propia = false,
  ): Promise<MarcaEmpresa> {
    const claves = new Set<string | null>();
    await this.prisma.$transaction(async (tx) => {
      if (propia) await this.validarEmpresaActual(tx, idOrganizacionActual);
      else await this.validarOrganizacionActiva(tx, idOrganizacionActual);
      if (!propia && idOrganizacion === idOrganizacionActual) {
        throw new BadRequestException("companies.cannotEditSelf");
      }
      await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
      await this.validarEmpresaActual(tx, idOrganizacion);
      if (comando.tipo === "portada") {
        if (!comando.id_portada)
          throw new BadRequestException("companies.media.invalidRequest");
        const portada = await tx.imagenes_login_organizacion.findFirst({
          where: {
            id_imagenes_login_organizacion: comando.id_portada,
            fid_organizaciones: idOrganizacion,
            estado: 1,
          },
          select: { clave_objeto: true },
        });
        if (!portada) throw new NotFoundException("companies.media.notFound");
        claves.add(portada.clave_objeto);
        await tx.imagenes_login_organizacion.update({
          where: { id_imagenes_login_organizacion: comando.id_portada },
          data: { estado: 0, updated_by: idUsuarioActual },
        });
      } else {
        const perfil = await tx.perfil_organizacion.findUnique({
          where: { fid_organizaciones: idOrganizacion },
          select: {
            escudo_url: true,
            escudo_oscuro_url: true,
            escudo_misma_imagen: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            imagotipo_misma_imagen: true,
          },
        });
        const campo = campoMarca(comando.tipo);
        const esEscudo = comando.tipo.startsWith("escudo");
        const esOscura = comando.tipo.endsWith("_oscuro");
        const mismaImagen = esEscudo
          ? (perfil?.escudo_misma_imagen ?? true)
          : (perfil?.imagotipo_misma_imagen ?? true);
        if (esOscura && mismaImagen) {
          throw new BadRequestException("companies.media.sharedVariant");
        }
        const clave = perfil?.[campo] ?? null;
        if (!clave) throw new NotFoundException("companies.media.notFound");
        claves.add(clave);
        const datos: Record<string, string | boolean | null> = {
          [campo]: null,
        };
        if (!esOscura && mismaImagen) {
          const campoOscuro = esEscudo
            ? "escudo_oscuro_url"
            : "imagotipo_oscuro_url";
          claves.add(perfil?.[campoOscuro] ?? null);
          datos[campoOscuro] = null;
        }
        const quedaEscudoClaro = esEscudo
          ? campo === "escudo_url"
            ? false
            : Boolean(perfil?.escudo_url)
          : true;
        const quedaEscudoOscuro = esEscudo
          ? campo === "escudo_oscuro_url" || (!esOscura && mismaImagen)
            ? false
            : Boolean(perfil?.escudo_oscuro_url)
          : true;
        if (esEscudo && !quedaEscudoClaro && !quedaEscudoOscuro) {
          datos.ui_mostrar_escudo_menu = false;
          datos.ui_ocultar_esquinero_expandido = false;
        }
        await tx.perfil_organizacion.update({
          where: { fid_organizaciones: idOrganizacion },
          data: { ...datos, updated_by: idUsuarioActual },
        });
      }
      await this.auditoria.registrar(
        {
          accion: `empresas.medio.${comando.tipo}.eliminado`,
          entidad: "organizaciones",
          id_entidad: idOrganizacion,
          fid_organizaciones: idOrganizacionActual,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: { tipo: comando.tipo },
        },
        tx,
      );
    });
    if (comando.tipo === "portada") {
      for (const clave of claves) await this.medios.eliminarSeguro(clave);
    } else {
      await this.eliminarMarcaSinReferencia(idOrganizacion, claves);
    }
    return this.obtenerMarca(idOrganizacion, idOrganizacionActual);
  }

  async compartirMedioActual(
    idOrganizacion: string,
    comando: ComandoCompartirMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa> {
    const anteriores = new Set<string | null>();
    await this.prisma.$transaction(async (tx) => {
      await this.validarEmpresaActual(tx, idOrganizacion);
      await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
      await this.validarEmpresaActual(tx, idOrganizacion);
      const perfil = await tx.perfil_organizacion.findUnique({
        where: { fid_organizaciones: idOrganizacion },
        select: {
          escudo_url: true,
          escudo_oscuro_url: true,
          escudo_misma_imagen: true,
          imagotipo_url: true,
          imagotipo_oscuro_url: true,
          imagotipo_misma_imagen: true,
          login_escudo_url: true,
          login_escudo_oscuro_url: true,
          login_escudo_misma_imagen: true,
        },
      });
      const esEscudo = comando.tipo === "escudo";
      const esLoginEscudo = comando.tipo === "login_escudo";
      const campoClaro = esEscudo
        ? "escudo_url"
        : esLoginEscudo
          ? "login_escudo_url"
          : "imagotipo_url";
      const campoOscuro = esEscudo
        ? "escudo_oscuro_url"
        : esLoginEscudo
          ? "login_escudo_oscuro_url"
          : "imagotipo_oscuro_url";
      const campoMisma = esEscudo
        ? "escudo_misma_imagen"
        : esLoginEscudo
          ? "login_escudo_misma_imagen"
          : "imagotipo_misma_imagen";
      const valorActual = perfil?.[campoMisma] ?? true;
      if (valorActual === comando.usar_misma_imagen) return;

      anteriores.add(perfil?.[campoOscuro] ?? null);
      const clara = perfil?.[campoClaro] ?? null;
      const regionalizacion = await this.regionalizacionPredeterminada(tx);
      await tx.perfil_organizacion.upsert({
        where: { fid_organizaciones: idOrganizacion },
        update: {
          [campoMisma]: comando.usar_misma_imagen,
          [campoOscuro]: comando.usar_misma_imagen ? clara : null,
          ...(esEscudo && !clara
            ? {
                ui_mostrar_escudo_menu: false,
                ui_ocultar_esquinero_expandido: false,
              }
            : {}),
          estado: 1,
          updated_by: idUsuarioActual,
        },
        create: {
          fid_organizaciones: idOrganizacion,
          ...regionalizacion,
          [campoMisma]: comando.usar_misma_imagen,
          [campoOscuro]: comando.usar_misma_imagen ? clara : null,
          ...(esEscudo && !clara
            ? {
                ui_mostrar_escudo_menu: false,
                ui_ocultar_esquinero_expandido: false,
              }
            : {}),
          created_by: idUsuarioActual,
          updated_by: idUsuarioActual,
        },
      });
      await this.auditoria.registrar(
        {
          accion: `empresas.medio.${comando.tipo}.compartido`,
          entidad: "organizaciones",
          id_entidad: idOrganizacion,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: {
            tipo: comando.tipo,
            usar_misma_imagen: comando.usar_misma_imagen,
          },
        },
        tx,
      );
    });
    await this.eliminarMarcaSinReferencia(idOrganizacion, anteriores);
    return this.obtenerMarcaActual(idOrganizacion);
  }

  async obtenerMedio(
    idOrganizacion: string,
    consulta: ConsultaMedioEmpresa,
    idOrganizacionActual: string,
    propia = false,
  ): Promise<MedioEmpresa> {
    if (propia)
      await this.validarEmpresaActual(this.prisma, idOrganizacionActual);
    else
      await this.validarOrganizacionActiva(this.prisma, idOrganizacionActual);
    if (propia) await this.validarEmpresaActual(this.prisma, idOrganizacion);
    else await this.validarEmpresaNoEliminada(this.prisma, idOrganizacion);
    let clave: string | null = null;
    if (consulta.tipo === "portada") {
      const portada = await this.prisma.imagenes_login_organizacion.findFirst({
        where: {
          fid_organizaciones: idOrganizacion,
          estado: 1,
          ...(consulta.id_portada
            ? { id_imagenes_login_organizacion: consulta.id_portada }
            : {}),
        },
        select: { clave_objeto: true },
      });
      clave = portada?.clave_objeto ?? null;
    } else {
      const perfil = await this.prisma.perfil_organizacion.findUnique({
        where: { fid_organizaciones: idOrganizacion },
        select: {
          escudo_url: true,
          escudo_oscuro_url: true,
          imagotipo_url: true,
          imagotipo_oscuro_url: true,
        },
      });
      clave = perfil?.[campoMarca(consulta.tipo)] ?? null;
    }
    if (!clave || versionMedioEmpresa(clave) !== consulta.version) {
      throw new NotFoundException("companies.media.notFound");
    }
    return this.medios.leer(clave);
  }

  obtenerResumenActual(idOrganizacion: string) {
    return this.obtenerResumen(idOrganizacion, idOrganizacion, true);
  }

  obtenerSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
  ) {
    return this.obtenerSeccion(idOrganizacion, seccion, idOrganizacion, true);
  }

  actualizarSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.actualizarSeccion(
      idOrganizacion,
      seccion,
      datos,
      idOrganizacion,
      idUsuarioActual,
      contexto,
      true,
    );
  }

  async actualizarFiltroColorLoginActual(
    idOrganizacion: string,
    activo: boolean,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${idOrganizacion}::uuid FOR UPDATE`;
      await this.validarEmpresaActual(tx, idOrganizacion);

      const usuario = await tx.usuarios.findFirst({
        where: {
          id_usuarios: idUsuarioActual,
          fid_organizaciones: idOrganizacion,
          estado: 1,
          estado_cuenta: "activo",
        },
        select: { id_usuarios: true },
      });
      if (!usuario) throw new NotFoundException("companies.notFound");

      const regionalizacion = await this.regionalizacionPredeterminada(tx);
      await tx.perfil_organizacion.upsert({
        where: { fid_organizaciones: idOrganizacion },
        update: {
          login_usar_filtro_color: activo,
          estado: 1,
          updated_by: idUsuarioActual,
        },
        create: {
          fid_organizaciones: idOrganizacion,
          ...regionalizacion,
          login_usar_filtro_color: activo,
          estado: 1,
          created_by: idUsuarioActual,
          updated_by: idUsuarioActual,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "empresas.login.filtro_color.modificada",
          entidad: "perfil_organizacion",
          id_entidad: idOrganizacion,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: { activo },
        },
        tx,
      );
    });
  }

  async obtenerCatalogosUbicacionActual(idOrganizacion: string) {
    await this.validarEmpresaActual(this.prisma, idOrganizacion);
    const [paises, nivel1, nivel2, nivel3, zonasHorarias, idiomas, monedas, tiposDocumento, especiesAnimales, tiposPersonaFiscal, responsabilidadesFiscales] = await Promise.all([
      this.prisma.admin_level_0.findMany({
        where: { estado: 1 },
        orderBy: { nombre_es: "asc" },
        select: {
          id_admin_level_0: true,
          codigo_iso2: true,
          nombre_es: true,
          etiqueta_admin_level_1: true,
          etiqueta_admin_level_2: true,
          etiqueta_admin_level_3: true,
        },
      }),
      this.prisma.admin_level_1.findMany({
        where: { estado: 1, admin_level_0: { estado: 1 } },
        orderBy: { nombre: "asc" },
        select: {
          id_admin_level_1: true,
          fid_admin_level_0: true,
          codigo: true,
          nombre: true,
        },
      }),
      this.prisma.admin_level_2.findMany({
        where: {
          estado: 1,
          admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
        },
        orderBy: { nombre: "asc" },
        select: {
          id_admin_level_2: true,
          fid_admin_level_1: true,
          codigo: true,
          nombre: true,
        },
      }),
      this.prisma.admin_level_3.findMany({
        where: {
          estado: 1,
          admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
        },
        orderBy: { nombre: "asc" },
        select: {
          fid_admin_level_1: true,
          fid_admin_level_2: true,
          codigo: true,
          nombre: true,
        },
      }),
      this.prisma.zonas_horarias.findMany({ where: { estado: 1 }, orderBy: { nombre_iana: "asc" }, select: { id_zonas_horarias: true, nombre_iana: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "idiomas", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "monedas", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "tipos_documento", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "especies_animales", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "tipos_persona_fiscal", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
      this.prisma.parametros.findMany({ where: { codigo_grupo: "responsabilidades_fiscales", estado: 1 }, orderBy: { orden: "asc" }, select: { id_parametros: true, codigo: true, etiqueta: true } }),
    ]);
    return {
      admin_level_0: paises.map(({ nombre_es, ...pais }) => ({
        ...pais,
        nombre: nombre_es,
      })),
      admin_level_1: nivel1,
      admin_level_2: nivel2,
      admin_level_3: nivel3,
      zonas_horarias: zonasHorarias,
      idiomas,
      monedas,
      tipos_documento: tiposDocumento,
      especies_animales: especiesAnimales,
      tipos_persona_fiscal: tiposPersonaFiscal,
      responsabilidades_fiscales: responsabilidadesFiscales,
    };
  }

  obtenerMarcaActual(idOrganizacion: string) {
    return this.obtenerMarca(idOrganizacion, idOrganizacion, true);
  }

  guardarMedioActual(
    idOrganizacion: string,
    comando: ComandoGuardarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.guardarMedio(
      idOrganizacion,
      comando,
      idOrganizacion,
      idUsuarioActual,
      contexto,
      true,
    );
  }

  eliminarMedioActual(
    idOrganizacion: string,
    comando: ComandoEliminarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    return this.eliminarMedio(
      idOrganizacion,
      comando,
      idOrganizacion,
      idUsuarioActual,
      contexto,
      true,
    );
  }

  obtenerMedioActual(idOrganizacion: string, consulta: ConsultaMedioEmpresa) {
    return this.obtenerMedio(idOrganizacion, consulta, idOrganizacion, true);
  }

  /** Convierte la violación de unicidad del slug en un mensaje entendible. */
  private traducirConflictoSlug(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new ConflictException("companies.slugDuplicate");
    }
    return error;
  }

  private async siguienteSlug(
    tx: ClientePrisma,
    base: string,
  ): Promise<string> {
    for (let intento = 0; intento < 100; intento += 1) {
      const sufijo = intento === 0 ? "" : `-${intento + 1}`;
      const candidato = `${base.slice(0, 63 - sufijo.length)}${sufijo}`;
      const existente = await tx.organizaciones.findFirst({
        where: { slug: candidato, estado: 1, eliminado_en: null },
        select: { id_organizaciones: true },
      });
      if (!existente) return candidato;
    }
    throw new ConflictException("companies.slugDuplicate");
  }
}
