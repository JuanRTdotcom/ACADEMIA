export interface PlanListado {
  id_planes: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  almacenamiento_max_bytes: number | null;
  maximo_sedes: number | null;
  maximo_usuarios: number | null;
  maximo_mensajes_mensuales: number | null;
  maximo_uso_ia_mensual: number | null;
  estado: number;
  created_at: Date;
  modulos?: { id_modulos: string; codigo: string; nombre: string }[];
}

export interface DatosGestionarPlan {
  codigo: string;
  nombre: string;
  descripcion?: string;
  almacenamiento_valor?: number | null;
  fid_parametros_unidad_almacenamiento?: string | null;
  maximo_sedes?: number | null;
  maximo_usuarios?: number | null;
  maximo_mensajes_mensuales?: number | null;
  maximo_uso_ia_mensual?: number | null;
}

export interface DatosActualizarModulosPlan {
  fid_modulos: string[];
}
