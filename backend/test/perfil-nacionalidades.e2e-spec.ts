import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { App } from "supertest/types";
import { ModuloAplicacion } from "../src/app.module";
import { PrismaService } from "../src/comun/prisma.service";

interface CuerpoNacionalidades {
  nacionalidades: unknown[];
  catalogo?: unknown[];
}

describe("nacionalidades del perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let idPais = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `N${sufijo.slice(0, 9)}`.toUpperCase();
  const contrasenia = "Nation1!Pass";
  const slug = process.env.OWNER_ORG_SLUG!;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [ModuloAplicacion],
    }).compile();
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

    const organizacion = await prisma.organizaciones.findFirstOrThrow({
      where: { slug, estado: 1 },
    });
    idOrganizacion = organizacion.id_organizaciones;
    idPais = (
      await prisma.admin_level_0.findFirstOrThrow({ where: { estado: 1 } })
    ).id_admin_level_0;
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Nacionalidad",
        apellido_paterno: "Temporal",
      },
    });
    idPersona = persona.id_personas;
    const usuario = await prisma.usuarios.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        usuario: usuarioIngreso,
      },
    });
    idUsuario = usuario.id_usuarios;
    const zona = await prisma.zonas_horarias.findUniqueOrThrow({
      where: { nombre_iana: "America/Lima" },
    });
    await prisma.preferencias_usuario.create({
      data: {
        fid_usuarios: idUsuario,
        fid_zonas_horarias: zona.id_zonas_horarias,
      },
    });
    await prisma.credenciales.create({
      data: {
        fid_usuarios: idUsuario,
        tipo: "contrasenia",
        hash_contrasenia: await argon2.hash(contrasenia),
      },
    });
    const ingreso = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", "1")
      .send({
        usuario: usuarioIngreso,
        contrasenia,
        slug_organizacion: slug,
        uid_dispositivo: `nationality-${sufijo}`,
        plataforma: "web",
      });
    expect(ingreso.status).toBe(200);
    cookies = (ingreso.headers["set-cookie"] as unknown as string[]).map(
      (cookie) => cookie.split(";", 1)[0],
    );
  });

  afterAll(async () => {
    if (prisma && idUsuario) {
      await prisma.auditoria.deleteMany({ where: { fid_usuarios: idUsuario } });
      await prisma.eventos.deleteMany({ where: { fid_usuarios: idUsuario } });
      await prisma.usuarios.delete({ where: { id_usuarios: idUsuario } });
      await prisma.personas.delete({ where: { id_personas: idPersona } });
    }
    await app?.close();
  });

  it("carga por sesión y rechaza cuerpos manipulados o sin CSRF", async () => {
    const sinSesion = await request(app.getHttpServer()).get(
      "/profile/nationalities",
    );
    expect(sinSesion.status).toBe(401);

    const listado = await request(app.getHttpServer())
      .get("/profile/nationalities")
      .set("Cookie", cookies);
    expect(listado.status).toBe(200);
    const cuerpoListado = listado.body as CuerpoNacionalidades;
    expect(cuerpoListado.nacionalidades).toEqual([]);
    expect(cuerpoListado.catalogo?.length).toBeGreaterThan(0);

    const sinCsrf = await request(app.getHttpServer())
      .post("/profile/nationalities")
      .set("Cookie", cookies)
      .send({ fid_admin_level_0: idPais });
    expect(sinCsrf.status).toBe(403);

    const uuidInvalido = await request(app.getHttpServer())
      .post("/profile/nationalities")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ fid_admin_level_0: "PE" });
    expect(uuidInvalido.status).toBe(400);

    const campoExtra = await request(app.getHttpServer())
      .post("/profile/nationalities")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ fid_admin_level_0: idPais, estado: 1 });
    expect(campoExtra.status).toBe(400);
  });

  it("agrega, evita duplicados y registra auditoría en la misma transacción", async () => {
    const agregado = await request(app.getHttpServer())
      .post("/profile/nationalities")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ fid_admin_level_0: idPais });
    expect(agregado.status).toBe(200);
    expect((agregado.body as CuerpoNacionalidades).nacionalidades).toHaveLength(
      1,
    );

    const duplicado = await request(app.getHttpServer())
      .post("/profile/nationalities")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ fid_admin_level_0: idPais });
    expect(duplicado.status).toBe(409);

    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: "perfil.nacionalidad.agregada",
        },
      }),
    ).toBe(1);
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: { codigo: "perfil.nacionalidad.agregada" },
        },
      }),
    ).toBe(1);
  });

  it("aísla por persona, elimina lógicamente y serializa altas simultáneas", async () => {
    const otraPersona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Otra",
        apellido_paterno: "Persona",
      },
    });
    try {
      const ajena = await prisma.personas_nacionalidades.create({
        data: {
          fid_personas: otraPersona.id_personas,
          fid_admin_level_0: idPais,
        },
      });
      const eliminarAjena = await request(app.getHttpServer())
        .delete(`/profile/nationalities/${ajena.id_personas_nacionalidades}`)
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1");
      expect(eliminarAjena.status).toBe(404);
    } finally {
      await prisma.personas.delete({
        where: { id_personas: otraPersona.id_personas },
      });
    }

    const actual = await prisma.personas_nacionalidades.findFirstOrThrow({
      where: { fid_personas: idPersona, fid_admin_level_0: idPais, estado: 1 },
    });
    const sinCsrf = await request(app.getHttpServer())
      .delete(`/profile/nationalities/${actual.id_personas_nacionalidades}`)
      .set("Cookie", cookies);
    expect(sinCsrf.status).toBe(403);

    const eliminado = await request(app.getHttpServer())
      .delete(`/profile/nationalities/${actual.id_personas_nacionalidades}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1");
    expect(eliminado.status).toBe(200);
    expect((eliminado.body as CuerpoNacionalidades).nacionalidades).toEqual([]);

    const respuestas = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post("/profile/nationalities")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ fid_admin_level_0: idPais }),
      ),
    );
    expect(respuestas.map((respuesta) => respuesta.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await prisma.personas_nacionalidades.count({
        where: { fid_personas: idPersona, fid_admin_level_0: idPais },
      }),
    ).toBe(1);

    const actividad = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies);
    expect(actividad.status).toBe(200);
    expect(
      (actividad.body as { eventos: { tipo_evento: string }[] }).eventos.map(
        (evento) => evento.tipo_evento,
      ),
    ).toEqual(
      expect.arrayContaining([
        "perfil.nacionalidad.agregada",
        "perfil.nacionalidad.eliminada",
      ]),
    );
  });

  it("rechaza la operación si usuario o cuenta dejan de estar activos", async () => {
    await prisma.usuarios.update({
      where: { id_usuarios: idUsuario },
      data: { estado: 0 },
    });
    try {
      const response = await request(app.getHttpServer())
        .get("/profile/nationalities")
        .set("Cookie", cookies);
      // El guardia global corta antes de llegar al caso de uso.
      expect(response.status).toBe(401);
    } finally {
      await prisma.usuarios.update({
        where: { id_usuarios: idUsuario },
        data: { estado: 1 },
      });
    }
  });
});
