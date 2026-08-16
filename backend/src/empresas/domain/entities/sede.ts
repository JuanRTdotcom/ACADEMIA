import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";

export interface HorarioSede {
  fid_parametros_dia_semana: string;
  turno: number;
  cerrado: boolean;
  hora_apertura: string | null;
  hora_cierre: string | null;
}

export interface DatosSede {
  fid_entidades_legales: string;
  fid_parametros_idioma: string;
  fid_zonas_horarias: string;
  codigo: string;
  nombre: string;
  es_principal: boolean;
  sin_sede_fisica: boolean;
  direccion: string | null;
  referencia: string | null;
  fid_admin_level_0: string | null;
  fid_admin_level_3: string | null;
  latitud: string | null;
  longitud: string | null;
  telefono: string | null;
  telefono_secundario: string | null;
  correo_contacto: string | null;
  correo_contacto_secundario: string | null;
  agenda_activa: boolean;
  duracion_cita_estimada: number;
  fid_servicios_veterinaria: string[];
  horarios: HorarioSede[];
}

export interface DatosBasicosSede {
  codigo: string;
  nombre: string;
}

export interface ActorSede {
  organizacion: string;
  usuario: string;
  sedeOrigen?: string;
  contexto: ContextoSolicitud;
}
