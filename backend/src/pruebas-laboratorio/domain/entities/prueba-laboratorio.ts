export interface DatosPruebaLaboratorio {
  fid_categorias_pruebas_laboratorio: string;
  nombre: string;
}
export interface FiltrosPruebasLaboratorio {
  despues_de?: string;
  antes_de?: string;
  consulta?: string;
}
