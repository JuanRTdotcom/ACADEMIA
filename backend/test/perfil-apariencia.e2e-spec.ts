import "dotenv/config";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import type { Express } from "express";
import { randomBytes, randomUUID } from "node:crypto";
import request from "supertest";
import sharp from "sharp";
import type { App } from "supertest/types";
import { ModuloAplicacion } from "../src/app.module";
import { PrismaService } from "../src/comun/prisma.service";

const AGENTE = "sumaq-e2e-profile-appearance";

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

describe("PATCH /profile/appearance (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario: string;
  let idOrganizacion: string;
  let idPersona: string;
  let cookies: string[];
  let idPais: string;
  let idZona: string;
  let preferenciasAnteriores: {
    fid_admin_level_0: string | null;
    fid_zonas_horarias: string | null;
    tema: string | null;
    idioma: string | null;
    menu_colapsado: boolean;
  };
  let mfaAnterior: {
    id_usuario_mfa: string;
    habilitado: boolean;
    estado: number;
  } | null;
  let personaAnterior: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    codigo_sexo: string | null;
    codigo_estado_civil: string | null;
    codigo_nivel_instruccion: string | null;
    fecha_nacimiento: Date | null;
    discapacidad: boolean;
    fid_admin_level_0_procedencia: string | null;
    fid_admin_level_3_procedencia: string | null;
    fid_admin_level_0_residencia: string | null;
    fid_admin_level_3_residencia: string | null;
    direccion: string | null;
    referencia: string | null;
    foto_url: string | null;
  };

  const slug = exigirEntorno("OWNER_ORG_SLUG");
  const usuarioIngreso = exigirEntorno("SUPERADMIN_USERNAME");
  const contrasenia = exigirEntorno("SUPERADMIN_PASSWORD");
  const uid = `e2e-appearance-${randomUUID()}`;
  let ultimoOctetoPayload = 100;

  async function payloadPersonal(
    cambios: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const respuesta = await request(app.getHttpServer())
      .get("/profile/personal")
      .set("Cookie", cookies)
      .set("x-forwarded-for", `198.51.100.${ultimoOctetoPayload++}`);
    expect(respuesta.status).toBe(200);
    return {
      ...(respuesta.body.persona as Record<string, unknown>),
      apellido_materno: respuesta.body.persona.apellido_materno ?? "Prueba",
      ...cambios,
    };
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

    const usuario = await prisma.usuarios.findFirstOrThrow({
      where: { usuario: usuarioIngreso, organizacion: { slug } },
      select: {
        id_usuarios: true,
        fid_organizaciones: true,
        fid_personas: true,
        persona: {
          select: {
            nombres: true,
            apellido_paterno: true,
            apellido_materno: true,
            codigo_sexo: true,
            codigo_estado_civil: true,
            codigo_nivel_instruccion: true,
            fecha_nacimiento: true,
            discapacidad: true,
            fid_admin_level_0_procedencia: true,
            fid_admin_level_3_procedencia: true,
            fid_admin_level_0_residencia: true,
            fid_admin_level_3_residencia: true,
            direccion: true,
            referencia: true,
            foto_url: true,
          },
        },
        preferencias_usuario: {
          select: {
            fid_admin_level_0: true,
            fid_zonas_horarias: true,
            tema: true,
            idioma: true,
            menu_colapsado: true,
          },
        },
        usuario_mfa: {
          where: { tipo: "totp" },
          take: 1,
          select: {
            id_usuario_mfa: true,
            habilitado: true,
            estado: true,
          },
        },
      },
    });
    idUsuario = usuario.id_usuarios;
    idOrganizacion = usuario.fid_organizaciones;
    idPersona = usuario.fid_personas;
    personaAnterior = usuario.persona;
    preferenciasAnteriores = usuario.preferencias_usuario ?? {
      fid_admin_level_0: null,
      fid_zonas_horarias: null,
      tema: null,
      idioma: null,
      menu_colapsado: false,
    };
    mfaAnterior = usuario.usuario_mfa[0] ?? null;

    const [pais, zona] = await Promise.all([
      prisma.admin_level_0.findFirstOrThrow({
        where: { codigo_iso2: "PE", estado: 1 },
        select: { id_admin_level_0: true },
      }),
      prisma.zonas_horarias.findFirstOrThrow({
        where: { nombre_iana: "America/Lima", estado: 1 },
        select: { id_zonas_horarias: true },
      }),
    ]);
    idPais = pais.id_admin_level_0;
    idZona = zona.id_zonas_horarias;

    const ingreso = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.44")
      .set("user-agent", AGENTE)
      .send({
        usuario: usuarioIngreso,
        contrasenia,
        slug_organizacion: slug,
        uid_dispositivo: uid,
        plataforma: "web",
      });
    expect(ingreso.status).toBe(200);
    cookies = cookiesDe(ingreso);
  });

  afterAll(async () => {
    await prisma.personas.update({
      where: { id_personas: idPersona },
      data: personaAnterior,
    });
    await prisma.preferencias_usuario.update({
      where: { fid_usuarios: idUsuario },
      data: preferenciasAnteriores,
    });
    if (mfaAnterior) {
      await prisma.usuario_mfa.update({
        where: { id_usuario_mfa: mfaAnterior.id_usuario_mfa },
        data: {
          habilitado: mfaAnterior.habilitado,
          estado: mfaAnterior.estado,
        },
      });
    } else {
      await prisma.usuario_mfa.deleteMany({
        where: { fid_usuarios: idUsuario, tipo: "totp" },
      });
    }
    await prisma.auditoria.deleteMany({
      where: { agente_usuario: AGENTE },
    });
    await prisma.eventos.deleteMany({
      where: {
        metadatos: { path: ["agente_usuario"], equals: AGENTE },
      },
    });
    await prisma.dispositivos.deleteMany({
      where: { fid_usuarios: idUsuario, uid_dispositivo: uid },
    });
    await app.close();
  });

  it("carga y actualiza solo los datos personales del usuario autenticado", async () => {
    const sinSesion = await request(app.getHttpServer()).get(
      "/profile/personal",
    );
    expect(sinSesion.status).toBe(401);

    const inicial = await request(app.getHttpServer())
      .get("/profile/personal")
      .set("Cookie", cookies);
    expect(inicial.status).toBe(200);
    const perfil = inicial.body as {
      persona: Record<string, unknown>;
      catalogos: {
        tipos_documento: { codigo: string }[];
        sexos: { codigo: string }[];
      };
      roles: { codigo: string }[];
    };
    expect(perfil.persona).not.toHaveProperty("correo");
    expect(perfil.persona).not.toHaveProperty("codigo_tipo_documento");
    expect(perfil.persona).not.toHaveProperty("numero_documento");
    expect(perfil.catalogos.sexos.length).toBeGreaterThan(0);
    expect(perfil.roles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ codigo: "SUPERADMIN" }),
      ]),
    );

    const payload = {
      nombres: `${personaAnterior.nombres} Prueba`,
      apellido_paterno: personaAnterior.apellido_paterno,
      apellido_materno: personaAnterior.apellido_materno ?? "Prueba",
      codigo_sexo: null,
      fecha_nacimiento: null,
      discapacidad: true,
      codigo_estado_civil: null,
      codigo_nivel_instruccion: null,
      fid_admin_level_0_procedencia: null,
      codigo_admin_level_3_procedencia: null,
      fid_admin_level_0_residencia: null,
      codigo_admin_level_3_residencia: null,
      direccion: null,
      referencia: null,
    };

    const sinCsrf = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .send(payload);
    expect(sinCsrf.status).toBe(403);

    const sinApellidoMaterno = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ ...payload, apellido_materno: "" });
    expect(sinApellidoMaterno.status).toBe(400);

    const nombresDemasiadoLargos = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ ...payload, nombres: "A".repeat(51) });
    expect(nombresDemasiadoLargos.status).toBe(400);

    const apellidoDemasiadoLargo = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ ...payload, apellido_paterno: "A".repeat(31) });
    expect(apellidoDemasiadoLargo.status).toBe(400);

    const respuesta = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .send(payload);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ ok: true, persona: payload });

    const contextoActualizado = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies);
    expect(contextoActualizado.status).toBe(200);
    const cuerpoContextoActualizado = contextoActualizado.body as {
      persona: {
        nombres: string;
        apellido_paterno: string;
        apellido_materno: string | null;
      };
    };
    expect(cuerpoContextoActualizado.persona).toEqual({
      nombres: payload.nombres,
      apellido_paterno: payload.apellido_paterno,
      apellido_materno: payload.apellido_materno,
    });

    const auditoria = await prisma.auditoria.findFirst({
      where: {
        fid_usuarios: idUsuario,
        accion: "perfil.datos_personales.actualizados",
        agente_usuario: AGENTE,
      },
    });
    expect(auditoria).not.toBeNull();

    const eventoVisible = await prisma.eventos.findFirst({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: { codigo: "perfil.datos_personales.actualizados" },
      },
    });
    expect(eventoVisible).not.toBeNull();
  });

  it("guarda procedencia y residencia independientes y rechaza países cruzados", async () => {
    const actual = await request(app.getHttpServer())
      .get("/profile/personal")
      .set("Cookie", cookies);
    expect(actual.status).toBe(200);

    const catalogos = actual.body.catalogos as {
      admin_level_0: { id_admin_level_0: string; codigo_iso2: string }[];
      admin_level_1: {
        id_admin_level_1: string;
        fid_admin_level_0: string;
      }[];
      admin_level_3: { fid_admin_level_1: string; codigo: string }[];
    };
    const peru = catalogos.admin_level_0.find(
      (item) => item.codigo_iso2 === "PE",
    )!;
    const mexico = catalogos.admin_level_0.find(
      (item) => item.codigo_iso2 === "MX",
    )!;
    const idsPeru = new Set(
      catalogos.admin_level_1
        .filter((item) => item.fid_admin_level_0 === peru.id_admin_level_0)
        .map((item) => item.id_admin_level_1),
    );
    const idsMexico = new Set(
      catalogos.admin_level_1
        .filter((item) => item.fid_admin_level_0 === mexico.id_admin_level_0)
        .map((item) => item.id_admin_level_1),
    );
    const nivel3Peru = catalogos.admin_level_3.find((item) =>
      idsPeru.has(item.fid_admin_level_1),
    )!;
    const nivel3Mexico = catalogos.admin_level_3.find((item) =>
      idsMexico.has(item.fid_admin_level_1),
    )!;
    const base = actual.body.persona as Record<string, unknown>;
    const payload = {
      ...base,
      apellido_materno: base.apellido_materno ?? "Prueba",
      fid_admin_level_0_procedencia: mexico.id_admin_level_0,
      codigo_admin_level_3_procedencia: nivel3Mexico.codigo,
      fid_admin_level_0_residencia: peru.id_admin_level_0,
      codigo_admin_level_3_residencia: nivel3Peru.codigo,
    };

    const guardada = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .send(payload);
    expect(guardada.status).toBe(200);
    expect(guardada.body.persona).toMatchObject({
      fid_admin_level_0_procedencia: mexico.id_admin_level_0,
      codigo_admin_level_3_procedencia: nivel3Mexico.codigo,
      fid_admin_level_0_residencia: peru.id_admin_level_0,
      codigo_admin_level_3_residencia: nivel3Peru.codigo,
    });

    const cruzada = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        ...payload,
        codigo_admin_level_3_procedencia: nivel3Peru.codigo,
      });
    expect(cruzada.status).toBe(400);

    const limpiada = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .send({
        ...payload,
        fid_admin_level_0_procedencia: null,
        codigo_admin_level_3_procedencia: null,
        fid_admin_level_0_residencia: null,
        codigo_admin_level_3_residencia: null,
      });
    expect(limpiada.status).toBe(200);
  });

  it("rechaza campos extra, tipos, formatos, catálogos y reglas cruzadas inválidas", async () => {
    const base = await payloadPersonal();
    const casos = [
      { ...base, campo_no_permitido: "intruso" },
      { ...base, nombres: 123 },
      { ...base, codigo_sexo: "catalogo_inexistente" },
    ];

    for (const [indice, payload] of casos.entries()) {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", `198.51.100.${120 + indice}`)
        .send(payload);
      expect(respuesta.status).toBe(400);
    }

    const sinCambios = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.130")
      .send(base);
    expect(sinCambios.status).toBe(400);
    expect(sinCambios.body.codigo).toBe("profile.personal.noChanges");
  });

  it("rechaza inmediatamente a un usuario que fue desactivado", async () => {
    const payload = await payloadPersonal({
      referencia: `inactivo-${randomUUID()}`,
    });
    await prisma.usuarios.update({
      where: { id_usuarios: idUsuario },
      data: { estado: 0 },
    });
    try {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.131")
        .send(payload);
      expect(respuesta.status).toBe(401);
      const persona = await prisma.personas.findUniqueOrThrow({
        where: { id_personas: idPersona },
        select: { referencia: true },
      });
      expect(persona.referencia).not.toBe(payload.referencia);
    } finally {
      await prisma.usuarios.update({
        where: { id_usuarios: idUsuario },
        data: { estado: 1 },
      });
    }
  });

  it("trata intentos SQL y XSS como texto, sin ejecutarlos", async () => {
    const original = await payloadPersonal();
    const direccion = "Av. O'Brien'); DROP TABLE personas.personas; --";
    const referencia = '<script>alert("xss")</script>';
    try {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.132")
        .set("user-agent", AGENTE)
        .send({ ...original, direccion, referencia });
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.persona).toMatchObject({ direccion, referencia });

      const guardada = await prisma.personas.findUniqueOrThrow({
        where: { id_personas: idPersona },
        select: { direccion: true, referencia: true },
      });
      expect(guardada).toEqual({ direccion, referencia });
      await expect(prisma.personas.count()).resolves.toBeGreaterThan(0);
    } finally {
      const restaurar = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.133")
        .set("user-agent", AGENTE)
        .send(original);
      expect([200, 400]).toContain(restaurar.status);
    }
  });

  it("serializa dos guardados simultáneos sobre la misma persona", async () => {
    const original = await payloadPersonal();
    const referencia = `concurrencia-${randomUUID()}`;
    const guardar = (ip: string) =>
      request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", ip)
        .set("user-agent", AGENTE)
        .send({ ...original, referencia });

    try {
      const respuestas = await Promise.all([
        guardar("198.51.100.134"),
        guardar("198.51.100.135"),
      ]);
      expect(respuestas.map(({ status }) => status).sort()).toEqual([200, 400]);
      const guardada = await prisma.personas.findUniqueOrThrow({
        where: { id_personas: idPersona },
        select: { referencia: true },
      });
      expect(guardada.referencia).toBe(referencia);
    } finally {
      await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.136")
        .set("user-agent", AGENTE)
        .send(original);
    }
  });

  it("revierte persona y auditoría si falla una escritura relacionada", async () => {
    const original = await payloadPersonal();
    const maestro = await prisma.eventos_maestro.findUniqueOrThrow({
      where: {
        codigo_version: {
          codigo: "perfil.datos_personales.actualizados",
          version: 1,
        },
      },
      select: { id_eventos_maestro: true, estado: true },
    });
    const auditoriasAntes = await prisma.auditoria.count({
      where: {
        fid_usuarios: idUsuario,
        accion: "perfil.datos_personales.actualizados",
        agente_usuario: AGENTE,
      },
    });
    await prisma.eventos_maestro.update({
      where: { id_eventos_maestro: maestro.id_eventos_maestro },
      data: { estado: 0 },
    });
    try {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.137")
        .set("user-agent", AGENTE)
        .send({ ...original, referencia: `rollback-${randomUUID()}` });
      expect(respuesta.status).toBe(500);
      expect(JSON.stringify(respuesta.body)).not.toContain(
        "Contrato de evento inválido",
      );

      const [persona, auditoriasDespues] = await Promise.all([
        prisma.personas.findUniqueOrThrow({
          where: { id_personas: idPersona },
          select: { referencia: true },
        }),
        prisma.auditoria.count({
          where: {
            fid_usuarios: idUsuario,
            accion: "perfil.datos_personales.actualizados",
            agente_usuario: AGENTE,
          },
        }),
      ]);
      expect(persona.referencia).toBe(original.referencia ?? null);
      expect(auditoriasDespues).toBe(auditoriasAntes);
    } finally {
      await prisma.eventos_maestro.update({
        where: { id_eventos_maestro: maestro.id_eventos_maestro },
        data: { estado: maestro.estado },
      });
    }
  });

  it("aplica directamente el límite de veinte guardados personales por minuto", async () => {
    for (let intento = 0; intento < 20; intento += 1) {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/personal")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.138")
        .send({});
      expect(respuesta.status).toBe(400);
    }
    const bloqueada = await request(app.getHttpServer())
      .patch("/profile/personal")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.138")
      .send({});
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.codigo).toBe("common.tooManyRequests");
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("procesa, sirve y elimina un avatar como eventos separados", async () => {
    // No se sustituye una foto real preexistente del desarrollador durante E2E.
    if (personaAnterior.foto_url) return;

    const imagen = await sharp(randomBytes(120 * 120 * 3), {
      raw: { width: 120, height: 120, channels: 3 },
    })
      .png()
      .toBuffer();

    const demasiadoGrande = await request(app.getHttpServer())
      .post("/profile/avatar")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .attach("avatar", Buffer.alloc(3 * 1024 * 1024 + 1, 0xff), {
        filename: "avatar.jpg",
        contentType: "image/jpeg",
      });
    expect(demasiadoGrande.status).toBe(413);

    const invalida = await request(app.getHttpServer())
      .post("/profile/avatar")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .attach("avatar", Buffer.from("no-es-imagen"), {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect(invalida.status).toBe(400);

    const subida = await request(app.getHttpServer())
      .post("/profile/avatar")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .attach("avatar", imagen, {
        filename: "avatar.png",
        contentType: "image/png",
      });
    expect(subida.status).toBe(200);
    const cuerpoSubida = subida.body as {
      ok: boolean;
      avatar: { version: string };
    };
    expect(cuerpoSubida.ok).toBe(true);
    expect(cuerpoSubida.avatar.version).toMatch(/\.jpg$/);

    const contextoConAvatar = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies);
    expect(contextoConAvatar.status).toBe(200);
    const cuerpoContextoConAvatar = contextoConAvatar.body as {
      avatar: { disponible: boolean; version: string | null };
    };
    expect(cuerpoContextoConAvatar.avatar).toEqual({
      disponible: true,
      version: cuerpoSubida.avatar.version,
    });

    const descarga = await request(app.getHttpServer())
      .get("/profile/avatar")
      .set("Cookie", cookies)
      .buffer(true);
    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("image/jpeg");
    const metadatos = await sharp(descarga.body as Buffer).metadata();
    expect(metadatos).toMatchObject({ width: 100, height: 100, format: "jpeg" });
    expect((descarga.body as Buffer).length).toBeLessThanOrEqual(10 * 1024);

    const eventoActualizado = await prisma.eventos.findFirst({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: { codigo: "perfil.avatar.actualizado" },
      },
    });
    expect(eventoActualizado).not.toBeNull();

    const eliminada = await request(app.getHttpServer())
      .delete("/profile/avatar")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE);
    expect(eliminada.status).toBe(200);

    const contextoSinAvatar = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies);
    expect(contextoSinAvatar.status).toBe(200);
    const cuerpoContextoSinAvatar = contextoSinAvatar.body as {
      avatar: { disponible: boolean; version: string | null };
    };
    expect(cuerpoContextoSinAvatar.avatar).toEqual({
      disponible: false,
      version: null,
    });

    const persona = await prisma.personas.findUniqueOrThrow({
      where: { id_personas: idPersona },
      select: { foto_url: true },
    });
    expect(persona.foto_url).toBeNull();
    const eventoEliminado = await prisma.eventos.findFirst({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: { codigo: "perfil.avatar.eliminado" },
      },
    });
    expect(eventoEliminado).not.toBeNull();
  });

  it("limita mutaciones repetidas del avatar", async () => {
    for (let intento = 0; intento < 20; intento += 1) {
      const respuesta = await request(app.getHttpServer())
        .post("/profile/avatar")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.91");
      expect(respuesta.status).toBe(400);
    }

    const bloqueada = await request(app.getHttpServer())
      .post("/profile/avatar")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.91");
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("exige CSRF, ambos UUID y registra el cambio", async () => {
    const sinCsrf = await request(app.getHttpServer())
      .patch("/profile/appearance")
      .set("Cookie", cookies)
      .set("x-forwarded-for", "198.51.100.44")
      .set("user-agent", AGENTE)
      .send({ fid_admin_level_0: idPais, fid_zonas_horarias: idZona });
    expect(sinCsrf.status).toBe(403);

    const incompleto = await request(app.getHttpServer())
      .patch("/profile/appearance")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.44")
      .set("user-agent", AGENTE)
      .send({ fid_admin_level_0: idPais });
    expect(incompleto.status).toBe(400);

    const correcto = await request(app.getHttpServer())
      .patch("/profile/appearance")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.44")
      .set("user-agent", AGENTE)
      .send({ fid_admin_level_0: idPais, fid_zonas_horarias: idZona });
    expect(correcto.status).toBe(200);
    expect(correcto.body).toMatchObject({
      ok: true,
      preferencias: {
        fid_admin_level_0: idPais,
        fid_zonas_horarias: idZona,
      },
    });

    const auditoria = await prisma.auditoria.findFirst({
      where: {
        fid_usuarios: idUsuario,
        accion: "perfil.apariencia.actualizada",
        agente_usuario: AGENTE,
      },
    });
    expect(auditoria).not.toBeNull();

    const evento = await prisma.eventos.findFirst({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: { codigo: "perfil.apariencia.actualizada" },
        metadatos: { path: ["agente_usuario"], equals: AGENTE },
      },
      include: { evento_maestro: true },
    });
    expect(evento).not.toBeNull();
    expect(evento?.evento_maestro).toMatchObject({
      codigo: "perfil.apariencia.actualizada",
      tipo_agregado: "preferencias_usuario",
      version: 1,
      visible_actividad: true,
      estado: 1,
    });
    expect(evento?.datos).toMatchObject({
      nuevo: {
        fid_admin_level_0: idPais,
        fid_zonas_horarias: idZona,
      },
    });
  });

  it("lista por SSR/API únicamente la actividad del usuario autenticado", async () => {
    const maestroApariencia = await prisma.eventos_maestro.findUniqueOrThrow({
      where: {
        codigo_version: {
          codigo: "perfil.apariencia.actualizada",
          version: 1,
        },
      },
      select: { id_eventos_maestro: true },
    });
    const eventoAjeno = await prisma.eventos.create({
      data: {
        fid_organizaciones: idOrganizacion,
        fid_usuarios: randomUUID(),
        fid_eventos_maestro: maestroApariencia.id_eventos_maestro,
        id_agregado: randomUUID(),
        datos: {},
        metadatos: {
          ip: "203.0.113.99",
          agente_usuario: AGENTE,
        },
      },
    });

    const sinSesion = await request(app.getHttpServer()).get(
      "/profile/activity",
    );
    expect(sinSesion.status).toBe(401);

    const respuesta = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies)
      .set("x-forwarded-for", "198.51.100.44")
      .set("user-agent", AGENTE);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      paginacion: { pagina: 1, limite: 50 },
      zona_horaria: "America/Lima",
    });

    const cuerpo = respuesta.body as {
      eventos: Record<string, unknown>[];
      ahora: string;
    };
    expect(Number.isNaN(Date.parse(cuerpo.ahora))).toBe(false);
    expect(
      cuerpo.eventos.some(
        (evento) => evento.tipo_evento === "autenticacion.ingreso.exito",
      ),
    ).toBe(true);
    expect(
      cuerpo.eventos.some(
        (evento) => evento.id_eventos === eventoAjeno.id_eventos,
      ),
    ).toBe(false);
    expect(Object.keys(cuerpo.eventos[0] ?? {}).sort()).toEqual(
      ["agente_usuario", "id_eventos", "ocurrido_en", "tipo_evento"].sort(),
    );
  });

  it("limita el historial a los 500 eventos más recientes y los ordena", async () => {
    const maestroApariencia = await prisma.eventos_maestro.findUniqueOrThrow({
      where: {
        codigo_version: {
          codigo: "perfil.apariencia.actualizada",
          version: 1,
        },
      },
      select: { id_eventos_maestro: true },
    });
    await prisma.eventos.createMany({
      data: Array.from({ length: 501 }, (_, indice) => ({
        fid_organizaciones: idOrganizacion,
        fid_usuarios: idUsuario,
        fid_eventos_maestro: maestroApariencia.id_eventos_maestro,
        id_agregado: idUsuario,
        datos: {},
        metadatos: { agente_usuario: AGENTE },
        ocurrido_en: new Date(Date.UTC(2000, 0, 1, 0, 0, indice)),
      })),
    });

    const primera = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies);
    expect(primera.status).toBe(200);
    const cuerpoPrimera = primera.body as {
      eventos: { ocurrido_en: string }[];
      paginacion: {
        pagina: number;
        limite: number;
        total: number;
        total_paginas: number;
      };
    };
    expect(cuerpoPrimera.paginacion).toMatchObject({
      pagina: 1,
      limite: 50,
      total: 500,
      total_paginas: 10,
    });

    const eventos = cuerpoPrimera.eventos;
    expect(eventos).toHaveLength(50);
    for (let indice = 1; indice < eventos.length; indice += 1) {
      expect(
        Date.parse(eventos[indice - 1].ocurrido_en),
      ).toBeGreaterThanOrEqual(Date.parse(eventos[indice].ocurrido_en));
    }

    const fueraDelLimite = await request(app.getHttpServer())
      .get("/profile/activity?pagina=11&limite=50")
      .set("Cookie", cookies);
    expect(fueraDelLimite.status).toBe(200);
    const cuerpoFuera = fueraDelLimite.body as {
      eventos: unknown[];
      paginacion: { total: number };
    };
    expect(cuerpoFuera.eventos).toEqual([]);
    expect(cuerpoFuera.paginacion.total).toBe(500);
  });

  it("limita a veinte solicitudes por minuto e IP", async () => {
    for (let intento = 0; intento < 20; intento += 1) {
      const respuesta = await request(app.getHttpServer())
        .patch("/profile/appearance")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("x-forwarded-for", "198.51.100.45")
        .set("user-agent", AGENTE)
        .send({ fid_admin_level_0: idPais });
      expect(respuesta.status).toBe(400);
    }

    const bloqueada = await request(app.getHttpServer())
      .patch("/profile/appearance")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.45")
      .set("user-agent", AGENTE)
      .send({ fid_admin_level_0: idPais });
    expect(bloqueada.status).toBe(429);
    expect(Number(bloqueada.headers["retry-after"])).toBeGreaterThan(0);
    expect(bloqueada.body).toMatchObject({
      statusCode: 429,
      codigo: "common.tooManyRequests",
    });
    const cuerpoBloqueado = bloqueada.body as { retry_after_seconds: number };
    expect(cuerpoBloqueado.retry_after_seconds).toBeGreaterThan(0);
  });

  it("guarda el switch 2FA en seguridad y lo expone en el contexto SSR", async () => {
    const nuevoValor = !(mfaAnterior?.habilitado ?? false);

    const sinCsrf = await request(app.getHttpServer())
      .patch("/profile/two-factor")
      .set("Cookie", cookies)
      .send({ habilitado: nuevoValor });
    expect(sinCsrf.status).toBe(403);

    const tipoInvalido = await request(app.getHttpServer())
      .patch("/profile/two-factor")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ habilitado: "true" });
    expect(tipoInvalido.status).toBe(400);

    const respuesta = await request(app.getHttpServer())
      .patch("/profile/two-factor")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .send({ habilitado: nuevoValor });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      ok: true,
      habilitado: nuevoValor,
    });

    const contexto = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies);
    expect(contexto.status).toBe(200);
    expect(contexto.body.seguridad.segundo_factor_habilitado).toBe(nuevoValor);

    const guardado = await prisma.usuario_mfa.findUnique({
      where: {
        fid_usuarios_tipo: { fid_usuarios: idUsuario, tipo: "totp" },
      },
    });
    expect(guardado?.habilitado).toBe(nuevoValor);
  });

  it("registra preferencias rápidas solo en auditoría", async () => {
    const nuevoMenu = !preferenciasAnteriores.menu_colapsado;
    const respuesta = await request(app.getHttpServer())
      .patch("/preferences")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("x-forwarded-for", "198.51.100.46")
      .set("user-agent", AGENTE)
      .send({ menu_colapsado: nuevoMenu });

    expect(respuesta.status).toBe(200);
    const cuerpoPreferencias = respuesta.body as { menu_colapsado: boolean };
    expect(cuerpoPreferencias.menu_colapsado).toBe(nuevoMenu);

    const [auditoria, evento] = await Promise.all([
      prisma.auditoria.findFirst({
        where: {
          fid_usuarios: idUsuario,
          accion: "preferencias.usuario.actualizada",
          agente_usuario: AGENTE,
        },
      }),
      prisma.eventos.findFirst({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: { codigo: "preferencias.usuario.actualizada" },
          metadatos: { path: ["agente_usuario"], equals: AGENTE },
        },
      }),
    ]);

    expect(auditoria).not.toBeNull();
    expect(evento).toBeNull();
  });

  it("audita el equipo sin convertir datos técnicos en eventos", async () => {
    const cliente = {
      uid_dispositivo: uid,
      firebase_id_instalacion: `fid-${randomUUID()}`,
      tipo_dispositivo: "escritorio",
      modelo: "equipo-e2e",
      version_so: "so-e2e",
      version_app: "1.0.0-e2e",
    };

    for (let intento = 0; intento < 2; intento += 1) {
      const respuesta = await request(app.getHttpServer())
        .post("/devices/client-info")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("user-agent", AGENTE)
        .send(cliente);
      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ actualizado: true });
    }

    const token = `fcm-${randomUUID()}`;
    const push = await request(app.getHttpServer())
      .post("/devices/push-token")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("user-agent", AGENTE)
      .send({ uid_dispositivo: uid, firebase_token_fcm: token });
    expect(push.status).toBe(200);

    const auditoriasCliente = await prisma.auditoria.findMany({
      where: {
        fid_usuarios: idUsuario,
        accion: "dispositivos.cliente.actualizado",
        agente_usuario: AGENTE,
      },
    });
    expect(auditoriasCliente).toHaveLength(1);

    const eventosTecnicos = await prisma.eventos.count({
      where: {
        fid_usuarios: idUsuario,
        evento_maestro: {
          codigo: {
            in: [
              "dispositivos.cliente.actualizado",
              "dispositivos.push_token.actualizado",
            ],
          },
        },
      },
    });
    expect(eventosTecnicos).toBe(0);

    const auditoriasPush = await prisma.auditoria.count({
      where: {
        fid_usuarios: idUsuario,
        accion: "dispositivos.push_token.actualizado",
      },
    });
    expect(auditoriasPush).toBe(0);

    const historial = JSON.stringify(auditoriasCliente);
    expect(historial).not.toContain(cliente.firebase_id_instalacion);
    expect(historial).not.toContain(token);
  });
});
