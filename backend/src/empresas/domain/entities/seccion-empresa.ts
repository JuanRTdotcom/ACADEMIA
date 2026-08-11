export const SECCIONES_EMPRESA = [
  "general",
  "contacto",
  "digital",
  "identidad",
  "comunicaciones",
  "region",
  "servicios",
  "agenda",
  "fiscal",
  "login",
] as const;

export type SeccionEmpresa = (typeof SECCIONES_EMPRESA)[number];

export interface ResumenEmpresa {
  id_organizaciones: string;
  nombre: string;
  slug: string;
  estado: number;
  escudo_version: string | null;
  escudo_oscuro_version: string | null;
  url_publica: string;
}

export interface DatosGeneralesEmpresa {
  nombre: string;
  slug: string;
  razon_social: string;
  ruc_nif: string;
  /** Dato informativo devuelto al leer; no forma parte de la edición. */
  plan_nombre?: string;
  suscripcion_inicia_en?: Date | null;
  suscripcion_expira_en?: Date | null;
}

export interface DatosContactoEmpresa {
	 sin_sede_fisica?: boolean;
  direccion: string;
  referencia: string;
  fid_admin_level_0: string;
  codigo_admin_level_3: string;
  telefono: string;
  telefono_secundario: string;
  correo_contacto: string;
  correo_contacto_secundario: string;
  latitud?: string;
  longitud?: string;
}

export interface DatosDigitalesEmpresa {
  sitio_web: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  x_url: string;
}

export interface DatosIdentidadEmpresa {
  color_primario: string;
  ui_cabecera_claro: string;
  ui_cabecera_oscuro: string;
  ui_esquinero_claro: string;
  ui_esquinero_oscuro: string;
  ui_menu_claro: string;
  ui_menu_oscuro: string;
  ui_mostrar_escudo_menu: boolean;
  ui_mostrar_nombre_empresa_menu: boolean;
  ui_ocultar_esquinero_expandido: boolean;
  ui_esquinero_fondo_activo: boolean;
  ui_cabecera_ocultar_borde: boolean;
  ui_menu_ocultar_borde: boolean;
  ui_tamano_escudo_menu: number;
}

export interface DatosLoginEmpresa {
  login_usar_filtro_color: boolean;
  login_mostrar_etiqueta: boolean;
  login_mostrar_destacados: boolean;
  login_mostrar_comunidad: boolean;
  login_etiqueta: string;
  login_titulo: string;
  login_subtitulo: string;
  login_destacado_1: string;
  login_destacado_2: string;
  login_destacado_3: string;
  login_destacado_icono_1: string;
  login_destacado_icono_2: string;
  login_destacado_icono_3: string;
  login_texto_comunidad: string;
}

export interface HorarioAtencionEmpresa {
  dia_semana: number;
  cerrado: boolean;
  hora_apertura: string | null;
  hora_cierre: string | null;
}

export interface DatosComunicacionesEmpresa {
  soporte_correo: string;
  soporte_telefono: string;
  soporte_whatsapp: string;
  horarios: HorarioAtencionEmpresa[];
}

export interface CatalogosUbicacionEmpresa {
  admin_level_0: Array<{
    id_admin_level_0: string;
    codigo_iso2: string;
    nombre: string;
    etiqueta_admin_level_1: string;
    etiqueta_admin_level_2: string | null;
    etiqueta_admin_level_3: string;
  }>;
  admin_level_1: Array<{
    id_admin_level_1: string;
    fid_admin_level_0: string;
    codigo: string;
    nombre: string;
  }>;
  admin_level_2: Array<{
    id_admin_level_2: string;
    fid_admin_level_1: string;
    codigo: string;
    nombre: string;
  }>;
  admin_level_3: Array<{
    fid_admin_level_1: string;
    fid_admin_level_2: string | null;
    codigo: string;
    nombre: string;
  }>;
  zonas_horarias: Array<{ id_zonas_horarias: string; nombre_iana: string }>;
  idiomas: CatalogoParametroEmpresa[];
  monedas: CatalogoParametroEmpresa[];
  tipos_documento: CatalogoParametroEmpresa[];
  especies_animales: CatalogoParametroEmpresa[];
  tipos_persona_fiscal: CatalogoParametroEmpresa[];
  responsabilidades_fiscales: CatalogoParametroEmpresa[];
}

export interface CatalogoParametroEmpresa {
  id_parametros: string;
  codigo: string;
  etiqueta: string;
}

export interface DatosRegionEmpresa {
  fid_parametros_idioma: string;
  fid_zonas_horarias: string;
  fid_parametros_moneda: string;
}

export interface DatosServiciosVeterinaria {
  fid_parametros_especies: string[];
}

export interface HorarioAgendaVeterinaria extends HorarioAtencionEmpresa {
  turno: number;
}

export interface DatosAgendaVeterinaria {
  agenda_activa: boolean;
  duracion_cita_estimada: number;
  horarios: HorarioAgendaVeterinaria[];
}

export interface DatosFiscalVeterinaria {
  fid_parametros_tipo_persona_fiscal: string | null;
  fid_parametros_tipo_documento_fiscal: string | null;
  fiscal_numero_documento: string;
  fiscal_razon_social: string;
  fiscal_afecto_igv: boolean;
  fid_parametros_responsabilidad_fiscal: string | null;
  fiscal_telefono: string;
  fiscal_correo: string;
  fiscal_direccion: string;
}

export interface SeccionesEmpresa {
  general: DatosGeneralesEmpresa;
  contacto: DatosContactoEmpresa;
  digital: DatosDigitalesEmpresa;
  identidad: DatosIdentidadEmpresa;
  comunicaciones: DatosComunicacionesEmpresa;
  region: DatosRegionEmpresa;
  servicios: DatosServiciosVeterinaria;
  agenda: DatosAgendaVeterinaria;
  fiscal: DatosFiscalVeterinaria;
  login: DatosLoginEmpresa;
}
