export interface DatosPropietario {
  fid_parametros_tipo_documento: string;
  numero_documento: string;
  nombre_completo: string;
  celular: string | null;
  celular_verificado: boolean;
  sin_correo: boolean;
  correo: string | null;
  correo_verificado: boolean;
  telefono_fijo: string | null;
  direccion: string | null;
  fid_admin_level_0: string | null;
  fid_admin_level_3: string | null;
  contacto_alternativo_nombre: string | null;
  contacto_alternativo_telefono: string | null;
  fid_parametros_como_conocio: string | null;
  como_conocio_otro: string | null;
}

export interface FiltrosPropietarios {
  q?: string;
  despues_de?: string;
  antes_de?: string;
}

export interface EliminacionPropietario {
  confirmar_desvinculacion?: boolean;
}
