import type { ResumenAccionesRequeridas } from "../../../comun/domain/entities/resumen-acciones-requeridas";

export interface ComandoAgregarCorreo {
  correo: string;
}

export interface ComandoModificarCorreo {
  id_personas_correos: string;
  correo: string;
}

export interface ComandoEliminarCorreo {
  id_personas_correos: string;
}

export const TIPOS_USO_CORREO = ["principal", "mensajes", "respaldo"] as const;
export type TipoUsoCorreo = (typeof TIPOS_USO_CORREO)[number];

export interface ComandoSeleccionarCorreoUso {
  id_personas_correos: string;
  tipo: TipoUsoCorreo;
}

export interface ComandoActualizarVerificacionCorreo {
  id_personas_correos: string;
  verificado: boolean;
}

export interface CorreoPersona {
  id_personas_correos: string;
  correo: string;
  usos: TipoUsoCorreo[];
  verificado: boolean;
}

export interface ResultadoGestionCorreos {
  ok: true;
  correos: CorreoPersona[];
  acciones_requeridas: ResumenAccionesRequeridas;
}
