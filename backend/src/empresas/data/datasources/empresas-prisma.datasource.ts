import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import type {
  ActorSede,
  DatosBasicosSede,
  DatosSede,
} from "../../domain/entities/sede";

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
      tx.parametros.findUnique({
        where: {
          codigo_grupo_codigo: { codigo_grupo: "idiomas", codigo: "es" },
        },
        select: { id_parametros: true },
      }),
      tx.zonas_horarias.findUnique({
        where: { nombre_iana: "America/Lima" },
        select: { id_zonas_horarias: true },
      }),
      tx.parametros.findUnique({
        where: {
          codigo_grupo_codigo: { codigo_grupo: "monedas", codigo: "PEN" },
        },
        select: { id_parametros: true },
      }),
    ]);
    if (!idioma || !zona || !moneda)
      throw new BadRequestException("companies.invalidRegionalization");
    return {
      fid_parametros_idioma: idioma.id_parametros,
      fid_zonas_horarias: zona.id_zonas_horarias,
      fid_parametros_moneda: moneda.id_parametros,
    };
  }

  private async configuracionFiscalPeru(tx: ClientePrisma) {
    const [pais, proveedor, tipoIdentificacion] = await Promise.all([
      tx.admin_level_0.findUnique({
        where: { codigo_iso2: "PE" },
        select: { id_admin_level_0: true },
      }),
      tx.proveedores_fiscales.findUnique({
        where: { codigo: "SUNAT" },
        select: { id_proveedores_fiscales: true, fid_admin_level_0: true },
      }),
      tx.tipos_identificacion_fiscal.findFirst({
        where: { codigo: "RUC", pais: { codigo_iso2: "PE" }, estado: 1 },
        select: {
          id_tipos_identificacion_fiscal: true,
          fid_admin_level_0: true,
          patron: true,
          longitud_minima: true,
          longitud_maxima: true,
        },
      }),
    ]);
    if (
      !pais ||
      !proveedor ||
      !tipoIdentificacion ||
      proveedor.fid_admin_level_0 !== pais.id_admin_level_0 ||
      tipoIdentificacion.fid_admin_level_0 !== pais.id_admin_level_0
    )
      throw new BadRequestException("companies.invalidFiscalConfiguration");
    return {
      fid_admin_level_0: pais.id_admin_level_0,
      fid_proveedores_fiscales: proveedor.id_proveedores_fiscales,
      fid_tipos_identificacion_fiscal:
        tipoIdentificacion.id_tipos_identificacion_fiscal,
      patron_identificacion: tipoIdentificacion.patron,
      longitud_minima_identificacion: tipoIdentificacion.longitud_minima,
      longitud_maxima_identificacion: tipoIdentificacion.longitud_maxima,
    };
  }

  private validarNumeroFiscal(
    numero: string,
    tipo: {
      patron_identificacion: string | null;
      longitud_minima_identificacion: number | null;
      longitud_maxima_identificacion: number | null;
    },
  ) {
    if (
      (tipo.longitud_minima_identificacion !== null &&
        numero.length < tipo.longitud_minima_identificacion) ||
      (tipo.longitud_maxima_identificacion !== null &&
        numero.length > tipo.longitud_maxima_identificacion) ||
      (tipo.patron_identificacion !== null &&
        !new RegExp(tipo.patron_identificacion).test(numero))
    )
      throw new BadRequestException("companies.invalidFiscalDocument");
  }

  private horariosAgendaDesde(
    filas: Array<{
      dia_semana: number;
      turno: number;
      cerrado: boolean;
      hora_apertura: string | null;
      hora_cierre: string | null;
    }>,
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
      const mappedPlan = plan
        ? {
            id_planes: plan.id_planes,
            codigo: plan.codigo,
            nombre: plan.nombre,
          }
        : { id_planes: "", codigo: "EMPRESARIAL", nombre: "Plan Empresarial" };

      if (!perfil || perfil.estado !== 1)
        return { ...empresa, perfil: null, plan: mappedPlan };
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
    const mappedPlan = plan
      ? {
          id_planes: plan.id_planes,
          codigo: plan.codigo,
          nombre: plan.nombre,
        }
      : { id_planes: "", codigo: "EMPRESARIAL", nombre: "Plan Empresarial" };

    const mappedPerfil =
      perfil && perfil.estado === 1
        ? {
            ...perfil,
            escudo_version: versionMedioEmpresa(perfil.escudo_url),
            escudo_oscuro_version: versionMedioEmpresa(
              perfil.escudo_oscuro_url,
            ),
          }
        : null;

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
    idSedeActual: string | null = null,
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
        entidades_legales: {
          where: {
            ...(idSedeActual
              ? {
                  sedes: {
                    some: {
                      id_sedes: idSedeActual,
                      estado: 1,
                      eliminado_en: null,
                    },
                  },
                }
              : { es_principal: true }),
            estado: 1,
            eliminado_en: null,
          },
          take: 1,
          select: {
            fid_tipos_identificacion_fiscal: true,
            numero_identificacion_fiscal: true,
            razon_social: true,
            fid_parametros_tipo_persona: true,
            fid_parametros_responsabilidad_fiscal: true,
            fid_parametros_moneda: true,
            afecto_impuesto: true,
            telefono_fiscal: true,
            correo_fiscal: true,
            direccion_fiscal: true,
          },
        },
        sedes: {
          where: {
            ...(idSedeActual
              ? { id_sedes: idSedeActual }
              : { es_principal: true }),
            estado: 1,
            eliminado_en: null,
          },
          take: 1,
          select: {
            fid_parametros_idioma: true,
            fid_zonas_horarias: true,
            sin_sede_fisica: true,
            direccion: true,
            referencia: true,
            fid_admin_level_0: true,
            admin_level_3: { select: { codigo: true } },
            telefono: true,
            telefono_secundario: true,
            correo_contacto: true,
            correo_contacto_secundario: true,
            latitud: true,
            longitud: true,
            agenda_activa: true,
            duracion_cita_estimada: true,
            sitio_web: true,
            facebook_url: true,
            instagram_url: true,
            tiktok_url: true,
            youtube_url: true,
            linkedin_url: true,
            x_url: true,
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
            login_usar_filtro_color: true,
            login_mostrar_etiqueta: true,
            login_mostrar_destacados: true,
            login_mostrar_comunidad: true,
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
            horarios: {
              where: { estado: 1 },
              orderBy: [{ dia_semana: { orden: "asc" } }, { turno: "asc" }],
              select: {
                dia_semana: { select: { orden: true } },
                turno: true,
                cerrado: true,
                hora_apertura: true,
                hora_cierre: true,
              },
            },
            especies_atendidas: {
              where: { estado: 1 },
              select: { fid_parametros: true },
            },
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
    // El perfil histórico solo es compatibilidad cuando no existe contexto de
    // sede. Una sede activa nunca debe heredar datos operativos por fallback.
    const perfilLocal = idSedeActual ? null : perfil;
    const entidadLegal = empresa.entidades_legales[0] ?? null;
    const sedePrincipal = empresa.sedes[0] ?? null;
    const secciones: SeccionesEmpresa = {
      general: {
        nombre: empresa.nombre,
        slug: empresa.slug,
        razon_social:
          entidadLegal?.razon_social ?? perfil?.razon_social ?? "",
        ruc_nif:
          entidadLegal?.numero_identificacion_fiscal ??
          perfil?.ruc_nif ??
          "",
        plan_nombre: (empresa as any).plan?.nombre ?? "Plan Completo",
        suscripcion_inicia_en: (empresa as any).suscripcion_inicia_en ?? null,
        suscripcion_expira_en: (empresa as any).suscripcion_expira_en ?? null,
      },
      contacto: {
        sin_sede_fisica:
          sedePrincipal?.sin_sede_fisica ??
          perfilLocal?.sin_sede_fisica ??
          false,
        direccion: sedePrincipal?.direccion ?? perfilLocal?.direccion ?? "",
        referencia: sedePrincipal?.referencia ?? perfilLocal?.referencia ?? "",
        fid_admin_level_0:
          sedePrincipal?.fid_admin_level_0 ??
          perfilLocal?.fid_admin_level_0 ??
          "",
        codigo_admin_level_3:
          sedePrincipal?.admin_level_3?.codigo ??
          perfilLocal?.admin_level_3?.codigo ??
          "",
        telefono: sedePrincipal?.telefono ?? perfilLocal?.telefono ?? "",
        telefono_secundario:
          sedePrincipal?.telefono_secundario ??
          perfilLocal?.telefono_secundario ??
          "",
        correo_contacto:
          sedePrincipal?.correo_contacto ??
          perfilLocal?.correo_contacto ??
          "",
        correo_contacto_secundario:
          sedePrincipal?.correo_contacto_secundario ??
          perfilLocal?.correo_contacto_secundario ??
          "",
        latitud:
          sedePrincipal?.latitud?.toString() ??
          perfilLocal?.latitud?.toString() ??
          "",
        longitud:
          sedePrincipal?.longitud?.toString() ??
          perfilLocal?.longitud?.toString() ??
          "",
      },
      digital: {
        sitio_web: sedePrincipal?.sitio_web ?? perfilLocal?.sitio_web ?? "",
        facebook_url:
          sedePrincipal?.facebook_url ?? perfilLocal?.facebook_url ?? "",
        instagram_url:
          sedePrincipal?.instagram_url ?? perfilLocal?.instagram_url ?? "",
        tiktok_url:
          sedePrincipal?.tiktok_url ?? perfilLocal?.tiktok_url ?? "",
        youtube_url:
          sedePrincipal?.youtube_url ?? perfilLocal?.youtube_url ?? "",
        linkedin_url:
          sedePrincipal?.linkedin_url ?? perfilLocal?.linkedin_url ?? "",
        x_url: sedePrincipal?.x_url ?? perfilLocal?.x_url ?? "",
      },
      identidad: {
        color_primario:
          sedePrincipal?.color_primario ?? perfilLocal?.color_primario ?? "",
        ui_cabecera_claro:
          sedePrincipal?.ui_cabecera_claro ??
          perfilLocal?.ui_cabecera_claro ??
          "",
        ui_cabecera_oscuro:
          sedePrincipal?.ui_cabecera_oscuro ??
          perfilLocal?.ui_cabecera_oscuro ??
          "",
        ui_esquinero_claro:
          sedePrincipal?.ui_esquinero_claro ??
          perfilLocal?.ui_esquinero_claro ??
          "",
        ui_esquinero_oscuro:
          sedePrincipal?.ui_esquinero_oscuro ??
          perfilLocal?.ui_esquinero_oscuro ??
          "",
        ui_menu_claro:
          sedePrincipal?.ui_menu_claro ?? perfilLocal?.ui_menu_claro ?? "",
        ui_menu_oscuro:
          sedePrincipal?.ui_menu_oscuro ?? perfilLocal?.ui_menu_oscuro ?? "",
        ui_mostrar_escudo_menu:
          sedePrincipal?.ui_mostrar_escudo_menu ??
          perfilLocal?.ui_mostrar_escudo_menu ??
          false,
        ui_mostrar_nombre_empresa_menu:
          sedePrincipal?.ui_mostrar_nombre_empresa_menu ??
          perfilLocal?.ui_mostrar_nombre_empresa_menu ??
          true,
        ui_ocultar_esquinero_expandido:
          sedePrincipal?.ui_ocultar_esquinero_expandido ??
          perfilLocal?.ui_ocultar_esquinero_expandido ??
          false,
        ui_esquinero_fondo_activo:
          sedePrincipal?.ui_esquinero_fondo_activo ??
          perfilLocal?.ui_esquinero_fondo_activo ??
          false,
        ui_cabecera_ocultar_borde:
          sedePrincipal?.ui_cabecera_ocultar_borde ??
          perfilLocal?.ui_cabecera_ocultar_borde ??
          false,
        ui_menu_ocultar_borde:
          sedePrincipal?.ui_menu_ocultar_borde ??
          perfilLocal?.ui_menu_ocultar_borde ??
          false,
        ui_tamano_escudo_menu:
          sedePrincipal?.ui_tamano_escudo_menu ??
          perfilLocal?.ui_tamano_escudo_menu ??
          100,
      },
      comunicaciones: {
        soporte_correo:
          sedePrincipal?.soporte_correo ?? perfilLocal?.soporte_correo ?? "",
        soporte_telefono:
          sedePrincipal?.soporte_telefono ??
          perfilLocal?.soporte_telefono ??
          "",
        soporte_whatsapp:
          sedePrincipal?.soporte_whatsapp ??
          perfilLocal?.soporte_whatsapp ??
          "",
      },
      region: {
        fid_parametros_idioma:
          sedePrincipal?.fid_parametros_idioma ??
          perfilLocal?.fid_parametros_idioma ??
          "",
        fid_zonas_horarias:
          sedePrincipal?.fid_zonas_horarias ??
          perfilLocal?.fid_zonas_horarias ??
          "",
        fid_parametros_moneda:
          entidadLegal?.fid_parametros_moneda ??
          perfilLocal?.fid_parametros_moneda ??
          "",
      },
      servicios: {
        fid_parametros_especies: (
          sedePrincipal?.especies_atendidas ?? empresa.especies_atendidas
        ).map((fila) => fila.fid_parametros),
      },
      agenda: {
        agenda_activa: sedePrincipal?.agenda_activa ?? empresa.agenda_activa,
        duracion_cita_estimada:
          sedePrincipal?.duracion_cita_estimada ??
          empresa.duracion_cita_estimada,
        horarios: sedePrincipal
          ? sedePrincipal.horarios.map((horario) => ({
              dia_semana: horario.dia_semana.orden,
              turno: horario.turno,
              cerrado: horario.cerrado,
              hora_apertura: horario.hora_apertura,
              hora_cierre: horario.hora_cierre,
            }))
          : this.horariosAgendaDesde(empresa.horarios_atencion),
      },
      fiscal: {
        fid_parametros_tipo_persona_fiscal:
          entidadLegal?.fid_parametros_tipo_persona ??
          perfilLocal?.fid_parametros_tipo_persona_fiscal ??
          null,
        fid_parametros_tipo_documento_fiscal:
          entidadLegal?.fid_tipos_identificacion_fiscal ?? null,
        fiscal_numero_documento:
          entidadLegal?.numero_identificacion_fiscal ??
          perfilLocal?.fiscal_numero_documento ??
          "",
        fiscal_razon_social:
          entidadLegal?.razon_social ??
          perfilLocal?.fiscal_razon_social ??
          "",
        fiscal_afecto_igv:
          entidadLegal?.afecto_impuesto ??
          perfilLocal?.fiscal_afecto_igv ??
          false,
        fid_parametros_responsabilidad_fiscal:
          entidadLegal?.fid_parametros_responsabilidad_fiscal ??
          perfilLocal?.fid_parametros_responsabilidad_fiscal ??
          null,
        fiscal_telefono:
          entidadLegal?.telefono_fiscal ??
          perfilLocal?.fiscal_telefono ??
          "",
        fiscal_correo:
          entidadLegal?.correo_fiscal ?? perfilLocal?.fiscal_correo ?? "",
        fiscal_direccion:
          entidadLegal?.direccion_fiscal ??
          perfilLocal?.fiscal_direccion ??
          "",
      },
      login: {
        login_usar_filtro_color:
          sedePrincipal?.login_usar_filtro_color ??
          perfilLocal?.login_usar_filtro_color ??
          true,
        login_mostrar_etiqueta:
          sedePrincipal?.login_mostrar_etiqueta ??
          perfilLocal?.login_mostrar_etiqueta ??
          true,
        login_mostrar_destacados:
          sedePrincipal?.login_mostrar_destacados ??
          perfilLocal?.login_mostrar_destacados ??
          true,
        login_mostrar_comunidad:
          sedePrincipal?.login_mostrar_comunidad ??
          perfilLocal?.login_mostrar_comunidad ??
          true,
        login_etiqueta:
          sedePrincipal?.login_etiqueta ?? perfilLocal?.login_etiqueta ?? "",
        login_titulo:
          sedePrincipal?.login_titulo ?? perfilLocal?.login_titulo ?? "",
        login_subtitulo:
          sedePrincipal?.login_subtitulo ??
          perfilLocal?.login_subtitulo ??
          "",
        login_destacado_1:
          sedePrincipal?.login_destacado_1 ??
          perfilLocal?.login_destacado_1 ??
          "",
        login_destacado_2:
          sedePrincipal?.login_destacado_2 ??
          perfilLocal?.login_destacado_2 ??
          "",
        login_destacado_3:
          sedePrincipal?.login_destacado_3 ??
          perfilLocal?.login_destacado_3 ??
          "",
        login_destacado_icono_1:
          sedePrincipal?.login_destacado_icono_1 ??
          perfilLocal?.login_destacado_icono_1 ??
          "book",
        login_destacado_icono_2:
          sedePrincipal?.login_destacado_icono_2 ??
          perfilLocal?.login_destacado_icono_2 ??
          "users",
        login_destacado_icono_3:
          sedePrincipal?.login_destacado_icono_3 ??
          perfilLocal?.login_destacado_icono_3 ??
          "award",
        login_texto_comunidad:
          sedePrincipal?.login_texto_comunidad ??
          perfil?.login_texto_comunidad ??
          "",
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
            tx.parametros.findFirst({
              where: {
                id_parametros: regional.fid_parametros_idioma,
                codigo_grupo: "idiomas",
                estado: 1,
              },
              select: { id_parametros: true },
            }),
            tx.zonas_horarias.findFirst({
              where: {
                id_zonas_horarias: regional.fid_zonas_horarias,
                estado: 1,
              },
              select: { id_zonas_horarias: true },
            }),
            tx.parametros.findFirst({
              where: {
                id_parametros: regional.fid_parametros_moneda,
                codigo_grupo: "monedas",
                estado: 1,
              },
              select: { id_parametros: true },
            }),
          ]);
          if (!idioma || !zona || !moneda)
            throw new BadRequestException("companies.invalidRegionalization");
        }

        if (seccion === "servicios") {
          const especies = (datos as SeccionesEmpresa["servicios"])
            .fid_parametros_especies;
          const catalogo = await tx.parametros.findMany({
            where: {
              codigo_grupo: "especies_animales",
              id_parametros: { in: especies },
              estado: 1,
            },
            select: { id_parametros: true },
          });
          if (catalogo.length !== especies.length)
            throw new BadRequestException("companies.invalidData");
        }

        if (seccion === "fiscal") {
          const fiscal = datos as SeccionesEmpresa["fiscal"];
          if (
            Boolean(fiscal.fid_parametros_tipo_documento_fiscal) !==
            Boolean(fiscal.fiscal_numero_documento)
          )
            throw new BadRequestException("companies.invalidFiscalDocument");
          const referencias = [
            [fiscal.fid_parametros_tipo_persona_fiscal, "tipos_persona_fiscal"],
            [
              fiscal.fid_parametros_responsabilidad_fiscal,
              "responsabilidades_fiscales",
            ],
          ] as const;
          for (const [id, grupo] of referencias) {
            if (!id) continue;
            const parametro = await tx.parametros.findFirst({
              where: { id_parametros: id, codigo_grupo: grupo, estado: 1 },
              select: { id_parametros: true },
            });
            if (!parametro)
              throw new BadRequestException("companies.invalidData");
          }
          if (fiscal.fid_parametros_tipo_documento_fiscal) {
            const tipo = await tx.tipos_identificacion_fiscal.findFirst({
              where: {
                id_tipos_identificacion_fiscal:
                  fiscal.fid_parametros_tipo_documento_fiscal,
                estado: 1,
                pais: { codigo_iso2: "PE", estado: 1 },
              },
              select: {
                patron: true,
                longitud_minima: true,
                longitud_maxima: true,
              },
            });
            const numero = fiscal.fiscal_numero_documento;
            if (
              !tipo ||
              (numero &&
                tipo.longitud_minima &&
                numero.length < tipo.longitud_minima) ||
              (numero &&
                tipo.longitud_maxima &&
                numero.length > tipo.longitud_maxima) ||
              (numero && tipo.patron && !new RegExp(tipo.patron).test(numero))
            )
              throw new BadRequestException("companies.invalidFiscalDocument");
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
            if (
              contacto.direccion ||
              contacto.referencia ||
              contacto.latitud ||
              contacto.longitud ||
              contacto.fid_admin_level_0 ||
              contacto.codigo_admin_level_3
            )
              throw new BadRequestException("companies.invalidLocation");
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
          if (general.ruc_nif)
            this.validarNumeroFiscal(
              general.ruc_nif,
              await this.configuracionFiscalPeru(tx),
            );
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
          await tx.entidades_legales.updateMany({
            where: {
              fid_organizaciones: idOrganizacion,
              es_principal: true,
              eliminado_en: null,
            },
            data: {
              razon_social: general.razon_social || null,
              numero_identificacion_fiscal: general.ruc_nif || null,
              updated_by: idUsuarioActual,
            },
          });
        } else {
          const datosPerfil =
            seccion === "contacto"
              ? {
                  sin_sede_fisica: (datos as SeccionesEmpresa["contacto"])
                    .sin_sede_fisica,
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
                  latitud:
                    (datos as SeccionesEmpresa["contacto"]).latitud || null,
                  longitud:
                    (datos as SeccionesEmpresa["contacto"]).longitud || null,
                  ...ubicacion,
                }
              : seccion === "agenda" || seccion === "servicios"
                ? {}
                : seccion === "fiscal"
                  ? {
                      fid_parametros_tipo_persona_fiscal: (
                        datos as SeccionesEmpresa["fiscal"]
                      ).fid_parametros_tipo_persona_fiscal,
                      fiscal_numero_documento: (
                        datos as SeccionesEmpresa["fiscal"]
                      ).fiscal_numero_documento,
                      fiscal_razon_social: (datos as SeccionesEmpresa["fiscal"])
                        .fiscal_razon_social,
                      fiscal_afecto_igv: (datos as SeccionesEmpresa["fiscal"])
                        .fiscal_afecto_igv,
                      fid_parametros_responsabilidad_fiscal: (
                        datos as SeccionesEmpresa["fiscal"]
                      ).fid_parametros_responsabilidad_fiscal,
                      fiscal_telefono: (datos as SeccionesEmpresa["fiscal"])
                        .fiscal_telefono,
                      fiscal_correo: (datos as SeccionesEmpresa["fiscal"])
                        .fiscal_correo,
                      fiscal_direccion: (datos as SeccionesEmpresa["fiscal"])
                        .fiscal_direccion,
                    }
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
          if (seccion === "region") {
            const region = datos as SeccionesEmpresa["region"];
            await Promise.all([
              tx.entidades_legales.updateMany({
                where: {
                  fid_organizaciones: idOrganizacion,
                  es_principal: true,
                  eliminado_en: null,
                },
                data: {
                  fid_parametros_moneda: region.fid_parametros_moneda,
                  updated_by: idUsuarioActual,
                },
              }),
              tx.sedes.updateMany({
                where: {
                  fid_organizaciones: idOrganizacion,
                  es_principal: true,
                  eliminado_en: null,
                },
                data: {
                  fid_parametros_idioma: region.fid_parametros_idioma,
                  fid_zonas_horarias: region.fid_zonas_horarias,
                  updated_by: idUsuarioActual,
                },
              }),
            ]);
          }
          if (seccion === "fiscal") {
            const fiscal = datos as SeccionesEmpresa["fiscal"];
            await tx.entidades_legales.updateMany({
              where: {
                fid_organizaciones: idOrganizacion,
                es_principal: true,
                eliminado_en: null,
              },
              data: {
                fid_tipos_identificacion_fiscal:
                  fiscal.fid_parametros_tipo_documento_fiscal,
                numero_identificacion_fiscal:
                  fiscal.fiscal_numero_documento || null,
                razon_social: fiscal.fiscal_razon_social || null,
                fid_parametros_tipo_persona:
                  fiscal.fid_parametros_tipo_persona_fiscal,
                fid_parametros_responsabilidad_fiscal:
                  fiscal.fid_parametros_responsabilidad_fiscal,
                afecto_impuesto: fiscal.fiscal_afecto_igv,
                telefono_fiscal: fiscal.fiscal_telefono || null,
                correo_fiscal: fiscal.fiscal_correo || null,
                direccion_fiscal: fiscal.fiscal_direccion || null,
                updated_by: idUsuarioActual,
              },
            });
          }
          if (seccion === "servicios") {
            const especies = (datos as SeccionesEmpresa["servicios"])
              .fid_parametros_especies;
            await tx.organizaciones_especies_atendidas.updateMany({
              where: { fid_organizaciones: idOrganizacion },
              data: { estado: 0, updated_by: idUsuarioActual },
            });
            for (const fidParametros of especies) {
              await tx.organizaciones_especies_atendidas.upsert({
                where: {
                  fid_organizaciones_fid_parametros: {
                    fid_organizaciones: idOrganizacion,
                    fid_parametros: fidParametros,
                  },
                },
                update: { estado: 1, updated_by: idUsuarioActual },
                create: {
                  fid_organizaciones: idOrganizacion,
                  fid_parametros: fidParametros,
                  estado: 1,
                  created_by: idUsuarioActual,
                  updated_by: idUsuarioActual,
                },
              });
            }
          }
          if (seccion === "agenda") {
            const agenda = datos as SeccionesEmpresa["agenda"];
            const claves = new Set(
              agenda.horarios.map((h) => `${h.dia_semana}:${h.turno}`),
            );
            if (
              claves.size !== agenda.horarios.length ||
              agenda.horarios.some(
                (h) =>
                  !h.cerrado &&
                  (!h.hora_apertura ||
                    !h.hora_cierre ||
                    h.hora_apertura >= h.hora_cierre),
              )
            ) {
              throw new BadRequestException("companies.invalidSchedule");
            }
            await tx.organizaciones.update({
              where: { id_organizaciones: idOrganizacion },
              data: {
                agenda_activa: agenda.agenda_activa,
                duracion_cita_estimada: agenda.duracion_cita_estimada,
                updated_by: idUsuarioActual,
              },
            });
            await tx.horarios_atencion_organizacion.updateMany({
              where: { fid_organizaciones: idOrganizacion },
              data: { estado: 0, updated_by: idUsuarioActual },
            });
            for (const horario of agenda.horarios) {
              await tx.horarios_atencion_organizacion.upsert({
                where: {
                  fid_organizaciones_dia_semana_turno: {
                    fid_organizaciones: idOrganizacion,
                    dia_semana: horario.dia_semana,
                    turno: horario.turno,
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
      },
      region: {
        fid_parametros_idioma: texto("fid_parametros_idioma"),
        fid_zonas_horarias: texto("fid_zonas_horarias"),
        fid_parametros_moneda: texto("fid_parametros_moneda"),
      },
      servicios: {
        fid_parametros_especies: (actual.especies_atendidas ?? []).map(
          (fila) => fila.fid_parametros,
        ),
      },
      agenda: {
        agenda_activa: bandera("agenda_activa", true),
        duracion_cita_estimada: entero("duracion_cita_estimada", 20),
        horarios: this.horariosAgendaDesde(
          (actual.horarios_atencion ?? []).map((h) => ({
            ...h,
            turno: (h as { turno?: number }).turno ?? 1,
          })),
        ),
      },
      fiscal: {
        fid_parametros_tipo_persona_fiscal:
          texto("fid_parametros_tipo_persona_fiscal") || null,
        fid_parametros_tipo_documento_fiscal:
          texto("fid_parametros_tipo_documento_fiscal") || null,
        fiscal_numero_documento: texto("fiscal_numero_documento"),
        fiscal_razon_social: texto("fiscal_razon_social"),
        fiscal_afecto_igv: bandera("fiscal_afecto_igv", false),
        fid_parametros_responsabilidad_fiscal:
          texto("fid_parametros_responsabilidad_fiscal") || null,
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
        const DEFAULT_PLAN_UUID = "40000000-0000-4000-8000-000000000004"; // Demo hasta registrar una suscripción
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

        const fiscalPeru = await this.configuracionFiscalPeru(tx);
        this.validarNumeroFiscal(datos.ruc_nif, fiscalPeru);
        const {
          patron_identificacion: _patron,
          longitud_minima_identificacion: _longitudMinima,
          longitud_maxima_identificacion: _longitudMaxima,
          ...relacionesFiscales
        } = fiscalPeru;
        const entidadLegal = await tx.entidades_legales.create({
          data: {
            fid_organizaciones: organizacion.id_organizaciones,
            codigo: "PRINCIPAL",
            es_principal: true,
            ...relacionesFiscales,
            numero_identificacion_fiscal: datos.ruc_nif || null,
            razon_social: datos.razon_social || datos.nombre,
            fid_parametros_moneda: regionalizacion.fid_parametros_moneda,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          },
          select: { id_entidades_legales: true },
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

        const sede = await tx.sedes.create({
          data: {
            fid_organizaciones: organizacion.id_organizaciones,
            fid_entidades_legales: entidadLegal.id_entidades_legales,
            fid_parametros_idioma: regionalizacion.fid_parametros_idioma,
            fid_zonas_horarias: regionalizacion.fid_zonas_horarias,
            codigo: "PRINCIPAL",
            nombre: "Sede principal",
            es_principal: true,
            sin_sede_fisica: true,
            created_by: idUsuarioActual,
            updated_by: idUsuarioActual,
          },
          select: { id_sedes: true },
        });
        await Promise.all([
          tx.almacenes.create({
            data: {
              fid_organizaciones: organizacion.id_organizaciones,
              fid_sedes: sede.id_sedes,
              codigo: "ALM-PRINCIPAL",
              nombre: "Almacén principal",
              es_principal: true,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          }),
          tx.cajas.create({
            data: {
              fid_organizaciones: organizacion.id_organizaciones,
              fid_sedes: sede.id_sedes,
              codigo: "CAJ-PRINCIPAL",
              nombre: "Caja principal",
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          }),
        ]);

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
          actual.nombre !== datos.nombre || actual.slug !== datos.slug;
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
              mode: "insensitive",
            },
          },
        },
        {
          plan: {
            nombre: {
              contains: cleanQ,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const rows = await this.prisma.renovaciones.findMany({
      where,
      take: limit || 20,
      orderBy: {
        created_at: "desc",
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
        escudo_version: tienePerfilActivo
          ? versionMedioEmpresa(perfil.escudo_url)
          : null,
        escudo_oscuro_version: tienePerfilActivo
          ? versionMedioEmpresa(perfil.escudo_oscuro_url)
          : null,
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
      login_escudo_version: versionMedioEmpresa(
        perfil?.login_escudo_url ?? null,
      ),
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
    const [perfil, sedes, portadasOrganizacion, portadasSedes] =
      await Promise.all([
        this.prisma.perfil_organizacion.findUnique({
          where: { fid_organizaciones: idOrganizacion },
          select: {
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
          },
        }),
        this.prisma.sedes.findMany({
          where: { fid_organizaciones: idOrganizacion, eliminado_en: null },
          select: {
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
          },
        }),
        this.prisma.imagenes_login_organizacion.findMany({
          where: { fid_organizaciones: idOrganizacion, estado: 1 },
          select: { clave_objeto: true },
        }),
        this.prisma.imagenes_login_sede.findMany({
          where: { fid_organizaciones: idOrganizacion, estado: 1 },
          select: { clave_objeto: true },
        }),
      ]);
    const vigentes = new Set([
      perfil?.escudo_url,
      perfil?.escudo_oscuro_url,
      perfil?.imagotipo_url,
      perfil?.imagotipo_oscuro_url,
      perfil?.login_escudo_url,
      perfil?.login_escudo_oscuro_url,
      ...sedes.flatMap((sede) => [
        sede.escudo_url,
        sede.escudo_oscuro_url,
        sede.imagotipo_url,
        sede.imagotipo_oscuro_url,
        sede.login_escudo_url,
        sede.login_escudo_oscuro_url,
      ]),
      ...portadasOrganizacion.map((portada) => portada.clave_objeto),
      ...portadasSedes.map((portada) => portada.clave_objeto),
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
    idSedeActual: string,
    comando: ComandoCompartirMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa> {
    const anteriores = new Set<string | null>();
    await this.prisma.$transaction(async (tx) => {
      await this.validarEmpresaActual(tx, idOrganizacion);
      await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${idSedeActual}::uuid AND fid_organizaciones = ${idOrganizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
      const perfil = await tx.sedes.findFirst({
        where: {
          id_sedes: idSedeActual,
          fid_organizaciones: idOrganizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: {
          es_principal: true,
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
      if (!perfil) throw new NotFoundException("companies.branches.notFound");
      if (!perfil.es_principal)
        throw new BadRequestException(
          "companies.branches.mainOnlyConfiguration",
        );
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
      const valorActual = perfil[campoMisma];
      if (valorActual === comando.usar_misma_imagen) return;

      anteriores.add(perfil[campoOscuro] ?? null);
      const clara = perfil[campoClaro] ?? null;
      const data = {
        [campoMisma]: comando.usar_misma_imagen,
        [campoOscuro]: comando.usar_misma_imagen ? clara : null,
        ...(esEscudo && !clara
          ? {
              ui_mostrar_escudo_menu: false,
              ui_ocultar_esquinero_expandido: false,
            }
          : {}),
        updated_by: idUsuarioActual,
      };
      if (esLoginEscudo) {
        await tx.sedes.update({ where: { id_sedes: idSedeActual }, data });
      } else {
        await tx.sedes.updateMany({
          where: {
            fid_organizaciones: idOrganizacion,
            estado: 1,
            eliminado_en: null,
          },
          data,
        });
      }
      await this.auditoria.registrar(
        {
          accion: `empresas.medio.${comando.tipo}.compartido`,
          entidad: "sedes",
          id_entidad: idSedeActual,
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
    return this.obtenerMarcaActual(idOrganizacion, idSedeActual);
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

  async obtenerResumenActual(
    idOrganizacion: string,
    idSedeActual: string | null,
  ) {
    const resumen = await this.obtenerResumen(
      idOrganizacion,
      idOrganizacion,
      true,
    );
    const sede = idSedeActual
      ? await this.prisma.sedes.findFirst({
          where: {
            id_sedes: idSedeActual,
            fid_organizaciones: idOrganizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: {
            id_sedes: true,
            codigo: true,
            nombre: true,
            sin_sede_fisica: true,
            direccion: true,
            telefono: true,
            correo_contacto: true,
            escudo_url: true,
            escudo_oscuro_url: true,
          },
        })
      : null;
    return {
      ...resumen,
      escudo_version: sede
        ? versionMedioEmpresa(sede.escudo_url)
        : resumen.escudo_version,
      escudo_oscuro_version: sede
        ? versionMedioEmpresa(sede.escudo_oscuro_url)
        : resumen.escudo_oscuro_version,
      sede_activa: sede
        ? (({ escudo_url: _claro, escudo_oscuro_url: _oscuro, ...datos }) =>
            datos)(sede)
        : null,
    };
  }

  obtenerSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    idSedeActual: string | null,
  ) {
    return this.obtenerSeccion(
      idOrganizacion,
      seccion,
      idOrganizacion,
      true,
      idSedeActual,
    );
  }

  actualizarSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idSedeActual: string | null,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    if (
      idSedeActual &&
      (
        [
          "contacto",
          "region",
          "servicios",
          "agenda",
          "fiscal",
          "digital",
          "identidad",
          "comunicaciones",
          "login",
        ] as SeccionEmpresa[]
      ).includes(seccion)
    ) {
      return this.actualizarSeccionSedeActual(
        idOrganizacion,
        idSedeActual,
        seccion,
        datos,
        idUsuarioActual,
        contexto,
      );
    }
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

  private async actualizarSeccionSedeActual<S extends SeccionEmpresa>(
    organizacion: string,
    sede: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    usuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarEmpresaActual(tx, organizacion);
      await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${sede}::uuid AND fid_organizaciones = ${organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
      const actual = await tx.sedes.findFirst({
        where: {
          id_sedes: sede,
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
          usuarios: {
            some: { fid_usuarios: usuario, estado: 1 },
          },
        },
        include: {
          entidad_legal: true,
          admin_level_3: { select: { codigo: true } },
          horarios: { where: { estado: 1 } },
        },
      });
      if (!actual)
        throw new ForbiddenException("companies.branches.notAssigned");
      if (
        (seccion === "identidad" || seccion === "login") &&
        !actual.es_principal
      )
        throw new BadRequestException(
          "companies.branches.mainOnlyConfiguration",
        );

      if (seccion === "contacto") {
        const contacto = datos as SeccionesEmpresa["contacto"];
        let ubicacion: {
          fid_admin_level_0: string | null;
          fid_admin_level_3: string | null;
        } = { fid_admin_level_0: null, fid_admin_level_3: null };
        if (contacto.sin_sede_fisica) {
          if (
            contacto.direccion ||
            contacto.referencia ||
            contacto.latitud ||
            contacto.longitud ||
            contacto.fid_admin_level_0 ||
            contacto.codigo_admin_level_3
          )
            throw new BadRequestException("companies.invalidLocation");
        } else {
          if (
            !contacto.direccion ||
            !contacto.fid_admin_level_0 ||
            !contacto.codigo_admin_level_3
          )
            throw new BadRequestException("companies.invalidLocation");
          const distrito = await tx.admin_level_3.findFirst({
            where: {
              codigo: contacto.codigo_admin_level_3,
              estado: 1,
              admin_level_1: {
                fid_admin_level_0: contacto.fid_admin_level_0,
                estado: 1,
              },
            },
            select: { id_admin_level_3: true },
          });
          if (!distrito)
            throw new BadRequestException("companies.invalidLocation");
          if (
            contacto.fid_admin_level_0 !==
            actual.entidad_legal.fid_admin_level_0
          )
            throw new BadRequestException("companies.branches.countryMismatch");
          ubicacion = {
            fid_admin_level_0: contacto.fid_admin_level_0,
            fid_admin_level_3: distrito.id_admin_level_3,
          };
        }
        const siguiente = {
          sin_sede_fisica: contacto.sin_sede_fisica,
          direccion: contacto.direccion || null,
          referencia: contacto.referencia || null,
          ...ubicacion,
          latitud: contacto.latitud
            ? new Prisma.Decimal(contacto.latitud)
            : null,
          longitud: contacto.longitud
            ? new Prisma.Decimal(contacto.longitud)
            : null,
          telefono: contacto.telefono || null,
          telefono_secundario: contacto.telefono_secundario || null,
          correo_contacto: contacto.correo_contacto || null,
          correo_contacto_secundario:
            contacto.correo_contacto_secundario || null,
          updated_by: usuario,
        };
        const cambia = Object.entries(siguiente).some(
          ([campo, valor]) =>
            campo !== "updated_by" &&
            String(actual[campo as keyof typeof actual] ?? "") !==
              String(valor ?? ""),
        );
        if (!cambia) throw new BadRequestException("companies.noChanges");
        await tx.sedes.update({ where: { id_sedes: sede }, data: siguiente });
      } else if (seccion === "region") {
        const region = datos as SeccionesEmpresa["region"];
        const [idioma, zona, moneda] = await Promise.all([
          tx.parametros.findFirst({
            where: {
              id_parametros: region.fid_parametros_idioma,
              codigo_grupo: "idiomas",
              estado: 1,
            },
            select: { id_parametros: true },
          }),
          tx.zonas_horarias.findFirst({
            where: {
              id_zonas_horarias: region.fid_zonas_horarias,
              estado: 1,
            },
            select: { id_zonas_horarias: true },
          }),
          tx.parametros.findFirst({
            where: {
              id_parametros: region.fid_parametros_moneda,
              codigo_grupo: "monedas",
              estado: 1,
            },
            select: { id_parametros: true },
          }),
        ]);
        if (!idioma || !zona || !moneda)
          throw new BadRequestException("companies.invalidRegionalization");
        const cambiaSede =
          actual.fid_parametros_idioma !== region.fid_parametros_idioma ||
          actual.fid_zonas_horarias !== region.fid_zonas_horarias;
        const cambiaMoneda =
          actual.entidad_legal.fid_parametros_moneda !==
          region.fid_parametros_moneda;
        if (!cambiaSede && !cambiaMoneda)
          throw new BadRequestException("companies.noChanges");
        if (cambiaSede)
          await tx.sedes.update({
            where: { id_sedes: sede },
            data: {
              fid_parametros_idioma: region.fid_parametros_idioma,
              fid_zonas_horarias: region.fid_zonas_horarias,
              updated_by: usuario,
            },
          });
        if (cambiaMoneda)
          await tx.entidades_legales.update({
            where: {
              id_entidades_legales: actual.fid_entidades_legales,
            },
            data: {
              fid_parametros_moneda: region.fid_parametros_moneda,
              updated_by: usuario,
            },
          });
      } else if (seccion === "servicios") {
        const servicios = datos as SeccionesEmpresa["servicios"];
        const especies = await tx.parametros.findMany({
          where: {
            id_parametros: { in: servicios.fid_parametros_especies },
            codigo_grupo: "especies_animales",
            estado: 1,
          },
          select: { id_parametros: true },
        });
        if (especies.length !== servicios.fid_parametros_especies.length)
          throw new BadRequestException("companies.invalidData");
        await tx.sedes_especies_atendidas.updateMany({
          where: { fid_sedes: sede, fid_organizaciones: organizacion },
          data: { estado: 0, updated_by: usuario },
        });
        for (const fidParametros of servicios.fid_parametros_especies) {
          await tx.sedes_especies_atendidas.upsert({
            where: {
              fid_sedes_fid_parametros: {
                fid_sedes: sede,
                fid_parametros: fidParametros,
              },
            },
            update: { estado: 1, updated_by: usuario },
            create: {
              fid_organizaciones: organizacion,
              fid_sedes: sede,
              fid_parametros: fidParametros,
              created_by: usuario,
              updated_by: usuario,
            },
          });
        }
      } else if (seccion === "agenda") {
        const agenda = datos as SeccionesEmpresa["agenda"];
        const dias = await tx.parametros.findMany({
          where: {
            codigo_grupo: "dias_semana",
            orden: {
              in: [...new Set(agenda.horarios.map((h) => h.dia_semana))],
            },
            estado: 1,
          },
          select: { id_parametros: true, orden: true },
        });
        const ids = new Map(dias.map((dia) => [dia.orden, dia.id_parametros]));
        const claves = new Set(
          agenda.horarios.map((h) => `${h.dia_semana}:${h.turno}`),
        );
        if (
          ids.size !== new Set(agenda.horarios.map((h) => h.dia_semana)).size ||
          claves.size !== agenda.horarios.length ||
          agenda.horarios.some(
            (h) =>
              !ids.has(h.dia_semana) ||
              (!h.cerrado &&
                (!h.hora_apertura ||
                  !h.hora_cierre ||
                  h.hora_apertura >= h.hora_cierre)),
          )
        )
          throw new BadRequestException("companies.invalidSchedule");
        for (const dia of new Set(agenda.horarios.map((h) => h.dia_semana))) {
          const turnos = agenda.horarios
            .filter((h) => h.dia_semana === dia && !h.cerrado)
            .sort((a, b) => a.hora_apertura!.localeCompare(b.hora_apertura!));
          if (
            turnos.some(
              (turno, indice) =>
                indice > 0 &&
                turno.hora_apertura! < turnos[indice - 1]!.hora_cierre!,
            )
          )
            throw new BadRequestException("companies.invalidSchedule");
        }
        await tx.sedes.update({
          where: { id_sedes: sede },
          data: {
            agenda_activa: agenda.agenda_activa,
            duracion_cita_estimada: agenda.duracion_cita_estimada,
            updated_by: usuario,
          },
        });
        await tx.horarios_atencion_sedes.updateMany({
          where: { fid_sedes: sede, fid_organizaciones: organizacion },
          data: { estado: 0, updated_by: usuario },
        });
        for (const horario of agenda.horarios) {
          const fidDia = ids.get(horario.dia_semana)!;
          await tx.horarios_atencion_sedes.upsert({
            where: {
              fid_sedes_fid_parametros_dia_semana_turno: {
                fid_sedes: sede,
                fid_parametros_dia_semana: fidDia,
                turno: horario.turno,
              },
            },
            update: {
              cerrado: horario.cerrado,
              hora_apertura: horario.hora_apertura,
              hora_cierre: horario.hora_cierre,
              estado: 1,
              updated_by: usuario,
            },
            create: {
              fid_organizaciones: organizacion,
              fid_sedes: sede,
              fid_parametros_dia_semana: fidDia,
              turno: horario.turno,
              cerrado: horario.cerrado,
              hora_apertura: horario.hora_apertura,
              hora_cierre: horario.hora_cierre,
              created_by: usuario,
              updated_by: usuario,
            },
          });
        }
      } else if (seccion === "digital") {
        const digital = datos as SeccionesEmpresa["digital"];
        const siguiente = Object.fromEntries(
          Object.entries(digital).map(([campo, valor]) => [
            campo,
            valor || null,
          ]),
        );
        const cambia = Object.entries(siguiente).some(
          ([campo, valor]) => actual[campo as keyof typeof actual] !== valor,
        );
        if (!cambia) throw new BadRequestException("companies.noChanges");
        await tx.sedes.update({
          where: { id_sedes: sede },
          data: { ...siguiente, updated_by: usuario },
        });
      } else if (seccion === "identidad") {
        const identidad = datos as SeccionesEmpresa["identidad"];
        if (
          identidad.ui_mostrar_escudo_menu &&
          !actual.escudo_url &&
          !actual.escudo_oscuro_url
        )
          throw new BadRequestException("companies.appearance.shieldRequired");
        if (
          identidad.ui_ocultar_esquinero_expandido &&
          (!identidad.ui_mostrar_escudo_menu ||
            (!actual.escudo_url && !actual.escudo_oscuro_url))
        )
          throw new BadRequestException(
            "companies.appearance.cornerHideRequiresShield",
          );
        const colorCompleto = /^#[0-9A-Fa-f]{6}$/;
        if (
          identidad.ui_esquinero_fondo_activo &&
          (!colorCompleto.test(
            identidad.ui_esquinero_claro || identidad.color_primario,
          ) ||
            !colorCompleto.test(
              identidad.ui_esquinero_oscuro || identidad.color_primario,
            ))
        )
          throw new BadRequestException(
            "companies.appearance.cornerBackgroundRequiresColor",
          );
        const siguiente = Object.fromEntries(
          Object.entries(identidad).map(([campo, valor]) => [
            campo,
            typeof valor === "string" ? valor || null : valor,
          ]),
        );
        const cambia = Object.entries(siguiente).some(
          ([campo, valor]) => actual[campo as keyof typeof actual] !== valor,
        );
        if (!cambia) throw new BadRequestException("companies.noChanges");
        await tx.sedes.updateMany({
          where: {
            fid_organizaciones: organizacion,
            estado: 1,
            eliminado_en: null,
          },
          data: { ...siguiente, updated_by: usuario },
        });
      } else if (seccion === "comunicaciones") {
        const comunicaciones = datos as SeccionesEmpresa["comunicaciones"];
        await tx.sedes.update({
          where: { id_sedes: sede },
          data: {
            soporte_correo: comunicaciones.soporte_correo || null,
            soporte_telefono: comunicaciones.soporte_telefono || null,
            soporte_whatsapp: comunicaciones.soporte_whatsapp || null,
            updated_by: usuario,
          },
        });
      } else if (seccion === "login") {
        const login = datos as SeccionesEmpresa["login"];
        const siguiente = Object.fromEntries(
          Object.entries(login).map(([campo, valor]) => [
            campo,
            typeof valor === "string" ? valor || null : valor,
          ]),
        );
        const cambia = Object.entries(siguiente).some(
          ([campo, valor]) => actual[campo as keyof typeof actual] !== valor,
        );
        if (!cambia) throw new BadRequestException("companies.noChanges");
        await tx.sedes.update({
          where: { id_sedes: sede },
          data: { ...siguiente, updated_by: usuario },
        });
      } else if (seccion === "fiscal") {
        const fiscal = datos as SeccionesEmpresa["fiscal"];
        if (
          Boolean(fiscal.fid_parametros_tipo_documento_fiscal) !==
          Boolean(fiscal.fiscal_numero_documento)
        )
          throw new BadRequestException("companies.invalidFiscalDocument");
        const [tipoPersona, responsabilidad, tipoDocumento] = await Promise.all(
          [
            fiscal.fid_parametros_tipo_persona_fiscal
              ? tx.parametros.findFirst({
                  where: {
                    id_parametros: fiscal.fid_parametros_tipo_persona_fiscal,
                    codigo_grupo: "tipos_persona_fiscal",
                    estado: 1,
                  },
                })
              : null,
            fiscal.fid_parametros_responsabilidad_fiscal
              ? tx.parametros.findFirst({
                  where: {
                    id_parametros: fiscal.fid_parametros_responsabilidad_fiscal,
                    codigo_grupo: "responsabilidades_fiscales",
                    estado: 1,
                  },
                })
              : null,
            fiscal.fid_parametros_tipo_documento_fiscal
              ? tx.tipos_identificacion_fiscal.findFirst({
                  where: {
                    id_tipos_identificacion_fiscal:
                      fiscal.fid_parametros_tipo_documento_fiscal,
                    fid_admin_level_0: actual.entidad_legal.fid_admin_level_0,
                    estado: 1,
                  },
                  select: {
                    patron: true,
                    longitud_minima: true,
                    longitud_maxima: true,
                  },
                })
              : null,
          ],
        );
        if (
          (fiscal.fid_parametros_tipo_persona_fiscal && !tipoPersona) ||
          (fiscal.fid_parametros_responsabilidad_fiscal && !responsabilidad) ||
          (fiscal.fid_parametros_tipo_documento_fiscal && !tipoDocumento)
        )
          throw new BadRequestException("companies.invalidData");
        const numero = fiscal.fiscal_numero_documento;
        if (
          tipoDocumento &&
          ((tipoDocumento.longitud_minima &&
            numero.length < tipoDocumento.longitud_minima) ||
            (tipoDocumento.longitud_maxima &&
              numero.length > tipoDocumento.longitud_maxima) ||
            (tipoDocumento.patron &&
              !new RegExp(tipoDocumento.patron).test(numero)))
        )
          throw new BadRequestException("companies.invalidFiscalDocument");
        await tx.entidades_legales.update({
          where: { id_entidades_legales: actual.fid_entidades_legales },
          data: {
            fid_tipos_identificacion_fiscal:
              fiscal.fid_parametros_tipo_documento_fiscal,
            numero_identificacion_fiscal: numero || null,
            razon_social: fiscal.fiscal_razon_social || null,
            fid_parametros_tipo_persona:
              fiscal.fid_parametros_tipo_persona_fiscal,
            fid_parametros_responsabilidad_fiscal:
              fiscal.fid_parametros_responsabilidad_fiscal,
            afecto_impuesto: fiscal.fiscal_afecto_igv,
            telefono_fiscal: fiscal.fiscal_telefono || null,
            correo_fiscal: fiscal.fiscal_correo || null,
            direccion_fiscal: fiscal.fiscal_direccion || null,
            updated_by: usuario,
          },
        });
      }

      await this.auditoria.registrar(
        {
          accion: `sedes.${seccion}.modificada`,
          entidad: "sedes",
          id_entidad: sede,
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
          peticion: contexto,
          metadatos: {
            seccion,
            fid_entidades_legales: actual.fid_entidades_legales,
          },
        },
        tx,
      );
    });
  }

  async actualizarFiltroColorLoginActual(
    idOrganizacion: string,
    idSedeActual: string,
    activo: boolean,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${idSedeActual}::uuid AND fid_organizaciones = ${idOrganizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
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

      const sede = await tx.sedes.findFirst({
        where: {
          id_sedes: idSedeActual,
          fid_organizaciones: idOrganizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_sedes: true, es_principal: true },
      });
      if (!sede) throw new NotFoundException("companies.branches.notFound");
      if (!sede.es_principal)
        throw new BadRequestException(
          "companies.branches.mainOnlyConfiguration",
        );
      await tx.sedes.update({
        where: { id_sedes: idSedeActual },
        data: {
          login_usar_filtro_color: activo,
          updated_by: idUsuarioActual,
        },
      });

      await this.auditoria.registrar(
        {
          accion: "empresas.login.filtro_color.modificada",
          entidad: "sedes",
          id_entidad: idSedeActual,
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
    const [
      paises,
      nivel1,
      nivel2,
      nivel3,
      zonasHorarias,
      idiomas,
      monedas,
      tiposDocumento,
      especiesAnimales,
      tiposPersonaFiscal,
      responsabilidadesFiscales,
    ] = await Promise.all([
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
          id_admin_level_3: true,
          fid_admin_level_1: true,
          fid_admin_level_2: true,
          codigo: true,
          nombre: true,
        },
      }),
      this.prisma.zonas_horarias.findMany({
        where: { estado: 1 },
        orderBy: { nombre_iana: "asc" },
        select: { id_zonas_horarias: true, nombre_iana: true },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "idiomas", estado: 1 },
        orderBy: { orden: "asc" },
        select: { id_parametros: true, codigo: true, etiqueta: true },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "monedas", estado: 1 },
        orderBy: { orden: "asc" },
        select: { id_parametros: true, codigo: true, etiqueta: true },
      }),
      this.prisma.tipos_identificacion_fiscal.findMany({
        where: { estado: 1, pais: { codigo_iso2: "PE", estado: 1 } },
        orderBy: { nombre: "asc" },
        select: {
          id_tipos_identificacion_fiscal: true,
          codigo: true,
          nombre: true,
        },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "especies_animales", estado: 1 },
        orderBy: { orden: "asc" },
        select: { id_parametros: true, codigo: true, etiqueta: true },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "tipos_persona_fiscal", estado: 1 },
        orderBy: { orden: "asc" },
        select: { id_parametros: true, codigo: true, etiqueta: true },
      }),
      this.prisma.parametros.findMany({
        where: { codigo_grupo: "responsabilidades_fiscales", estado: 1 },
        orderBy: { orden: "asc" },
        select: { id_parametros: true, codigo: true, etiqueta: true },
      }),
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
      tipos_documento: tiposDocumento.map((tipo) => ({
        id_parametros: tipo.id_tipos_identificacion_fiscal,
        codigo: tipo.codigo,
        etiqueta: tipo.nombre,
      })),
      especies_animales: especiesAnimales,
      tipos_persona_fiscal: tiposPersonaFiscal,
      responsabilidades_fiscales: responsabilidadesFiscales,
    };
  }

  private async marcaSedeDesde(
    idOrganizacion: string,
    idSedeActual: string,
    cliente: ClientePrisma | PrismaService = this.prisma,
  ): Promise<MarcaEmpresa> {
    const sede = await cliente.sedes.findFirst({
      where: {
        id_sedes: idSedeActual,
        fid_organizaciones: idOrganizacion,
        estado: 1,
        eliminado_en: null,
      },
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
        imagenes_login: {
          where: { estado: 1 },
          orderBy: [{ orden: "asc" }, { created_at: "asc" }],
          select: {
            id_imagenes_login_sede: true,
            clave_objeto: true,
            orden: true,
            texto_alternativo: true,
          },
        },
      },
    });
    if (!sede) throw new NotFoundException("companies.branches.notFound");
    return {
      escudo_version: versionMedioEmpresa(sede.escudo_url),
      escudo_oscuro_version: versionMedioEmpresa(sede.escudo_oscuro_url),
      escudo_misma_imagen: sede.escudo_misma_imagen,
      imagotipo_version: versionMedioEmpresa(sede.imagotipo_url),
      imagotipo_oscuro_version: versionMedioEmpresa(sede.imagotipo_oscuro_url),
      imagotipo_misma_imagen: sede.imagotipo_misma_imagen,
      login_escudo_version: versionMedioEmpresa(sede.login_escudo_url),
      login_escudo_oscuro_version: versionMedioEmpresa(
        sede.login_escudo_oscuro_url,
      ),
      login_escudo_misma_imagen: sede.login_escudo_misma_imagen,
      portadas: sede.imagenes_login.map((imagen) => ({
        id: imagen.id_imagenes_login_sede,
        version: versionMedioEmpresa(imagen.clave_objeto)!,
        orden: imagen.orden,
        texto_alternativo: imagen.texto_alternativo ?? "",
      })),
    };
  }

  async obtenerMarcaActual(idOrganizacion: string, idSedeActual: string) {
    await this.validarEmpresaActual(this.prisma, idOrganizacion);
    return this.marcaSedeDesde(idOrganizacion, idSedeActual);
  }

  private async exigirConfiguracionVisualPrincipal(
    cliente: ClientePrisma | PrismaService,
    organizacion: string,
    sede: string,
    _tipo:
      | ComandoGuardarMedioEmpresa["tipo"]
      | ComandoCompartirMedioEmpresa["tipo"],
  ) {
    const actual = await cliente.sedes.findFirst({
      where: {
        id_sedes: sede,
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
      },
      select: { es_principal: true },
    });
    if (!actual) throw new NotFoundException("companies.branches.notFound");
    if (!actual.es_principal)
      throw new BadRequestException(
        "companies.branches.mainOnlyConfiguration",
      );
  }

  async guardarMedioActual(
    idOrganizacion: string,
    idSedeActual: string,
    comando: ComandoGuardarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    await this.validarEmpresaActual(this.prisma, idOrganizacion);
    await this.exigirConfiguracionVisualPrincipal(
      this.prisma,
      idOrganizacion,
      idSedeActual,
      comando.tipo,
    );
    const nuevo = await this.medios.guardar(
      idOrganizacion,
      comando.tipo,
      comando.archivo,
    );
    const anteriores = new Set<string | null>();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${idSedeActual}::uuid AND fid_organizaciones = ${idOrganizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
        const sede = await tx.sedes.findFirst({
          where: {
            id_sedes: idSedeActual,
            fid_organizaciones: idOrganizacion,
            estado: 1,
            eliminado_en: null,
          },
        });
        if (!sede) throw new NotFoundException("companies.branches.notFound");
        if (comando.tipo === "portada") {
          const activas = await tx.imagenes_login_sede.count({
            where: { fid_sedes: idSedeActual, estado: 1 },
          });
          if (activas >= 4)
            throw new BadRequestException("companies.media.coverLimit");
          const ultima = await tx.imagenes_login_sede.aggregate({
            where: { fid_sedes: idSedeActual },
            _max: { orden: true },
          });
          await tx.imagenes_login_sede.create({
            data: {
              fid_organizaciones: idOrganizacion,
              fid_sedes: idSedeActual,
              clave_objeto: nuevo.clave,
              orden: (ultima._max.orden ?? 0) + 1,
              texto_alternativo: comando.texto_alternativo?.trim() || null,
              created_by: idUsuarioActual,
              updated_by: idUsuarioActual,
            },
          });
        } else {
          const campo = campoMarca(comando.tipo);
          const esEscudo = comando.tipo.startsWith("escudo");
          const esLoginEscudo = comando.tipo.startsWith("login_escudo");
          const esOscura = comando.tipo.endsWith("_oscuro");
          const mismaImagen = esEscudo
            ? sede.escudo_misma_imagen
            : esLoginEscudo
              ? sede.login_escudo_misma_imagen
              : sede.imagotipo_misma_imagen;
          if (esOscura && mismaImagen)
            throw new BadRequestException("companies.media.sharedVariant");
          anteriores.add(sede[campo] as string | null);
          const data: Record<string, string> = {
            [campo]: nuevo.clave,
            updated_by: idUsuarioActual,
          };
          if (!esOscura && mismaImagen) {
            const campoOscuro = esEscudo
              ? "escudo_oscuro_url"
              : esLoginEscudo
                ? "login_escudo_oscuro_url"
                : "imagotipo_oscuro_url";
            anteriores.add(
              sede[campoOscuro as keyof typeof sede] as string | null,
            );
            data[campoOscuro] = nuevo.clave;
          }
          if (comando.tipo.startsWith("login_")) {
            await tx.sedes.update({ where: { id_sedes: idSedeActual }, data });
          } else {
            await tx.sedes.updateMany({
              where: {
                fid_organizaciones: idOrganizacion,
                estado: 1,
                eliminado_en: null,
              },
              data,
            });
          }
        }
        await this.auditoria.registrar(
          {
            accion: `sedes.medio.${comando.tipo}.actualizado`,
            entidad: "sedes",
            id_entidad: idSedeActual,
            fid_organizaciones: idOrganizacion,
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
    return this.marcaSedeDesde(idOrganizacion, idSedeActual);
  }

  async eliminarMedioActual(
    idOrganizacion: string,
    idSedeActual: string,
    comando: ComandoEliminarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ) {
    const claves = new Set<string | null>();
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${idSedeActual}::uuid AND fid_organizaciones = ${idOrganizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
      const sede = await tx.sedes.findFirst({
        where: {
          id_sedes: idSedeActual,
          fid_organizaciones: idOrganizacion,
          estado: 1,
          eliminado_en: null,
        },
      });
      if (!sede) throw new NotFoundException("companies.branches.notFound");
      await this.exigirConfiguracionVisualPrincipal(
        tx,
        idOrganizacion,
        idSedeActual,
        comando.tipo,
      );
      if (comando.tipo === "portada") {
        if (!comando.id_portada)
          throw new BadRequestException("companies.media.invalidRequest");
        const portada = await tx.imagenes_login_sede.findFirst({
          where: {
            id_imagenes_login_sede: comando.id_portada,
            fid_sedes: idSedeActual,
            estado: 1,
          },
        });
        if (!portada) throw new NotFoundException("companies.media.notFound");
        claves.add(portada.clave_objeto);
        await tx.imagenes_login_sede.update({
          where: { id_imagenes_login_sede: comando.id_portada },
          data: { estado: 0, updated_by: idUsuarioActual },
        });
      } else {
        const campo = campoMarca(comando.tipo);
        const esEscudo = comando.tipo.startsWith("escudo");
        const esLoginEscudo = comando.tipo.startsWith("login_escudo");
        const esOscura = comando.tipo.endsWith("_oscuro");
        const mismaImagen = esEscudo
          ? sede.escudo_misma_imagen
          : esLoginEscudo
            ? sede.login_escudo_misma_imagen
            : sede.imagotipo_misma_imagen;
        if (esOscura && mismaImagen)
          throw new BadRequestException("companies.media.sharedVariant");
        const clave = sede[campo] as string | null;
        if (!clave) throw new NotFoundException("companies.media.notFound");
        claves.add(clave);
        const data: Record<string, string | boolean | null> = {
          [campo]: null,
          updated_by: idUsuarioActual,
        };
        if (!esOscura && mismaImagen) {
          const campoOscuro = esEscudo
            ? "escudo_oscuro_url"
            : esLoginEscudo
              ? "login_escudo_oscuro_url"
              : "imagotipo_oscuro_url";
          claves.add(sede[campoOscuro as keyof typeof sede] as string | null);
          data[campoOscuro] = null;
        }
        if (
          esEscudo &&
          !sede.escudo_url &&
          (campo === "escudo_oscuro_url" || (!esOscura && mismaImagen))
        ) {
          data.ui_mostrar_escudo_menu = false;
          data.ui_ocultar_esquinero_expandido = false;
        }
        if (comando.tipo.startsWith("login_")) {
          await tx.sedes.update({ where: { id_sedes: idSedeActual }, data });
        } else {
          await tx.sedes.updateMany({
            where: {
              fid_organizaciones: idOrganizacion,
              estado: 1,
              eliminado_en: null,
            },
            data,
          });
        }
      }
      await this.auditoria.registrar(
        {
          accion: `sedes.medio.${comando.tipo}.eliminado`,
          entidad: "sedes",
          id_entidad: idSedeActual,
          fid_organizaciones: idOrganizacion,
          fid_usuarios: idUsuarioActual,
          peticion: contexto,
          metadatos: { tipo: comando.tipo },
        },
        tx,
      );
    });
    await this.eliminarMarcaSinReferencia(idOrganizacion, claves);
    return this.marcaSedeDesde(idOrganizacion, idSedeActual);
  }

  async obtenerMedioActual(
    idOrganizacion: string,
    idSedeActual: string,
    consulta: ConsultaMedioEmpresa,
  ) {
    let clave: string | null = null;
    if (consulta.tipo === "portada") {
      const portada = await this.prisma.imagenes_login_sede.findFirst({
        where: {
          fid_organizaciones: idOrganizacion,
          fid_sedes: idSedeActual,
          estado: 1,
          ...(consulta.id_portada
            ? { id_imagenes_login_sede: consulta.id_portada }
            : {}),
        },
        select: { clave_objeto: true },
      });
      clave = portada?.clave_objeto ?? null;
    } else {
      const sede = await this.prisma.sedes.findFirst({
        where: {
          id_sedes: idSedeActual,
          fid_organizaciones: idOrganizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: {
          escudo_url: true,
          escudo_oscuro_url: true,
          imagotipo_url: true,
          imagotipo_oscuro_url: true,
          login_escudo_url: true,
          login_escudo_oscuro_url: true,
        },
      });
      clave = (sede?.[campoMarca(consulta.tipo)] as string | null) ?? null;
    }
    if (!clave || versionMedioEmpresa(clave) !== consulta.version)
      throw new NotFoundException("companies.media.notFound");
    return this.medios.leer(clave);
  }

  async listarSedesActual(organizacion: string, _idioma: string) {
    await this.validarEmpresaActual(this.prisma, organizacion);
    const [sedes, plan] = await Promise.all([
      this.prisma.sedes.findMany({
        where: { fid_organizaciones: organizacion, eliminado_en: null },
        orderBy: [
          { es_principal: "desc" },
          { created_at: "desc" },
          { id_sedes: "desc" },
        ],
        select: {
          id_sedes: true,
          codigo: true,
          nombre: true,
          es_principal: true,
          estado: true,
          created_at: true,
          _count: {
            select: {
              usuarios: { where: { estado: 1 } },
              atenciones: true,
              ventas: true,
              citas: true,
            },
          },
        },
      }),
      this.prisma.organizaciones.findFirst({
        where: { id_organizaciones: organizacion },
        select: { plan: { select: { maximo_sedes: true } } },
      }),
    ]);
    return {
      sedes,
      total: sedes.filter((sede) => sede.estado === 1).length,
      limite: plan?.plan.maximo_sedes ?? null,
    };
  }

  private async validarDatosSede(
    tx: ClientePrisma,
    datos: DatosSede,
    actor: ActorSede,
  ) {
    await this.validarOrganizacionActiva(tx, actor.organizacion);
    const usuario = await tx.usuarios.findFirst({
      where: {
        id_usuarios: actor.usuario,
        fid_organizaciones: actor.organizacion,
        estado: 1,
        estado_cuenta: "activo",
        eliminado_en: null,
      },
      select: { id_usuarios: true },
    });
    if (!usuario) throw new NotFoundException("companies.branches.unavailable");
    const [entidadLegal, idioma, zonaHoraria] = await Promise.all([
      tx.entidades_legales.findFirst({
        where: {
          id_entidades_legales: datos.fid_entidades_legales,
          fid_organizaciones: actor.organizacion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_entidades_legales: true, fid_admin_level_0: true },
      }),
      tx.parametros.findFirst({
        where: {
          id_parametros: datos.fid_parametros_idioma,
          codigo_grupo: "idiomas",
          estado: 1,
        },
        select: { id_parametros: true },
      }),
      tx.zonas_horarias.findFirst({
        where: { id_zonas_horarias: datos.fid_zonas_horarias, estado: 1 },
        select: { id_zonas_horarias: true },
      }),
    ]);
    if (!entidadLegal || !idioma || !zonaHoraria)
      throw new BadRequestException(
        "companies.branches.invalidRegionalization",
      );
    if (
      !datos.sin_sede_fisica &&
      datos.fid_admin_level_0 !== entidadLegal.fid_admin_level_0
    )
      throw new BadRequestException("companies.branches.countryMismatch");
    if (datos.sin_sede_fisica) {
      if (
        datos.direccion ||
        datos.fid_admin_level_0 ||
        datos.fid_admin_level_3 ||
        datos.latitud ||
        datos.longitud
      )
        throw new BadRequestException("companies.branches.addressNotAllowed");
    } else if (
      !datos.direccion ||
      !datos.fid_admin_level_0 ||
      !datos.fid_admin_level_3
    ) {
      throw new BadRequestException("companies.branches.addressRequired");
    }
    if (Boolean(datos.latitud) !== Boolean(datos.longitud))
      throw new BadRequestException("companies.branches.invalidCoordinates");
    if (datos.fid_admin_level_3) {
      const ubigeo = await tx.admin_level_3.findFirst({
        where: {
          id_admin_level_3: datos.fid_admin_level_3,
          estado: 1,
          admin_level_1: { fid_admin_level_0: datos.fid_admin_level_0! },
        },
        select: { id_admin_level_3: true },
      });
      if (!ubigeo)
        throw new BadRequestException("companies.branches.invalidLocation");
    }
    if (
      new Set(datos.fid_servicios_veterinaria).size !==
      datos.fid_servicios_veterinaria.length
    )
      throw new BadRequestException("companies.branches.invalidServices");
    const servicios = await tx.servicios_veterinaria.count({
      where: {
        id_servicios_veterinaria: { in: datos.fid_servicios_veterinaria },
        fid_organizaciones: actor.organizacion,
        estado: 1,
        eliminado_en: null,
      },
    });
    if (servicios !== datos.fid_servicios_veterinaria.length)
      throw new BadRequestException("companies.branches.invalidServices");
    const claves = new Set(
      datos.horarios.map(
        (horario) => `${horario.fid_parametros_dia_semana}:${horario.turno}`,
      ),
    );
    if (claves.size !== datos.horarios.length)
      throw new BadRequestException("companies.branches.invalidSchedule");
    const dias = await tx.parametros.count({
      where: {
        id_parametros: {
          in: [
            ...new Set(
              datos.horarios.map(
                (horario) => horario.fid_parametros_dia_semana,
              ),
            ),
          ],
        },
        codigo_grupo: "dias_semana",
        estado: 1,
      },
    });
    if (
      dias !==
      new Set(
        datos.horarios.map((horario) => horario.fid_parametros_dia_semana),
      ).size
    )
      throw new BadRequestException("companies.branches.invalidSchedule");
    for (const horario of datos.horarios) {
      if (
        horario.cerrado
          ? horario.hora_apertura || horario.hora_cierre
          : !horario.hora_apertura ||
            !horario.hora_cierre ||
            horario.hora_apertura >= horario.hora_cierre
      )
        throw new BadRequestException("companies.branches.invalidSchedule");
    }
    for (const dia of new Set(
      datos.horarios.map((horario) => horario.fid_parametros_dia_semana),
    )) {
      const turnos = datos.horarios
        .filter(
          (horario) =>
            horario.fid_parametros_dia_semana === dia && !horario.cerrado,
        )
        .sort((a, b) => a.hora_apertura!.localeCompare(b.hora_apertura!));
      if (
        turnos.some(
          (turno, indice) =>
            indice > 0 &&
            turno.hora_apertura! < turnos[indice - 1]!.hora_cierre!,
        )
      )
        throw new BadRequestException("companies.branches.overlappingSchedule");
    }
  }

  private datosPersistenciaSede(datos: DatosSede) {
    return {
      fid_entidades_legales: datos.fid_entidades_legales,
      fid_parametros_idioma: datos.fid_parametros_idioma,
      fid_zonas_horarias: datos.fid_zonas_horarias,
      codigo: datos.codigo,
      nombre: datos.nombre,
      es_principal: datos.es_principal,
      sin_sede_fisica: datos.sin_sede_fisica,
      direccion: datos.direccion,
      referencia: datos.referencia,
      fid_admin_level_0: datos.fid_admin_level_0,
      fid_admin_level_3: datos.fid_admin_level_3,
      latitud: datos.latitud ? new Prisma.Decimal(datos.latitud) : null,
      longitud: datos.longitud ? new Prisma.Decimal(datos.longitud) : null,
      telefono: datos.telefono,
      telefono_secundario: datos.telefono_secundario,
      correo_contacto: datos.correo_contacto,
      correo_contacto_secundario: datos.correo_contacto_secundario,
      agenda_activa: datos.agenda_activa,
      duracion_cita_estimada: datos.duracion_cita_estimada,
    };
  }

  private async validarCupoSedes(tx: ClientePrisma, organizacion: string) {
    const [plan] = await tx.$queryRaw<Array<{ maximo_sedes: number | null }>>`
      SELECT plan.maximo_sedes
      FROM nucleo.organizaciones empresa
      JOIN configuracion.planes plan ON plan.id_planes = empresa.fid_planes
      WHERE empresa.id_organizaciones = ${organizacion}::uuid
        AND empresa.estado = 1
        AND empresa.eliminado_en IS NULL
        AND plan.estado = 1
        AND plan.eliminado_en IS NULL
      FOR UPDATE OF empresa
    `;
    if (!plan) throw new BadRequestException("companies.branches.unavailable");
    if (plan.maximo_sedes === null) return;
    const activas = await tx.sedes.count({
      where: {
        fid_organizaciones: organizacion,
        estado: 1,
        eliminado_en: null,
      },
    });
    if (activas >= plan.maximo_sedes)
      throw new BadRequestException("companies.branches.planLimit");
  }

  async crearSedeActual(datos: DatosBasicosSede, actor: ActorSede) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarOrganizacionActiva(tx, actor.organizacion);
      await this.validarCupoSedes(tx, actor.organizacion);
      const [origen, principal, regionalizacion] = await Promise.all([
        tx.sedes.findFirst({
          where: {
            id_sedes: actor.sedeOrigen,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            eliminado_en: null,
            usuarios: {
              some: { fid_usuarios: actor.usuario, estado: 1 },
            },
          },
          select: { id_sedes: true },
        }),
        tx.sedes.findFirst({
          where: {
            fid_organizaciones: actor.organizacion,
            es_principal: true,
            estado: 1,
            eliminado_en: null,
          },
          include: {
            entidad_legal: { select: { fid_admin_level_0: true } },
          },
        }),
        this.regionalizacionPredeterminada(tx),
      ]);
      if (!origen)
        throw new ForbiddenException("companies.branches.notAssigned");
      if (!principal)
        throw new NotFoundException("companies.branches.notFound");
      const entidadLegal = await tx.entidades_legales.create({
        data: {
          fid_organizaciones: actor.organizacion,
          codigo: `SEDE-${datos.codigo}`,
          es_principal: false,
          fid_admin_level_0: principal.entidad_legal.fid_admin_level_0,
          fid_parametros_moneda: regionalizacion.fid_parametros_moneda,
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
      });
      let sede;
      try {
        sede = await tx.sedes.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_entidades_legales: entidadLegal.id_entidades_legales,
            fid_parametros_idioma: regionalizacion.fid_parametros_idioma,
            fid_zonas_horarias: regionalizacion.fid_zonas_horarias,
            codigo: datos.codigo,
            nombre: datos.nombre,
            es_principal: false,
            // La sede nace sin datos operativos; esto mantiene coherente la
            // restricción de BD hasta que el administrador registre su ubicación.
            sin_sede_fisica: true,
            agenda_activa: false,
            login_usar_filtro_color: false,
            login_mostrar_etiqueta: false,
            login_mostrar_destacados: false,
            login_mostrar_comunidad: false,
            escudo_url: principal.escudo_url,
            escudo_oscuro_url: principal.escudo_oscuro_url,
            escudo_misma_imagen: principal.escudo_misma_imagen,
            imagotipo_url: principal.imagotipo_url,
            imagotipo_oscuro_url: principal.imagotipo_oscuro_url,
            imagotipo_misma_imagen: principal.imagotipo_misma_imagen,
            color_primario: principal.color_primario,
            ui_cabecera_claro: principal.ui_cabecera_claro,
            ui_cabecera_oscuro: principal.ui_cabecera_oscuro,
            ui_esquinero_claro: principal.ui_esquinero_claro,
            ui_esquinero_oscuro: principal.ui_esquinero_oscuro,
            ui_menu_claro: principal.ui_menu_claro,
            ui_menu_oscuro: principal.ui_menu_oscuro,
            ui_mostrar_escudo_menu: principal.ui_mostrar_escudo_menu,
            ui_mostrar_nombre_empresa_menu:
              principal.ui_mostrar_nombre_empresa_menu,
            ui_ocultar_esquinero_expandido:
              principal.ui_ocultar_esquinero_expandido,
            ui_esquinero_fondo_activo: principal.ui_esquinero_fondo_activo,
            ui_cabecera_ocultar_borde: principal.ui_cabecera_ocultar_borde,
            ui_menu_ocultar_borde: principal.ui_menu_ocultar_borde,
            ui_tamano_escudo_menu: principal.ui_tamano_escudo_menu,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
          select: { id_sedes: true, nombre: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new ConflictException("companies.branches.duplicateCode");
        throw error;
      }
      await Promise.all([
        tx.usuarios_sedes.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            fid_sedes: sede.id_sedes,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
        }),
        tx.almacenes.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_sedes: sede.id_sedes,
            codigo: `ALM-${datos.codigo}`,
            nombre: `Almacén ${datos.nombre}`,
            es_principal: true,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
        }),
        tx.cajas.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_sedes: sede.id_sedes,
            codigo: `CAJ-${datos.codigo}`,
            nombre: `Caja ${datos.nombre}`,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
        }),
      ]);
      await this.auditoria.registrar(
        {
          accion: "sedes.creada",
          entidad: "sedes",
          id_entidad: sede.id_sedes,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
          metadatos: { nombre: sede.nombre, origen: actor.sedeOrigen },
        },
        tx,
      );
      return sede;
    });
  }

  async actualizarSedeActual(
    id: string,
    datos: DatosBasicosSede,
    actor: ActorSede,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarOrganizacionActiva(tx, actor.organizacion);
      await tx.$queryRaw`SELECT id_sedes FROM nucleo.sedes WHERE id_sedes = ${id}::uuid AND fid_organizaciones = ${actor.organizacion}::uuid AND eliminado_en IS NULL FOR UPDATE`;
      const actual = await tx.sedes.findFirst({
        where: {
          id_sedes: id,
          fid_organizaciones: actor.organizacion,
          eliminado_en: null,
        },
        select: { id_sedes: true, nombre: true, es_principal: true },
      });
      if (!actual) throw new NotFoundException("companies.branches.notFound");
      if (actual.es_principal)
        throw new ConflictException("companies.branches.mainCannotUpdate");
      try {
        await tx.sedes.update({
          where: { id_sedes: id },
          data: {
            codigo: datos.codigo,
            nombre: datos.nombre,
            updated_by: actor.usuario,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
          throw new ConflictException("companies.branches.duplicateCode");
        throw error;
      }
      await this.auditoria.registrar(
        {
          accion: "sedes.modificada",
          entidad: "sedes",
          id_entidad: id,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
          metadatos: { anterior: actual.nombre, nuevo: datos.nombre },
        },
        tx,
      );
      return { id_sedes: id };
    });
  }

  async eliminarSedeActual(id: string, actor: ActorSede) {
    await this.prisma.$transaction(async (tx) => {
      await this.validarOrganizacionActiva(tx, actor.organizacion);
      const sede = await tx.sedes.findFirst({
        where: {
          id_sedes: id,
          fid_organizaciones: actor.organizacion,
          eliminado_en: null,
        },
        select: {
          es_principal: true,
          nombre: true,
          _count: {
            select: {
              atenciones: true,
              ventas: true,
              citas: true,
              propietarios_registrados: true,
              mascotas_registradas: true,
            },
          },
        },
      });
      if (!sede) throw new NotFoundException("companies.branches.notFound");
      if (sede.es_principal)
        throw new ConflictException("companies.branches.mainCannotDelete");
      if (
        sede._count.atenciones +
          sede._count.ventas +
          sede._count.citas +
          sede._count.propietarios_registrados +
          sede._count.mascotas_registradas >
        0
      )
        throw new ConflictException("companies.branches.inUse");
      await tx.$executeRaw`UPDATE nucleo.sedes SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${actor.usuario}::uuid, updated_by = ${actor.usuario} WHERE id_sedes = ${id}::uuid AND fid_organizaciones = ${actor.organizacion}::uuid AND eliminado_en IS NULL`;
      await this.auditoria.registrar(
        {
          accion: "sedes.eliminada",
          entidad: "sedes",
          id_entidad: id,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
          metadatos: { nombre: sede.nombre },
        },
        tx,
      );
    });
  }

  async seleccionarSedeActual(id: string, actor: ActorSede) {
    await this.prisma.$transaction(async (tx) => {
      const asignacion = await tx.usuarios_sedes.findFirst({
        where: {
          fid_usuarios: actor.usuario,
          fid_organizaciones: actor.organizacion,
          fid_sedes: id,
          estado: 1,
          sede: { estado: 1, eliminado_en: null },
        },
        select: { id_usuarios_sedes: true },
      });
      if (!asignacion)
        throw new ForbiddenException("companies.branches.notAssigned");
      await tx.preferencias_usuario.upsert({
        where: { fid_usuarios: actor.usuario },
        create: {
          fid_usuarios: actor.usuario,
          fid_sedes: id,
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        update: {
          fid_sedes: id,
          updated_by: actor.usuario,
        },
      });
      await this.auditoria.registrar(
        {
          accion: "sedes.seleccionada",
          entidad: "sedes",
          id_entidad: id,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
        },
        tx,
      );
    });
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
