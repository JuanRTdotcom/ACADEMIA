import {
  normalizarNombreDescarga,
  validarClaveAlmacenamiento,
} from "./storage-key";

describe("claves de almacenamiento", () => {
  it("acepta una clave aislada por tenant", () => {
    expect(
      validarClaveAlmacenamiento(
        "tenants/550e8400-e29b-41d4-a716-446655440000/courses/file.pdf",
      ),
    ).toBe("tenants/550e8400-e29b-41d4-a716-446655440000/courses/file.pdf");
  });

  it.each(["/absolute/file.pdf", "../secret", "folder//file", "a/./b"])(
    "rechaza traversal o segmentos ambiguos: %s",
    (clave) => {
      expect(() => validarClaveAlmacenamiento(clave)).toThrow();
    },
  );

  it("neutraliza controles y separadores del nombre de descarga", () => {
    expect(normalizarNombreDescarga("reporte\r\nmalicioso/2026.pdf")).toBe(
      "reporte__malicioso_2026.pdf",
    );
  });
});
