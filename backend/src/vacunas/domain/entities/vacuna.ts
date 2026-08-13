export interface DatosVacuna {
  nombre: string;
}

export interface FiltrosVacunas {
  despues_de?: string;
  antes_de?: string;
  consulta?: string;
}

export interface CatalogoVacunas {
  vacunas: unknown[];
  total: number;
  paginacion: { anterior: string | null; siguiente: string | null };
}
