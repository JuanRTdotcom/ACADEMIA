import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { App } from "supertest/types";
import { ModuloAplicacion } from "../src/app.module";
import { PrismaService } from "../src/comun/prisma.service";

const AGENTE = "sumaq-e2e-profile-password";
const CLAVE_ACTUAL = "Current1!Pass";
const CLAVE_NUEVA = "Newest2@Pass";

function exigirEntorno(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor) throw new Error(`Falta ${nombre} para la prueba E2E`);
  return valor;
}

function cookiesDe(respuesta: request.Response): string[] {
  const valor = respuesta.headers["set-cookie"] as unknown;
  const cabeceras: string[] = Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : typeof valor === "string"
      ? [valor]
      : [];
  return cabeceras.map((cookie) => cookie.split(";", 1)[0]);
}

describe("PATCH /profile/password (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario: string;
  let idPersona: string;
  let idOrganizacion: string;
  let cookiesActuales: string[];
  let cookiesOtraSesion: string[];
  const slug = exigirEntorno("OWNER_ORG_SLUG");
  const sufijo = randomUUID();
  const usuarioIngreso =
    `P${sufijo.replaceAll("-", "").slice(0, 9)}`.toUpperCase();

  beforeAll(async () => {
    const modulo: TestingModule = await Test.createTestingModule({
      imports: [ModuloAplicacion],
    }).compile();
    app = modulo.createNestApplication();
    app.use(cookieParser());
    const express = app.getHttpAdapter().getInstance() as Express;
    express.set("trust proxy", 1);
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
      select: { id_organizaciones: true },
    });
    idOrganizacion = organizacion.id_organizaciones;
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Prueba",
        apellido_paterno: "Contrasenia",
        apellido_materno: "Temporal",
      },
    });
    idPersona = persona.id_personas;
    const usuario = await prisma.usuarios.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        usuario: usuarioIngreso,
        estado_cuenta: "activo",
      },
    });
    idUsuario = usuario.id_usuarios;
    await prisma.credenciales.create({
      data: {
        fid_usuarios: idUsuario,
        tipo: "contrasenia",
        hash_contrasenia: await argon2.hash(CLAVE_ACTUAL, {
          type: argon2.argon2id,
        }),
      },
    });

    const ingresar = async (uid: string, ip: string) =>
      request(app.getHttpServer())
        .post("/auth/login")
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", ip)
        .set("user-agent", AGENTE)
        .send({
          usuario: usuarioIngreso,
          contrasenia: CLAVE_ACTUAL,
          slug_organizacion: slug,
          uid_dispositivo: uid,
          plataforma: "web",
        });
    const otra = await ingresar(`password-other-${sufijo}`, "198.51.100.201");
    const actual = await ingresar(
      `password-current-${sufijo}`,
      "198.51.100.202",
    );
    expect(otra.status).toBe(200);
    expect(actual.status).toBe(200);
    cookiesOtraSesion = cookiesDe(otra);
    cookiesActuales = cookiesDe(actual);
  });

  afterAll(async () => {
    if (prisma && idUsuario) {
      await prisma.eventos.deleteMany({ where: { fid_usuarios: idUsuario } });
      await prisma.auditoria.deleteMany({
        where: { fid_usuarios: idUsuario },
      });
      await prisma.usuarios.delete({ where: { id_usuarios: idUsuario } });
      await prisma.personas.delete({ where: { id_personas: idPersona } });
    }
    await app?.close();
  });

  it("exige CSRF y la política completa", async () => {
    const sinCsrf = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .send({
        contrasenia_actual: CLAVE_ACTUAL,
        contrasenia_nueva: CLAVE_NUEVA,
        confirmacion_contrasenia: CLAVE_NUEVA,
      });
    expect(sinCsrf.status).toBe(403);

    const debil = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .send({
        contrasenia_actual: CLAVE_ACTUAL,
        contrasenia_nueva: "debil",
        confirmacion_contrasenia: "debil",
      });
    expect(debil.status).toBe(400);

    const confirmacionDistinta = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .send({
        contrasenia_actual: CLAVE_ACTUAL,
        contrasenia_nueva: CLAVE_NUEVA,
        confirmacion_contrasenia: "Other3#Pass",
      });
    expect(confirmacionDistinta.status).toBe(400);

    const actualIncorrecta = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .send({
        contrasenia_actual: "Wrong3#Pass",
        contrasenia_nueva: CLAVE_NUEVA,
        confirmacion_contrasenia: CLAVE_NUEVA,
      });
    expect(actualIncorrecta.status).toBe(400);
  });

  it("cambia, conserva cinco hashes, audita y revoca otras sesiones", async () => {
    const cookiesAnteriores = [...cookiesActuales];
    const respuesta = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.202")
      .set("user-agent", AGENTE)
      .send({
        contrasenia_actual: CLAVE_ACTUAL,
        contrasenia_nueva: CLAVE_NUEVA,
        confirmacion_contrasenia: CLAVE_NUEVA,
      });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ ok: true });
    const cookiesRotadas = cookiesDe(respuesta);
    expect(cookiesRotadas).toHaveLength(2);

    const [credencial, historial, evento, auditoria] = await Promise.all([
      prisma.credenciales.findFirstOrThrow({
        where: { fid_usuarios: idUsuario, tipo: "contrasenia", estado: 1 },
      }),
      prisma.historial_contrasenias.findMany({
        where: { fid_usuarios: idUsuario },
      }),
      prisma.eventos.findFirst({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: { codigo: "perfil.contrasenia.actualizada" },
        },
      }),
      prisma.auditoria.findFirst({
        where: {
          fid_usuarios: idUsuario,
          accion: "perfil.contrasenia.actualizada",
        },
      }),
    ]);
    expect(await argon2.verify(credencial.hash_contrasenia!, CLAVE_NUEVA)).toBe(
      true,
    );
    expect(historial).toHaveLength(1);
    expect(
      await argon2.verify(historial[0].hash_contrasenia, CLAVE_ACTUAL),
    ).toBe(true);
    expect(evento).not.toBeNull();
    expect(auditoria).not.toBeNull();
    expect(JSON.stringify(evento)).not.toContain(CLAVE_NUEVA);
    expect(JSON.stringify(auditoria)).not.toContain(CLAVE_NUEVA);

    const otraSesion = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookiesOtraSesion);
    const tokenAnterior = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookiesAnteriores);
    const sesionActual = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookiesRotadas);
    expect(otraSesion.status).toBe(401);
    expect(tokenAnterior.status).toBe(401);
    expect(sesionActual.status).toBe(200);
    cookiesActuales = cookiesRotadas;
  });

  it("rechaza reutilizar una de las cinco contraseñas anteriores", async () => {
    const respuesta = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.203")
      .send({
        contrasenia_actual: CLAVE_NUEVA,
        contrasenia_nueva: CLAVE_ACTUAL,
        confirmacion_contrasenia: CLAVE_ACTUAL,
      });
    expect(respuesta.status).toBe(400);
  });

  it("bloquea la solicitud 21 durante la ventana de un minuto", async () => {
    for (let intento = 0; intento < 20; intento += 1) {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/password")
        .set("Cookie", cookiesActuales)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.204")
        .send({});
      expect(respuesta.status).toBe(400);
    }
    const bloqueada = await request(app.getHttpServer())
      .patch("/profile/password")
      .set("Cookie", cookiesActuales)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.204")
      .send({});
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
  });
});
