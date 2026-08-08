import type { ParametroTraducible } from "./parametro-traducible";

export type OpcionParametro = ParametroTraducible;

export interface DatosPersonaPerfil {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  codigo_sexo: string | null;
  codigo_estado_civil: string | null;
  codigo_nivel_instruccion: string | null;
  fecha_nacimiento: string | null;
  discapacidad: boolean;
  fid_admin_level_0_procedencia: string | null;
  codigo_admin_level_3_procedencia: string | null;
  fid_admin_level_0_residencia: string | null;
  codigo_admin_level_3_residencia: string | null;
  direccion: string | null;
  referencia: string | null;
}

export interface DatosPersonalesPerfil {
  persona: DatosPersonaPerfil;
  catalogos: {
    sexos: OpcionParametro[];
    estados_civiles: OpcionParametro[];
    niveles_instruccion: OpcionParametro[];
    admin_level_0: {
      id_admin_level_0: string;
      codigo_iso2: string;
      nombre: string;
      etiqueta_admin_level_1: string;
      etiqueta_admin_level_2: string | null;
      etiqueta_admin_level_3: string;
    }[];
    admin_level_1: {
      id_admin_level_1: string;
      fid_admin_level_0: string;
      codigo: string;
      nombre: string;
    }[];
    admin_level_2: {
      id_admin_level_2: string;
      fid_admin_level_1: string;
      codigo: string;
      nombre: string;
    }[];
    admin_level_3: {
      fid_admin_level_1: string;
      fid_admin_level_2: string | null;
      codigo: string;
      nombre: string;
    }[];
  };
  roles: { codigo: string; nombre: string }[];
  avatar: { disponible: boolean; version: string | null };
}

export type ComandoActualizarDatosPersonales = Omit<
  DatosPersonaPerfil,
  "apellido_materno"
> & {
  apellido_materno: string;
};
