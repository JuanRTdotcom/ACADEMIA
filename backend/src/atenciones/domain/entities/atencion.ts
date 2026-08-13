export interface CampoRegistroAtencion {
  clave: string;
  etiqueta_es: string;
  etiqueta_en: string;
  tipo:
    | "text"
    | "textarea"
    | "date"
    | "datetime"
    | "boolean"
    | "number"
    | "uuid"
    | "list";
  requerido: boolean;
  fuente?:
    | "motivos_consulta"
    | "vacunas"
    | "tipos_desparasitacion"
    | "tipos_hospitalizacion"
    | "motivos_salida_hospitalizacion"
    | "tipos_estancia_guarderia"
    | "tipos_seguimiento_atencion"
    | "procedimientos_veterinarios"
    | "usuarios_organizacion"
    | "pruebas_laboratorio"
    | "estudios_diagnosticos"
    | "sedacion_imagen_diagnostica"
    | "servicios_peluqueria_spa";
  precarga?: "fecha_ultimo_registro";
  ayuda_precarga_es?: string;
  ayuda_precarga_en?: string;
  min?: number;
  max?: number;
  max_items?: number;
  campos?: CampoRegistroAtencion[];
}

export interface ArchivoAdjuntoAtencion {
  contenido: Buffer;
  tipo_mime: string;
  nombre_original: string;
}

export interface AdjuntoAtencionGuardado {
  clave_objeto: string;
  nombre_original: string;
  tipo_mime: string;
  bytes: number;
  checksum_sha256: string;
}

export interface DatosRegistroAtencion {
  fid_tipos_registro_atencion: string;
  fid_registros_atencion_origen?: string;
  detalle: Record<string, unknown>;
}

export interface DatosEditarRegistroAtencion extends DatosRegistroAtencion {
  adjuntos_conservados?: string[][];
}

export interface DatosCrearAtencion {
  fid_mascotas: string;
  registro: DatosRegistroAtencion;
}

export interface FiltrosAtenciones {
  q?: string;
  incluir_ayer?: boolean;
  despues_de?: string;
  antes_de?: string;
}

export interface EliminacionAtencion {
  confirmar_eliminacion_protegida?: boolean;
}

export interface RegistroAtencionValidado {
  detalle: Record<
    string,
    string | number | boolean | Array<Record<string, string | number>>
  >;
  resumen: string;
  fecha_programada: string | null;
  programado_local: string | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function camposRegistroAtencion(
  valor: unknown,
): CampoRegistroAtencion[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 20)
    return null;
  const claves = new Set<string>();
  const campos: CampoRegistroAtencion[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const campo = item as Partial<CampoRegistroAtencion>;
    if (
      typeof campo.clave !== "string" ||
      !/^[a-z][a-z0-9_]{1,49}$/.test(campo.clave) ||
      claves.has(campo.clave) ||
      typeof campo.etiqueta_es !== "string" ||
      typeof campo.etiqueta_en !== "string" ||
      ![
        "text",
        "textarea",
        "date",
        "datetime",
        "boolean",
        "number",
        "uuid",
        "list",
      ].includes(campo.tipo ?? "") ||
      typeof campo.requerido !== "boolean" ||
      (campo.tipo === "uuid" &&
        ![
          "motivos_consulta",
          "vacunas",
          "tipos_desparasitacion",
          "tipos_hospitalizacion",
          "motivos_salida_hospitalizacion",
          "tipos_estancia_guarderia",
          "tipos_seguimiento_atencion",
          "procedimientos_veterinarios",
          "usuarios_organizacion",
          "pruebas_laboratorio",
          "estudios_diagnosticos",
          "sedacion_imagen_diagnostica",
          "servicios_peluqueria_spa",
        ].includes(campo.fuente ?? "")) ||
      (campo.precarga !== undefined &&
        (campo.tipo !== "date" ||
          campo.precarga !== "fecha_ultimo_registro" ||
          typeof campo.ayuda_precarga_es !== "string" ||
          campo.ayuda_precarga_es.length > 160 ||
          typeof campo.ayuda_precarga_en !== "string" ||
          campo.ayuda_precarga_en.length > 160)) ||
      (campo.precarga === undefined &&
        (campo.ayuda_precarga_es !== undefined ||
          campo.ayuda_precarga_en !== undefined))
    )
      return null;
    let subcampos: CampoRegistroAtencion[] | undefined;
    if (campo.tipo === "list") {
      const camposAnidados = camposRegistroAtencion(campo.campos);
      if (
        !camposAnidados ||
        camposAnidados.some(
          (subcampo) =>
            !["text", "textarea", "uuid", "number"].includes(subcampo.tipo),
        ) ||
        !Number.isInteger(campo.max_items) ||
        (campo.max_items ?? 0) < 1 ||
        (campo.max_items ?? 0) > 50
      )
        return null;
      subcampos = camposAnidados;
    } else if (campo.campos !== undefined || campo.max_items !== undefined) {
      return null;
    }
    claves.add(campo.clave);
    campos.push({ ...(campo as CampoRegistroAtencion), campos: subcampos });
  }
  return campos;
}

