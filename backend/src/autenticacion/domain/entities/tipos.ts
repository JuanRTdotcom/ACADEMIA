export interface PreferenciasUsuarioSeguras {
  tema: string | null;
  idioma: string | null;
  menu_colapsado: boolean;
  fid_admin_level_0: string | null;
  fid_zonas_horarias: string | null;
  zona_horaria: string;
}

/** Datos seguros que el frontend puede usar; nunca incluye hashes, tokens o bloqueos. */
export interface ContextoUsuario {
  id_usuarios: string;
  fid_organizaciones: string;
  usuario: string;
  correos: {
    id_personas_correos: string;
    correo: string;
    usos: ("principal" | "mensajes" | "respaldo")[];
    verificado: boolean;
  }[];
  persona: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  };
  avatar: { disponible: boolean; version: string | null };
  organizacion: {
    slug: string;
    nombre: string;
    plan: { codigo: string; nombre: string };
  };
  sedes: {
    id_sedes: string;
    codigo: string;
    nombre: string;
    es_principal: boolean;
  }[];
  sede_activa: {
    id_sedes: string;
    codigo: string;
    nombre: string;
    es_principal: boolean;
    apariencia: {
      color_primario: string | null;
      cabecera_claro: string | null;
      cabecera_oscuro: string | null;
      esquinero_claro: string | null;
      esquinero_oscuro: string | null;
      menu_claro: string | null;
      menu_oscuro: string | null;
      mostrar_escudo_menu: boolean;
      mostrar_nombre_empresa_menu: boolean;
      ocultar_esquinero_expandido: boolean;
      esquinero_fondo_activo: boolean;
      cabecera_ocultar_borde: boolean;
      menu_ocultar_borde: boolean;
      tamano_escudo_menu: number;
      escudo_version: string | null;
      escudo_oscuro_version: string | null;
      imagotipo_version: string | null;
      imagotipo_oscuro_version: string | null;
    };
  } | null;
  roles: { codigo: string; nombre: string }[];
  permisos: string[];
  modulos: {
    codigo: string;
    nombre: string;
    icono: string | null;
    ruta: string | null;
  }[];
  preferencias: PreferenciasUsuarioSeguras;
  seguridad: { segundo_factor_habilitado: boolean };
  acciones_requeridas: {
    total: number;
    por_seccion: Record<string, number>;
  };
}

/** Datos firmados en el access token. Los campos mutables se revalidan en DB. */
export interface PayloadAcceso {
  sub: string; // id_usuarios
  sid: string; // id_sesiones: permite reconocer la sesión actual
  gen: number; // generación vigente: invalida access tokens ya rotados
  fid_organizaciones: string;
  usuario: string;
  roles: string[]; // códigos de rol (ej. "SUPERADMIN", "PROFESOR")
  idioma: string; // idioma preferido del usuario ("en"/"es") — usado por el i18n en sesión
  iat: number; // emitido desde CURRENT_TIMESTAMP de PostgreSQL
  exp: number; // expiración calculada desde el reloj de PostgreSQL
}

/** req.user después de validar sesión y reconstruir el contexto actual desde DB. */
export interface UsuarioAutenticado extends PayloadAcceso {
  permisos: string[]; // autorización vigente reconstruida desde PostgreSQL
  contexto: ContextoUsuario;
}

/** Payload del token de refresco. */
export interface PayloadRefresco {
  sub: string; // id_usuarios
  sid: string; // id_sesiones (estable: NO cambia al rotar; la fila se actualiza en sitio)
  gen: number; // generación del token: distingue el vigente de uno ya rotado (reuso)
  iat: number;
  exp: number;
}
