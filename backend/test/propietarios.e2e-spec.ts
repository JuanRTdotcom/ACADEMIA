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

describe("propietarios: seguridad y ciclo tenant (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let organizacion = "";
  let persona = "";
  let usuario = "";
  let propietario = "";
  let propietarioAjeno = "";
  const propietariosMascotas: string[] = [];
  const mascotas: string[] = [];
  let cookies: string[] = [];
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const username = `PO${suffix}`;
  const password = "Owners1!Pass";
  const csrf = "1";

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

    const tenant = await prisma.organizaciones.findFirstOrThrow({
      where: {
        slug: process.env.OWNER_ORG_SLUG!,
        estado: 1,
        eliminado_en: null,
      },
    });
    organizacion = tenant.id_organizaciones;
    const rol = await prisma.roles.findFirstOrThrow({
      where: { codigo: "SUPERADMIN", estado: 1, eliminado_en: null },
    });
    const zona = await prisma.zonas_horarias.findUniqueOrThrow({
      where: { nombre_iana: "America/Lima" },
    });
    const nuevaPersona = await prisma.personas.create({
      data: {
        fid_organizaciones: organizacion,
        nombres: "Propietarios",
        apellido_paterno: "Temporal",
      },
    });
    persona = nuevaPersona.id_personas;
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        fid_personas: persona,
        fid_organizaciones: organizacion,
        usuario: username,
        credenciales: {
          create: {
            tipo: "contrasenia",
            hash_contrasenia: await argon2.hash(password),
          },
        },
        usuarios_roles: { create: { fid_roles: rol.id_roles } },
        preferencias_usuario: {
          create: { fid_zonas_horarias: zona.id_zonas_horarias },
        },
      },
    });
    usuario = nuevoUsuario.id_usuarios;
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: username,
        contrasenia: password,
        slug_organizacion: process.env.OWNER_ORG_SLUG,
        uid_dispositivo: `owners-${suffix}`,
        plataforma: "web",
      });
    expect(login.status).toBe(200);
    cookies = (login.headers["set-cookie"] as unknown as string[]).map(
      (item) => item.split(";", 1)[0],
    );
  });

  afterAll(async () => {
    if (prisma) {
      if (mascotas.length) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "mascotas", id_entidad: { in: mascotas } },
        });
        await prisma.mascotas.deleteMany({
          where: { id_mascotas: { in: mascotas } },
        });
      }
      if (propietariosMascotas.length) {
        await prisma.auditoria.deleteMany({
          where: {
            entidad: "propietarios",
            id_entidad: { in: propietariosMascotas },
          },
        });
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: { in: propietariosMascotas } },
        });
      }
      if (propietario) {
        await prisma.auditoria.deleteMany({
          where: { entidad: "propietarios", id_entidad: propietario },
        });
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: propietario },
        });
      }
      if (propietarioAjeno) {
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: propietarioAjeno },
        });
      }
      if (usuario) {
        await prisma.auditoria.deleteMany({ where: { fid_usuarios: usuario } });
        await prisma.eventos.deleteMany({ where: { fid_usuarios: usuario } });
        await prisma.usuarios.delete({ where: { id_usuarios: usuario } });
      }
      if (persona)
        await prisma.personas.delete({ where: { id_personas: persona } });
    }
    await app?.close();
  });

  it("rechaza el listado sin sesión", async () => {
    await request(app.getHttpServer()).get("/clinic/owners").expect(401);
  });

  it("crea, consulta, actualiza y elimina dentro del tenant con auditoría", async () => {
    const opciones = await request(app.getHttpServer())
      .get("/clinic/owners/options")
      .set("Cookie", cookies)
      .expect(200);
    const tipo = opciones.body.tipos_documento[0];
    const fuente = opciones.body.como_conocio.find(
      (item: { codigo: string }) => item.codigo !== "otro",
    );
    const distrito = opciones.body.ubicaciones.admin_level_3[0];
    const nivel1 = opciones.body.ubicaciones.admin_level_1.find(
      (item: { id_admin_level_1: string }) =>
        item.id_admin_level_1 === distrito.fid_admin_level_1,
    );
    const pais = opciones.body.ubicaciones.admin_level_0.find(
      (item: { id_admin_level_0: string }) =>
        item.id_admin_level_0 === nivel1.fid_admin_level_0,
    );
    const body = {
      fid_parametros_tipo_documento: tipo.id_parametros,
      numero_documento: `DOC${suffix}`,
      nombre_completo: "Ana Propietaria Temporal",
      celular: "+51 999 888 777",
      celular_verificado: true,
      sin_correo: false,
      correo: `owner-${suffix.toLowerCase()}@example.com`,
      correo_verificado: false,
      telefono_fijo: "",
      direccion: "Avenida Temporal 123",
      fid_admin_level_0: pais.id_admin_level_0,
      fid_admin_level_3: distrito.id_admin_level_3,
      contacto_alternativo_nombre: "",
      contacto_alternativo_telefono: "",
      fid_parametros_como_conocio: fuente.id_parametros,
      como_conocio_otro: "",
    };

    await request(app.getHttpServer())
      .post("/clinic/owners")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send(body)
      .expect(201);
    const creado = await prisma.propietarios.findFirstOrThrow({
      where: {
        fid_organizaciones: organizacion,
        numero_documento: body.numero_documento,
      },
    });
    propietario = creado.id_propietarios;

    const otroTenant = await prisma.organizaciones.findFirst({
      where: {
        id_organizaciones: { not: organizacion },
        estado: 1,
        eliminado_en: null,
      },
      select: { id_organizaciones: true },
    });
    if (otroTenant) {
      const ajeno = await prisma.propietarios.create({
        data: {
          fid_organizaciones: otroTenant.id_organizaciones,
          fid_parametros_tipo_documento: body.fid_parametros_tipo_documento,
          numero_documento: `OTHER${suffix}`,
          nombre_completo: "Propietario de otro tenant",
          celular: body.celular,
          sin_correo: true,
          direccion: body.direccion,
          fid_admin_level_0: body.fid_admin_level_0,
          fid_admin_level_3: body.fid_admin_level_3,
          fid_parametros_como_conocio: body.fid_parametros_como_conocio,
        },
      });
      propietarioAjeno = ajeno.id_propietarios;
      await request(app.getHttpServer())
        .get(`/clinic/owners/${propietarioAjeno}`)
        .set("Cookie", cookies)
        .expect(404);
    }

    const listado = await request(app.getHttpServer())
      .get(`/clinic/owners?q=${suffix}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(listado.body.total).toBe(1);
    await request(app.getHttpServer())
      .get(`/clinic/owners/${randomUUID()}`)
      .set("Cookie", cookies)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/clinic/owners/${propietario}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ ...body, nombre_completo: "Ana Propietaria Actualizada" })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/clinic/owners/${propietario}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .expect(200);

    const eliminado = await prisma.propietarios.findUniqueOrThrow({
      where: { id_propietarios: propietario },
    });
    expect(eliminado.eliminado_en).not.toBeNull();
    const acciones = await prisma.auditoria.findMany({
      where: { entidad: "propietarios", id_entidad: propietario },
      select: { accion: true },
    });
    expect(acciones.map(({ accion }) => accion).sort()).toEqual([
      "propietarios.creado",
      "propietarios.eliminado",
      "propietarios.modificado",
    ]);
  });

  it("exige confirmar la desvinculación automática de las mascotas", async () => {
    const [tipoDocumento, especie, genero] = await Promise.all([
      prisma.parametros.findFirstOrThrow({
        where: { codigo_grupo: "tipos_documento", estado: 1 },
      }),
      prisma.especies_animales.findFirstOrThrow({ where: { estado: 1 } }),
      prisma.parametros.findFirstOrThrow({
        where: { codigo_grupo: "generos_mascota", estado: 1 },
      }),
    ]);
    const crearPropietario = async (indice: string) => {
      const creado = await prisma.propietarios.create({
        data: {
          fid_organizaciones: organizacion,
          fid_parametros_tipo_documento: tipoDocumento.id_parametros,
          numero_documento: `REL${suffix}${indice}`,
          nombre_completo: `Propietario relación ${indice}`,
          sin_correo: true,
          created_by: usuario,
          updated_by: usuario,
        },
      });
      propietariosMascotas.push(creado.id_propietarios);
      return creado.id_propietarios;
    };
    const origenConMascota = await crearPropietario("A");
    const origenSinPropietario = await crearPropietario("C");
    const crearMascota = async (nombre: string, fid_propietarios: string) => {
      const creada = await prisma.mascotas.create({
        data: {
          fid_organizaciones: organizacion,
          fid_propietarios,
          nombre,
          fid_especies_animales: especie.id_especies_animales,
          fid_parametros_genero: genero.id_parametros,
          created_by: usuario,
          updated_by: usuario,
        },
      });
      mascotas.push(creada.id_mascotas);
      return creada.id_mascotas;
    };
    const mascotaVinculada = await crearMascota(
      "Mascota por resolver",
      origenConMascota,
    );
    const mascotaSinPropietario = await crearMascota(
      "Mascota independiente",
      origenSinPropietario,
    );

    const impacto = await request(app.getHttpServer())
      .delete(`/clinic/owners/${origenConMascota}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({})
      .expect(409);
    expect(impacto.body.codigo).toBe("owners.petsResolutionRequired");
    expect(impacto.body.data.cantidad_mascotas).toBe(1);
    expect(impacto.body.data.mascotas[0].id_mascotas).toBe(mascotaVinculada);
    expect(impacto.body.data.destinos).toBeUndefined();
    await request(app.getHttpServer())
      .delete(`/clinic/owners/${origenConMascota}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ confirmar_desvinculacion: "true" })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/clinic/owners/${origenConMascota}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ confirmar_desvinculacion: true })
      .expect(200);
    expect(
      (
        await prisma.mascotas.findUniqueOrThrow({
          where: { id_mascotas: mascotaVinculada },
        })
      ).fid_propietarios,
    ).toBeNull();

    await request(app.getHttpServer())
      .delete(`/clinic/owners/${origenSinPropietario}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ confirmar_desvinculacion: true })
      .expect(200);
    expect(
      (
        await prisma.mascotas.findUniqueOrThrow({
          where: { id_mascotas: mascotaSinPropietario },
        })
      ).fid_propietarios,
    ).toBeNull();

    const auditorias = await prisma.auditoria.findMany({
      where: { entidad: "mascotas", id_entidad: { in: mascotas } },
      select: { accion: true },
    });
    expect(auditorias.map(({ accion }) => accion).sort()).toEqual([
      "mascotas.propietario_retirado",
      "mascotas.propietario_retirado",
    ]);
  });
});
