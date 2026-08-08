import { Injectable } from "@nestjs/common"; // NestJS: provider inyectable (DI)
import { IDIOMA_POR_DEFECTO, type Idioma } from "./idiomas";
import en from "./en.json";
import es from "./es.json";

type Diccionario = Record<string, string>;

/**
 * Traduce códigos de mensaje a texto según el idioma. Los diccionarios se cargan
 * una sola vez desde los JSON. Si el código no existe en el idioma pedido, cae al
 * idioma por defecto, y si tampoco existe, devuelve el código tal cual (así los
 * mensajes literales aún no migrados siguen mostrándose sin romper nada).
 */
@Injectable()
export class ServicioTraduccion {
  private readonly diccionarios: Record<Idioma, Diccionario> = { en, es };

  traducir(codigo: string, idioma: Idioma): string {
    return (
      this.diccionarios[idioma]?.[codigo] ??
      this.diccionarios[IDIOMA_POR_DEFECTO]?.[codigo] ??
      codigo
    );
  }
}
