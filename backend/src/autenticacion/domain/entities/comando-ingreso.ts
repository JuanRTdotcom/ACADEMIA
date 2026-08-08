import type { PlataformaDispositivo } from "./plataforma-dispositivo";

/** Entrada del caso de uso. No contiene decoradores ni depende del transporte HTTP. */
export interface ComandoIngreso {
  usuario: string;
  contrasenia: string;
  slug_organizacion?: string;
  uid_dispositivo: string;
  plataforma: PlataformaDispositivo;
}
