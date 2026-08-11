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

describe("correos secundarios de perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `E${sufijo.slice(0, 9)}`.toUpperCase();
  const correoInicial = `inicial-${sufijo}@e2e.sumaq.test`;
  const correoNuevo = `nuevo-${sufijo}@e2e.sumaq.test`;
  const correoAuxiliar = `auxiliar-${sufijo}@e2e.sumaq.test`;
  const correoModificado = `modificado-${sufijo}@e2e.sumaq.test`;
  const correoFinal = `final-${sufijo}@e2e.sumaq.test`;
  const correoLiberado = `liberado-${sufijo}@e2e.sumaq.test`;
  const contrasenia = "Email1!Pass";
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
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: organizacion.id_organizaciones,
        nombres: "Correo",
        apellido_paterno: "Temporal",
      },
    });
    idPersona = persona.id_personas;
    const usuario = await prisma.usuarios.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: organizacion.id_organizaciones,
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
    const correoBase = await prisma.personas_correos.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        correo: correoInicial,
      },
    });
    await prisma.$executeRaw`
      UPDATE personas.personas_correos SET verificado_en = CURRENT_TIMESTAMP
      WHERE id_personas_correos = ${correoBase.id_personas_correos}::uuid
    `;
    const ingreso = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", "1")
      .send({
        usuario: usuarioIngreso,
        contrasenia,
        slug_organizacion: slug,
        uid_dispositivo: `email-${sufijo}`,
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

  it("agrega, verifica y asigna los tres usos del correo de forma atómica", async () => {
    const sinCsrf = await request(app.getHttpServer())
      .post("/profile/emails")
      .set("Cookie", cookies)
      .send({ correo: correoNuevo });
    expect(sinCsrf.status).toBe(403);

    const agregado = await request(app.getHttpServer())
      .post("/profile/emails")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: correoNuevo });
    expect(agregado.status).toBe(200);
    expect(agregado.body.acciones_requeridas).toEqual({
      total: 1,
      por_seccion: { emails: 1 },
    });
    const nuevo = agregado.body.correos.find(
      (correo: { correo: string }) => correo.correo === correoNuevo,
    );
    expect(nuevo).toMatchObject({ verificado: false, usos: [] });
    const contextoPendiente = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies);
    expect(contextoPendiente.status).toBe(200);
    expect(contextoPendiente.body.acciones_requeridas).toEqual({
      total: 1,
      por_seccion: { emails: 1 },
    });

    await prisma.personas_correos.update({
      where: { id_personas_correos: nuevo.id_personas_correos },
      data: { estado: 0 },
    });
    const correoInactivo = await request(app.getHttpServer())
      .patch("/profile/emails/use")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        id_personas_correos: nuevo.id_personas_correos,
        tipo: "principal",
      });
    expect(correoInactivo.status).toBe(404);
    await prisma.personas_correos.update({
      where: { id_personas_correos: nuevo.id_personas_correos },
      data: { estado: 1 },
    });

    const principalSinVerificar = await request(app.getHttpServer())
      .patch("/profile/emails/use")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        id_personas_correos: nuevo.id_personas_correos,
        tipo: "principal",
      });
    expect(principalSinVerificar.status).toBe(200);

    const mensajesSinVerificar = await request(app.getHttpServer())
      .patch("/profile/emails/use")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        id_personas_correos: nuevo.id_personas_correos,
        tipo: "mensajes",
      });
    expect(mensajesSinVerificar.status).toBe(400);

    const verificacionSinCsrf = await request(app.getHttpServer())
      .patch(`/profile/emails/${nuevo.id_personas_correos}/verification`)
      .set("Cookie", cookies)
      .send({ verificado: true });
    expect(verificacionSinCsrf.status).toBe(403);

    const verificacionInvalida = await request(app.getHttpServer())
      .patch(`/profile/emails/${nuevo.id_personas_correos}/verification`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ verificado: "true" });
    expect(verificacionInvalida.status).toBe(400);

    const usoInvalido = await request(app.getHttpServer())
      .patch("/profile/emails/use")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        id_personas_correos: nuevo.id_personas_correos,
        tipo: "desconocido",
      });
    expect(usoInvalido.status).toBe(400);

    const auxiliar = await prisma.personas_correos.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        correo: correoAuxiliar,
      },
    });
    await prisma.$executeRaw`
      UPDATE personas.personas_correos SET verificado_en = CURRENT_TIMESTAMP
      WHERE id_personas_correos = ${auxiliar.id_personas_correos}::uuid
    `;

    const verificado = await request(app.getHttpServer())
      .patch(`/profile/emails/${nuevo.id_personas_correos}/verification`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ verificado: true });
    expect(verificado.status).toBe(200);
    expect(verificado.body.acciones_requeridas).toEqual({
      total: 0,
      por_seccion: {},
    });
    expect(
      await prisma.acciones_requeridas.findFirstOrThrow({
        where: { fid_usuarios: idUsuario },
        select: { estado: true, resuelta_en: true },
      }),
    ).toEqual({ estado: 0, resuelta_en: expect.any(Date) });

    for (const tipo of ["principal", "mensajes", "respaldo"] as const) {
      const seleccionado = await request(app.getHttpServer())
        .patch("/profile/emails/use")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .send({ id_personas_correos: nuevo.id_personas_correos, tipo });
      expect(seleccionado.status).toBe(200);
    }

    const usos = await prisma.personas_correos_usos.findMany({
      where: {
        fid_personas: idPersona,
        fid_personas_correos: nuevo.id_personas_correos,
        estado: 1,
      },
    });
    expect(usos.map((uso) => uso.tipo).sort()).toEqual([
      "mensajes",
      "principal",
      "respaldo",
    ]);

    await prisma.personas_correos.update({
      where: { id_personas_correos: auxiliar.id_personas_correos },
      data: { estado: 0 },
    });
    const desverificado = await request(app.getHttpServer())
      .patch(`/profile/emails/${nuevo.id_personas_correos}/verification`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ verificado: false });
    expect(desverificado.status).toBe(200);
    expect(desverificado.body.acciones_requeridas).toEqual({
      total: 1,
      por_seccion: { emails: 1 },
    });
    expect(
      await prisma.acciones_requeridas.findFirstOrThrow({
        where: { fid_usuarios: idUsuario },
        select: { estado: true, resuelta_en: true },
      }),
    ).toEqual({ estado: 1, resuelta_en: null });
    expect(
      desverificado.body.correos.find(
        (correo: { correo: string }) => correo.correo === correoNuevo,
      ),
    ).toMatchObject({ verificado: false, usos: ["principal"] });
    expect(
      await prisma.personas_correos_usos.count({
        where: {
          fid_personas_correos: nuevo.id_personas_correos,
          estado: 1,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: {
            in: [
              "perfil.correo.agregado",
              "perfil.correo.uso_seleccionado",
              "perfil.correo.verificacion_manual_actualizada",
            ],
          },
        },
      }),
    ).toBe(7);
  });

  it("rechaza un correo ya registrado por otra persona de la organización", async () => {
    const otraPersona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Otra",
        apellido_paterno: "Persona",
      },
    });
    try {
      await prisma.personas_correos.create({
        data: {
          fid_personas: otraPersona.id_personas,
          fid_organizaciones: idOrganizacion,
          correo: `ocupado-${sufijo}@e2e.sumaq.test`,
        },
      });
      const duplicado = await request(app.getHttpServer())
        .post("/profile/emails")
        .set("Cookie", cookies)
        .set("x-sumaq-csrf", "1")
        .set("Accept-Language", "es")
        .send({ correo: `OCUPADO-${sufijo}@e2e.sumaq.test` });
      expect(duplicado.status).toBe(409);
      expect(duplicado.body.message).toBe(
        "Ese correo ya está registrado en esta organización",
      );
    } finally {
      await prisma.personas.delete({
        where: { id_personas: otraPersona.id_personas },
      });
    }
  });

  it("modifica y elimina el correo con auditoría e historial funcional", async () => {
    const correo = await prisma.personas_correos.findFirstOrThrow({
      where: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        correo: correoNuevo,
        estado: 1,
      },
    });

    const modificarSinCsrf = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .send({ correo: correoModificado });
    expect(modificarSinCsrf.status).toBe(403);

    const correoDuplicado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: correoInicial });
    expect(correoDuplicado.status).toBe(409);

    await prisma.personas_correos.create({
      data: {
        fid_personas: idPersona,
        fid_organizaciones: idOrganizacion,
        correo: correoLiberado,
        estado: 0,
      },
    });
    const reutilizado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: correoLiberado });
    expect(reutilizado.status).toBe(200);
    expect(
      reutilizado.body.correos.find(
        (actual: { id_personas_correos: string }) =>
          actual.id_personas_correos === correo.id_personas_correos,
      ),
    ).toMatchObject({ correo: correoLiberado });

    const modificado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: correoModificado.toUpperCase() });
    expect(modificado.status).toBe(200);
    expect(
      modificado.body.correos.find(
        (actual: { id_personas_correos: string }) =>
          actual.id_personas_correos === correo.id_personas_correos,
      ),
    ).toMatchObject({
      correo: correoModificado,
      verificado: false,
      usos: ["principal"],
    });

    const verificado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/verification`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ verificado: true });
    expect(verificado.status).toBe(200);
    const seleccionado = await request(app.getHttpServer())
      .patch("/profile/emails/use")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        id_personas_correos: correo.id_personas_correos,
        tipo: "principal",
      });
    expect(seleccionado.status).toBe(200);

    const remodificado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: correoFinal });
    expect(remodificado.status).toBe(200);
    expect(
      remodificado.body.correos.find(
        (actual: { id_personas_correos: string }) =>
          actual.id_personas_correos === correo.id_personas_correos,
      ),
    ).toMatchObject({
      correo: correoFinal,
      verificado: false,
      usos: ["principal"],
    });

    const eliminarSinCsrf = await request(app.getHttpServer())
      .delete(`/profile/emails/${correo.id_personas_correos}`)
      .set("Cookie", cookies);
    expect(eliminarSinCsrf.status).toBe(403);

    const eliminado = await request(app.getHttpServer())
      .delete(`/profile/emails/${correo.id_personas_correos}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1");
    expect(eliminado.status).toBe(200);
    expect(
      eliminado.body.correos.some(
        (actual: { id_personas_correos: string }) =>
          actual.id_personas_correos === correo.id_personas_correos,
      ),
    ).toBe(false);

    const modificarEliminado = await request(app.getHttpServer())
      .patch(`/profile/emails/${correo.id_personas_correos}/address`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ correo: `rechazado-${sufijo}@e2e.sumaq.test` });
    expect(modificarEliminado.status).toBe(404);

    expect(
      await prisma.personas_correos.findUniqueOrThrow({
        where: { id_personas_correos: correo.id_personas_correos },
        select: { estado: true, verificado_en: true },
      }),
    ).toEqual({ estado: 0, verificado_en: null });
    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: idUsuario,
          accion: {
            in: ["perfil.correo.modificado", "perfil.correo.eliminado"],
          },
        },
      }),
    ).toBe(4);
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: {
            codigo: {
              in: ["perfil.correo.modificado", "perfil.correo.eliminado"],
            },
          },
        },
      }),
    ).toBe(4);

    const actividad = await request(app.getHttpServer())
      .get("/profile/activity?pagina=1&limite=50")
      .set("Cookie", cookies);
    expect(actividad.status).toBe(200);
    expect(
      actividad.body.eventos.map(
        (evento: { tipo_evento: string }) => evento.tipo_evento,
      ),
    ).toEqual(
      expect.arrayContaining([
        "perfil.correo.agregado",
        "perfil.correo.uso_seleccionado",
        "perfil.correo.modificado",
        "perfil.correo.eliminado",
      ]),
    );
  });

  it("rechaza el correo número once y conserva intactos los diez activos", async () => {
    const actuales = await prisma.personas_correos.count({
      where: { fid_personas: idPersona, estado: 1 },
    });
    const faltantes = 10 - actuales;
    if (faltantes > 0) {
      await prisma.personas_correos.createMany({
        data: Array.from({ length: faltantes }, (_, indice) => ({
          fid_personas: idPersona,
          fid_organizaciones: idOrganizacion,
          correo: `limite-${indice}-${sufijo}@e2e.sumaq.test`,
        })),
      });
    }

    const excedente = await request(app.getHttpServer())
      .post("/profile/emails")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .set("Accept-Language", "es")
      .send({ correo: `excedente-${sufijo}@e2e.sumaq.test` });

    expect(excedente.status).toBe(400);
    expect(excedente.body.message).toBe(
      "Alcanzaste el límite de correos permitidos",
    );
    expect(
      await prisma.personas_correos.count({
        where: { fid_personas: idPersona, estado: 1 },
      }),
    ).toBe(10);
  });
});
