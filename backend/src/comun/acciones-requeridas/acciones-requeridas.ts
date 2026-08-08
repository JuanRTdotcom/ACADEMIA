/**
 * Identificadores técnicos de acciones que el sistema puede reconciliar.
 * Su contenido visible y sección pertenecen a
 * `seguridad.acciones_requeridas_maestro`.
 */
export const ACCIONES_REQUERIDAS = {
  PERFIL_CORREOS_SIN_VERIFICAR: {
    codigo: "perfil.correos.sin_verificar",
  },
  PERFIL_CAMBIAR_CONTRASENIA: {
    codigo: "perfil.cambiar_contrasenia",
  },
} as const;

export type CodigoAccionRequerida =
  (typeof ACCIONES_REQUERIDAS)[keyof typeof ACCIONES_REQUERIDAS]["codigo"];
