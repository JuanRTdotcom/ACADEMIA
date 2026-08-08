/**
 * Identificadores técnicos que la aplicación puede emitir.
 * Nombres, descripciones, agregado y visibilidad se leen de
 * `eventos.eventos_maestro`; no se duplican en el código.
 */
export const EVENTOS_FUNCIONALES = {
  AUTENTICACION_INGRESO_EXITO: {
    codigo: "autenticacion.ingreso.exito",
    version: 1,
  },
  AUTENTICACION_CIERRE_EXITO: {
    codigo: "autenticacion.cierre.exito",
    version: 1,
  },
  PERFIL_APARIENCIA_ACTUALIZADA: {
    codigo: "perfil.apariencia.actualizada",
    version: 1,
  },
  PERFIL_DATOS_PERSONALES_ACTUALIZADOS: {
    codigo: "perfil.datos_personales.actualizados",
    version: 1,
  },
  PERFIL_AVATAR_ACTUALIZADO: {
    codigo: "perfil.avatar.actualizado",
    version: 1,
  },
  PERFIL_AVATAR_ELIMINADO: { codigo: "perfil.avatar.eliminado", version: 1 },
  PERFIL_CONTRASENIA_ACTUALIZADA: {
    codigo: "perfil.contrasenia.actualizada",
    version: 1,
  },
  PERFIL_CORREO_AGREGADO: { codigo: "perfil.correo.agregado", version: 1 },
  PERFIL_CORREO_USO_SELECCIONADO: {
    codigo: "perfil.correo.uso_seleccionado",
    version: 1,
  },
  PERFIL_CORREO_MODIFICADO: { codigo: "perfil.correo.modificado", version: 1 },
  PERFIL_CORREO_ELIMINADO: { codigo: "perfil.correo.eliminado", version: 1 },
  PERFIL_NACIONALIDAD_AGREGADA: {
    codigo: "perfil.nacionalidad.agregada",
    version: 1,
  },
  PERFIL_NACIONALIDAD_ELIMINADA: {
    codigo: "perfil.nacionalidad.eliminada",
    version: 1,
  },
  PERFIL_SEGURO_AGREGADO: { codigo: "perfil.seguro.agregado", version: 1 },
  PERFIL_SEGURO_MODIFICADO: { codigo: "perfil.seguro.modificado", version: 1 },
  PERFIL_SEGURO_ELIMINADO: { codigo: "perfil.seguro.eliminado", version: 1 },
  PERFIL_HOBBY_AGREGADO: { codigo: "perfil.hobby.agregado", version: 1 },
  PERFIL_HOBBY_MODIFICADO: { codigo: "perfil.hobby.modificado", version: 1 },
  PERFIL_HOBBY_ELIMINADO: { codigo: "perfil.hobby.eliminado", version: 1 },
  PERFIL_DOCUMENTO_AGREGADO: {
    codigo: "perfil.documento.agregado",
    version: 1,
  },
  PERFIL_DOCUMENTO_MODIFICADO: {
    codigo: "perfil.documento.modificado",
    version: 1,
  },
  PERFIL_DOCUMENTO_ELIMINADO: {
    codigo: "perfil.documento.eliminado",
    version: 1,
  },
  PERFIL_TELEFONO_AGREGADO: {
    codigo: "perfil.telefono.agregado",
    version: 1,
  },
  PERFIL_TELEFONO_MODIFICADO: {
    codigo: "perfil.telefono.modificado",
    version: 1,
  },
  PERFIL_TELEFONO_ELIMINADO: {
    codigo: "perfil.telefono.eliminado",
    version: 1,
  },
  PERFIL_ESTUDIO_REALIZADO_AGREGADO: {
    codigo: "perfil.estudio_realizado.agregado",
    version: 1,
  },
  PERFIL_ESTUDIO_REALIZADO_MODIFICADO: {
    codigo: "perfil.estudio_realizado.modificado",
    version: 1,
  },
  PERFIL_ESTUDIO_REALIZADO_ELIMINADO: {
    codigo: "perfil.estudio_realizado.eliminado",
    version: 1,
  },
  PERFIL_ESTUDIO_COMPLEMENTARIO_AGREGADO: {
    codigo: "perfil.estudio_complementario.agregado",
    version: 1,
  },
  PERFIL_ESTUDIO_COMPLEMENTARIO_MODIFICADO: {
    codigo: "perfil.estudio_complementario.modificado",
    version: 1,
  },
  PERFIL_ESTUDIO_COMPLEMENTARIO_ELIMINADO: {
    codigo: "perfil.estudio_complementario.eliminado",
    version: 1,
  },
} as const;

export type EventoFuncional =
  (typeof EVENTOS_FUNCIONALES)[keyof typeof EVENTOS_FUNCIONALES];
export type CodigoEventoFuncional = EventoFuncional["codigo"];

const EVENTOS_POR_CODIGO = new Map<CodigoEventoFuncional, EventoFuncional>(
  Object.values(EVENTOS_FUNCIONALES).map((evento) => [evento.codigo, evento]),
);

export function obtenerIdentificadorEvento(
  codigo: CodigoEventoFuncional,
): EventoFuncional {
  const evento = EVENTOS_POR_CODIGO.get(codigo);
  if (!evento) throw new Error(`Evento funcional no definido: ${codigo}`);
  return evento;
}
