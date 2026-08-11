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

describe("estudios del perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `E${sufijo.slice(0, 9)}`.toUpperCase();
  const contrasenia = "Estudios1!Pass";
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
    idOrganizacion = (
      await prisma.organizaciones.findFirstOrThrow({
        where: { slug, estado: 1 },
      })
    ).id_organizaciones;
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Estudio",
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
        uid_dispositivo: `studies-${sufijo}`,
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

  it("carga los cuatro maestros traducidos y protege sesión, CSRF y DTO", async () => {
    expect(
      (await request(app.getHttpServer()).get("/profile/studies")).status,
    ).toBe(401);
    const listado = await request(app.getHttpServer())
      .get("/profile/studies")
      .set("Cookie", cookies);
    expect(listado.status).toBe(200);
    for (const catalogo of Object.values(
      listado.body.catalogos as Record<
        string,
        { traducciones: Record<string, string> }[]
      >,
    )) {
      expect(catalogo.length).toBeGreaterThan(0);
      expect(catalogo[0]!.traducciones).toEqual(
        expect.objectContaining({
          es: expect.any(String),
          en: expect.any(String),
        }),
      );
    }
    const payload = {
      codigo_nivel_instruccion: "universitario",
      codigo_grado_obtenido: "bachiller",
      codigo_profesion: "medicina",
      fecha_inicio: "2020-01-01",
      fecha_fin: "2024-01-01",
      en_curso: false,
    };
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/academic")
          .set("Cookie", cookies)
          .send(payload)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/academic")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...payload, intruso: true })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/academic")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...payload, fecha_fin: payload.fecha_inicio })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/academic")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...payload, codigo_profesion: "otro" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/academic")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...payload, fecha_fin: "2019-01-01" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/studies/complementary")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_estudio: "curso",
            institucion: "Universidad de prueba",
            fecha_inicio: "2025-01-01",
            en_curso: true,
          })
      ).status,
    ).toBe(400);
  });

  it("agrega y modifica ambos tipos dentro de transacciones auditadas", async () => {
    const academico = await request(app.getHttpServer())
      .post("/profile/studies/academic")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_nivel_instruccion: "universitario",
        codigo_grado_obtenido: "bachiller",
        codigo_profesion: "otro",
        profesion_otro: "Biología marina",
        fecha_inicio: "2020-01-01",
        fecha_fin: "2024-01-01",
        en_curso: false,
      });
    expect(academico.status).toBe(200);
    const idAcademico = academico.body.realizados[0]
      .id_personas_estudios_realizados as string;
    const modificado = await request(app.getHttpServer())
      .patch(`/profile/studies/academic/${idAcademico}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_nivel_instruccion: "universitario",
        codigo_grado_obtenido: "titulo_profesional",
        codigo_profesion: "medicina",
        fecha_inicio: "2020-01-01",
        fecha_fin: "2025-01-01",
        en_curso: false,
      });
    expect(modificado.status).toBe(200);

    const complementario = await request(app.getHttpServer())
      .post("/profile/studies/complementary")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_tipo_estudio: "otro",
        tipo_estudio_otro: "Programa internacional",
        nombre_estudio: "Gestión de proyectos educativos",
        institucion: "Universidad de prueba",
        fecha_inicio: "2025-01-01",
        en_curso: true,
      });
    expect(complementario.status).toBe(200);
    const idComplementario = complementario.body.complementarios[0]
      .id_personas_estudios_complementarios as string;
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/profile/studies/complementary/${idComplementario}`)
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_estudio: "curso",
            nombre_estudio: "Gestión de proyectos",
            institucion: "Universidad de prueba",
            fecha_inicio: "2025-01-01",
            fecha_fin: "2025-07-01",
            en_curso: false,
          })
      ).status,
    ).toBe(200);
    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: { startsWith: "perfil.estudio_" },
        },
      }),
    ).toBe(4);
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: { codigo: { startsWith: "perfil.estudio_" } },
        },
      }),
    ).toBe(4);
  });

  it("aísla por persona y elimina lógicamente con actividad visible", async () => {
    const realizado =
      await prisma.personas_estudios_realizados.findFirstOrThrow({
        where: { fid_personas: idPersona, estado: 1 },
      });
    const complementario =
      await prisma.personas_estudios_complementarios.findFirstOrThrow({
        where: { fid_personas: idPersona, estado: 1 },
      });
    expect(
      (
        await request(app.getHttpServer())
          .delete(
            `/profile/studies/academic/${realizado.id_personas_estudios_realizados}`,
          )
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .delete(
            `/profile/studies/complementary/${complementario.id_personas_estudios_complementarios}`,
          )
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
      ).status,
    ).toBe(200);
    expect(
      (
        await prisma.personas_estudios_realizados.findUniqueOrThrow({
          where: {
            id_personas_estudios_realizados:
              realizado.id_personas_estudios_realizados,
          },
        })
      ).estado,
    ).toBe(0);
    const actividad = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies);
    expect(
      actividad.body.eventos.map(
        (evento: { tipo_evento: string }) => evento.tipo_evento,
      ),
    ).toEqual(
      expect.arrayContaining([
        "perfil.estudio_realizado.agregado",
        "perfil.estudio_realizado.modificado",
        "perfil.estudio_realizado.eliminado",
        "perfil.estudio_complementario.agregado",
        "perfil.estudio_complementario.modificado",
        "perfil.estudio_complementario.eliminado",
      ]),
    );
  });
});
