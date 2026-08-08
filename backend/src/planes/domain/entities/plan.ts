export interface PlanListado {
  id_planes: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: number;
  created_at: Date;
  modulos?: { id_modulos: string; codigo: string; nombre: string }[];
}

export interface DatosGestionarPlan {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface DatosActualizarModulosPlan {
  fid_modulos: string[];
}
