export interface DatosUsuario {
  fid_organizaciones: string;
  usuario: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  correo: string;
  contrasenia_temporal: string;
  fid_roles: string[];
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
}

export interface OpcionesUsuario {
  empresas: Array<{ id_organizaciones: string; nombre: string; slug: string }>;
  roles: Array<{ id_roles: string; nombre: string; codigo: string; icono: string }>;
}
