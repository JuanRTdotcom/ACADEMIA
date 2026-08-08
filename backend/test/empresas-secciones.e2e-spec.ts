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

describe("empresas: alcance global y tenant actual (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let ownerId = "";
  let superUserId = "";
  let superPersonId = "";
  let adminUserId = "";
  let adminPersonId = "";
  let companyId = "";
  let blockerId = "";
  let managedRoleId = "";
  let replacementRoleId = "";
  let superCookies: string[] = [];
  let adminCookies: string[] = [];
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const slug = `tenant-${suffix}`;
  const csrf = "1";

  const cookiesFrom = (response: request.Response) =>
    (response.headers["set-cookie"] as unknown as string[]).map(
      (cookie) => cookie.split(";", 1)[0],
    );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ModuloAplicacion],
    }).compile();
    app = module.createNestApplication();
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

    const owner = await prisma.organizaciones.findFirstOrThrow({
      where: { slug: process.env.OWNER_ORG_SLUG!, estado: 1 },
    });
    ownerId = owner.id_organizaciones;
    const role = await prisma.roles.findFirstOrThrow({
      where: {
        fid_organizaciones: ownerId,
        codigo: "SUPERADMIN",
        estado: 1,
      },
    });
    const person = await prisma.personas.create({
      data: {
        fid_organizaciones: ownerId,
        nombres: "Empresas",
        apellido_paterno: "Temporal",
      },
    });
    superPersonId = person.id_personas;
    const user = await prisma.usuarios.create({
      data: {
        fid_personas: superPersonId,
        fid_organizaciones: ownerId,
        usuario: `S${suffix}`.toUpperCase(),
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash("Companies1!Pass"),
          },
        },
        usuarios_roles: { create: { fid_roles: role.id_roles } },
      },
    });
    superUserId = user.id_usuarios;
    const zone = await prisma.zonas_horarias.findUniqueOrThrow({
      where: { nombre_iana: "America/Lima" },
    });
    await prisma.preferencias_usuario.create({
      data: {
        fid_usuarios: superUserId,
        fid_zonas_horarias: zone.id_zonas_horarias,
      },
    });

    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: `S${suffix}`.toUpperCase(),
        contrasenia: "Companies1!Pass",
        slug_organizacion: process.env.OWNER_ORG_SLUG,
        uid_dispositivo: `super-${suffix}`,
        plataforma: "web",
      });
    expect(login.status).toBe(200);
    superCookies = cookiesFrom(login);
  });

  afterAll(async () => {
    if (prisma) {
      if (replacementRoleId) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "roles", id_entidad: replacementRoleId },
        });
        await prisma.roles.delete({ where: { id_roles: replacementRoleId } });
      }
      if (managedRoleId) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "roles", id_entidad: managedRoleId },
        });
        await prisma.roles.delete({ where: { id_roles: managedRoleId } });
      }
      if (blockerId) {
        await prisma.organizaciones.delete({
          where: { id_organizaciones: blockerId },
        });
      }
      if (adminUserId) {
        await prisma.auditoria.deleteMany({
          where: { fid_usuarios: adminUserId },
        });
        await prisma.eventos.deleteMany({
          where: { fid_usuarios: adminUserId },
        });
        await prisma.usuarios.delete({ where: { id_usuarios: adminUserId } });
      }
      if (adminPersonId) {
        await prisma.personas.delete({ where: { id_personas: adminPersonId } });
      }
      if (companyId) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "organizaciones", id_entidad: companyId },
        });
        await prisma.organizaciones.delete({
          where: { id_organizaciones: companyId },
        });
      }
      if (superUserId) {
        await prisma.auditoria.deleteMany({
          where: { fid_usuarios: superUserId },
        });
        await prisma.eventos.deleteMany({
          where: { fid_usuarios: superUserId },
        });
        await prisma.usuarios.delete({ where: { id_usuarios: superUserId } });
      }
      if (superPersonId) {
        await prisma.personas.delete({ where: { id_personas: superPersonId } });
      }
    }
    await app?.close();
  });

  it("crea y edita la empresa completa sin depender todavía de permisos", async () => {
    const response = await request(app.getHttpServer())
      .post("/companies")
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Academia ${suffix}`,
        razon_social: `Academia ${suffix} S.A.C.`,
        ruc_nif: "20123456789",
        slug,
        correo_contacto: `${suffix}@example.com`,
        telefono: "+51 999 111 222",
      });
    expect(response.status).toBe(201);

    const company = await prisma.organizaciones.findFirstOrThrow({
      where: { slug, estado: 1 },
      include: { perfil: true },
    });
    companyId = company.id_organizaciones;
    const fechaAntigua = new Date("2000-01-01T00:00:00.000Z");
    await prisma.organizaciones.update({
      where: { id_organizaciones: companyId },
      data: { updated_at: fechaAntigua },
    });
    await prisma.perfil_organizacion.update({
      where: { fid_organizaciones: companyId },
      data: { updated_at: fechaAntigua },
    });
    expect(company.perfil).toEqual(
      expect.objectContaining({
        razon_social: `Academia ${suffix} S.A.C.`,
        ruc_nif: "20123456789",
        correo_contacto: `${suffix}@example.com`,
        telefono: "+51 999 111 222",
      }),
    );
    const list = await request(app.getHttpServer())
      .get(`/companies?q=${suffix}`)
      .set("Cookie", superCookies);
    expect(list.status).toBe(200);
    expect(list.body.empresas).toHaveLength(1);
    expect(list.body.empresas[0]).toEqual(
      expect.objectContaining({
        id_organizaciones: companyId,
        slug,
        estado: 1,
      }),
    );

    const fullList = await request(app.getHttpServer())
      .get("/companies")
      .set("Cookie", superCookies);
    expect(fullList.status).toBe(200);
    expect(fullList.body.empresas[0].id_organizaciones).toBe(companyId);

    const edited = await request(app.getHttpServer())
      .patch(`/companies/${companyId}`)
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Academia editada ${suffix}`,
        razon_social: `Academia editada ${suffix} S.A.C.`,
        ruc_nif: "20987654321",
        slug,
        correo_contacto: `editada-${suffix}@example.com`,
        telefono: "+51 988 777 666",
      });
    expect(edited.status).toBe(200);
    const empresaEditada = await prisma.organizaciones.findFirstOrThrow({
      where: { id_organizaciones: companyId },
      include: { perfil: true },
    });
    expect(empresaEditada).toEqual(
      expect.objectContaining({
        nombre: `Academia editada ${suffix}`,
        perfil: expect.objectContaining({
          razon_social: `Academia editada ${suffix} S.A.C.`,
          ruc_nif: "20987654321",
          correo_contacto: `editada-${suffix}@example.com`,
          telefono: "+51 988 777 666",
        }),
      }),
    );
    expect(empresaEditada.updated_at.getTime()).toBeGreaterThan(
      fechaAntigua.getTime(),
    );
    expect(empresaEditada.perfil!.updated_at.getTime()).toBeGreaterThan(
      fechaAntigua.getTime(),
    );

    const person = await prisma.personas.create({
      data: {
        fid_organizaciones: companyId,
        nombres: "Administrador",
        apellido_paterno: "Tenant",
      },
    });
    adminPersonId = person.id_personas;
    const admin = await prisma.usuarios.create({
      data: {
        fid_personas: adminPersonId,
        fid_organizaciones: companyId,
        usuario: `A${suffix}`.toUpperCase(),
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash("Companies1!Pass"),
          },
        },
      },
    });
    adminUserId = admin.id_usuarios;
    const zone = await prisma.zonas_horarias.findUniqueOrThrow({
      where: { nombre_iana: "America/Lima" },
    });
    await prisma.preferencias_usuario.create({
      data: {
        fid_usuarios: adminUserId,
        fid_zonas_horarias: zone.id_zonas_horarias,
      },
    });
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: `A${suffix}`.toUpperCase(),
        contrasenia: "Companies1!Pass",
        slug_organizacion: slug,
        uid_dispositivo: `admin-${suffix}`,
        plataforma: "web",
      });
    expect(login.status).toBe(200);
    adminCookies = cookiesFrom(login);
  });

  it("rechaza DTO inválido, campos extra y acciones sobre estado incorrecto", async () => {
    expect(
      (
        await request(app.getHttpServer())
          .post("/companies")
          .set("x-sumaq-csrf", csrf)
          .send({
            nombre: "Sin sesión",
            razon_social: "Sin sesión S.A.C.",
            ruc_nif: "20123456789",
            slug: `sin-sesion-${suffix}`,
            correo_contacto: "sin-sesion@example.com",
            telefono: "999111222",
          })
      ).status,
    ).toBe(401);

    const base = {
      nombre: `Academia editada ${suffix}`,
      razon_social: `Academia editada ${suffix} S.A.C.`,
      ruc_nif: "20987654321",
      slug,
      correo_contacto: `editada-${suffix}@example.com`,
      telefono: "+51 988 777 666",
    };
    expect(
      (
        await request(app.getHttpServer())
          .post("/companies")
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ activo: "false" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .delete("/companies/no-es-uuid")
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ ...base, intruso: true })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ ...base, telefono: "1234567890123456" })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ ...base, nombre: "X".repeat(121) })
      ).status,
    ).toBe(400);

    const fechaEstadoAnterior = new Date("2000-01-01T00:00:00.000Z");
    await prisma.organizaciones.update({
      where: { id_organizaciones: companyId },
      data: { updated_at: fechaEstadoAnterior },
    });
    const deactivate = await request(app.getHttpServer())
      .patch(`/companies/${companyId}/status`)
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: false });
    expect(deactivate.status).toBe(200);
    expect(
      (
        await prisma.organizaciones.findUniqueOrThrow({
          where: { id_organizaciones: companyId },
          select: { updated_at: true },
        })
      ).updated_at.getTime(),
    ).toBeGreaterThan(fechaEstadoAnterior.getTime());
    const blocker = await prisma.organizaciones.create({
      data: {
        nombre: `Bloqueo ${suffix}`,
        slug,
        perfil: { create: { estado: 1 } },
      },
    });
    blockerId = blocker.id_organizaciones;
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ activo: true })
      ).status,
    ).toBe(409);
    await prisma.organizaciones.delete({
      where: { id_organizaciones: blockerId },
    });
    blockerId = "";
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ activo: false })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send(base)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/companies/${companyId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/companies/${companyId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ activo: true })
      ).status,
    ).toBe(200);
  });

  it("administra exclusivamente la empresa obtenida de su sesión", async () => {
    expect(
      (await request(app.getHttpServer()).get("/company/current/summary"))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/companies/${companyId}/summary`)
          .set("Cookie", superCookies)
      ).status,
    ).toBe(404);

    const summary = await request(app.getHttpServer())
      .get("/company/current/summary")
      .set("Cookie", adminCookies);
    expect(summary.status).toBe(200);
    expect(summary.body).toEqual(
      expect.objectContaining({ id_organizaciones: companyId, slug }),
    );

    expect(
      (
        await request(app.getHttpServer())
          .patch("/company/current/sections/contact")
          .set("Cookie", adminCookies)
          .send({
            direccion: "Av. Prueba 123",
            telefono: "+51 999 222 333",
            correo_contacto: "tenant@example.com",
            sitio_web: "https://example.com",
          })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app.getHttpServer())
          .patch("/company/current/sections/contact")
          .set("Cookie", adminCookies)
          .set("x-sumaq-csrf", csrf)
          .send({
            direccion: "Av. Prueba 123",
            telefono: "+51 999 222 333",
            correo_contacto: "tenant@example.com",
            sitio_web: "https://example.com",
            intruso: true,
          })
      ).status,
    ).toBe(400);

    const update = await request(app.getHttpServer())
      .patch("/company/current/sections/contact")
      .set("Cookie", adminCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        direccion: "Av. Prueba 123",
        referencia: "",
        fid_admin_level_0: "",
        codigo_admin_level_3: "",
        telefono: "+51 999 222 333",
        telefono_secundario: "",
        correo_contacto: "tenant@example.com",
        correo_contacto_secundario: "",
      });
    expect(update.status).toBe(200);

    expect(
      (
        await request(app.getHttpServer())
          .patch("/company/current/login/color-filter")
          .set("Cookie", adminCookies)
          .set("x-sumaq-csrf", csrf)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .patch("/company/current/login/color-filter")
          .set("Cookie", adminCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ login_usar_filtro_color: "false" })
      ).status,
    ).toBe(400);

    const filtro = await request(app.getHttpServer())
      .patch("/company/current/login/color-filter")
      .set("Cookie", adminCookies)
      .set("x-sumaq-csrf", csrf)
      .send({ login_usar_filtro_color: false });
    expect(filtro.status).toBe(200);
    expect(filtro.body).toEqual({ login_usar_filtro_color: false });
    expect(
      (
        await prisma.perfil_organizacion.findUniqueOrThrow({
          where: { fid_organizaciones: companyId },
          select: { login_usar_filtro_color: true },
        })
      ).login_usar_filtro_color,
    ).toBe(false);
    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: adminUserId,
          id_entidad: companyId,
          accion: "empresas.login.filtro_color.modificada",
        },
      }),
    ).toBe(1);

    const forbiddenSlug = await request(app.getHttpServer())
      .patch("/company/current/sections/general")
      .set("Cookie", adminCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Academia ${suffix}`,
        slug: `otro-${suffix}`,
        razon_social: `Academia ${suffix} S.A.C.`,
        ruc_nif: "20123456789",
      });
    expect(forbiddenSlug.status).toBe(404);
    expect(
      await prisma.auditoria.count({
        where: {
          fid_usuarios: adminUserId,
          entidad: "organizaciones",
          id_entidad: companyId,
          accion: "empresas.contacto.modificada",
        },
      }),
    ).toBe(1);
  });

  it("administra roles del tenant con validación, auditoría y eliminación lógica", async () => {
    expect((await request(app.getHttpServer()).get("/roles")).status).toBe(401);

    const datos = {
      nombre: `Coordinador ${suffix}`,
      alias: `COORD_${suffix}`.toUpperCase(),
      descripcion: "Coordina las actividades académicas de la plataforma.",
      icono: "users",
    };
    expect(
      (
        await request(app.getHttpServer())
          .post("/roles")
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({})
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post("/roles")
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ ...datos, intruso: true })
      ).status,
    ).toBe(400);

    const created = await request(app.getHttpServer())
      .post("/roles")
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send(datos);
    expect(created.status).toBe(201);
    const role = await prisma.roles.findFirstOrThrow({
      where: {
        fid_organizaciones: ownerId,
        codigo: datos.alias,
        eliminado_en: null,
      },
    });
    managedRoleId = role.id_roles;

    const list = await request(app.getHttpServer())
      .get("/roles")
      .set("Cookie", superCookies);
    expect(list.status).toBe(200);
    expect(list.body.roles[0]).toEqual(
      expect.objectContaining({
        id_roles: managedRoleId,
        nombre: datos.nombre,
        alias: datos.alias,
        descripcion: datos.descripcion,
        estado: 1,
      }),
    );

    expect(
      (
        await request(app.getHttpServer())
          .post("/roles")
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ ...datos, alias: `OTRO_${suffix}`.toUpperCase() })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/roles/${managedRoleId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send(datos)
      ).status,
    ).toBe(400);

    const edited = {
      ...datos,
      nombre: `Coordinación ${suffix}`,
      descripcion: "Supervisa la coordinación académica de la plataforma.",
      icono: "badge-check",
    };
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/roles/${managedRoleId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send(edited)
      ).status,
    ).toBe(200);
    for (const activo of [false, true]) {
      expect(
        (
          await request(app.getHttpServer())
            .patch(`/roles/${managedRoleId}/status`)
            .set("Cookie", superCookies)
            .set("x-sumaq-csrf", csrf)
            .send({ activo })
        ).status,
      ).toBe(200);
      if (!activo) {
        expect(
          (
            await request(app.getHttpServer())
              .patch(`/roles/${managedRoleId}`)
              .set("Cookie", superCookies)
              .set("x-sumaq-csrf", csrf)
              .send(edited)
          ).status,
        ).toBe(409);
        expect(
          (
            await request(app.getHttpServer())
              .delete(`/roles/${managedRoleId}`)
              .set("Cookie", superCookies)
              .set("x-sumaq-csrf", csrf)
          ).status,
        ).toBe(409);
      }
    }

    expect(
      (
        await request(app.getHttpServer())
          .delete(`/roles/${managedRoleId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
      ).status,
    ).toBe(200);
    expect(
      await prisma.roles.findUniqueOrThrow({
        where: { id_roles: managedRoleId },
        select: { estado: true, eliminado_en: true, eliminado_por: true },
      }),
    ).toEqual({
      estado: 0,
      eliminado_en: expect.any(Date),
      eliminado_por: superUserId,
    });
    expect(
      await prisma.auditoria.count({
        where: { entidad: "roles", id_entidad: managedRoleId },
      }),
    ).toBe(5);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/roles/${managedRoleId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send(edited)
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app.getHttpServer())
          .patch(`/roles/${managedRoleId}/status`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
          .send({ activo: true })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/roles/${managedRoleId}`)
          .set("Cookie", superCookies)
          .set("x-sumaq-csrf", csrf)
      ).status,
    ).toBe(409);
    const recreated = await request(app.getHttpServer())
      .post("/roles")
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send(edited);
    expect(recreated.status).toBe(201);
    replacementRoleId = (
      await prisma.roles.findFirstOrThrow({
        where: {
          fid_organizaciones: ownerId,
          codigo: edited.alias,
          eliminado_en: null,
        },
        select: { id_roles: true },
      })
    ).id_roles;
    expect(replacementRoleId).not.toBe(managedRoleId);
    const finalList = await request(app.getHttpServer())
      .get("/roles")
      .set("Cookie", superCookies);
    expect(
      finalList.body.roles.some(
        (listedRole: { id_roles: string }) =>
          listedRole.id_roles === managedRoleId,
      ),
    ).toBe(false);
  });

  it("cambia el estado y elimina lógicamente desde superadministración", async () => {
    for (const activo of [false, true]) {
      const response = await request(app.getHttpServer())
        .patch(`/companies/${companyId}/status`)
        .set("Cookie", superCookies)
        .set("x-sumaq-csrf", csrf)
        .send({ activo });
      expect(response.status).toBe(200);
    }

    const duplicadaActiva = await request(app.getHttpServer())
      .post("/companies")
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Duplicada ${suffix}`,
        razon_social: `Duplicada ${suffix} S.A.C.`,
        ruc_nif: "20111222333",
        slug,
        correo_contacto: `duplicada-${suffix}@example.com`,
        telefono: "999111333",
      });
    expect(duplicadaActiva.status).toBe(409);

    const fechaEliminacionAnterior = new Date("2000-01-01T00:00:00.000Z");
    await prisma.organizaciones.update({
      where: { id_organizaciones: companyId },
      data: { updated_at: fechaEliminacionAnterior },
    });
    const deleted = await request(app.getHttpServer())
      .delete(`/companies/${companyId}`)
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf);
    expect(deleted.status).toBe(200);
    expect(
      await prisma.organizaciones.findUnique({
        where: { id_organizaciones: companyId },
        select: {
          estado: true,
          eliminado_en: true,
          eliminado_por: true,
          updated_at: true,
        },
      }),
    ).toEqual({
      estado: 0,
      eliminado_en: expect.any(Date),
      eliminado_por: superUserId,
      updated_at: expect.any(Date),
    });
    expect(
      (
        await prisma.organizaciones.findUniqueOrThrow({
          where: { id_organizaciones: companyId },
          select: { updated_at: true },
        })
      ).updated_at.getTime(),
    ).toBeGreaterThan(fechaEliminacionAnterior.getTime());
    const list = await request(app.getHttpServer())
      .get(`/companies?q=${suffix}`)
      .set("Cookie", superCookies);
    expect(list.status).toBe(200);
    expect(list.body.empresas).toHaveLength(0);

    const recreada = await request(app.getHttpServer())
      .post("/companies")
      .set("Cookie", superCookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Nueva ${suffix}`,
        razon_social: `Nueva ${suffix} S.A.C.`,
        ruc_nif: "20444555666",
        slug,
        correo_contacto: `nueva-${suffix}@example.com`,
        telefono: "999444555",
      });
    expect(recreada.status).toBe(201);
    const reemplazo = await prisma.organizaciones.findFirstOrThrow({
      where: { slug, estado: 1 },
    });
    await prisma.auditoria.deleteMany({
      where: {
        entidad: "organizaciones",
        id_entidad: reemplazo.id_organizaciones,
      },
    });
    await prisma.organizaciones.delete({
      where: { id_organizaciones: reemplazo.id_organizaciones },
    });
  });
});
