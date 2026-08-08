import type { ParametroTraducible } from "./parametro-traducible";

export interface SeguroMaestro extends ParametroTraducible {
  permite_otro: boolean;
}

export interface SeguroPersona {
  id_personas_seguros: string;
  codigo_seguro: string;
  nombre_otro: string | null;
  numero_seguro: string;
  seguro: SeguroMaestro;
}

export interface SegurosPerfil {
  seguros: SeguroPersona[];
  catalogo: SeguroMaestro[];
}

export interface DatosSeguro {
  codigo_seguro: string;
  nombre_otro?: string | null;
  numero_seguro: string;
}

export type ComandoAgregarSeguro = DatosSeguro;

export interface ComandoModificarSeguro extends DatosSeguro {
  id_personas_seguros: string;
}

export interface ComandoEliminarSeguro {
  id_personas_seguros: string;
}

export interface ResultadoGestionSeguros {
  ok: true;
  seguros: SeguroPersona[];
}
