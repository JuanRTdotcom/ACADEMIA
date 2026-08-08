import type { ParametroTraducible } from "./parametro-traducible";

export type OpcionTipoDocumento = ParametroTraducible;

export interface DocumentoPersona {
  id_personas_documentos: string;
  codigo_tipo_documento: string;
  numero_documento: string;
  tipo_documento: OpcionTipoDocumento;
}

export interface DocumentosPerfil {
  documentos: DocumentoPersona[];
  catalogo: OpcionTipoDocumento[];
}

export interface ComandoAgregarDocumento {
  codigo_tipo_documento: string;
  numero_documento: string;
}

export interface ComandoModificarDocumento extends ComandoAgregarDocumento {
  id_personas_documentos: string;
}

export interface ComandoEliminarDocumento {
  id_personas_documentos: string;
}

export interface ResultadoGestionDocumentos {
  ok: true;
  documentos: DocumentoPersona[];
}
