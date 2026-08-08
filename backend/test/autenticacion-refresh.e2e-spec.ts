import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import request from "supertest";
import type { App } from "supertest/types";
import { ModuloAplicacion } from "../src/app.module";
import { ServicioHashTokenRefresco } from "../src/autenticacion/data/security/hash-token-refresco.service";
import { PrismaService } from "../src/comun/prisma.service";

const CABECERA_CSRF = "x-sumaq-csrf";
const AGENTE_PRUEBA = "sumaq-e2e-refresh";

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

function cookiePorNombre(cookies: string[], nombre: string): string {
  const cookie = cookies.find((actual) => actual.startsWith(`${nombre}=`));
  if (!cookie) throw new Error(`La respuesta no contiene ${nombre}`);
  return cookie;
}

describe("POST /auth/refresh (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let hashTokens: ServicioHashTokenRefresco;
  let jwt: JwtService;
  let config: ConfigService;
  let idUsuario: string;
  let idPersona: string;
  const dispositivosPrueba: string[] = [];

  const slug = exigirEntorno("OWNER_ORG_SLUG");
  const sufijoUsuario = randomUUID();
  const usuarioIngreso =
    `R${sufijoUsuario.replaceAll("-", "").slice(0, 19)}`.toUpperCase();
  const contrasenia = "Refresh1!Pass";

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
    hashTokens = app.get(ServicioHashTokenRefresco);
    jwt = app.get(JwtService);
    config = app.get(ConfigService);

    const organizacion = await prisma.organizaciones.findFirstOrThrow({
      where: { slug, estado: 1 },
      select: { id_organizaciones: true },
    });
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: organizacion.id_organizaciones,
        nombres: "Prueba",
        apellido_paterno: "Refresco",
        apellido_materno: "Temporal",
      },
    });
    idPersona = persona.id_personas;
    const usuario = await prisma.usuarios.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: organizacion.id_organizaciones,
        usuario: usuarioIngreso,
        estado_cuenta: "activo",
      },
    });
    idUsuario = usuario.id_usuarios;
    await prisma.credenciales.create({
      data: {
        fid_usuarios: idUsuario,
        tipo: "contrasenia",
        hash_contrasenia: await argon2.hash(contrasenia, {
          type: argon2.argon2id,
        }),
      },
    });
  });

  afterAll(async () => {
    await prisma.auditoria.deleteMany({
      where: { agente_usuario: AGENTE_PRUEBA },
    });
    await prisma.eventos.deleteMany({
      where: {
        metadatos: { path: ["agente_usuario"], equals: AGENTE_PRUEBA },
      },
    });
    await prisma.dispositivos.deleteMany({
      where: {
        fid_usuarios: idUsuario,
        uid_dispositivo: { in: dispositivosPrueba },
      },
    });
    await prisma.usuarios.delete({ where: { id_usuarios: idUsuario } });
    await prisma.personas.delete({ where: { id_personas: idPersona } });
    await app.close();
  });

  function nuevaUid(): string {
    const uid = `e2e-refresh-${randomUUID()}`;
    dispositivosPrueba.push(uid);
    return uid;
  }

  async function ingresar(uid: string, ip: string) {
    const respuesta = await request(app.getHttpServer())
      .post("/auth/login")
      .set(CABECERA_CSRF, "1")
      .set("x-forwarded-for", ip)
      .set("user-agent", AGENTE_PRUEBA)
      .send({
        usuario: usuarioIngreso,
        contrasenia,
        slug_organizacion: slug,
        uid_dispositivo: uid,
        plataforma: "web",
      });

    expect(respuesta.status).toBe(200);
    const cookies = cookiesDe(respuesta);
    return {
      refresh: cookiePorNombre(cookies, "refresh_token"),
      access: cookiePorNombre(cookies, "access_token"),
    };
  }

  async function sesionesDe(uid: string) {
    const dispositivo = await prisma.dispositivos.findUnique({
      where: {
        fid_usuarios_uid_dispositivo: {
          fid_usuarios: idUsuario,
          uid_dispositivo: uid,
        },
      },
      include: { sesiones: { orderBy: { created_at: "asc" } } },
    });
    if (!dispositivo) throw new Error(`No existe dispositivo E2E ${uid}`);
    return dispositivo.sesiones;
  }

  function refrescar(cookie: string, ip: string) {
    return request(app.getHttpServer())
      .post("/auth/refresh")
      .set(CABECERA_CSRF, "1")
      .set("x-forwarded-for", ip)
      .set("user-agent", AGENTE_PRUEBA)
      .set("cookie", cookie);
  }

  it("rota en sitio dentro de una transacción y guarda el nuevo HMAC", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.11");

    const respuesta = await refrescar(sesion.refresh, "198.51.100.11");
    expect(respuesta.status).toBe(200);
    expect(cookiePorNombre(cookiesDe(respuesta), "refresh_token")).not.toBe(
      sesion.refresh,
    );

    const filas = await sesionesDe(uid);
    expect(filas).toHaveLength(1);
    expect(filas[0].rotada_en).not.toBeNull();
    expect(filas[0].revocada_en).toBeNull();
    expect(filas[0].generacion).toBe(1);
    expect(filas[0].hash_token_refresco).toMatch(/^hmac-sha256:[a-f0-9]{64}$/);
  });

  it("serializa dos refresh concurrentes y conserva una sola fila", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.12");

    const respuestas = await Promise.all([
      refrescar(sesion.refresh, "198.51.100.12"),
      refrescar(sesion.refresh, "198.51.100.12"),
    ]);
    expect(respuestas.map(({ status }) => status).sort()).toEqual([200, 401]);

    const filas = await sesionesDe(uid);
    expect(filas).toHaveLength(1);
    expect(
      filas.filter(({ revocada_en }) => revocada_en === null),
    ).toHaveLength(1);
    expect(filas[0].generacion).toBe(1);
  });

  it("rota sin crear auditoría ni evento técnico", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.13");
    const respuesta = await refrescar(sesion.refresh, "198.51.100.13");
    expect(respuesta.status).toBe(200);
    const filas = await sesionesDe(uid);
    expect(filas).toHaveLength(1);
    expect(filas[0].rotada_en).not.toBeNull();
    expect(filas[0].revocada_en).toBeNull();

    const [auditorias, eventos] = await Promise.all([
      prisma.auditoria.count({
        where: {
          accion: "autenticacion.refresco.exito",
          agente_usuario: AGENTE_PRUEBA,
        },
      }),
      prisma.eventos.count({
        where: {
          evento_maestro: { codigo: "autenticacion.refresco.exito" },
          metadatos: { path: ["agente_usuario"], equals: AGENTE_PRUEBA },
        },
      }),
    ]);
    expect(auditorias).toBe(0);
    expect(eventos).toBe(0);
  });

  it("rechaza una sesión cuya inactividad venció sin crear sucesora", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.14");
    const [activa] = await sesionesDe(uid);
    await prisma.$executeRaw`
      UPDATE seguridad.sesiones
      SET expira_inactividad_en = CURRENT_TIMESTAMP - INTERVAL '1 second'
      WHERE id_sesiones = ${activa.id_sesiones}::uuid
    `;

    const respuesta = await refrescar(sesion.refresh, "198.51.100.14");
    expect(respuesta.status).toBe(401);
    expect(await sesionesDe(uid)).toHaveLength(1);
  });

  it("rechaza una sesión cuyo límite absoluto venció", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.18");
    const [activa] = await sesionesDe(uid);
    await prisma.$executeRaw`
      UPDATE seguridad.sesiones
      SET expira_absoluta_en = CURRENT_TIMESTAMP - INTERVAL '1 second'
      WHERE id_sesiones = ${activa.id_sesiones}::uuid
    `;

    const respuesta = await refrescar(sesion.refresh, "198.51.100.18");
    expect(respuesta.status).toBe(401);
    expect(await sesionesDe(uid)).toHaveLength(1);
  });

  it("un replay se procesa una vez y no afecta un login posterior", async () => {
    const uid = nuevaUid();
    const primera = await ingresar(uid, "198.51.100.15");
    expect((await refrescar(primera.refresh, "198.51.100.15")).status).toBe(
      200,
    );
    const [origen] = await sesionesDe(uid);
    const gracia = Number(exigirEntorno("REFRESH_REUSE_GRACE_SECONDS"));
    await prisma.$executeRaw`
      UPDATE seguridad.sesiones
      SET rotada_en = CURRENT_TIMESTAMP - (${gracia + 1} * INTERVAL '1 second')
      WHERE id_sesiones = ${origen.id_sesiones}::uuid
    `;

    expect((await refrescar(primera.refresh, "198.51.100.15")).status).toBe(
      401,
    );
    const familiaComprometida = await sesionesDe(uid);
    expect(
      familiaComprometida.every(({ revocada_en }) => revocada_en !== null),
    ).toBe(true);
    expect(familiaComprometida[0].reuso_detectado_en).not.toBeNull();

    const nueva = await ingresar(uid, "198.51.100.15");
    const antes = (await sesionesDe(uid)).find(
      ({ revocada_en }) => revocada_en === null,
    );
    expect(antes).toBeDefined();

    expect((await refrescar(primera.refresh, "198.51.100.15")).status).toBe(
      401,
    );
    const despues = (await sesionesDe(uid)).find(
      ({ revocada_en }) => revocada_en === null,
    );
    expect(despues?.id_sesiones).toBe(antes?.id_sesiones);
    expect(nueva.refresh).toBeDefined();

    const auditorias = await prisma.auditoria.count({
      where: {
        accion: "autenticacion.refresco.reuso",
        id_entidad: origen.id_sesiones,
        agente_usuario: AGENTE_PRUEBA,
      },
    });
    expect(auditorias).toBe(1);

    const eventos = await prisma.eventos.count({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: { codigo: "autenticacion.refresco.reuso" },
        id_agregado: origen.id_sesiones,
        metadatos: { path: ["agente_usuario"], equals: AGENTE_PRUEBA },
      },
    });
    expect(eventos).toBe(0);
  });

  it("rechaza un token firmado cuyo HMAC no coincide", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.16");
    const [activa] = await sesionesDe(uid);
    await prisma.sesiones.update({
      where: { id_sesiones: activa.id_sesiones },
      data: { hash_token_refresco: hashTokens.crear("token-distinto") },
    });

    expect((await refrescar(sesion.refresh, "198.51.100.16")).status).toBe(401);
    expect(await sesionesDe(uid)).toHaveLength(1);
  });

  it("rechaza HS384 antes de consultar el HMAC de la sesión", async () => {
    const uid = nuevaUid();
    await ingresar(uid, "198.51.100.19");
    const [activa] = await sesionesDe(uid);
    const [reloj] = await prisma.$queryRaw<{ epoch: bigint }[]>`
      SELECT EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint AS epoch
    `;
    if (!reloj) throw new Error("PostgreSQL no devolvió su epoch");
    const iat = Number(reloj.epoch);
    const tokenHs384 = await jwt.signAsync(
      {
        sub: idUsuario,
        sid: activa.id_sesiones,
        iat,
        exp: iat + 600,
      },
      {
        secret: config.getOrThrow("JWT_REFRESH_SECRET"),
        issuer: config.getOrThrow("JWT_ISSUER"),
        audience: config.getOrThrow("JWT_AUDIENCE"),
        algorithm: "HS384",
      },
    );
    const verificar = jest.spyOn(hashTokens, "verificar");

    const respuesta = await refrescar(
      `refresh_token=${tokenHs384}`,
      "198.51.100.19",
    );
    expect(respuesta.status).toBe(401);
    expect(verificar).not.toHaveBeenCalled();
    verificar.mockRestore();
  });

  it("limita refresh por sid aunque cambie la IP", async () => {
    const uid = nuevaUid();
    const sesion = await ingresar(uid, "198.51.100.17");
    const limite = Number(exigirEntorno("REFRESH_SESSION_RATE_LIMIT"));
    const estados: number[] = [];

    for (let intento = 0; intento <= limite; intento += 1) {
      const respuesta = await refrescar(
        sesion.refresh,
        `203.0.113.${intento + 1}`,
      );
      estados.push(respuesta.status);
    }

    expect(estados[0]).toBe(200);
    expect(estados.at(-1)).toBe(429);
  });

  it("limita refresh por IP antes de verificar un JWT inválido", async () => {
    const estados: number[] = [];
    for (let intento = 0; intento < 21; intento += 1) {
      const respuesta = await refrescar(
        "refresh_token=jwt-invalido",
        "198.51.100.200",
      );
      estados.push(respuesta.status);
    }

    expect(estados.slice(0, 20).every((estado) => estado === 401)).toBe(true);
    expect(estados[20]).toBe(429);
  });
});
