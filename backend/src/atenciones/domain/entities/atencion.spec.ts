import { camposRegistroAtencion, validarRegistroAtencion } from "./atencion";

const esquema = [
  {
    clave: "motivo",
    etiqueta_es: "Motivo",
    etiqueta_en: "Reason",
    tipo: "textarea",
    requerido: true,
    max: 100,
  },
  {
    clave: "urgente",
    etiqueta_es: "Urgente",
    etiqueta_en: "Urgent",
    tipo: "boolean",
    requerido: false,
  },
  {
    clave: "duracion",
    etiqueta_es: "Duración",
    etiqueta_en: "Duration",
    tipo: "number",
    requerido: false,
    min: 5,
    max: 60,
  },
] as const;

describe("validación de registros de atención", () => {
  it("normaliza exclusivamente los campos declarados en base", () => {
    expect(
      validarRegistroAtencion(esquema, {
        motivo: "  Control   general ",
        urgente: true,
        duracion: "30",
      }),
    ).toEqual({
      detalle: { motivo: "Control general", urgente: true, duracion: 30 },
      resumen: "Control general",
      fecha_programada: null,
      programado_local: null,
    });
  });

  it("rechaza campos ajenos, requeridos ausentes y límites inválidos", () => {
    expect(
      validarRegistroAtencion(esquema, { motivo: "Control", secreto: "no" }),
    ).toBeNull();
    expect(validarRegistroAtencion(esquema, { urgente: false })).toBeNull();
    expect(
      validarRegistroAtencion(esquema, { motivo: "Control", duracion: 90 }),
    ).toBeNull();
  });

  it("rechaza esquemas duplicados o no soportados", () => {
    expect(camposRegistroAtencion([...esquema, esquema[0]])).toBeNull();
    expect(
      camposRegistroAtencion([{ ...esquema[0], tipo: "html" }]),
    ).toBeNull();
  });

  it("acepta una precarga declarada por base únicamente sobre fechas", () => {
    const fecha = {
      clave: "fecha_ultima_desparasitacion",
      etiqueta_es: "Fecha de última desparasitación",
      etiqueta_en: "Last deworming date",
      tipo: "date",
      requerido: false,
      precarga: "fecha_ultimo_registro",
      ayuda_precarga_es: "Última desparasitación encontrada",
      ayuda_precarga_en: "Last deworming record found",
    } as const;
    expect(camposRegistroAtencion([fecha])).toEqual([fecha]);
    expect(camposRegistroAtencion([{ ...fecha, tipo: "text" }])).toBeNull();
    expect(
      camposRegistroAtencion([{ ...fecha, ayuda_precarga_en: undefined }]),
    ).toBeNull();
  });

  it("valida listas obligatorias configuradas en base", () => {
    const formula = [
      {
        clave: "diagnostico_presuntivo",
        etiqueta_es: "Diagnóstico presuntivo",
        etiqueta_en: "Presumptive diagnosis",
        tipo: "textarea",
        requerido: true,
        max: 200,
      },
      {
        clave: "medicamentos",
        etiqueta_es: "Medicamentos",
        etiqueta_en: "Medications",
        tipo: "list",
        requerido: true,
        max_items: 3,
        campos: [
          {
            clave: "medicamento",
            etiqueta_es: "Medicamento",
            etiqueta_en: "Medication",
            tipo: "text",
            requerido: true,
            max: 50,
          },
          {
            clave: "cantidad",
            etiqueta_es: "Cantidad",
            etiqueta_en: "Quantity",
            tipo: "text",
            requerido: false,
            max: 20,
          },
        ],
      },
    ] as const;
    expect(
      validarRegistroAtencion(formula, {
        diagnostico_presuntivo: "  Dermatitis   alérgica ",
        medicamentos: [
          { medicamento: "  Prednisona ", cantidad: " 10 tabletas " },
        ],
      }),
    ).toMatchObject({
      detalle: {
        diagnostico_presuntivo: "Dermatitis alérgica",
        medicamentos: [{ medicamento: "Prednisona", cantidad: "10 tabletas" }],
      },
    });
    expect(
      validarRegistroAtencion(formula, {
        diagnostico_presuntivo: "Dermatitis alérgica",
      }),
    ).toBeNull();
    expect(
      validarRegistroAtencion(formula, {
        diagnostico_presuntivo: "Dermatitis alérgica",
        medicamentos: [{ cantidad: "10" }],
      }),
    ).toBeNull();
  });

  it("valida relaciones UUID y cantidades en pruebas de laboratorio", () => {
    const laboratorio = [
      {
        clave: "pruebas",
        etiqueta_es: "Pruebas",
        etiqueta_en: "Tests",
        tipo: "list",
        requerido: true,
        max_items: 20,
        campos: [
          {
            clave: "fid_pruebas_laboratorio",
            etiqueta_es: "Prueba",
            etiqueta_en: "Test",
            tipo: "uuid",
            fuente: "pruebas_laboratorio",
            requerido: true,
          },
          {
            clave: "cantidad",
            etiqueta_es: "Cantidad",
            etiqueta_en: "Quantity",
            tipo: "number",
            requerido: true,
            min: 1,
            max: 999,
          },
          {
            clave: "cantidad_adjuntos",
            etiqueta_es: "Archivo de resultado",
            etiqueta_en: "Result file",
            tipo: "number",
            requerido: true,
            min: 0,
            max: 1,
          },
        ],
      },
    ] as const;
    expect(
      validarRegistroAtencion(laboratorio, {
        pruebas: [
          {
            fid_pruebas_laboratorio: "11111111-1111-4111-8111-111111111111",
            cantidad: "2",
            cantidad_adjuntos: "1",
          },
        ],
      })?.detalle,
    ).toEqual({
      pruebas: [
        {
          fid_pruebas_laboratorio: "11111111-1111-4111-8111-111111111111",
          cantidad: 2,
          cantidad_adjuntos: 1,
        },
      ],
    });
    expect(
      validarRegistroAtencion(laboratorio, {
        pruebas: [{ fid_pruebas_laboratorio: "no-uuid", cantidad: 0 }],
      }),
    ).toBeNull();
    expect(
      validarRegistroAtencion(laboratorio, {
        pruebas: [
          {
            fid_pruebas_laboratorio: "11111111-1111-4111-8111-111111111111",
            cantidad: 1,
            cantidad_adjuntos: 2,
          },
        ],
      }),
    ).toBeNull();
  });
});
