export interface DatosUsuario {
  fid_organizaciones: string;
  usuario: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  contrasenia_temporal: string;
  fid_roles: string[];
  fid_permisos: string[];
}

export interface UsuarioListado {
  id_usuarios: string;
  fid_organizaciones: string;
  usuario: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  correo: string | null;
  foto_version: string | null;
  estado: number;
  estado_cuenta: string;
  created_at: Date;
  empresa: { nombre: string; slug: string };
  roles: Array<{ id_roles: string; nombre: string; codigo: string; icono: string }>;
  permisos: string[];
}

export interface ModuloPermisosUsuario {
  id_modulos: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  acceso_usuario_obligatorio: boolean;
  icono: string | null;
  ruta: string | null;
  fid_modulos_padre: string | null;
  orden: number;
  permisos: Array<{
    id_permisos: string;
    codigo: string;
    accion: string;
    descripcion: string | null;
  }>;
}

export interface OpcionesUsuario {
  empresas: Array<{ id_organizaciones: string; nombre: string; slug: string }>;
  roles: Array<{ id_roles: string; nombre: string; codigo: string; icono: string; permisos: string[] }>;
  modulos: ModuloPermisosUsuario[];
  modulos_por_empresa: Record<string, ModuloPermisosUsuario[]>;
}
