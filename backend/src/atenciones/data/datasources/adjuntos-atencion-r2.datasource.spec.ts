import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { AlmacenAdjuntosAtencionR2 } from "./adjuntos-atencion-r2.datasource";

describe("AlmacenAdjuntosAtencionR2", () => {
  let ultimoGuardado: { contenido: Buffer; tipoContenido: string } | null =
    null;
  const guardar = {
    ejecutar: jest.fn(
      (solicitud: {
        contenido: Buffer;
        tipoContenido: string;
      }): Promise<void> => {
        ultimoGuardado = solicitud;
        return Promise.resolve();
      },
    ),
  };
  const leer = { ejecutar: jest.fn() };
  const eliminar = { ejecutar: jest.fn() };
  const config = {
    getOrThrow: jest.fn((key: string) =>
      key === "ATTENTION_ATTACHMENT_MAX_BYTES" ? 10 * 1024 * 1024 : 86_400,
    ),
  };
  const almacen = new AlmacenAdjuntosAtencionR2(
    config as never,
    guardar as never,
    leer as never,
    eliminar as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    ultimoGuardado = null;
  });

  it("normaliza una imagen válida a JPEG privado", async () => {
    const contenido = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const resultado = await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime: "image/png",
      nombre_original: "examen.png",
    });
    expect(resultado.tipo_mime).toBe("image/jpeg");
    expect(resultado.clave_objeto).toContain(
      "tenants/org/attentions/atencion/records/registro/attachments/",
    );
    expect(guardar.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoContenido: "image/jpeg",
        cacheControl: "private, max-age=86400, immutable",
      }),
    );
  });

  it("conserva las dimensiones y recodifica con calidad moderada", async () => {
    const contenido = await sharp({
      create: { width: 1800, height: 120, channels: 3, background: "#336699" },
    })
      .png()
      .toBuffer();
    await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime: "image/png",
      nombre_original: "panoramica.png",
    });
    expect(ultimoGuardado).not.toBeNull();
    expect(await sharp(ultimoGuardado!.contenido).metadata()).toMatchObject({
      width: 1800,
      height: 120,
      format: "jpeg",
    });
  });

  it("acepta y procesa una fotografía válida de aproximadamente 4 MB", async () => {
    const contenido = await sharp(randomBytes(1200 * 1200 * 3), {
      raw: { width: 1200, height: 1200, channels: 3 },
    })
      .png({ compressionLevel: 0 })
      .toBuffer();
    expect(contenido.length).toBeGreaterThan(4 * 1024 * 1024);
    expect(contenido.length).toBeLessThan(10 * 1024 * 1024);

    const resultado = await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime: "image/png",
      nombre_original: "consulta-general.png",
    });

    expect(resultado.tipo_mime).toBe("image/jpeg");
    expect(guardar.ejecutar).toHaveBeenCalledTimes(1);
  });

  it("rechaza archivos cuyo contenido no coincide con el tipo declarado", async () => {
    await expect(
      almacen.guardar("org", "atencion", "registro", {
        contenido: Buffer.from("no-image"),
        tipo_mime: "image/png",
        nombre_original: "falsa.png",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("conserva un PDF válido sin modificar su contenido", async () => {
    const contenido = Buffer.from(
      "%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF",
    );
    const resultado = await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime: "application/pdf",
      nombre_original: "resultado.pdf",
    });
    expect(ultimoGuardado).not.toBeNull();
    expect(resultado.tipo_mime).toBe("application/pdf");
    expect(resultado.clave_objeto.endsWith(".pdf")).toBe(true);
    expect(ultimoGuardado!.tipoContenido).toBe("application/pdf");
    expect(ultimoGuardado!.contenido).toEqual(contenido);
  });

  it("acepta un PDF válido con datos posteriores a su marcador final", async () => {
    const contenido = Buffer.concat([
      Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n"),
      Buffer.alloc(2048, 0),
    ]);
    const resultado = await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime: "application/pdf",
      nombre_original: "firmado.pdf",
    });
    expect(resultado.tipo_mime).toBe("application/pdf");
    expect(ultimoGuardado!.contenido).toEqual(contenido);
  });

  it("acepta documentos Open XML cuyo contenedor coincide con la extensión", async () => {
    const contenido = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("word/document.xml"),
    ]);
    const resultado = await almacen.guardar("org", "atencion", "registro", {
      contenido,
      tipo_mime:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      nombre_original: "informe.docx",
    });
    expect(resultado.tipo_mime).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(resultado.clave_objeto.endsWith(".docx")).toBe(true);
  });

  it("rechaza documentos cuyo contenedor no coincide con la extensión", async () => {
    await expect(
      almacen.guardar("org", "atencion", "registro", {
        contenido: Buffer.concat([
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
          Buffer.from("xl/workbook.xml"),
        ]),
        tipo_mime:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        nombre_original: "falso.docx",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rechaza originales mayores a 10 MB", async () => {
    await expect(
      almacen.guardar("org", "atencion", "registro", {
        contenido: Buffer.alloc(10 * 1024 * 1024 + 1),
        tipo_mime: "image/jpeg",
        nombre_original: "grande.jpg",
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});