export function validarRegistroAtencion(
  esquema: unknown,
  recibido: unknown,
): RegistroAtencionValidado | null {
  const campos = camposRegistroAtencion(esquema);
  if (
    !campos ||
    !recibido ||
    typeof recibido !== "object" ||
    Array.isArray(recibido)
  )
    return null;
  const entrada = recibido as Record<string, unknown>;
  if (
    Object.keys(entrada).some(
      (clave) => !campos.some((campo) => campo.clave === clave),
    )
  )
    return null;

  const detalle: RegistroAtencionValidado["detalle"] = {};
  let resumen = "";
  let fechaProgramada: string | null = null;
  let programadoLocal: string | null = null;
  for (const campo of campos) {
    const valor = entrada[campo.clave];
    if (campo.tipo === "list") {
      if ((valor === undefined || valor === null) && !campo.requerido) continue;
      if (
        !Array.isArray(valor) ||
        valor.length > (campo.max_items ?? 0) ||
        (campo.requerido && valor.length === 0)
      )
        return null;
      const items: Array<Record<string, string | number>> = [];
      for (const item of valor) {
        if (!item || typeof item !== "object" || Array.isArray(item))
          return null;
        const entradaItem = item as Record<string, unknown>;
        const subcampos = campo.campos ?? [];
        if (
          Object.keys(entradaItem).some(
            (clave) => !subcampos.some((subcampo) => subcampo.clave === clave),
          )
        )
          return null;
        const itemValidado: Record<string, string | number> = {};
        for (const subcampo of subcampos) {
          const recibido = entradaItem[subcampo.clave];
          if (
            (recibido === undefined || recibido === null || recibido === "") &&
            !subcampo.requerido
          )
            continue;
          if (subcampo.tipo === "number") {
            const numero =
              typeof recibido === "number" ? recibido : Number(recibido);
            if (
              !Number.isFinite(numero) ||
              !Number.isInteger(numero) ||
              (subcampo.min !== undefined && numero < subcampo.min) ||
              (subcampo.max !== undefined && numero > subcampo.max)
            )
              return null;
            itemValidado[subcampo.clave] = numero;
            continue;
          }
          if (typeof recibido !== "string") return null;
          const texto = recibido.trim().replace(/\s+/g, " ");
          if (!texto && subcampo.requerido) return null;
          if (!texto) continue;
          if (
            subcampo.tipo === "uuid" &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              texto,
            )
          )
            return null;
          if (
            texto.length >
            (subcampo.max ?? (subcampo.tipo === "textarea" ? 4000 : 250))
          )
            return null;
          itemValidado[subcampo.clave] = texto;
        }
        items.push(itemValidado);
      }
      if (items.length) detalle[campo.clave] = items;
      continue;
    }
    if (campo.tipo === "boolean") {
      if (valor === undefined && !campo.requerido) continue;
      if (typeof valor !== "boolean") return null;
      detalle[campo.clave] = valor;
      continue;
    }
    if (campo.tipo === "number") {
      if ((valor === undefined || valor === "") && !campo.requerido) continue;
      const numero = typeof valor === "number" ? valor : Number(valor);
      if (
        !Number.isFinite(numero) ||
        (campo.min !== undefined && numero < campo.min) ||
        (campo.max !== undefined && numero > campo.max)
      )
        return null;
      detalle[campo.clave] = numero;
      continue;
    }
    if (
      (valor === undefined || valor === null || valor === "") &&
      !campo.requerido
    )
      continue;
    if (typeof valor !== "string") return null;
    const texto = valor.trim().replace(/\s+/g, " ");
    if (!texto && campo.requerido) return null;
    if (!texto) continue;
    if (campo.tipo === "uuid") {
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          texto,
        )
      )
        return null;
    } else if (campo.tipo === "date") {
      if (!FECHA.test(texto) || texto < "1900-01-01") return null;
      if (campo.clave === "fecha_programada") fechaProgramada = texto;
    } else if (campo.tipo === "datetime") {
      if (!FECHA_HORA.test(texto)) return null;
      if (campo.clave === "programado_para") programadoLocal = texto;
    } else if (
      texto.length > (campo.max ?? (campo.tipo === "textarea" ? 4000 : 250))
    ) {
      return null;
    }
    detalle[campo.clave] = texto;
    if (
      !resumen &&
      ![
        "fecha_consulta",
        "fid_motivos_consulta",
        "indicaciones",
        "hallazgos",
        "resultado",
      ].includes(campo.clave)
    )
      resumen = texto.slice(0, 160);
  }
  if (!resumen) resumen = "Registro clínico";
  return {
    detalle,
    resumen,
    fecha_programada: fechaProgramada,
    programado_local: programadoLocal,
  };
}
