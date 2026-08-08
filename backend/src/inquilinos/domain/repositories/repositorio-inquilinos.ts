import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { InquilinoPublico } from "../entities/inquilino";

export abstract class RepositorioInquilinos {
  abstract actual(contexto: ContextoSolicitud): Promise<InquilinoPublico>;
  abstract leerMedio(
    contexto: ContextoSolicitud,
    tipo:
      | "escudo"
      | "escudo_oscuro"
      | "imagotipo"
      | "imagotipo_oscuro"
      | "portada"
      | "login_escudo"
      | "login_escudo_oscuro",
    version: string,
  ): Promise<{
    contenido: Buffer;
    tipo_mime: "image/png" | "image/jpeg" | "image/webp";
  }>;
}
