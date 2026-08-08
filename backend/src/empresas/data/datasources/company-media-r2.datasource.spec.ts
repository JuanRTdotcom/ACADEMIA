import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { CasoUsoEliminarObjeto } from "../../../storage/domain/usecases/delete-object";
import { CasoUsoLeerObjeto } from "../../../storage/domain/usecases/read-object";
import { CasoUsoGuardarObjeto } from "../../../storage/domain/usecases/save-object";
import { AlmacenMediosEmpresaR2 } from "./company-media-r2.datasource";

describe("AlmacenMediosEmpresaR2", () => {
  const guardar = { ejecutar: jest.fn() };
  const leer = { ejecutar: jest.fn() };
  const eliminar = { ejecutar: jest.fn() };
  const almacen = new AlmacenMediosEmpresaR2(
    new ConfigService({ COMPANY_MEDIA_MAX_BYTES: 3 * 1024 * 1024 }),
    guardar as unknown as CasoUsoGuardarObjeto,
    leer as unknown as CasoUsoLeerObjeto,
    eliminar as unknown as CasoUsoEliminarObjeto,
  );

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["escudo", 256, 256, 40 * 1024, "png", "image/png", ".png"],
    ["escudo_oscuro", 256, 256, 40 * 1024, "png", "image/png", ".png"],
    ["imagotipo", 640, 200, 80 * 1024, "png", "image/png", ".png"],
    ["imagotipo_oscuro", 640, 200, 80 * 1024, "png", "image/png", ".png"],
    ["portada", 1280, 1920, 100 * 1024, "webp", "image/webp", ".webp"],
  ] as const)(
    "normaliza %s al formato requerido dentro de su límite",
    async (
      tipo,
      ancho,
      alto,
      limite,
      formatoSalida,
      mimeSalida,
      extensionSalida,
    ) => {
      const imagen = sharp({
        create: {
          width: 1800,
          height: 1200,
          channels: 4,
          background: "#2563eb",
        },
      }).withMetadata({ comment: "no conservar" });
      const esPortada = tipo === "portada";
      const original = await (
        esPortada ? imagen.jpeg() : imagen.png()
      ).toBuffer();
      guardar.ejecutar.mockResolvedValue(undefined);

      const resultado = await almacen.guardar("org-1", tipo, {
        contenido: original,
        tipo_mime: esPortada ? "image/jpeg" : "image/png",
        nombre_original: esPortada ? "portada.jpg" : "marca.png",
      });

      expect(resultado.clave).toMatch(
        new RegExp(
          `^tenants/org-1/branding/${tipo}/[\\w-]+\\${extensionSalida}$`,
        ),
      );
      const solicitud = guardar.ejecutar.mock.calls[0][0];
      expect(await sharp(solicitud.contenido).metadata()).toMatchObject({
        format: formatoSalida,
        width: ancho,
        height: alto,
      });
      expect(solicitud.tipoContenido).toBe(mimeSalida);
      expect(solicitud.contenido.byteLength).toBeLessThanOrEqual(limite);
      expect(solicitud.cacheControl).toBe(
        "public, max-age=31536000, immutable",
      );
    },
  );

  it("rechaza archivos cuyo MIME, extensión y firma no coinciden", async () => {
    const jpeg = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "white" },
    })
      .jpeg()
      .toBuffer();

    await expect(
      almacen.guardar("org-1", "escudo", {
        contenido: jpeg,
        tipo_mime: "image/png",
        nombre_original: "marca.png",
      }),
    ).rejects.toMatchObject({
      message: "companies.media.invalidShieldFile",
    });
    expect(guardar.ejecutar).not.toHaveBeenCalled();
  });

  it("rechaza JPEG para imagotipos porque toda la marca exige PNG", async () => {
    const jpeg = await sharp({
      create: { width: 640, height: 200, channels: 3, background: "blue" },
    })
      .jpeg()
      .toBuffer();

    await expect(
      almacen.guardar("org-1", "imagotipo", {
        contenido: jpeg,
        tipo_mime: "image/jpeg",
        nombre_original: "imagotipo.jpg",
      }),
    ).rejects.toMatchObject({
      message: "companies.media.invalidLogotypeFile",
    });
  });

  it("rechaza PNG para portadas porque el original debe ser JPG", async () => {
    const png = await sharp({
      create: { width: 1280, height: 1920, channels: 3, background: "blue" },
    })
      .png()
      .toBuffer();

    await expect(
      almacen.guardar("org-1", "portada", {
        contenido: png,
        tipo_mime: "image/png",
        nombre_original: "portada.png",
      }),
    ).rejects.toMatchObject({ message: "companies.media.invalidFile" });
    expect(guardar.ejecutar).not.toHaveBeenCalled();
  });

  it("rechaza cualquier medio que supere 3 MB antes de procesarlo", async () => {
    const contenido = Buffer.alloc(3 * 1024 * 1024 + 1);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(
      contenido,
    );

    await expect(
      almacen.guardar("org-1", "escudo", {
        contenido,
        tipo_mime: "image/png",
        nombre_original: "escudo.png",
      }),
    ).rejects.toMatchObject({ message: "companies.media.tooLarge" });
    expect(guardar.ejecutar).not.toHaveBeenCalled();
  });
});
