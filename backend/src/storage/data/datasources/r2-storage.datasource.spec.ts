import { ConfigService } from "@nestjs/config";
import { FuenteDatosAlmacenamientoR2 } from "./r2-storage.datasource";

describe("FuenteDatosAlmacenamientoR2", () => {
  const accountId = "c".repeat(32);
  const fuente = new FuenteDatosAlmacenamientoR2(
    new ConfigService({
      STORAGE_BUCKET: "sumaq-development-private",
      STORAGE_SIGNED_URL_TTL_SECONDS: 900,
      STORAGE_REGION: "auto",
      STORAGE_ENDPOINT: `https://${accountId}.r2.cloudflarestorage.com`,
      STORAGE_ACCESS_KEY_ID: "a".repeat(32),
      STORAGE_SECRET_ACCESS_KEY: "s".repeat(64),
    }),
  );

  it("firma una carga limitada a un objeto y tiempo concretos", async () => {
    const acceso = await fuente.crearCargaFirmada({
      clave: "tenants/org-1/resources/file.pdf",
      tipoContenido: "application/pdf",
      bytes: 1234,
    });
    const url = new URL(acceso.url);

    expect(url.hostname).toBe(
      `sumaq-development-private.${accountId}.r2.cloudflarestorage.com`,
    );
    expect(url.pathname).toBe("/tenants/org-1/resources/file.pdf");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900");
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(acceso.encabezados).toEqual({
      "content-type": "application/pdf",
      "content-length": "1234",
    });
  });

  it("firma una descarga sin exponer el secreto", async () => {
    const acceso = await fuente.crearDescargaFirmada(
      "tenants/org-1/resources/file.pdf",
      "material.pdf",
    );

    expect(acceso.url).toContain("X-Amz-Signature=");
    expect(acceso.url).not.toContain("s".repeat(64));
    expect(acceso.expiraEnSegundos).toBe(900);
  });
});
