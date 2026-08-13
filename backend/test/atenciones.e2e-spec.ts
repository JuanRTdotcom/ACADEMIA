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

describe("atenciones: tenant, permisos, validación y auditoría (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let organizacion = "";
  let persona = "";
  let usuario = "";
  let propietario = "";
  let mascota = "";
  let temperamentoEsperado: { etiqueta: string; color_hex: string | null };
  let atencion = "";
  let registro = "";
  let motivoCreado = "";
  let vacunaCreada = "";
  let tipoHospitalizacionCreado = "";
  let procedimientoCreado = "";
  let pruebaLaboratorioCreada = "";
  let estudioDiagnosticoCreado = "";
  let servicioPeluqueriaCreado = "";
  let cookies: string[] = [];
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const username = `A${suffix}`;
  const password = "Attention1!Pass";
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
    const [rol, zona, tipoDocumento, especie, genero, temperamento] =
      await Promise.all([
        prisma.roles.findFirstOrThrow({
          where: { codigo: "SUPERADMIN", estado: 1, eliminado_en: null },
        }),
        prisma.zonas_horarias.findUniqueOrThrow({
          where: { nombre_iana: "America/Lima" },
        }),
        prisma.parametros.findFirstOrThrow({
          where: { codigo_grupo: "tipos_documento", estado: 1 },
        }),
        prisma.especies_animales.findFirstOrThrow({ where: { estado: 1 } }),
        prisma.parametros.findFirstOrThrow({
          where: { codigo_grupo: "generos_mascota", estado: 1 },
        }),
        prisma.parametros.findFirstOrThrow({
          where: { codigo_grupo: "temperamentos_mascota", estado: 1 },
        }),
      ]);
    temperamentoEsperado = {
      etiqueta: temperamento.etiqueta,
      color_hex: temperamento.color_hex,
    };
    persona = (
      await prisma.personas.create({
        data: {
          fid_organizaciones: organizacion,
          nombres: "Atenciones",
          apellido_paterno: "Temporal",
        },
      })
    ).id_personas;
    usuario = (
      await prisma.usuarios.create({
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
      })
    ).id_usuarios;
    propietario = (
      await prisma.propietarios.create({
        data: {
          fid_organizaciones: organizacion,
          fid_parametros_tipo_documento: tipoDocumento.id_parametros,
          numero_documento: `AT${suffix}`,
          nombre_completo: "Propietario Atención",
          sin_correo: true,
          created_by: usuario,
          updated_by: usuario,
        },
      })
    ).id_propietarios;
    mascota = (
      await prisma.mascotas.create({
        data: {
          fid_organizaciones: organizacion,
          fid_propietarios: propietario,
          nombre: "Paciente Atención",
          fid_especies_animales: especie.id_especies_animales,
          fid_parametros_genero: genero.id_parametros,
          fid_parametros_temperamento: temperamento.id_parametros,
          created_by: usuario,
          updated_by: usuario,
        },
      })
    ).id_mascotas;
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .set("x-sumaq-csrf", csrf)
      .send({
        usuario: username,
        contrasenia: password,
        slug_organizacion: process.env.OWNER_ORG_SLUG,
        uid_dispositivo: `attentions-${suffix}`,
        plataforma: "web",
      });
    expect(login.status).toBe(200);
    cookies = (login.headers["set-cookie"] as unknown as string[]).map(
      (item) => item.split(";", 1)[0],
    );
  });

  afterAll(async () => {
    if (prisma) {
      if (motivoCreado) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: motivoCreado },
        });
        await prisma.motivos_consulta.deleteMany({
          where: { id_motivos_consulta: motivoCreado },
        });
      }
      if (atencion) {
        await prisma.auditoria.deleteMany({
          where: {
            OR: [
              { id_entidad: atencion },
              {
                entidad: "registros_atencion",
                fid_organizaciones: organizacion,
                fid_usuarios: usuario,
              },
            ],
          },
        });
        await prisma.adjuntos_registro_atencion.deleteMany({
          where: { registro: { fid_atenciones: atencion } },
        });
        await prisma.pruebas_registro_laboratorio.deleteMany({
          where: { registro: { fid_atenciones: atencion } },
        });
        await prisma.servicios_registro_peluqueria_spa.deleteMany({
          where: { registro: { fid_atenciones: atencion } },
        });
        await prisma.registros_atencion.deleteMany({
          where: { fid_atenciones: atencion },
        });
        await prisma.atenciones.deleteMany({
          where: { id_atenciones: atencion },
        });
      }
      if (vacunaCreada) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: vacunaCreada },
        });
        await prisma.vacunas.deleteMany({
          where: { id_vacunas: vacunaCreada },
        });
      }
      if (tipoHospitalizacionCreado) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: tipoHospitalizacionCreado },
        });
        await prisma.tipos_hospitalizacion.deleteMany({
          where: { id_tipos_hospitalizacion: tipoHospitalizacionCreado },
        });
      }
      if (procedimientoCreado) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: procedimientoCreado },
        });
        await prisma.procedimientos_veterinarios.deleteMany({
          where: { id_procedimientos_veterinarios: procedimientoCreado },
        });
      }
      if (pruebaLaboratorioCreada) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: pruebaLaboratorioCreada },
        });
        await prisma.pruebas_laboratorio.deleteMany({
          where: { id_pruebas_laboratorio: pruebaLaboratorioCreada },
        });
      }
      if (estudioDiagnosticoCreado) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: estudioDiagnosticoCreado },
        });
        await prisma.estudios_diagnosticos.deleteMany({
          where: { id_estudios_diagnosticos: estudioDiagnosticoCreado },
        });
      }
      if (servicioPeluqueriaCreado) {
        await prisma.auditoria.deleteMany({
          where: { id_entidad: servicioPeluqueriaCreado },
        });
        await prisma.servicios_peluqueria_spa.deleteMany({
          where: { id_servicios_peluqueria_spa: servicioPeluqueriaCreado },
        });
      }
      if (mascota)
        await prisma.mascotas.deleteMany({ where: { id_mascotas: mascota } });
      if (propietario)
        await prisma.propietarios.deleteMany({
          where: { id_propietarios: propietario },
        });
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

  it("protege las rutas sin sesión", async () => {
    await request(app.getHttpServer()).get("/clinic/attentions").expect(401);
    await request(app.getHttpServer())
      .get(`/clinic/attentions/pets/${randomUUID()}/history`)
      .expect(401);
  });

  it("administra motivos de consulta por veterinaria y audita los cambios", async () => {
    await request(app.getHttpServer())
      .get("/company/consultation-reasons")
      .expect(401);
    const invalido = await request(app.getHttpServer())
      .post("/company/consultation-reasons")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "", descripcion: "" })
      .expect(400);
    expect(invalido.body.codigo).toBe("consultationReasons.invalidData");
    await request(app.getHttpServer())
      .post("/company/consultation-reasons")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Motivo ${suffix}`, descripcion: "Motivo de prueba" })
      .expect(201);
    const lista = await request(app.getHttpServer())
      .get("/company/consultation-reasons")
      .set("Cookie", cookies)
      .expect(200);
    motivoCreado = lista.body.motivos.find(
      (item: { nombre: string }) => item.nombre === `Motivo ${suffix}`,
    ).id_motivos_consulta;
    expect(lista.body.motivos[0].id_motivos_consulta).toBe(motivoCreado);
    await request(app.getHttpServer())
      .patch(`/company/consultation-reasons/${motivoCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Motivo ${suffix}`,
        descripcion: "Descripción actualizada",
      })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/company/consultation-reasons/${motivoCreado}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: false })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/company/consultation-reasons/${motivoCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .expect(200);
    expect(
      await prisma.auditoria.count({
        where: { id_entidad: motivoCreado, fid_organizaciones: organizacion },
      }),
    ).toBe(4);
  });

  it("administra vacunas por veterinaria y audita los cambios", async () => {
    await request(app.getHttpServer()).get("/company/vaccines").expect(401);
    const invalida = await request(app.getHttpServer())
      .post("/company/vaccines")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "x" })
      .expect(400);
    expect(invalida.body.codigo).toBe("vaccines.invalidData");
    const creada = await request(app.getHttpServer())
      .post("/company/vaccines")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Vacuna ${suffix}` })
      .expect(201);
    vacunaCreada = creada.body.id_vacunas;
    await request(app.getHttpServer())
      .patch(`/company/vaccines/${vacunaCreada}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Vacuna clínica ${suffix}` })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/company/vaccines/${vacunaCreada}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/company/vaccines/${vacunaCreada}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: true })
      .expect(200);
    const lista = await request(app.getHttpServer())
      .get("/company/vaccines")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.vacunas[0].id_vacunas).toBe(vacunaCreada);
    expect(
      await prisma.auditoria.count({
        where: { id_entidad: vacunaCreada, fid_organizaciones: organizacion },
      }),
    ).toBe(4);
  });

  it("administra tipos de hospitalización por veterinaria y audita los cambios", async () => {
    await request(app.getHttpServer())
      .get("/company/hospitalization-types")
      .expect(401);
    await request(app.getHttpServer())
      .post("/company/hospitalization-types")
      .set("Cookie", cookies)
      .send({ nombre: `Sin CSRF ${suffix}` })
      .expect(403);
    const invalido = await request(app.getHttpServer())
      .post("/company/hospitalization-types")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "x" })
      .expect(400);
    expect(invalido.body.codigo).toBe("hospitalizationTypes.invalidData");
    const creado = await request(app.getHttpServer())
      .post("/company/hospitalization-types")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Hospitalización ${suffix}` })
      .expect(201);
    tipoHospitalizacionCreado = creado.body.id_tipos_hospitalizacion;
    await request(app.getHttpServer())
      .patch(`/company/hospitalization-types/${tipoHospitalizacionCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Hospitalización clínica ${suffix}` })
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        `/company/hospitalization-types/${tipoHospitalizacionCreado}/status`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        `/company/hospitalization-types/${tipoHospitalizacionCreado}/status`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: true })
      .expect(200);
    const lista = await request(app.getHttpServer())
      .get("/company/hospitalization-types")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.tipos[0].id_tipos_hospitalizacion).toBe(
      tipoHospitalizacionCreado,
    );
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: tipoHospitalizacionCreado,
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(4);
  });

  it("administra procedimientos con guía, seguridad y auditoría", async () => {
    await request(app.getHttpServer()).get("/company/procedures").expect(401);
    await request(app.getHttpServer())
      .post("/company/procedures")
      .set("Cookie", cookies)
      .send({
        nombre: `Procedimiento ${suffix}`,
        descripcion_guia: "Guía inicial segura.",
      })
      .expect(403);
    const invalido = await request(app.getHttpServer())
      .post("/company/procedures")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "x", descripcion_guia: "no" })
      .expect(400);
    expect(invalido.body.codigo).toBe("procedures.invalidData");
    const creado = await request(app.getHttpServer())
      .post("/company/procedures")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Procedimiento ${suffix}`,
        descripcion_guia: "Guía inicial segura y editable.",
      })
      .expect(201);
    procedimientoCreado = creado.body.id_procedimientos_veterinarios;
    expect(creado.body.descripcion_guia).toBe(
      "Guía inicial segura y editable.",
    );
    await request(app.getHttpServer())
      .patch(`/company/procedures/${procedimientoCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        nombre: `Cirugía ${suffix}`,
        descripcion_guia: "Guía clínica actualizada.",
      })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/company/procedures/${procedimientoCreado}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/company/procedures/${procedimientoCreado}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ activo: true })
      .expect(200);
    const lista = await request(app.getHttpServer())
      .get("/company/procedures")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.procedimientos[0].id_procedimientos_veterinarios).toBe(
      procedimientoCreado,
    );
    expect(lista.body.procedimientos[0].descripcion_guia).toBe(
      "Guía clínica actualizada.",
    );
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: procedimientoCreado,
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(4);
  });

  it("administra pruebas de laboratorio por categoría, seguridad y auditoría", async () => {
    await request(app.getHttpServer())
      .get("/company/laboratory-tests")
      .expect(401);
    const lista = await request(app.getHttpServer())
      .get("/company/laboratory-tests")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.categorias).toHaveLength(15);
    const categoria =
      lista.body.categorias[0].id_categorias_pruebas_laboratorio;
    const invalida = await request(app.getHttpServer())
      .post("/company/laboratory-tests")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ fid_categorias_pruebas_laboratorio: "incorrecta", nombre: "x" })
      .expect(400);
    expect(invalida.body.codigo).toBe("laboratoryTests.invalidData");
    await request(app.getHttpServer())
      .post("/company/laboratory-tests")
      .set("Cookie", cookies)
      .send({
        fid_categorias_pruebas_laboratorio: categoria,
        nombre: `Prueba ${suffix}`,
      })
      .expect(403);
    const creada = await request(app.getHttpServer())
      .post("/company/laboratory-tests")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_categorias_pruebas_laboratorio: categoria,
        nombre: `Prueba ${suffix}`,
      })
      .expect(201);
    pruebaLaboratorioCreada = creada.body.id_pruebas_laboratorio;
    await request(app.getHttpServer())
      .patch(`/company/laboratory-tests/${pruebaLaboratorioCreada}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_categorias_pruebas_laboratorio: categoria,
        nombre: `Prueba clínica ${suffix}`,
      })
      .expect(200);
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: pruebaLaboratorioCreada,
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(2);
  });

  it("administra estudios diagnósticos por veterinaria, seguridad y auditoría", async () => {
    await request(app.getHttpServer())
      .get("/company/diagnostic-studies")
      .expect(401);
    const lista = await request(app.getHttpServer())
      .get("/company/diagnostic-studies")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.estudios.length).toBeGreaterThanOrEqual(10);
    const invalido = await request(app.getHttpServer())
      .post("/company/diagnostic-studies")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "x" })
      .expect(400);
    expect(invalido.body.codigo).toBe("diagnosticStudies.invalidData");
    await request(app.getHttpServer())
      .post("/company/diagnostic-studies")
      .set("Cookie", cookies)
      .send({ nombre: `Estudio ${suffix}` })
      .expect(403);
    const creado = await request(app.getHttpServer())
      .post("/company/diagnostic-studies")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Estudio ${suffix}` })
      .expect(201);
    estudioDiagnosticoCreado = creado.body.id_estudios_diagnosticos;
    await request(app.getHttpServer())
      .patch(`/company/diagnostic-studies/${estudioDiagnosticoCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Estudio clínico ${suffix}` })
      .expect(200);
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: estudioDiagnosticoCreado,
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(2);
  });

  it("administra servicios de peluquería y spa por veterinaria, seguridad y auditoría", async () => {
    await request(app.getHttpServer())
      .get("/company/grooming-services")
      .expect(401);
    const lista = await request(app.getHttpServer())
      .get("/company/grooming-services")
      .set("Cookie", cookies)
      .expect(200);
    expect(lista.body.servicios.length).toBeGreaterThanOrEqual(10);
    const invalido = await request(app.getHttpServer())
      .post("/company/grooming-services")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: "x" })
      .expect(400);
    expect(invalido.body.codigo).toBe("groomingServices.invalidData");
    await request(app.getHttpServer())
      .post("/company/grooming-services")
      .set("Cookie", cookies)
      .send({ nombre: `Spa ${suffix}` })
      .expect(403);
    const creado = await request(app.getHttpServer())
      .post("/company/grooming-services")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Spa ${suffix}` })
      .expect(201);
    servicioPeluqueriaCreado = creado.body.id_servicios_peluqueria_spa;
    await request(app.getHttpServer())
      .patch(`/company/grooming-services/${servicioPeluqueriaCreado}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ nombre: `Spa clínico ${suffix}` })
      .expect(200);
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: servicioPeluqueriaCreado,
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(2);
  });

  it("acumula registros validados, aísla el tenant y audita cambios", async () => {
    const mascotas = await request(app.getHttpServer())
      .get(`/clinic/attentions/owners/${propietario}/pets`)
      .set("Cookie", cookies)
      .expect(200);
    expect(mascotas.body.mascotas[0].temperamento).toEqual(
      temperamentoEsperado,
    );
    const opciones = await request(app.getHttpServer())
      .get("/clinic/attentions/options")
      .set("Cookie", cookies)
      .expect(200);
    expect(opciones.body.tipos).toHaveLength(14);
    const consulta = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "consulta",
    );
    const vacuna = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "vacunacion",
    );
    const formula = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "formula_medica",
    );
    const desparasitacion = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "desparasitacion",
    );
    const hospitalizacion = opciones.body.tipos.find(
      (item: { codigo: string }) =>
        item.codigo === "hospitalizacion_ambulatorio",
    );
    const procedimiento = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "cirugia_procedimiento",
    );
    const laboratorio = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "laboratorio",
    );
    const imagenDiagnostica = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "imagen_diagnostica",
    );
    const peluqueriaSpa = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "peluqueria_spa",
    );
    const guarderia = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "guarderia",
    );
    const remision = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "remision",
    );
    const seguimiento = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "seguimiento",
    );
    const documento = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "documento",
    );
    const cita = opciones.body.tipos.find(
      (item: { codigo: string }) => item.codigo === "cita",
    );
    expect(documento).toMatchObject({
      permite_registro_raiz: false,
      requiere_registro_origen: false,
    });
    expect(cita).toMatchObject({
      permite_registro_raiz: false,
      requiere_registro_origen: false,
    });
    expect(seguimiento).toMatchObject({
      permite_registro_raiz: false,
      requiere_registro_origen: true,
      acepta_adjuntos: true,
      max_adjuntos: 10,
    });
    const tiposSeguimiento = seguimiento.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_parametros_tipo_seguimiento",
    ).opciones;
    expect(tiposSeguimiento).toHaveLength(12);
    const campoUsuarioRemitente = remision.campos.find(
      (item: { clave: string }) => item.clave === "fid_usuarios_remitente",
    );
    expect(remision).toMatchObject({
      icono: "truck",
      acepta_adjuntos: false,
      max_adjuntos: 0,
    });
    expect(campoUsuarioRemitente.opciones).toContainEqual(
      expect.objectContaining({ id: usuario }),
    );
    const campoTipoEstancia = guarderia.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_parametros_tipo_estancia_guarderia",
    );
    expect(guarderia).toMatchObject({
      nombre: "Guardería / hotel",
      acepta_adjuntos: false,
      max_adjuntos: 0,
    });
    expect(
      campoTipoEstancia.opciones.map(
        (item: { etiqueta: string }) => item.etiqueta,
      ),
    ).toEqual(["Guardería", "Hotel"]);
    const campoServiciosPeluqueria = peluqueriaSpa.campos.find(
      (item: { clave: string }) => item.clave === "servicios",
    );
    expect(peluqueriaSpa).toMatchObject({
      icono: "sparkles",
      acepta_adjuntos: true,
      max_adjuntos: 10,
    });
    expect(
      campoServiciosPeluqueria.campos.find(
        (item: { clave: string }) =>
          item.clave === "fid_servicios_peluqueria_spa",
      ).opciones,
    ).toContainEqual(
      expect.objectContaining({
        id: servicioPeluqueriaCreado,
        etiqueta: `Spa clínico ${suffix}`,
      }),
    );
    expect(
      campoServiciosPeluqueria.campos.find(
        (item: { clave: string }) => item.clave === "fid_usuarios_encargado",
      ).opciones,
    ).toContainEqual(expect.objectContaining({ id: usuario }));
    const campoPruebasLaboratorio = laboratorio.campos.find(
      (item: { clave: string }) => item.clave === "pruebas",
    );
    expect(
      laboratorio.campos.some(
        (item: { clave: string }) => item.clave === "fecha",
      ),
    ).toBe(false);
    const subcampoPruebaLaboratorio = campoPruebasLaboratorio.campos.find(
      (item: { clave: string }) => item.clave === "fid_pruebas_laboratorio",
    );
    const subcampoProfesional = campoPruebasLaboratorio.campos.find(
      (item: { clave: string }) => item.clave === "fid_usuarios_profesional",
    );
    const subcampoArchivoResultado = campoPruebasLaboratorio.campos.find(
      (item: { clave: string }) => item.clave === "cantidad_adjuntos",
    );
    expect(
      subcampoPruebaLaboratorio.opciones.find(
        (item: { id: string }) => item.id === pruebaLaboratorioCreada,
      ),
    ).toMatchObject({ etiqueta: `Prueba clínica ${suffix}` });
    expect(
      subcampoProfesional.opciones.some(
        (item: { id: string }) => item.id === usuario,
      ),
    ).toBe(true);
    expect(subcampoArchivoResultado).toMatchObject({ min: 0, max: 1 });
    expect(imagenDiagnostica).toMatchObject({
      icono: "image",
      acepta_adjuntos: true,
      max_adjuntos: 10,
    });
    const campoEstudioDiagnostico = imagenDiagnostica.campos.find(
      (item: { clave: string }) => item.clave === "fid_estudios_diagnosticos",
    );
    const campoSedacionImagen = imagenDiagnostica.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_parametros_sedacion_imagen",
    );
    expect(campoEstudioDiagnostico.opciones).toContainEqual(
      expect.objectContaining({
        id: estudioDiagnosticoCreado,
        etiqueta: `Estudio clínico ${suffix}`,
      }),
    );
    expect(campoSedacionImagen.opciones).toHaveLength(3);
    expect(vacuna).toMatchObject({
      nombre_es: "Vacunación",
      nombre_en: "Vaccination",
    });
    const motivo = consulta.campos.find(
      (item: { clave: string }) => item.clave === "fid_motivos_consulta",
    ).opciones[0];
    const opcionVacuna = vacuna.campos
      .find((item: { clave: string }) => item.clave === "fid_vacunas")
      .opciones.find((item: { id: string }) => item.id === vacunaCreada);
    expect(
      vacuna.campos.find(
        (item: { clave: string }) => item.clave === "fid_vacunas",
      ),
    ).toMatchObject({ etiqueta_es: "Vacuna", etiqueta_en: "Vaccine" });
    expect(
      formula.campos.find(
        (item: { clave: string }) => item.clave === "medicamentos",
      ),
    ).toMatchObject({ tipo: "list", requerido: true, max_items: 30 });
    expect(desparasitacion).toMatchObject({
      acepta_adjuntos: true,
      max_adjuntos: 2,
    });
    const campoTipoHospitalizacion = hospitalizacion.campos.find(
      (item: { clave: string }) => item.clave === "fid_tipos_hospitalizacion",
    );
    const campoMotivoSalida = hospitalizacion.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_parametros_motivo_salida_hospitalizacion",
    );
    expect(
      campoTipoHospitalizacion.opciones.some(
        (item: { id: string }) => item.id === tipoHospitalizacionCreado,
      ),
    ).toBe(true);
    expect(campoMotivoSalida.opciones).toHaveLength(7);
    expect(procedimiento).toMatchObject({
      acepta_adjuntos: true,
      max_adjuntos: 10,
    });
    const campoProcedimiento = procedimiento.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_procedimientos_veterinarios",
    );
    expect(
      campoProcedimiento.opciones.find(
        (item: { id: string }) => item.id === procedimientoCreado,
      ),
    ).toMatchObject({
      etiqueta: `Cirugía ${suffix}`,
      descripcion: "Guía clínica actualizada.",
    });
    const campoTipoDesparasitacion = desparasitacion.campos.find(
      (item: { clave: string }) =>
        item.clave === "fid_parametros_tipo_desparasitacion",
    );
    expect(campoTipoDesparasitacion.opciones).toHaveLength(4);
    expect(
      desparasitacion.campos.find(
        (item: { clave: string }) =>
          item.clave === "fecha_ultima_desparasitacion",
      ),
    ).toMatchObject({
      precarga: "fecha_ultimo_registro",
      ayuda_precarga_es: "Última desparasitación encontrada",
    });
    await request(app.getHttpServer())
      .get(
        `/clinic/attentions/pets/${mascota}/records/${desparasitacion.id_tipos_registro_atencion}/latest`,
      )
      .set("Cookie", cookies)
      .expect(200)
      .expect({ campo: "fecha_ultima_desparasitacion", valor: null });
    const detalleConsulta = {
      fid_motivos_consulta: motivo.id,
      subjetivo: "Paciente estable según refiere el propietario",
    };
    await request(app.getHttpServer())
      .post("/clinic/attentions")
      .set("Cookie", cookies)
      .send({
        fid_mascotas: mascota,
        registro: {
          fid_tipos_registro_atencion: consulta.id_tipos_registro_atencion,
          detalle: detalleConsulta,
        },
      })
      .expect(403);
    await request(app.getHttpServer())
      .post("/clinic/attentions")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_mascotas: mascota,
        registro: {
          fid_tipos_registro_atencion: consulta.id_tipos_registro_atencion,
          detalle: { ...detalleConsulta, campo_inventado: "no" },
        },
      })
      .expect(400);
    const mascotaInvalida = await request(app.getHttpServer())
      .post("/clinic/attentions")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field("fid_mascotas", "mascota-invalida")
      .field(
        "registro",
        JSON.stringify({
          fid_tipos_registro_atencion: consulta.id_tipos_registro_atencion,
          detalle: detalleConsulta,
        }),
      )
      .expect(400);
    expect(mascotaInvalida.body.codigo).toBe("attentions.invalidPet");
    const creada = await request(app.getHttpServer())
      .post("/clinic/attentions")
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field("fid_mascotas", mascota)
      .field(
        "registro",
        JSON.stringify({
          fid_tipos_registro_atencion: consulta.id_tipos_registro_atencion,
          detalle: detalleConsulta,
        }),
      )
      .expect(201);
    atencion = creada.body.id_atenciones;
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: documento.id_tipos_registro_atencion,
        detalle: { documento: "No disponible desde Atenciones" },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: cita.id_tipos_registro_atencion,
        detalle: { fecha: "2026-08-20T10:00", motivo: "No disponible" },
      })
      .expect(400);
    await prisma.$executeRaw`UPDATE personas.atenciones SET fecha_atencion = fecha_atencion - 1 WHERE id_atenciones = ${atencion}::uuid`;
    const soloHoy = await request(app.getHttpServer())
      .get("/clinic/attentions")
      .set("Cookie", cookies)
      .expect(200);
    expect(
      soloHoy.body.atenciones.some(
        (item: { id_atenciones: string }) => item.id_atenciones === atencion,
      ),
    ).toBe(false);
    const conAyer = await request(app.getHttpServer())
      .get("/clinic/attentions?incluir_ayer=1")
      .set("Cookie", cookies)
      .expect(200);
    expect(
      conAyer.body.atenciones.some(
        (item: { id_atenciones: string }) => item.id_atenciones === atencion,
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .get("/clinic/attentions?incluir_ayer=si")
      .set("Cookie", cookies)
      .expect(400);
    await prisma.$executeRaw`UPDATE personas.atenciones SET fecha_atencion = fecha_atencion + 1 WHERE id_atenciones = ${atencion}::uuid`;
    const agregada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: vacuna.id_tipos_registro_atencion,
        detalle: {
          fid_vacunas: opcionVacuna.id,
          laboratorio: "Laboratorio prueba",
          lote: "L-123",
          observaciones: "Sin reacciones inmediatas",
        },
      })
      .expect(201);
    registro = agregada.body.id_registros_atencion;
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: formula.id_tipos_registro_atencion,
        detalle: { diagnostico_presuntivo: "Dermatitis alérgica" },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: formula.id_tipos_registro_atencion,
        detalle: {
          diagnostico_presuntivo: "Dermatitis alérgica",
          medicamentos: [
            {
              medicamento: "Prednisona",
              presentacion: "Tabletas",
              cantidad: "10",
              posologia: "Una tableta cada 24 horas",
            },
          ],
          observaciones: "Controlar tolerancia",
        },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: formula.id_tipos_registro_atencion,
        detalle: {
          diagnostico_presuntivo: "Dermatitis alérgica",
          medicamentos: [{ cantidad: "10" }],
        },
      })
      .expect(400);
    const detalle = await request(app.getHttpServer())
      .get(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(detalle.body.atencion.registros).toHaveLength(3);
    expect(detalle.body.atencion.registros[0].detalle.medicamentos[0]).toEqual({
      medicamento: "Prednisona",
      presentacion: "Tabletas",
      cantidad: "10",
      posologia: "Una tableta cada 24 horas",
    });
    expect(detalle.body.atencion.registros[1].id_registros_atencion).toBe(
      registro,
    );
    expect(detalle.body.atencion.registros[1].detalle.fid_vacunas).toBe(
      `Vacuna clínica ${suffix}`,
    );
    expect(detalle.body.atencion.registros[1].tipo).toMatchObject({
      nombre_es: "Vacunación",
      nombre_en: "Vaccination",
    });
    await request(app.getHttpServer())
      .patch(`/clinic/attentions/${atencion}/records/${registro}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: vacuna.id_tipos_registro_atencion,
        detalle: {
          fid_vacunas: opcionVacuna.id,
          laboratorio: "Laboratorio actualizado",
          lote: "L-123",
          observaciones: "Registro clínico editado",
        },
      })
      .expect(200);
    expect(
      await prisma.auditoria.count({
        where: {
          id_entidad: registro,
          accion: "atenciones.registro_actualizado",
          fid_organizaciones: organizacion,
        },
      }),
    ).toBe(1);
    const registroConsulta = detalle.body.atencion.registros.find(
      (item: { tipo: { codigo: string } }) => item.tipo.codigo === "consulta",
    ).id_registros_atencion;
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: seguimiento.id_tipos_registro_atencion,
        detalle: {
          fid_parametros_tipo_seguimiento: tiposSeguimiento[0].id,
          detalle_seguimiento: "Evolución favorable",
        },
      })
      .expect(400);
    const seguimientoCreado = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        seguimiento.id_tipos_registro_atencion,
      )
      .field("fid_registros_atencion_origen", registroConsulta)
      .field(
        "detalle",
        JSON.stringify({
          fid_parametros_tipo_seguimiento: tiposSeguimiento[0].id,
          motivo: "Revisión posterior",
          detalle_seguimiento: "Evolución favorable",
          fecha_programada: "2026-08-20",
        }),
      )
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "control.pdf")
      .expect(201);
    await request(app.getHttpServer())
      .patch(
        `/clinic/attentions/${atencion}/records/${seguimientoCreado.body.id_registros_atencion}`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: seguimiento.id_tipos_registro_atencion,
        detalle: {
          fid_parametros_tipo_seguimiento: tiposSeguimiento[1].id,
          motivo: "Revisión editada",
          detalle_seguimiento: "Evolución favorable confirmada",
          fecha_programada: "2026-08-21",
        },
      })
      .expect(200);
    expect(
      await prisma.adjuntos_registro_atencion.count({
        where: {
          fid_registros_atencion: seguimientoCreado.body.id_registros_atencion,
          estado: 1,
          eliminado_en: null,
        },
      }),
    ).toBe(1);
    const adjuntoAnterior =
      await prisma.adjuntos_registro_atencion.findFirstOrThrow({
        where: {
          fid_registros_atencion: seguimientoCreado.body.id_registros_atencion,
          estado: 1,
          eliminado_en: null,
        },
        select: { id_adjuntos_registro_atencion: true, clave_objeto: true },
      });
    await request(app.getHttpServer())
      .patch(
        `/clinic/attentions/${atencion}/records/${seguimientoCreado.body.id_registros_atencion}`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        seguimiento.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          fid_parametros_tipo_seguimiento: tiposSeguimiento[1].id,
          motivo: "Revisión con adjunto reemplazado",
          detalle_seguimiento: "Evolución favorable confirmada",
          fecha_programada: "2026-08-21",
        }),
      )
      .field("adjuntos_conservados", JSON.stringify([[]]))
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "nuevo-control.pdf")
      .expect(200);
    const adjuntosEditados = await prisma.adjuntos_registro_atencion.findMany({
      where: {
        fid_registros_atencion: seguimientoCreado.body.id_registros_atencion,
        estado: 1,
        eliminado_en: null,
      },
      select: { nombre_original: true, clave_objeto: true },
    });
    expect(adjuntosEditados).toHaveLength(1);
    expect(adjuntosEditados[0].nombre_original).toBe("nuevo-control.pdf");
    expect(adjuntosEditados[0].clave_objeto).not.toBe(
      adjuntoAnterior.clave_objeto,
    );
    await request(app.getHttpServer())
      .patch(
        `/clinic/attentions/${atencion}/records/${seguimientoCreado.body.id_registros_atencion}`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        seguimiento.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          fid_parametros_tipo_seguimiento: tiposSeguimiento[1].id,
          detalle_seguimiento: "Intento con un adjunto ajeno",
        }),
      )
      .field("adjuntos_conservados", JSON.stringify([[randomUUID()]]))
      .expect(400);
    const detalleConSeguimiento = await request(app.getHttpServer())
      .get(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .expect(200);
    const consultaConSeguimiento =
      detalleConSeguimiento.body.atencion.registros.find(
        (item: { id_registros_atencion: string }) =>
          item.id_registros_atencion === registroConsulta,
      );
    expect(consultaConSeguimiento.seguimientos).toHaveLength(1);
    expect(consultaConSeguimiento.seguimientos[0].id_registros_atencion).toBe(
      seguimientoCreado.body.id_registros_atencion,
    );
    expect(
      detalleConSeguimiento.body.atencion.registros.some(
        (item: { id_registros_atencion: string }) =>
          item.id_registros_atencion ===
          seguimientoCreado.body.id_registros_atencion,
      ),
    ).toBe(false);
    const historial = await request(app.getHttpServer())
      .get(`/clinic/attentions/pets/${mascota}/history`)
      .set("Cookie", cookies)
      .expect(200);
    expect(historial.body.mascota).toMatchObject({
      id_mascotas: mascota,
      nombre: "Paciente Atención",
    });
    expect(historial.body.atenciones[0].id_atenciones).toBe(atencion);
    expect(
      historial.body.atenciones[0].registros.find(
        (item: { id_registros_atencion: string }) =>
          item.id_registros_atencion === registroConsulta,
      ).seguimientos,
    ).toHaveLength(1);
    expect(
      historial.body.atenciones[0].registros[0].tipo.campos,
    ).toBeInstanceOf(Array);
    await request(app.getHttpServer())
      .get(`/clinic/attentions/pets/${randomUUID()}/history`)
      .set("Cookie", cookies)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: hospitalizacion.id_tipos_registro_atencion,
        detalle: {
          fid_tipos_hospitalizacion: vacunaCreada,
          fecha_ingreso: "2026-08-11",
          razon_ingreso: "Observación clínica",
        },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: hospitalizacion.id_tipos_registro_atencion,
        detalle: {
          fid_tipos_hospitalizacion: tipoHospitalizacionCreado,
          fecha_ingreso: "2026-08-11",
          razon_ingreso: "Observación clínica",
          fid_parametros_motivo_salida_hospitalizacion:
            opciones.body.estados[0].id_parametros,
        },
      })
      .expect(400);
    const hospitalizacionCreada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: hospitalizacion.id_tipos_registro_atencion,
        detalle: {
          fid_tipos_hospitalizacion: tipoHospitalizacionCreado,
          fecha_ingreso: "2026-08-11",
          razon_ingreso: "Observación clínica",
          fid_parametros_motivo_salida_hospitalizacion:
            campoMotivoSalida.opciones[0].id,
          fecha_salida: "2026-08-12",
          observaciones: "Evolución favorable",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion:
            hospitalizacionCreada.body.id_registros_atencion,
        },
        select: {
          fid_tipos_hospitalizacion: true,
          fid_parametros_motivo_salida_hospitalizacion: true,
        },
      }),
    ).toEqual({
      fid_tipos_hospitalizacion: tipoHospitalizacionCreado,
      fid_parametros_motivo_salida_hospitalizacion:
        campoMotivoSalida.opciones[0].id,
    });
    const detalleHospitalizacion = await request(app.getHttpServer())
      .get(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(
      detalleHospitalizacion.body.atencion.registros.find(
        (item: { id_registros_atencion: string }) =>
          item.id_registros_atencion ===
          hospitalizacionCreada.body.id_registros_atencion,
      ).detalle,
    ).toMatchObject({
      fid_tipos_hospitalizacion: `Hospitalización clínica ${suffix}`,
      fid_parametros_motivo_salida_hospitalizacion:
        campoMotivoSalida.opciones[0].etiqueta,
    });
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: procedimiento.id_tipos_registro_atencion,
        detalle: {
          fid_procedimientos_veterinarios: vacunaCreada,
          descripcion_quirurgica: "Descripción clínica realizada.",
        },
      })
      .expect(400);
    const procedimientoRegistrado = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: procedimiento.id_tipos_registro_atencion,
        detalle: {
          fid_procedimientos_veterinarios: procedimientoCreado,
          descripcion_quirurgica: "Descripción clínica realizada y ajustada.",
          preanestesico: "Protocolo preanestésico registrado.",
          anestesico: "Protocolo anestésico registrado.",
          otros_medicamentos: "Medicamento A, Medicamento B",
          tratamiento: "Tratamiento posoperatorio indicado.",
          observaciones: "Paciente estable.",
          complicaciones: "Sin complicaciones.",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion:
            procedimientoRegistrado.body.id_registros_atencion,
        },
        select: { fid_procedimientos_veterinarios: true },
      }),
    ).toEqual({ fid_procedimientos_veterinarios: procedimientoCreado });
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: laboratorio.id_tipos_registro_atencion,
        detalle: {
          pruebas: [
            {
              fid_usuarios_profesional: randomUUID(),
              fid_pruebas_laboratorio: pruebaLaboratorioCreada,
              cantidad: 1,
              cantidad_adjuntos: 0,
            },
          ],
        },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: laboratorio.id_tipos_registro_atencion,
        detalle: {
          pruebas: [
            {
              fid_usuarios_profesional: usuario,
              fid_pruebas_laboratorio: pruebaLaboratorioCreada,
              cantidad: 1,
              cantidad_adjuntos: 2,
            },
          ],
        },
      })
      .expect(400);
    const laboratorioRegistrado = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        laboratorio.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          pruebas: [
            {
              fid_usuarios_profesional: usuario,
              fid_pruebas_laboratorio: pruebaLaboratorioCreada,
              cantidad: 2,
              cantidad_adjuntos: 1,
            },
          ],
          diagnostico_presuntivo: "Control preventivo",
        }),
      )
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "resultado.pdf")
      .expect(201);
    expect(
      await prisma.pruebas_registro_laboratorio.findFirst({
        where: {
          fid_registros_atencion:
            laboratorioRegistrado.body.id_registros_atencion,
        },
        select: {
          fid_pruebas_laboratorio: true,
          fid_usuarios_profesional: true,
          cantidad: true,
        },
      }),
    ).toEqual({
      fid_pruebas_laboratorio: pruebaLaboratorioCreada,
      fid_usuarios_profesional: usuario,
      cantidad: 2,
    });
    const resultadoLaboratorio =
      await prisma.adjuntos_registro_atencion.findFirstOrThrow({
        where: {
          fid_registros_atencion:
            laboratorioRegistrado.body.id_registros_atencion,
        },
        select: { id_adjuntos_registro_atencion: true },
      });
    await request(app.getHttpServer())
      .patch(
        `/clinic/attentions/${atencion}/records/${laboratorioRegistrado.body.id_registros_atencion}`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        laboratorio.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          pruebas: [
            {
              fid_usuarios_profesional: usuario,
              fid_pruebas_laboratorio: pruebaLaboratorioCreada,
              cantidad: 2,
              cantidad_adjuntos: 1,
            },
          ],
          diagnostico_presuntivo: "Control preventivo editado",
        }),
      )
      .field(
        "adjuntos_conservados",
        JSON.stringify([[resultadoLaboratorio.id_adjuntos_registro_atencion]]),
      )
      .expect(200);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion:
          imagenDiagnostica.id_tipos_registro_atencion,
        detalle: {
          fid_estudios_diagnosticos: estudioDiagnosticoCreado,
          fid_parametros_sedacion_imagen:
            opciones.body.estados[0].id_parametros,
          tipo_estudio: "Simple",
        },
      })
      .expect(400);
    const imagenRegistrada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion:
          imagenDiagnostica.id_tipos_registro_atencion,
        detalle: {
          fid_estudios_diagnosticos: estudioDiagnosticoCreado,
          fid_parametros_sedacion_imagen: campoSedacionImagen.opciones[0].id,
          signos_clinicos: "Tos, disnea",
          diagnosticos_presuntivos: "Bronquitis, neumonía",
          tipo_estudio: "Tórax, dos proyecciones",
          observaciones: "Paciente estable",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion: imagenRegistrada.body.id_registros_atencion,
        },
        select: {
          fid_estudios_diagnosticos: true,
          fid_parametros_sedacion_imagen: true,
        },
      }),
    ).toEqual({
      fid_estudios_diagnosticos: estudioDiagnosticoCreado,
      fid_parametros_sedacion_imagen: campoSedacionImagen.opciones[0].id,
    });
    const detallePeluqueria = {
      servicios: [{ fid_servicios_peluqueria_spa: servicioPeluqueriaCreado }],
      observaciones_generales: "Sin incidentes",
      cantidad_fotos_antes: 0,
      cantidad_fotos_despues: 0,
      fecha_programada: "2027-01-20",
    };
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        peluqueriaSpa.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({ ...detallePeluqueria, cantidad_fotos_antes: 1 }),
      )
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "antes.pdf")
      .expect(400);
    const fotoPeluqueria = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const peluqueriaRegistrada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        peluqueriaSpa.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({ ...detallePeluqueria, cantidad_fotos_antes: 1 }),
      )
      .attach("adjuntos", fotoPeluqueria, "antes.png")
      .expect(201);
    expect(
      await prisma.servicios_registro_peluqueria_spa.findFirst({
        where: {
          fid_registros_atencion:
            peluqueriaRegistrada.body.id_registros_atencion,
        },
        select: {
          fid_servicios_peluqueria_spa: true,
          fid_usuarios_encargado: true,
          motivo: true,
        },
      }),
    ).toEqual({
      fid_servicios_peluqueria_spa: servicioPeluqueriaCreado,
      fid_usuarios_encargado: null,
      motivo: null,
    });
    const fotoAntes = await prisma.adjuntos_registro_atencion.findFirstOrThrow({
      where: {
        fid_registros_atencion: peluqueriaRegistrada.body.id_registros_atencion,
      },
      select: { id_adjuntos_registro_atencion: true },
    });
    await request(app.getHttpServer())
      .patch(
        `/clinic/attentions/${atencion}/records/${peluqueriaRegistrada.body.id_registros_atencion}`,
      )
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        peluqueriaSpa.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          ...detallePeluqueria,
          cantidad_fotos_antes: 1,
          cantidad_fotos_despues: 1,
        }),
      )
      .field(
        "adjuntos_conservados",
        JSON.stringify([[fotoAntes.id_adjuntos_registro_atencion], []]),
      )
      .attach("adjuntos", fotoPeluqueria, "despues.png")
      .expect(200);
    const fotosEditadas = await prisma.adjuntos_registro_atencion.findMany({
      where: {
        fid_registros_atencion: peluqueriaRegistrada.body.id_registros_atencion,
        estado: 1,
        eliminado_en: null,
      },
      select: { etapa_foto_peluqueria: { select: { codigo: true } } },
      orderBy: { created_at: "asc" },
    });
    expect(
      fotosEditadas.map((foto) => foto.etapa_foto_peluqueria?.codigo),
    ).toEqual(["antes", "despues"]);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: guarderia.id_tipos_registro_atencion,
        detalle: {
          fecha_ingreso: "2027-02-02",
          fecha_salida: "2027-02-01",
          fid_parametros_tipo_estancia_guarderia:
            campoTipoEstancia.opciones[0].id,
        },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: guarderia.id_tipos_registro_atencion,
        detalle: {
          fecha_ingreso: "2027-02-02",
          fid_parametros_tipo_estancia_guarderia:
            opciones.body.estados[0].id_parametros,
        },
      })
      .expect(400);
    const guarderiaRegistrada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: guarderia.id_tipos_registro_atencion,
        detalle: {
          fecha_ingreso: "2027-02-02",
          fecha_salida: "2027-02-03",
          fid_parametros_tipo_estancia_guarderia:
            campoTipoEstancia.opciones[1].id,
          tipo_comida: "Alimento habitual",
          cantidad_comida: "200 g por ración",
          objetos_mascota: "Correa y manta",
          observaciones_recomendaciones: "Dos paseos diarios",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion: guarderiaRegistrada.body.id_registros_atencion,
        },
        select: { fid_parametros_tipo_estancia_guarderia: true },
      }),
    ).toEqual({
      fid_parametros_tipo_estancia_guarderia: campoTipoEstancia.opciones[1].id,
    });
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: remision.id_tipos_registro_atencion,
        detalle: {
          fid_usuarios_remitente: randomUUID(),
          clinica_veterinaria_destino: "Clínica externa",
        },
      })
      .expect(400);
    const remisionRegistrada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: remision.id_tipos_registro_atencion,
        detalle: {
          clinica_veterinaria_destino: "Clínica veterinaria destino",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion: remisionRegistrada.body.id_registros_atencion,
        },
        select: { fid_usuarios_remitente: true, resumen: true },
      }),
    ).toEqual({
      fid_usuarios_remitente: null,
      resumen: "Clínica veterinaria destino",
    });
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: desparasitacion.id_tipos_registro_atencion,
        detalle: {
          fid_parametros_tipo_desparasitacion:
            opciones.body.estados[0].id_parametros,
          producto: "Parámetro de grupo incorrecto",
        },
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .field(
        "fid_tipos_registro_atencion",
        desparasitacion.id_tipos_registro_atencion,
      )
      .field(
        "detalle",
        JSON.stringify({
          fid_parametros_tipo_desparasitacion:
            campoTipoDesparasitacion.opciones[0].id,
          producto: "Producto de prueba",
        }),
      )
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "uno.pdf")
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "dos.pdf")
      .attach("adjuntos", Buffer.from("%PDF-1.4\n%%EOF"), "tres.pdf")
      .expect(400);
    const desparasitacionCreada = await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: desparasitacion.id_tipos_registro_atencion,
        detalle: {
          fid_parametros_tipo_desparasitacion:
            campoTipoDesparasitacion.opciones[0].id,
          producto: "Producto de prueba",
          dosis: "1 tableta",
          observaciones: "Sin incidencias",
        },
      })
      .expect(201);
    expect(
      await prisma.registros_atencion.findUniqueOrThrow({
        where: {
          id_registros_atencion:
            desparasitacionCreada.body.id_registros_atencion,
        },
        select: { fid_parametros_tipo_desparasitacion: true },
      }),
    ).toEqual({
      fid_parametros_tipo_desparasitacion:
        campoTipoDesparasitacion.opciones[0].id,
    });
    const ultimoRegistro = await request(app.getHttpServer())
      .get(
        `/clinic/attentions/pets/${mascota}/records/${desparasitacion.id_tipos_registro_atencion}/latest`,
      )
      .set("Cookie", cookies)
      .expect(200);
    expect(ultimoRegistro.body).toMatchObject({
      campo: "fecha_ultima_desparasitacion",
    });
    expect(ultimoRegistro.body.valor).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const detalleDesparasitacion = await request(app.getHttpServer())
      .get(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .expect(200);
    expect(
      detalleDesparasitacion.body.atencion.registros.find(
        (item: { id_registros_atencion: string }) =>
          item.id_registros_atencion ===
          desparasitacionCreada.body.id_registros_atencion,
      ).detalle.fid_parametros_tipo_desparasitacion,
    ).toBe(campoTipoDesparasitacion.opciones[0].etiqueta);
    await request(app.getHttpServer())
      .get(`/clinic/attentions/${randomUUID()}`)
      .set("Cookie", cookies)
      .expect(404);
    await request(app.getHttpServer())
      .delete(`/clinic/attentions/${atencion}/records/${registro}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .expect(200);
    const finalizada = opciones.body.estados.find(
      (item: { codigo: string }) => item.codigo === "finalizada",
    );
    await request(app.getHttpServer())
      .patch(`/clinic/attentions/${atencion}/status`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ fid_parametros_estado: finalizada.id_parametros })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/clinic/attentions/${atencion}/records`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({
        fid_tipos_registro_atencion: vacuna.id_tipos_registro_atencion,
        detalle: { fid_vacunas: vacunaCreada },
      })
      .expect(400);
    const requiereReconfirmacion = await request(app.getHttpServer())
      .delete(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({})
      .expect(409);
    expect(requiereReconfirmacion.body).toEqual(
      expect.objectContaining({
        codigo: "attentions.protectedDeletionConfirmationRequired",
        data: expect.objectContaining({
          estado_codigo: "finalizada",
          cantidad_registros: expect.any(Number),
        }),
      }),
    );
    expect(requiereReconfirmacion.body.data.cantidad_registros).toBeGreaterThan(
      0,
    );
    await request(app.getHttpServer())
      .delete(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ confirmar_eliminacion_protegida: "true" })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/clinic/attentions/${atencion}`)
      .set("Cookie", cookies)
      .set("x-sumaq-csrf", csrf)
      .send({ confirmar_eliminacion_protegida: true })
      .expect(200);
    expect(
      await prisma.atenciones.findUniqueOrThrow({
        where: { id_atenciones: atencion },
        select: { estado: true, eliminado_en: true, eliminado_por: true },
      }),
    ).toEqual({
      estado: 0,
      eliminado_en: expect.any(Date),
      eliminado_por: usuario,
    });
    expect(
      await prisma.registros_atencion.count({
        where: { fid_atenciones: atencion, eliminado_en: null },
      }),
    ).toBe(0);
    const acciones = await prisma.auditoria.findMany({
      where: {
        fid_organizaciones: organizacion,
        fid_usuarios: usuario,
        accion: { startsWith: "atenciones." },
      },
      select: { accion: true },
    });
    expect(acciones.map((item) => item.accion)).toEqual(
      expect.arrayContaining([
        "atenciones.creada",
        "atenciones.registro_agregado",
        "atenciones.registro_eliminado",
        "atenciones.estado_cambiado",
        "atenciones.eliminada",
      ]),
    );
  }, 15_000);
});
