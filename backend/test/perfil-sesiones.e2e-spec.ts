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

const AGENTE = "sumaq-e2e-profile-sessions";

function entorno(nombre: string): string {
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

describe("GET/DELETE /profile/sessions (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario: string;
  let idPersona: string;
  let idOrganizacion: string;
  let usuario: string;
  let cookiesActual: string[];
  let cookiesSegunda: string[];
  let cookiesTercera: string[];
  const password = entorno("SUPERADMIN_PASSWORD");
  const slug = entorno("OWNER_ORG_SLUG");
  const uidActual = `sesion-a-${randomUUID()}`;
  const uidSegunda = `sesion-b-${randomUUID()}`;
  const uidTercera = `sesion-c-${randomUUID()}`;

  async function ingresar(uid_dispositivo: string, ip: string) {
    return request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", ip)
      .set("user-agent", AGENTE)
      .send({
        usuario,
        contrasenia: password,
        slug_organizacion: slug,
        uid_dispositivo,
        plataforma: "web",
      });
  }

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

    const [organizacion, pais, zona] = await Promise.all([
      prisma.organizaciones.findFirstOrThrow({ where: { slug, estado: 1 } }),
      prisma.admin_level_0.findUniqueOrThrow({ where: { codigo_iso2: "PE" } }),
      prisma.zonas_horarias.findUniqueOrThrow({
        where: { nombre_iana: "America/Lima" },
      }),
    ]);
    idOrganizacion = organizacion.id_organizaciones;
    usuario =
      `E2E${randomUUID().replaceAll("-", "").slice(0, 12)}`.toUpperCase();
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Prueba",
        apellido_paterno: "Sesiones",
        apellido_materno: "E2E",
      },
    });
    idPersona = persona.id_personas;
    const creado = await prisma.usuarios.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        usuario,
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash(password, {
              type: argon2.argon2id,
            }),
          },
        },
        preferencias_usuario: {
          create: {
            fid_admin_level_0: pais.id_admin_level_0,
            fid_zonas_horarias: zona.id_zonas_horarias,
          },
        },
      },
    });
    idUsuario = creado.id_usuarios;

    const [primera, segunda, tercera] = await Promise.all([
      ingresar(uidActual, "198.51.100.151"),
      ingresar(uidSegunda, "198.51.100.152"),
      ingresar(uidTercera, "198.51.100.153"),
    ]);
    expect([primera.status, segunda.status, tercera.status]).toEqual([
      200, 200, 200,
    ]);
    cookiesActual = cookiesDe(primera);
    cookiesSegunda = cookiesDe(segunda);
    cookiesTercera = cookiesDe(tercera);

    await Promise.all([
      prisma.dispositivos.update({
        where: {
          fid_usuarios_uid_dispositivo: {
            fid_usuarios: idUsuario,
            uid_dispositivo: uidActual,
          },
        },
        data: { modelo: "Equipo actual", version_so: "Sistema A" },
      }),
      prisma.dispositivos.update({
        where: {
          fid_usuarios_uid_dispositivo: {
            fid_usuarios: idUsuario,
            uid_dispositivo: uidSegunda,
          },
        },
        data: { modelo: "Equipo secundario", version_so: "Sistema B" },
      }),
    ]);
  });

  afterAll(async () => {
    if (prisma && idUsuario) {
      await prisma.eventos.deleteMany({ where: { fid_usuarios: idUsuario } });
      await prisma.auditoria.deleteMany({ where: { fid_usuarios: idUsuario } });
      await prisma.usuarios.delete({ where: { id_usuarios: idUsuario } });
      await prisma.personas.delete({ where: { id_personas: idPersona } });
    }
    await app?.close();
  });

  it("carga por SSR/API las sesiones reales y marca la actual", async () => {
    const respuesta = await request(app.getHttpServer())
      .get("/profile/sessions")
      .set("Cookie", cookiesActual);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ zona_horaria: "America/Lima" });
    expect(respuesta.body.sesiones).toHaveLength(3);
    expect(
      respuesta.body.sesiones.filter(
        (sesion: { actual: boolean }) => sesion.actual,
      ),
    ).toHaveLength(1);
    expect(respuesta.body.sesiones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ modelo: "Equipo actual", actual: true }),
        expect.objectContaining({ modelo: "Equipo secundario", actual: false }),
      ]),
    );
  });

  it("deja de autorizar inmediatamente a un usuario desactivado", async () => {
    await prisma.usuarios.update({
      where: { id_usuarios: idUsuario },
      data: { estado: 0 },
    });
    try {
      const respuesta = await request(app.getHttpServer())
        .get("/profile/sessions")
        .set("Cookie", cookiesActual);
      expect(respuesta.status).toBe(401);
    } finally {
      await prisma.usuarios.update({
        where: { id_usuarios: idUsuario },
        data: { estado: 1 },
      });
    }
  });

  it("protege el cierre, impide cerrar la actual y revoca otra sesión", async () => {
    const listado = await request(app.getHttpServer())
      .get("/profile/sessions")
      .set("Cookie", cookiesActual);
    const actual = listado.body.sesiones.find(
      (sesion: { actual: boolean }) => sesion.actual,
    );
    const segunda = listado.body.sesiones.find(
      (sesion: { modelo: string | null }) =>
        sesion.modelo === "Equipo secundario",
    );

    const actualRechazada = await request(app.getHttpServer())
      .delete(`/profile/sessions/${actual.id_sesiones}`)
      .set("Cookie", cookiesActual)
      .set("x-sumaq-csrf", "1");
    expect(actualRechazada.status).toBe(400);

    const sinCsrf = await request(app.getHttpServer())
      .delete(`/profile/sessions/${segunda.id_sesiones}`)
      .set("Cookie", cookiesActual);
    expect(sinCsrf.status).toBe(403);

    const cerrada = await request(app.getHttpServer())
      .delete(`/profile/sessions/${segunda.id_sesiones}`)
      .set("Cookie", cookiesActual)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE);
    expect(cerrada.status).toBe(200);
    const yaNoAutorizada = await request(app.getHttpServer())
      .get("/profile/sessions")
      .set("Cookie", cookiesSegunda);
    expect(yaNoAutorizada.status).toBe(401);
  });

  it("cierra todas las demás sin afectar la sesión actual", async () => {
    const respuesta = await request(app.getHttpServer())
      .delete("/profile/sessions")
      .set("Cookie", cookiesActual)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ ok: true, cerradas: 1 });

    const vigente = await request(app.getHttpServer())
      .get("/profile/sessions")
      .set("Cookie", cookiesActual);
    expect(vigente.status).toBe(200);
    expect(vigente.body.sesiones).toHaveLength(1);
    expect(vigente.body.sesiones[0].actual).toBe(true);
    const terceraCerrada = await request(app.getHttpServer())
      .get("/profile/sessions")
      .set("Cookie", cookiesTercera);
    expect(terceraCerrada.status).toBe(401);

    const cierres = await prisma.auditoria.count({
      where: {
        fid_usuarios: idUsuario,
        accion: "autenticacion.cierre.exito",
      },
    });
    expect(cierres).toBe(2);
  });
});
