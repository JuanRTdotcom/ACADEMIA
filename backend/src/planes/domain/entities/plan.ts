export interface PlanListado {
  id_planes: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  almacenamiento_max_bytes: number | null;
  estado: number;
  created_at: Date;
  modulos?: { id_modulos: string; codigo: string; nombre: string }[];
}

export interface DatosGestionarPlan {
  codigo: string;
  nombre: string;
  descripcion?: string;
  almacenamiento_max_bytes?: number | null;
}

export interface DatosActualizarModulosPlan {
  fid_modulos: string[];
}
