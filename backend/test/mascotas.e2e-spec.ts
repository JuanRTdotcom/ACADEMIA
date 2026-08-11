import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { App } from "supertest/types";
import sharp from "sharp";
import { ModuloAplicacion } from "../src/app.module";
import { PrismaService } from "../src/comun/prisma.service";
import type { SolicitudGuardarObjeto } from "../src/storage/domain/entities/storage-object";
import { CasoUsoEliminarObjeto } from "../src/storage/domain/usecases/delete-object";
import { CasoUsoLeerObjeto } from "../src/storage/domain/usecases/read-object";
import { CasoUsoGuardarObjeto } from "../src/storage/domain/usecases/save-object";

interface OpcionesMascotas {
  especies: Array<{ id_especies_animales: string }>;
  generos: Array<{ id_parametros: string }>;
}

interface BusquedaPropietarios {
  propietarios: Array<{ id_propietarios: string }>;
}

interface ListadoMascotas {
  total: number;
  mascotas: Array<{ id_mascotas: string; foto_version: string | null }>;
}

describe("mascotas: seguridad, fotos y ciclo tenant (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let organizacion = "";
  let persona = "";
  let personaRestringida = "";
  let usuario = "";
  let usuarioRestringido = "";
  let propietario = "";
  let propietarioAjeno = "";
  let mascota = "";
  let mascotaAjena = "";
  const mascotasFormato: string[] = [];
  let cookies: string[] = [];
  let cookiesRestringidas: string[] = [];
  const objetos = new Map<
    string,
    { contenido: Uint8Array; tipoContenido: string }
  >();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const username = `M${suffix}`;
  const usernameRestringido = `R${suffix}`;
  const password = "Pets1!Pass";
  const csrf = "1";

  const cookiesDe = (respuesta: request.Response) =>
    (respuesta.headers["set-cookie"] as unknown as string[]).map(
      (item) => item.split(";", 1)[0],
    );

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [ModuloAplicacion],
    })
      .overrideProvider(CasoUsoGuardarObjeto)
      .useValue({
        ejecutar: (solicitud: SolicitudGuardarObjeto) => {
          objetos.set(solicitud.clave, {
            contenido: solicitud.contenido,
            tipoContenido: solicitud.tipoContenido,
          });
          return Promise.resolve();
        },
      })
      .overrideProvider(CasoUsoLeerObjeto)
      .useValue({
        ejecutar: (clave: string) => {
          const objeto = objetos.get(clave);
          return Promise.resolve(
            objeto
              ? {
                  clave,
                  contenido: objeto.contenido,
                  tipoContenido: objeto.tipoContenido,
                  bytes: objeto.contenido.byteLength,
                  etag: null,
                  ultimaModificacion: null,
                }
              : null,
          );
        },
      })
      .overrideProvider(CasoUsoEliminarObjeto)
      .useValue({
        ejecutar: (clave: string) => {
          objetos.delete(clave);
          return Promise.resolve();
        },
      })
      .compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const tenant = await prisma.organizaciones.findFirstOrThrow({
      where: {
        slug: process.env.OWNER_ORG_SLUG!,
        estado: 1,
        eliminado_en: null,
      },
    });
    organizacion = tenant.id_organizaciones;
    const rol = await prisma.roles.findFirstOrThrow({
      where: { codigo: "SUPERADMIN", estado: 1, eliminado_en: null },
    });
    const zona = await prisma.zonas_horarias.findUniqueOrThrow({
      where: { nombre_iana: "America/Lima" },
    });
    const permisosMascotas = await prisma.permisos.findMany({
      where: { codigo: { startsWith: "clinic.pets." }, estado: 1 },
      select: { id_permisos: true },
    });
    expect(permisosMascotas).toHaveLength(4);

    const nuevaPersona = await prisma.personas.create({
      data: {
        fid_organizaciones: organizacion,
        nombres: "Mascotas",
        apellido_paterno: "Temporal",
      },
    });
    persona = nuevaPersona.id_personas;
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        fid_personas: persona,
        fid_organizaciones: organizacion,
        usuario: username,
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash(password),
          },
        },
        usuarios_roles: { create: { fid_roles: rol.id_roles } },
        preferencias_usuario: {
          create: { fid_zonas_horarias: zona.id_zonas_horarias },
        },
      },
    });
    usuario = nuevoUsuario.id_usuarios;

    const nuevaPersonaRestringida = await prisma.personas.create({
      data: {
        fid_organizaciones: organizacion,
        nombres: "Mascotas Restringido",
        apellido_paterno: "Temporal",
      },
    });
    personaRestringida = nuevaPersonaRestringida.id_personas;
    const nuevoUsuarioRestringido = await prisma.usuarios.create({
      data: {
        fid_personas: personaRestringida,
        fid_organizaciones: organizacion,
        usuario: usernameRestringido,
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash(password),
          },
        },
        usuarios_roles: { create: { fid_roles: rol.id_roles } },
        usuarios_permisos: {
          create: permisosMascotas.map(({ id_permisos }) => ({
            fid_permisos: id_permisos,
            efecto: "denegar",
          })),
        },
        preferencias_usuario: {
          create: { fid_zonas_horarias: zona.id_zonas_horarias },
        },
      },
    });
    usuarioRestringido = nuevoUsuarioRestringido.id_usuarios;

    const tipoDocumento = await prisma.parametros.findFirstOrThrow({
      where: { codigo_grupo: "tipos_documento", estado: 1 },
    });
    propietario = (
      await prisma.propietarios.create({
        data: {
          fid_organizaciones: organizacion,
          fid_parametros_tipo_documento: tipoDocumento.id_parametros,
          numero_documento: `PD${suffix}`,
          nombre_completo: `Propietario Mascota ${suffix}`,
          sin_correo: true,
          created_by: usuario,
          updated_by: usuario,
        },
      })
    ).id_propietarios;

    const otroTenant = await prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: { not: organizacion },
        estado: 1,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (otroTenant) {
      propietarioAjeno = (
        await prisma.propietarios.create({
          data: {
            fid_organizaciones: otroTenant.id_organizaciones,
            fid_parametros_tipo_documento: tipoDocumento.id_parametros,
            numero_documento: `PA${suffix}`,
            nombre_completo: `Propietario Ajeno ${suffix}`,
            sin_correo: true,
          },
        })
      ).id_propietarios;
      const especie = await prisma.especies_animales.findFirstOrThrow({
        where: { estado: 1 },
      });
      const genero = await prisma.parametros.findFirstOrThrow({
        where: { codigo_grupo: "generos_mascota", estado: 1 },
      });
      mascotaAjena = (
        await prisma.mascotas.create({
          data: {
            fid_organizaciones: otroTenant.id_organizaciones,
            nombre: `Mascota Ajena ${suffix}`,
            fid_especies_animales: especie.id_especies_animales,
            fid_parametros_genero: genero.id_parametros,
          },
        })
      ).id_mascotas;
    }

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: username,
        contrasenia: password,
        slug_organizacion: process.env.OWNER_ORG_SLUG,
        uid_dispositivo: `pets-${suffix}`,
        plataforma: "web",
      });
    expect(login.status).toBe(200);
    cookies = cookiesDe(login);

    const loginRestringido = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: usernameRestringido,
        contrasenia: password,
        slug_organizacion: process.env.OWNER_ORG_SLUG,
        uid_dispositivo: `pets-restricted-${suffix}`,
        plataforma: "web",
      });
    expect(loginRestringido.status).toBe(200);
    cookiesRestringidas = cookiesDe(loginRestringido);
  });

  afterAll(async () => {
    if (prisma) {
      if (mascota) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "mascotas", id_entidad: mascota },
        });
        await prisma.mascotas.deleteMany({
          where: { id_mascotas: mascota },
        });
      }
      if (mascotaAjena)
        await prisma.mascotas.deleteMany({
          where: { id_mascotas: mascotaAjena },
        });
      if (mascotasFormato.length) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "mascotas", id_entidad: { in: mascotasFormato } },
        });
        await prisma.mascotas.deleteMany({
          where: { id_mascotas: { in: mascotasFormato } },
        });
      }
      if (propietario)
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: propietario },
        });
      if (propietarioAjeno)
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: propietarioAjeno },
        });
      for (const id of [usuario, usuarioRestringido].filter(Boolean)) {
        await prisma.auditoria.deleteMany({ where: { fid_usuarios: id } });
        await prisma.eventos.deleteMany({ where: { fid_usuarios: id } });
        await prisma.usuarios.delete({ where: { id_usuarios: id } });
      }
      for (const id of [persona, personaRestringida].filter(Boolean))
        await prisma.personas.delete({ where: { id_personas: id } });
    }
    await app?.close();
  });

  it("exige sesión, permiso y CSRF", async () => {
    await request(app.getHttpServer()).get("/clinic/pets").expect(401);
    await request(app.getHttpServer())
      .get("/clinic/pets")
      .set("Cookie", cookiesRestringidas)
      .expect(403);
    await request(app.getHttpServer())
      .get("/clinic/pets/options")
      .set("Cookie", cookiesRestringidas)
      .expect(403);
    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookiesRestringidas)
      .set("x-sumaq-csrf", csrf)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/clinic/pets/${randomUUID()}`)
      .set("Cookie", cookiesRestringidas)
      .set("x-sumaq-csrf", csrf)
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/clinic/pets/${randomUUID()}`)
      .set("Cookie", cookiesRestringidas)
      .set("x-sumaq-csrf", csrf)
      .expect(403);

    const opciones = await request(app.getHttpServer())
      .get("/clinic/pets/options")
      .set("Cookie", cookies)
      .expect(200);
    const cuerpoOpciones = opciones.body as unknown as OpcionesMascotas;
    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .send({
        sin_propietario: false,
        fid_propietarios: propietario,
        nombre: `Sin CSRF ${suffix}`,
        fid_especies_animales: cuerpoOpciones.especies[0].id_especies_animales,
        fid_parametros_genero: cuerpoOpciones.generos[0].id_parametros,
      })
      .expect(403);
  });

  it("rechaza DTO, catálogos, decisión de dueño y referencias de otro tenant", async () => {
    const opciones = await request(app.getHttpServer())
      .get("/clinic/pets/options")
      .set("Cookie", cookies)
      .expect(200);
    const cuerpoOpciones = opciones.body as unknown as OpcionesMascotas;
    const base = {
      sin_propietario: false,
      fid_propietarios: propietario,
      nombre: `Mascota ${suffix}`,
      fid_especies_animales: cuerpoOpciones.especies[0].id_especies_animales,
      fid_parametros_genero: cuerpoOpciones.generos[0].id_parametros,
    };
    const totalAntes = await prisma.mascotas.count({
      where: { fid_organizaciones: organizacion, nombre: base.nombre },
    });

    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ ...base, intruso: true })
      .expect(400);
    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ ...base, sin_propietario: true })
      .expect(400);
    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ ...base, fid_especies_animales: randomUUID() })
      .expect(400);
    const objetosAntes = objetos.size;
    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field("sin_propietario", "false")
      .field("fid_propietarios", propietario)
      .field("nombre", base.nombre)
      .field("fid_especies_animales", base.fid_especies_animales)
      .field("fid_parametros_genero", base.fid_parametros_genero)
      .attach("foto", Buffer.from("contenido-no-imagen"), {
        filename: "falsa.png",
        contentType: "image/png",
      })
      .expect(400);
    expect(objetos.size).toBe(objetosAntes);
    if (propietarioAjeno) {
      await request(app.getHttpServer())
        .post("/clinic/pets")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", csrf)
        .send({ ...base, fid_propietarios: propietarioAjeno })
        .expect(400);
      const busqueda = await request(app.getHttpServer())
        .get(`/clinic/pets/owners?q=${suffix}`)
        .set("Cookie", cookies)
        .expect(200);
      const cuerpoBusqueda = busqueda.body as unknown as BusquedaPropietarios;
      expect(
        cuerpoBusqueda.propietarios.map((item) => item.id_propietarios),
      ).toEqual([propietario]);
    }
    expect(
      await prisma.mascotas.count({
        where: { fid_organizaciones: organizacion, nombre: base.nombre },
      }),
    ).toBe(totalAntes);
  });

  it("admite fotografías JPG, JPEG, PNG y WebP y las normaliza", async () => {
    const opciones = await request(app.getHttpServer())
      .get("/clinic/pets/options")
      .set("Cookie", cookies)
      .expect(200);
    const cuerpoOpciones = opciones.body as unknown as OpcionesMascotas;
    const base = {
      create: {
        width: 80,
        height: 80,
        channels: 3 as const,
        background: "#3874ff",
      },
    };
    const formatos = [
      {
        extension: "jpg",
        tipo: "image/jpg",
        contenido: await sharp(base).jpeg().toBuffer(),
      },
      {
        extension: "jpeg",
        tipo: "image/jpeg",
        contenido: await sharp(base).jpeg().toBuffer(),
      },
      {
        extension: "png",
        tipo: "image/png",
        contenido: await sharp(base).png().toBuffer(),
      },
      {
        extension: "webp",
        tipo: "image/webp",
        contenido: await sharp(base).webp().toBuffer(),
      },
    ];

    for (const formato of formatos) {
      const respuesta = await request(app.getHttpServer())
        .post("/clinic/pets")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", csrf)
        .field("sin_propietario", "false")
        .field("fid_propietarios", propietario)
        .field("nombre", `Formato ${formato.extension} ${randomUUID()}`)
        .field(
          "fid_especies_animales",
          cuerpoOpciones.especies[0].id_especies_animales,
        )
        .field("fid_parametros_genero", cuerpoOpciones.generos[0].id_parametros)
        .attach("foto", formato.contenido, {
          filename: `mascota.${formato.extension}`,
          contentType: formato.tipo,
        })
        .expect(201);
      const id = (respuesta.body as { id_mascotas: string }).id_mascotas;
      mascotasFormato.push(id);
      const creada = await prisma.mascotas.findUniqueOrThrow({
        where: { id_mascotas: id },
      });
      const objeto = objetos.get(creada.foto_url!);
      expect(objeto?.tipoContenido).toBe("image/jpeg");
      expect(await sharp(objeto!.contenido).metadata()).toEqual(
        expect.objectContaining({ width: 130, height: 130, format: "jpeg" }),
      );
      expect(objeto!.contenido.byteLength).toBeLessThanOrEqual(10 * 1024);
    }
    await prisma.auditoria.deleteMany({
      where: { entidad: "mascotas", id_entidad: { in: mascotasFormato } },
    });
    await prisma.mascotas.deleteMany({
      where: { id_mascotas: { in: mascotasFormato } },
    });
    mascotasFormato.length = 0;
  });

  it("crea, sirve, actualiza y elimina foto y mascota con auditoría tenant", async () => {
    const opciones = await request(app.getHttpServer())
      .get("/clinic/pets/options")
      .set("Cookie", cookies)
      .expect(200);
    const cuerpoOpciones = opciones.body as unknown as OpcionesMascotas;
    const especie = cuerpoOpciones.especies[0];
    const genero = cuerpoOpciones.generos[0];
    const imagen = await sharp({
      create: {
        width: 160,
        height: 120,
        channels: 3,
        background: "#3874ff",
      },
    })
      .png()
      .toBuffer();

    await request(app.getHttpServer())
      .post("/clinic/pets")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field("sin_propietario", "false")
      .field("fid_propietarios", propietario)
      .field("nombre", `Mascota ${suffix}`)
      .field("fid_especies_animales", especie.id_especies_animales)
      .field("fid_parametros_genero", genero.id_parametros)
      .attach("foto", imagen, {
        filename: "mascota.png",
        contentType: "image/png",
      })
      .expect(201);

    const creada = await prisma.mascotas.findFirstOrThrow({
      where: {
        fid_organizaciones: organizacion,
        nombre: `Mascota ${suffix}`,
      },
    });
    mascota = creada.id_mascotas;
    expect(creada.fid_propietarios).toBe(propietario);
    expect(creada.foto_url).toMatch(
      new RegExp(`^tenants/${organizacion}/pets/${mascota}/photo/.+\\.jpg$`),
    );
    const objeto = objetos.get(creada.foto_url!);
    expect(objeto?.tipoContenido).toBe("image/jpeg");
    expect(await sharp(objeto!.contenido).metadata()).toEqual(
      expect.objectContaining({ width: 130, height: 130, format: "jpeg" }),
    );
    expect(objeto!.contenido.byteLength).toBeLessThanOrEqual(10 * 1024);
    const version = creada.foto_url!.split("/").at(-1)!;

    const foto = await request(app.getHttpServer())
      .get(`/clinic/pets/${mascota}/photo/${version}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(foto.headers["content-type"]).toContain("image/jpeg");
    expect(foto.headers["cache-control"]).toContain("private");
    expect(foto.headers["cache-control"]).toContain("immutable");
    await request(app.getHttpServer())
      .get(`/clinic/pets/${mascota}/photo/${randomUUID()}.jpg`)
      .set("Cookie", cookies)
      .expect(404);
    if (mascotaAjena) {
      await request(app.getHttpServer())
        .get(`/clinic/pets/${mascotaAjena}`)
        .set("Cookie", cookies)
        .expect(404);
    }

    const listado = await request(app.getHttpServer())
      .get(`/clinic/pets?q=${suffix}`)
      .set("Cookie", cookies)
      .expect(200);
    const cuerpoListado = listado.body as unknown as ListadoMascotas;
    expect(cuerpoListado.total).toBe(1);
    expect(cuerpoListado.mascotas[0].id_mascotas).toBe(mascota);
    expect(cuerpoListado.mascotas[0].foto_version).toBe(version);

    await request(app.getHttpServer())
      .patch(`/clinic/pets/${mascota}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        sin_propietario: true,
        nombre: `Mascota Actualizada ${suffix}`,
        fid_especies_animales: especie.id_especies_animales,
        fid_parametros_genero: genero.id_parametros,
        eliminar_foto: true,
      })
      .expect(200);
    expect(objetos.has(creada.foto_url!)).toBe(false);

    await request(app.getHttpServer())
      .delete(`/clinic/pets/${mascota}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .expect(200);
    const eliminada = await prisma.mascotas.findUniqueOrThrow({
      where: { id_mascotas: mascota },
    });
    expect(eliminada.estado).toBe(0);
    expect(eliminada.eliminado_en).not.toBeNull();
    expect(eliminada.eliminado_por).toBe(usuario);
    const acciones = await prisma.auditoria.findMany({
      where: { entidad: "mascotas", id_entidad: mascota },
      select: { accion: true, fid_organizaciones: true, fid_usuarios: true },
    });
    expect(acciones.map(({ accion }) => accion).sort()).toEqual([
      "mascotas.creada",
      "mascotas.eliminada",
      "mascotas.modificada",
    ]);
    expect(acciones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fid_organizaciones: organizacion,
          fid_usuarios: usuario,
        }),
      ]),
    );
  });
});
