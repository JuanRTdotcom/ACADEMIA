import type {
  AccesoFirmado,
  ObjetoAlmacenado,
  ObjetoConContenido,
  SolicitudCargaFirmada,
  SolicitudGuardarObjeto,
} from "../entities/storage-object";

/** Contrato neutral: el dominio no conoce AWS SDK ni Cloudflare R2. */
export abstract class RepositorioAlmacenamiento {
  abstract crearCargaFirmada(
    solicitud: SolicitudCargaFirmada,
  ): Promise<AccesoFirmado>;

  abstract crearDescargaFirmada(
    clave: string,
    nombreDescarga?: string,
  ): Promise<AccesoFirmado>;

  abstract guardar(solicitud: SolicitudGuardarObjeto): Promise<void>;

  abstract leer(clave: string): Promise<ObjetoConContenido | null>;

  abstract inspeccionar(clave: string): Promise<ObjetoAlmacenado | null>;

  abstract eliminar(clave: string): Promise<void>;
}
