import { mapearParametroTraducible } from "./parametro-traducible";

describe("mapearParametroTraducible", () => {
  it("agrupa idiomas sin perder los datos del maestro", () => {
    expect(
      mapearParametroTraducible({
        codigo_grupo: "tipos_telefono",
        codigo: "movil",
        etiqueta: "Móvil",
        traducciones: [
          { codigo_idioma: "es", etiqueta: "Móvil" },
          { codigo_idioma: "en", etiqueta: "Mobile" },
        ],
      }),
    ).toEqual({
      codigo_grupo: "tipos_telefono",
      codigo: "movil",
      etiqueta: "Móvil",
      traducciones: { es: "Móvil", en: "Mobile" },
    });
  });
});
