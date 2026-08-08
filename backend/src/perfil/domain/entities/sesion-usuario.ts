/** Ubicación aproximada de la sesión, derivada de la IP. */
export interface UbicacionSesion {
  /** IP local/privada (LAN, loopback): no hay geolocalización pública. */
  local: boolean;
  /** Ciudad o región (nombre del Level 1 territorial, o etiqueta libre). */
  ciudad: string | null;
  pais_es: string | null;
  pais_en: string | null;
}

export interface SesionUsuario {
  id_sesiones: string;
  actual: boolean;
  plataforma: string;
  tipo_dispositivo: string;
  modelo: string | null;
  version_so: string | null;
  version_app: string | null;
  agente_usuario: string | null;
  ip: string | null;
  ubicacion: UbicacionSesion | null;
  iniciada_en: string;
  ultimo_uso_en: string;
  expira_inactividad_en: string;
}

export interface SesionesUsuario {
  sesiones: SesionUsuario[];
  zona_horaria: string;
  ahora: string;
}
