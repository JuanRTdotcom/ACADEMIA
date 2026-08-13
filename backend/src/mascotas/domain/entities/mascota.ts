export interface ArchivoMascota {
  contenido: Buffer;
  tipo_mime: string;
  nombre_original: string;
}

export interface DatosMascota {
  fid_propietarios: string | null;
  animal_servicio: boolean;
  apoyo_emocional: boolean;
  nombre: string;
  codigo_chip: string | null;
  fid_especies_animales: string;
  fid_subespecies_animales: string | null;
  fid_razas_animales: string | null;
  fid_parametros_genero: string;
  fid_parametros_color: string | null;
  fecha_nacimiento: string | null;
  peso: string | null;
  fid_parametros_unidad_peso: string | null;
  fid_parametros_talla: string | null;
  fid_parametros_estado_reproductivo: string | null;
  fid_parametros_temperamento: string | null;
  alimento: string | null;
}

export interface FiltrosMascotas {
  q?: string;
  despues_de?: string;
  antes_de?: string;
}

export interface EliminacionMascota {
  confirmar_desvinculacion?: boolean;
}
