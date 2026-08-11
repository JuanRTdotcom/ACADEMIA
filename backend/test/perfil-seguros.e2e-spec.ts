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

describe("seguros del perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let codigoSeguro = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `S${sufijo.slice(0, 9)}`.toUpperCase();
  const contrasenia = "Insurance1!Pass";
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
    codigoSeguro = (
      await prisma.parametros.findFirstOrThrow({
        where: {
          codigo_grupo: "seguros",
          estado: 1,
          codigo: { not: "otro" },
        },
      })
    ).codigo;
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Seguro",
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
        uid_dispositivo: `insurance-${sufijo}`,
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

  it("carga el catálogo y valida sesión, CSRF, DTO y la opción Otros", async () => {
    expect(
      (await request(app.getHttpServer()).get("/profile/insurance")).status,
    ).toBe(401);
    const listado = await request(app.getHttpServer())
      .get("/profile/insurance")
      .set("Cookie", cookies);
    expect(listado.status).toBe(200);
    expect((listado.body as { catalogo: unknown[] }).catalogo).toHaveLength(25);

    const base = { codigo_seguro: codigoSeguro, numero_seguro: "POL-001" };
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/insurance")
          .set("Cookie", cookies)
          .send(base)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/insurance")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...base, estado: 1 })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/insurance")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ codigo_seguro: "otro", numero_seguro: "OTR-1" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/insurance")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ ...base, nombre_otro: "No permitido" })
      ).status,
    ).toBe(400);
  });

  it("agrega, evita duplicados, modifica y registra auditoría y eventos", async () => {
    const agregado = await request(app.getHttpServer())
      .post("/profile/insurance")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_seguro: "otro",
        nombre_otro: "seguro personal",
        numero_seguro: "otr-001",
      });
    expect(agregado.status).toBe(200);
    const registro = (
      agregado.body as { seguros: { id_personas_seguros: string }[] }
    ).seguros[0];

    const duplicado = await request(app.getHttpServer())
      .post("/profile/insurance")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_seguro: "otro",
        nombre_otro: "Seguro Personal",
        numero_seguro: "OTR-001",
      });
    expect(duplicado.status).toBe(409);

    const modificado = await request(app.getHttpServer())
      .patch(`/profile/insurance/${registro.id_personas_seguros}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_seguro: codigoSeguro,
        numero_seguro: "POL-002",
      });
    expect(modificado.status).toBe(200);

    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: {
            in: ["perfil.seguro.agregado", "perfil.seguro.modificado"],
          },
        },
      }),
    ).toBe(2);
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: {
            codigo: {
              in: ["perfil.seguro.agregado", "perfil.seguro.modificado"],
            },
          },
        },
      }),
    ).toBe(2);
  });

  it("aísla por persona, elimina lógicamente y publica la actividad", async () => {
    const actual = await prisma.personas_seguros.findFirstOrThrow({
      where: { fid_personas: idPersona, estado: 1 },
    });
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/profile/insurance/${actual.id_personas_seguros}`)
          .set("Cookie", cookies)
      ).status,
    ).toBe(403);
    const eliminado = await request(app.getHttpServer())
      .delete(`/profile/insurance/${actual.id_personas_seguros}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1");
    expect(eliminado.status).toBe(200);
    expect((eliminado.body as { seguros: unknown[] }).seguros).toEqual([]);
    expect(
      (
        await prisma.personas_seguros.findUniqueOrThrow({
          where: { id_personas_seguros: actual.id_personas_seguros },
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
        "perfil.seguro.agregado",
        "perfil.seguro.modificado",
        "perfil.seguro.eliminado",
      ]),
    );
  });
});
