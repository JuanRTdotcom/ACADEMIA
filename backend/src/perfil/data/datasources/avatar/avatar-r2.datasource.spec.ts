import { ConfigService } from "@nestjs/config";
import sharp from "sharp";
import { CasoUsoEliminarObjeto } from "../../../../storage/domain/usecases/delete-object";
import { CasoUsoLeerObjeto } from "../../../../storage/domain/usecases/read-object";
import { CasoUsoGuardarObjeto } from "../../../../storage/domain/usecases/save-object";
import { AlmacenAvatarR2 } from "./avatar-r2.datasource";

describe("AlmacenAvatarR2", () => {
  const guardar = { ejecutar: jest.fn() };
  const leer = { ejecutar: jest.fn() };
  const eliminar = { ejecutar: jest.fn() };
  const almacen = new AlmacenAvatarR2(
    new ConfigService({ AVATAR_MAX_BYTES: 3 * 1024 * 1024 }),
    guardar as unknown as CasoUsoGuardarObjeto,
    leer as unknown as CasoUsoLeerObjeto,
    eliminar as unknown as CasoUsoEliminarObjeto,
  );

  beforeEach(() => jest.clearAllMocks());

  it("recodifica a JPEG 100x100, elimina metadatos y organiza por tenant/usuario", async () => {
    const original = await sharp({
      create: {
        width: 200,
        height: 120,
        channels: 4,
        background: "#2563eb",
      },
    })
      .png()
      .withMetadata({ comment: "dato que no debe conservarse" })
      .toBuffer();
    guardar.ejecutar.mockResolvedValue(undefined);

    const resultado = await almacen.guardar("org-1", "user-1", {
      contenido: original,
      tipo_mime: "image/png",
      nombre_original: "foto.png",
    });

    expect(resultado.clave).toMatch(
      /^tenants\/org-1\/users\/user-1\/profile\/avatar\/[\w-]+\.jpg$/,
    );
    const solicitud = guardar.ejecutar.mock.calls[0][0];
    const metadatos = await sharp(solicitud.contenido).metadata();
    expect(metadatos).toMatchObject({ format: "jpeg", width: 100, height: 100 });
    expect(solicitud.contenido.byteLength).toBeLessThanOrEqual(10 * 1024);
    expect(solicitud.tipoContenido).toBe("image/jpeg");
    expect(solicitud.checksumSha256Base64).toMatch(/^[A-Za-z0-9+/]{43}=$/);
  });

  it("rechaza cuando MIME, extensión y firma no corresponden", async () => {
    const jpeg = await sharp({
      create: {
        width: 80,
        height: 80,
        channels: 3,
        background: "white",
      },
    })
      .jpeg()
      .toBuffer();

    await expect(
      almacen.guardar("org-1", "user-1", {
        contenido: jpeg,
        tipo_mime: "image/png",
        nombre_original: "foto.png",
      }),
    ).rejects.toMatchObject({ message: "profile.avatar.invalidFile" });
    expect(guardar.ejecutar).not.toHaveBeenCalled();
  });

  it("lee y elimina mediante la capa neutral de almacenamiento", async () => {
    const contenido = new Uint8Array([0xff, 0xd8, 0xff]);
    leer.ejecutar.mockResolvedValue({
      clave: "tenants/org/users/user/profile/avatar/a.jpg",
      contenido,
      bytes: contenido.byteLength,
      tipoContenido: "image/jpeg",
      etag: null,
      ultimaModificacion: null,
    });
    eliminar.ejecutar.mockResolvedValue(undefined);

    const avatar = await almacen.leer(
      "tenants/org/users/user/profile/avatar/a.jpg",
    );
    await almacen.eliminarSeguro("tenants/org/users/user/profile/avatar/a.jpg");

    expect(avatar.contenido).toEqual(Buffer.from(contenido));
    expect(eliminar.ejecutar).toHaveBeenCalledTimes(1);
  });
});
