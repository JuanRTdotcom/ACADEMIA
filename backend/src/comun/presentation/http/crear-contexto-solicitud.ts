import type { Request } from "express";
import type { ContextoSolicitud } from "../../domain/entities/contexto-solicitud";

function cabeceraTexto(valor: string | string[] | undefined): string | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}

/** Traduce Express a un contrato pequeño antes de entrar en aplicación. */
export function crearContextoSolicitud(peticion: Request): ContextoSolicitud {
  return {
    host: cabeceraTexto(peticion.headers.host),
    host_reenviado: cabeceraTexto(peticion.headers["x-forwarded-host"]),
    ip: peticion.ip ?? peticion.socket?.remoteAddress ?? null,
    agente_usuario:
      cabeceraTexto(peticion.headers["user-agent"])?.slice(0, 255) ?? null,
  };
}
