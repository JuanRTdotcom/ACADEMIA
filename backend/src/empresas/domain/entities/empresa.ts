/** Entidad que el dominio expone al listar una empresa. */
export interface EmpresaListada {
  id_organizaciones: string;
  slug: string;
  nombre: string;
  estado: number;
  eliminado_en: Date | null;
  created_at: Date;
  suscripcion_inicia_en?: Date | null;
  suscripcion_expira_en?: Date | null;
  perfil: {
    razon_social: string | null;
    ruc_nif: string | null;
    telefono: string | null;
    correo_contacto: string | null;
    escudo_version?: string | null;
    escudo_oscuro_version?: string | null;
  } | null;
  plan: {
    id_planes: string;
    codigo: string;
    nombre: string;
  };
}

export interface ListadoEmpresas {
  empresas: EmpresaListada[];
  total: number;
  id_organizacion_actual: string;
}

export interface DatosCrearEmpresa {
  nombre: string;
  razon_social: string;
  ruc_nif: string;
  slug: string;
  correo_contacto: string;
  telefono: string;
}
