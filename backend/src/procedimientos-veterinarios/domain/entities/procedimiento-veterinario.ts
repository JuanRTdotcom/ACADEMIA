export interface DatosProcedimientoVeterinario {
  nombre: string;
  descripcion_guia: string;
}
export interface FiltrosProcedimientosVeterinarios {
  despues_de?: string;
  antes_de?: string;
  consulta?: string;
}
