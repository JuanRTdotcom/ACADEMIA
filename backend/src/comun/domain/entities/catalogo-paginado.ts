export interface ResultadoCatalogoPaginado {
  total: number;
  paginacion: {
    anterior: string | null;
    siguiente: string | null;
  };
}
