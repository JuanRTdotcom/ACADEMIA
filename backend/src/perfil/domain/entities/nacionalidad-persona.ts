export interface PaisNacionalidad {
  id_admin_level_0: string;
  codigo_iso2: string;
  nombre_es: string;
  nombre_en: string;
}

export interface NacionalidadPersona {
  id_personas_nacionalidades: string;
  fid_admin_level_0: string;
  pais: PaisNacionalidad;
}

export interface NacionalidadesPerfil {
  nacionalidades: NacionalidadPersona[];
  catalogo: PaisNacionalidad[];
}

export interface ComandoAgregarNacionalidad {
  fid_admin_level_0: string;
}

export interface ComandoEliminarNacionalidad {
  id_personas_nacionalidades: string;
}

export interface ResultadoGestionNacionalidades {
  ok: true;
  nacionalidades: NacionalidadPersona[];
}
