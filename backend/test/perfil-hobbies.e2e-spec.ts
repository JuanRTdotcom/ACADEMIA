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

describe("hobbies del perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let codigoHobby = "";
  let codigoHobbyAlterno = "";
  let codigoFrecuencia = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `H${sufijo.slice(0, 19)}`.toUpperCase();
  const contrasenia = "Hobbies1!Pass";
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
    const hobbies = await prisma.parametros.findMany({
      where: {
        codigo_grupo: "hobbies",
        estado: 1,
        codigo: { not: "otros" },
      },
      orderBy: { orden: "asc" },
      take: 2,
    });
    codigoHobby = hobbies[0]!.codigo;
    codigoHobbyAlterno = hobbies[1]!.codigo;
    codigoFrecuencia = (
      await prisma.parametros.findFirstOrThrow({
        where: { codigo_grupo: "frecuencias_hobby", estado: 1 },
      })
    ).codigo;

    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Hobby",
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
        uid_dispositivo: `hobbies-${sufijo}`,
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

  it("carga ambos catálogos y rechaza sesión, CSRF y cuerpos manipulados", async () => {
    expect(
      (await request(app.getHttpServer()).get("/profile/hobbies")).status,
    ).toBe(401);
    const listado = await request(app.getHttpServer())
      .get("/profile/hobbies")
      .set("Cookie", cookies);
    expect(listado.status).toBe(200);
    expect(
      (listado.body as { catalogoHobbies: unknown[] }).catalogoHobbies.length,
    ).toBeGreaterThan(1);
    expect(
      (listado.body as { catalogoFrecuencias: unknown[] }).catalogoFrecuencias
        .length,
    ).toBeGreaterThan(0);
    expect(listado.body.catalogoHobbies[0].traducciones).toEqual(
      expect.objectContaining({
        es: expect.any(String),
        en: expect.any(String),
      }),
    );

    const valido = {
      codigo_hobby: codigoHobby,
      codigo_frecuencia: codigoFrecuencia,
    };
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/hobbies")
          .set("Cookie", cookies)
          .send(valido)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/hobbies")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...valido, estado: 1 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/hobbies")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...valido, codigo_hobby: "inventado" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/hobbies")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...valido, hobby_personalizado: "No permitido" })
      ).status,
    ).toBe(400);
  });

  it("agrega Otros, evita duplicados y permite modificar usando parámetros activos", async () => {
    const agregado = await request(app.getHttpServer())
      .post("/profile/hobbies")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_hobby: "otros",
        hobby_personalizado: "Origami modular",
        codigo_frecuencia: codigoFrecuencia,
      });
    expect(agregado.status).toBe(200);
    const actual = (
      agregado.body as { hobbies: { id_personas_hobbies: string }[] }
    ).hobbies[0]!;

    const duplicado = await request(app.getHttpServer())
      .post("/profile/hobbies")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_hobby: "otros",
        hobby_personalizado: "origami modular",
        codigo_frecuencia: codigoFrecuencia,
      });
    expect(duplicado.status).toBe(409);

    const modificado = await request(app.getHttpServer())
      .patch(`/profile/hobbies/${actual.id_personas_hobbies}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_hobby: codigoHobbyAlterno,
        codigo_frecuencia: codigoFrecuencia,
      });
    expect(modificado.status).toBe(200);
    expect(
      (modificado.body as { hobbies: { codigo_hobby: string }[] }).hobbies[0]
        ?.codigo_hobby,
    ).toBe(codigoHobbyAlterno);

    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: {
            in: ["perfil.hobby.agregado", "perfil.hobby.modificado"],
          },
        },
      }),
    ).toBe(2);
  });

  it("impide operar registros ajenos, elimina lógicamente y muestra los eventos", async () => {
    const otraPersona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Otra",
        apellido_paterno: "Persona",
      },
    });
    try {
      const ajeno = await prisma.personas_hobbies.create({
        data: {
          fid_personas: otraPersona.id_personas,
          codigo_hobby: codigoHobby,
          codigo_frecuencia: codigoFrecuencia,
        },
      });
      expect(
        (
          await request(app.getHttpServer())
            .delete(`/profile/hobbies/${ajeno.id_personas_hobbies}`)
            .set("Cookie", cookies)
            .set("x-sumaq-csrf", "1")
        ).status,
      ).toBe(404);
    } finally {
      await prisma.personas.delete({
        where: { id_personas: otraPersona.id_personas },
      });
    }

    const actual = await prisma.personas_hobbies.findFirstOrThrow({
      where: { fid_personas: idPersona, estado: 1 },
    });
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/profile/hobbies/${actual.id_personas_hobbies}`)
          .set("Cookie", cookies)
      ).status,
    ).toBe(403);
    const eliminado = await request(app.getHttpServer())
      .delete(`/profile/hobbies/${actual.id_personas_hobbies}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1");
    expect(eliminado.status).toBe(200);
    expect((eliminado.body as { hobbies: unknown[] }).hobbies).toEqual([]);
    expect(
      (
        await prisma.personas_hobbies.findUniqueOrThrow({
          where: { id_personas_hobbies: actual.id_personas_hobbies },
        })
      ).estado,
    ).toBe(0);

    const actividad = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies);
    expect(
      (actividad.body as { eventos: { tipo_evento: string }[] }).eventos.map(
        (evento) => evento.tipo_evento,
      ),
    ).toEqual(
      expect.arrayContaining([
        "perfil.hobby.agregado",
        "perfil.hobby.modificado",
        "perfil.hobby.eliminado",
      ]),
    );
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: {
            codigo: {
              in: [
                "perfil.hobby.agregado",
                "perfil.hobby.modificado",
                "perfil.hobby.eliminado",
              ],
            },
          },
        },
      }),
    ).toBe(3);
  });
});
