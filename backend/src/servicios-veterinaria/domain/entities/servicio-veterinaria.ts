export interface DatosServicioVeterinaria {
  nombre: string;
  descripcion: string | null;
  precio: string | null;
}

export interface ServicioVeterinaria extends DatosServicioVeterinaria {
  id_servicios_veterinaria: string;
  estado: number;
  created_at: Date;
  updated_at: Date;
}

export interface MonedaServicioVeterinaria {
  id_parametros: string;
  codigo: string;
  etiqueta: string;
}

export interface CatalogoServiciosVeterinaria {
  servicios: ServicioVeterinaria[];
  moneda: MonedaServicioVeterinaria;
  total: number;
}
