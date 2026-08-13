export interface DatosMotivoConsulta {
  nombre: string;
  descripcion: string | null;
}

export interface MotivoConsulta extends DatosMotivoConsulta {
  id_motivos_consulta: string;
  estado: number;
  created_at: Date;
  updated_at: Date;
}

export interface CatalogoMotivosConsulta {
  motivos: MotivoConsulta[];
  total: number;
  paginacion: {
    anterior: string | null;
    siguiente: string | null;
  };
}

export interface FiltrosMotivosConsulta {
  despues_de?: string;
  antes_de?: string;
  consulta?: string;
}
