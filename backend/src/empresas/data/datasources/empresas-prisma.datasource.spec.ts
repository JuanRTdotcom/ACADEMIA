jest.mock("../../../../prisma/generated/client/client", () => ({
  Prisma: {},
  PrismaClient: class {},
}));

import { FuenteDatosEmpresasPrisma } from "./empresas-prisma.datasource";

describe("FuenteDatosEmpresasPrisma.crearSedeActual", () => {
  it("crea una sede vacía y hereda solo la identidad de la principal", async () => {
    const tx = {
      organizaciones: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ estado: 1, eliminado_en: null }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ maximo_sedes: null }]),
      parametros: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({ id_parametros: "idioma-es" })
          .mockResolvedValueOnce({ id_parametros: "moneda-pen" }),
      },
      zonas_horarias: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_zonas_horarias: "zona-lima" }),
      },
      sedes: {
        count: jest.fn(),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id_sedes: "sede-origen" })
          .mockResolvedValueOnce({
            entidad_legal: { fid_admin_level_0: "pais-peru" },
            escudo_url: "escudo.png",
            escudo_oscuro_url: "escudo-oscuro.png",
            escudo_misma_imagen: false,
            imagotipo_url: "imagotipo.png",
            imagotipo_oscuro_url: "imagotipo-oscuro.png",
            imagotipo_misma_imagen: false,
            color_primario: "#123456",
            ui_cabecera_claro: "#FFFFFF",
            ui_cabecera_oscuro: "#111111",
            ui_esquinero_claro: "#FFFFFF",
            ui_esquinero_oscuro: "#111111",
            ui_menu_claro: "#FFFFFF",
            ui_menu_oscuro: "#111111",
            ui_mostrar_escudo_menu: true,
            ui_mostrar_nombre_empresa_menu: true,
            ui_ocultar_esquinero_expandido: false,
            ui_esquinero_fondo_activo: false,
            ui_cabecera_ocultar_borde: false,
            ui_menu_ocultar_borde: false,
            ui_tamano_escudo_menu: 100,
          }),
        create: jest
          .fn()
          .mockResolvedValue({ id_sedes: "sede-nueva", nombre: "Norte" }),
      },
      entidades_legales: {
        create: jest
          .fn()
          .mockResolvedValue({ id_entidades_legales: "entidad-nueva" }),
      },
      usuarios_sedes: { create: jest.fn().mockResolvedValue({}) },
      almacenes: { create: jest.fn().mockResolvedValue({}) },
      cajas: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const auditoria = { registrar: jest.fn().mockResolvedValue(undefined) };
    const fuente = new FuenteDatosEmpresasPrisma(
      prisma as never,
      auditoria as never,
      {} as never,
      {} as never,
    );

    await fuente.crearSedeActual(
      { nombre: "Norte", codigo: "NORTE" },
      {
        organizacion: "organizacion",
        usuario: "usuario",
        sedeOrigen: "sede-origen",
        contexto: {},
      },
    );

    const entidad = tx.entidades_legales.create.mock.calls[0][0].data;
    expect(entidad).toEqual(
      expect.objectContaining({
        fid_admin_level_0: "pais-peru",
        fid_parametros_moneda: "moneda-pen",
      }),
    );
    expect(entidad).not.toHaveProperty("numero_identificacion_fiscal");
    expect(entidad).not.toHaveProperty("razon_social");
    expect(entidad).not.toHaveProperty("direccion_fiscal");

    const sede = tx.sedes.create.mock.calls[0][0].data;
    expect(sede).toEqual(
      expect.objectContaining({
        agenda_activa: false,
        sin_sede_fisica: true,
        escudo_url: "escudo.png",
        imagotipo_url: "imagotipo.png",
        color_primario: "#123456",
        login_mostrar_etiqueta: false,
        login_mostrar_destacados: false,
        login_mostrar_comunidad: false,
      }),
    );
    expect(sede).not.toHaveProperty("sitio_web");
    expect(sede).not.toHaveProperty("soporte_correo");
    expect(sede).not.toHaveProperty("login_titulo");
  });
});

describe("FuenteDatosEmpresasPrisma.obtenerSeccionActual", () => {
  it("no hereda contacto ni presencia digital del perfil en una sede activa", async () => {
    const empresa = {
      nombre: "Veterinaria",
      slug: "veterinaria",
      plan: { nombre: "Plan" },
      agenda_activa: false,
      duracion_cita_estimada: 20,
      especies_atendidas: [],
      horarios_atencion: [],
      perfil: {
        estado: 1,
        razon_social: "Veterinaria Principal SAC",
        ruc_nif: "20123456789",
        telefono: "999999999",
        correo_contacto: "principal@example.com",
        sitio_web: "https://principal.example.com",
        facebook_url: "https://facebook.com/principal",
      },
      entidades_legales: [{ fid_parametros_moneda: "moneda" }],
      sedes: [
        {
          sin_sede_fisica: true,
          telefono: null,
          correo_contacto: null,
          sitio_web: null,
          facebook_url: null,
          horarios: [],
          horarios_soporte: [],
          especies_atendidas: [],
        },
      ],
    };
    const prisma = {
      organizaciones: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id_organizaciones: "organizacion" })
          .mockResolvedValue(empresa),
      },
    };
    const fuente = new FuenteDatosEmpresasPrisma(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      fuente.obtenerSeccionActual("organizacion", "contacto", "sede"),
    ).resolves.toEqual(
      expect.objectContaining({ telefono: "", correo_contacto: "" }),
    );
    await expect(
      fuente.obtenerSeccionActual("organizacion", "digital", "sede"),
    ).resolves.toEqual(
      expect.objectContaining({ sitio_web: "", facebook_url: "" }),
    );
    await expect(
      fuente.obtenerSeccionActual("organizacion", "general", "sede"),
    ).resolves.toEqual(
      expect.objectContaining({
        razon_social: "Veterinaria Principal SAC",
        ruc_nif: "20123456789",
      }),
    );
  });
});
