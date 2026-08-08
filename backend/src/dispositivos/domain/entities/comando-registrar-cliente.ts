import type { TipoDispositivo } from "./tipo-dispositivo";

/** Información de instalación ya validada por la capa de presentación. */
export interface ComandoRegistrarCliente {
  uid_dispositivo: string;
  firebase_id_instalacion: string;
  tipo_dispositivo: TipoDispositivo;
  modelo?: string;
  version_so?: string;
  version_app: string;
}
