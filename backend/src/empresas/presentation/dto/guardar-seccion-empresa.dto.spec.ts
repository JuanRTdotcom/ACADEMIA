import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  DtoGuardarComunicacionesEmpresa,
  DtoGuardarContactoEmpresa,
  DtoGuardarIdentidadEmpresa,
} from "./guardar-seccion-empresa.dto";

describe("DTO de configuración de empresa actual", () => {
  const contacto = {
    direccion: "Av. Principal 123",
    referencia: "Frente al parque",
    fid_admin_level_0: "11111111-1111-4111-8111-111111111111",
    codigo_admin_level_3: "150101",
    telefono: "+51 999 999 999",
    telefono_secundario: "+51 988 888 888",
    correo_contacto: "contacto@institucion.edu.pe",
    correo_contacto_secundario: "alternativo@institucion.edu.pe",
  };

  const horarios = Array.from({ length: 7 }, (_, indice) => ({
    dia_semana: indice + 1,
    cerrado: indice === 6,
    hora_apertura: indice === 6 ? null : "08:00",
    hora_cierre: indice === 6 ? null : "18:00",
  }));

  it("acepta una ubicación jerárquica completa", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarContactoEmpresa, contacto),
    );
    expect(errores).toHaveLength(0);
  });

  it("rechaza identificadores territoriales con formato inválido", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarContactoEmpresa, {
        ...contacto,
        fid_admin_level_0: "no-es-uuid",
      }),
    );
    expect(
      errores.some((error) => error.property === "fid_admin_level_0"),
    ).toBe(true);
  });

  it("valida los canales de soporte", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarComunicacionesEmpresa, {
        soporte_correo: "soporte@institucion.edu.pe",
        soporte_telefono: "+51 1 555 5555",
        soporte_whatsapp: "+51 999 999 999",
        horarios,
      }),
    );
    expect(errores).toHaveLength(0);
  });

  it("rechaza un canal de soporte inseguro o mal formado", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarComunicacionesEmpresa, {
        soporte_correo: "correo-invalido",
        soporte_telefono: "teléfono",
        soporte_whatsapp: "javascript:alert(1)",
        horarios: [{ ...horarios[0], hora_apertura: "25:00" }],
      }),
    );
    expect(errores.length).toBeGreaterThanOrEqual(4);
  });

  it("acepta los seis colores de interfaz y el indicador del escudo", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarIdentidadEmpresa, {
        color_primario: "#2563EB",
        ui_cabecera_claro: "#EFF6FF",
        ui_cabecera_oscuro: "#0F172A",
        ui_esquinero_claro: "#DBEAFE",
        ui_esquinero_oscuro: "#172554",
        ui_menu_claro: "#1D4ED8",
        ui_menu_oscuro: "#0B1F4B",
        ui_mostrar_escudo_menu: true,
        ui_mostrar_nombre_empresa_menu: true,
        ui_ocultar_esquinero_expandido: true,
        ui_esquinero_fondo_activo: true,
        ui_cabecera_ocultar_borde: true,
        ui_menu_ocultar_borde: true,
        ui_tamano_escudo_menu: 125,
      }),
    );
    expect(errores).toHaveLength(0);
  });

  it("rechaza colores incompletos y un indicador que no sea booleano", async () => {
    const errores = await validate(
      plainToInstance(DtoGuardarIdentidadEmpresa, {
        color_primario: "#2563EB",
        ui_cabecera_claro: "#FFF",
        ui_cabecera_oscuro: "",
        ui_esquinero_claro: "",
        ui_esquinero_oscuro: "",
        ui_menu_claro: "javascript:alert(1)",
        ui_menu_oscuro: "",
        ui_mostrar_escudo_menu: "true",
        ui_mostrar_nombre_empresa_menu: "true",
        ui_ocultar_esquinero_expandido: "true",
        ui_esquinero_fondo_activo: "true",
        ui_cabecera_ocultar_borde: "true",
        ui_menu_ocultar_borde: "true",
        ui_tamano_escudo_menu: 201,
      }),
    );
    expect(
      errores.some((error) => error.property === "ui_cabecera_claro"),
    ).toBe(true);
    expect(errores.some((error) => error.property === "ui_menu_claro")).toBe(
      true,
    );
    expect(
      errores.some((error) => error.property === "ui_mostrar_escudo_menu"),
    ).toBe(true);
    expect(
      errores.some(
        (error) => error.property === "ui_mostrar_nombre_empresa_menu",
      ),
    ).toBe(true);
    expect(
      errores.some(
        (error) => error.property === "ui_ocultar_esquinero_expandido",
      ),
    ).toBe(true);
    expect(
      errores.some((error) => error.property === "ui_esquinero_fondo_activo"),
    ).toBe(true);
    expect(
      errores.some((error) => error.property === "ui_cabecera_ocultar_borde"),
    ).toBe(true);
    expect(
      errores.some((error) => error.property === "ui_menu_ocultar_borde"),
    ).toBe(true);
    expect(
      errores.some((error) => error.property === "ui_tamano_escudo_menu"),
    ).toBe(true);
  });
});
