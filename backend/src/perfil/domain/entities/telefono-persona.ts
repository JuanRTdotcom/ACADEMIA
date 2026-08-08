import type { ParametroTraducible } from "./parametro-traducible";

export type OpcionTipoTelefono = ParametroTraducible;

export interface TelefonoPersona {
  id_personas_telefonos: string;
  codigo_tipo_telefono: string;
  numero: string;
  titular: string;
  es_emergencia: boolean;
  tipo_telefono: OpcionTipoTelefono;
}

export interface TelefonosPerfil {
  telefonos: TelefonoPersona[];
  catalogo: OpcionTipoTelefono[];
}

export interface ComandoAgregarTelefono {
  codigo_tipo_telefono: string;
  numero: string;
  titular: string;
  es_emergencia: boolean;
}

export interface ComandoModificarTelefono extends ComandoAgregarTelefono {
  id_personas_telefonos: string;
}

export interface ComandoEliminarTelefono {
  id_personas_telefonos: string;
}

export interface ResultadoGestionTelefonos {
  ok: true;
  telefonos: TelefonoPersona[];
}
