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

describe("documentos y teléfonos del perfil (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let idUsuario = "";
  let idPersona = "";
  let idOrganizacion = "";
  let cookies: string[] = [];
  const sufijo = randomUUID().replaceAll("-", "");
  const usuarioIngreso = `D${sufijo.slice(0, 9)}`.toUpperCase();
  const contrasenia = "Documents1!Pass";
  const slug = process.env.OWNER_ORG_SLUG!;
  const tipoDocumentoInactivo = `documento_inactivo_${sufijo.slice(0, 8)}`;
  const tipoTelefonoInactivo = `telefono_inactivo_${sufijo.slice(0, 8)}`;

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

    await prisma.parametros.createMany({
      data: [
        {
          codigo_grupo: "tipos_documento",
          codigo: tipoDocumentoInactivo,
          etiqueta: "Documento inactivo de prueba",
          estado: 0,
        },
        {
          codigo_grupo: "tipos_telefono",
          codigo: tipoTelefonoInactivo,
          etiqueta: "Teléfono inactivo de prueba",
          estado: 0,
        },
      ],
    });

    const organizacion = await prisma.organizaciones.findFirstOrThrow({
      where: { slug, estado: 1 },
    });
    idOrganizacion = organizacion.id_organizaciones;
    const persona = await prisma.personas.create({
      data: {
        fid_organizaciones: idOrganizacion,
        nombres: "Documentos",
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
        uid_dispositivo: `documents-${sufijo}`,
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
    if (prisma) {
      await prisma.parametros.deleteMany({
        where: {
          codigo: { in: [tipoDocumentoInactivo, tipoTelefonoInactivo] },
        },
      });
    }
    await app?.close();
  });

  it("carga maestros activos y protege sesión, CSRF, DTO y maestros", async () => {
    expect(
      (await request(app.getHttpServer()).get("/profile/documents")).status,
    ).toBe(401);

    const documentos = await request(app.getHttpServer())
      .get("/profile/documents")
      .set("Cookie", cookies);
    const telefonos = await request(app.getHttpServer())
      .get("/profile/phones")
      .set("Cookie", cookies);
    expect(documentos.status).toBe(200);
    expect(telefonos.status).toBe(200);
    expect(
      (documentos.body as { catalogo: unknown[] }).catalogo.length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      (documentos.body.catalogo as { codigo: string }[]).some(
        (item) => item.codigo === "sin_documento",
      ),
    ).toBe(false);
    expect(
      (telefonos.body as { catalogo: unknown[] }).catalogo.length,
    ).toBeGreaterThanOrEqual(4);
    expect(documentos.body.catalogo[0].traducciones).toEqual(
      expect.objectContaining({
        es: expect.any(String),
        en: expect.any(String),
      }),
    );
    expect(telefonos.body.catalogo[0].traducciones).toEqual(
      expect.objectContaining({
        es: expect.any(String),
        en: expect.any(String),
      }),
    );

    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/documents")
          .set("Cookie", cookies)
          .send({ codigo_tipo_documento: "dni", numero_documento: "87654321" })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/documents")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_documento: "inexistente",
            numero_documento: "87654321",
          })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/documents")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_documento: tipoDocumentoInactivo,
            numero_documento: "87654321",
          })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/phones")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_telefono: tipoTelefonoInactivo,
            numero: "+51 999 111 222",
            titular: "Persona Temporal",
            es_emergencia: false,
          })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/phones")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_telefono: "movil",
            numero: "+51 999 111 222",
            titular: "Persona Temporal",
            es_emergencia: false,
            estado: 1,
          })
      ).status,
    ).toBe(400);
  });

  it("gestiona documentos y teléfonos sin duplicados y con trazabilidad", async () => {
    const documento = await request(app.getHttpServer())
      .post("/profile/documents")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({ codigo_tipo_documento: "dni", numero_documento: "87654321" });
    expect(documento.status).toBe(200);
    const registroDocumento = (
      documento.body as {
        documentos: { id_personas_documentos: string }[];
      }
    ).documentos[0];
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/documents")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({ codigo_tipo_documento: "dni", numero_documento: "87654321" })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app.getHttpServer())
          .patch(
            `/profile/documents/${registroDocumento.id_personas_documentos}`,
          )
          .set("Cookie", cookies)
          .send({
            codigo_tipo_documento: "pasaporte",
            numero_documento: "P-87654321",
          })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .patch(
            `/profile/documents/${registroDocumento.id_personas_documentos}`,
          )
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_documento: tipoDocumentoInactivo,
            numero_documento: "P-87654321",
          })
      ).status,
    ).toBe(400);

    const documentoModificado = await request(app.getHttpServer())
      .patch(`/profile/documents/${registroDocumento.id_personas_documentos}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_tipo_documento: "pasaporte",
        numero_documento: "P-87654321",
      });
    expect(documentoModificado.status).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .patch(
            `/profile/documents/${registroDocumento.id_personas_documentos}`,
          )
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_documento: "pasaporte",
            numero_documento: "P-87654321",
          })
      ).status,
    ).toBe(400);

    const telefono = await request(app.getHttpServer())
      .post("/profile/phones")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_tipo_telefono: "movil",
        numero: "+51 999 111 222",
        titular: "Persona Temporal",
        es_emergencia: false,
      });
    expect(telefono.status).toBe(200);
    const registro = (
      telefono.body as { telefonos: { id_personas_telefonos: string }[] }
    ).telefonos[0];
    expect(
      (
        await request(app.getHttpServer())
          .post("/profile/phones")
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_telefono: "fijo",
            numero: "+51999111222",
            titular: "Persona Temporal",
            es_emergencia: false,
          })
      ).status,
    ).toBe(409);

    const modificado = await request(app.getHttpServer())
      .patch(`/profile/phones/${registro.id_personas_telefonos}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", "1")
      .send({
        codigo_tipo_telefono: "movil",
        numero: "+51 999 111 222",
        titular: "Persona Temporal",
        es_emergencia: true,
      });
    expect(modificado.status).toBe(200);

    const codigos = [
      "perfil.documento.agregado",
      "perfil.documento.modificado",
      "perfil.telefono.agregado",
      "perfil.telefono.modificado",
    ];
    expect(
      await prisma.auditoria.count({
        where: { fid_usuarios: idUsuario, accion: { in: codigos } },
      }),
    ).toBe(4);
    expect(
      await prisma.eventos.count({
        where: {
          fid_usuarios: idUsuario,
          evento_maestro: { codigo: { in: codigos } },
        },
      }),
    ).toBe(4);
  });

  it("elimina lógicamente y publica las acciones en actividad", async () => {
    const documento = await prisma.personas_documentos.findFirstOrThrow({
      where: { fid_personas: idPersona, estado: 1 },
    });
    const telefono = await prisma.personas_telefonos.findFirstOrThrow({
      where: { fid_personas: idPersona, estado: 1 },
    });
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/profile/documents/${documento.id_personas_documentos}`)
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/profile/phones/${telefono.id_personas_telefonos}`)
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
      ).status,
    ).toBe(200);
    expect(
      (
        await prisma.personas_documentos.findUniqueOrThrow({
          where: { id_personas_documentos: documento.id_personas_documentos },
        })
      ).estado,
    ).toBe(0);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/profile/documents/${documento.id_personas_documentos}`)
          .set("Cookie", cookies)
          .set("x-sumaq-csrf", "1")
          .send({
            codigo_tipo_documento: "dni",
            numero_documento: "11223344",
          })
      ).status,
    ).toBe(404);
    expect(
      (
        await prisma.personas_telefonos.findUniqueOrThrow({
          where: { id_personas_telefonos: telefono.id_personas_telefonos },
        })
      ).estado,
    ).toBe(0);

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
        "perfil.documento.agregado",
        "perfil.documento.modificado",
        "perfil.documento.eliminado",
        "perfil.telefono.agregado",
        "perfil.telefono.modificado",
        "perfil.telefono.eliminado",
      ]),
    );
  });
});
