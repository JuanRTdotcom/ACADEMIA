import { extname } from "node:path";

export type FamiliaAdjunto =
  "imagen" | "pdf" | "word" | "excel" | "powerpoint" | "opendocument";

export interface FormatoAdjuntoAtencion {
  extension: string;
  tipoMime: string;
  familia: FamiliaAdjunto;
  marcadorZip?: string;
  tiposDeclarados: readonly string[];
}

const formatos: Record<string, FormatoAdjuntoAtencion> = {
  ".jpg": {
    extension: ".jpg",
    tipoMime: "image/jpeg",
    familia: "imagen",
    tiposDeclarados: ["image/jpeg", "image/jpg"],
  },
  ".jpeg": {
    extension: ".jpg",
    tipoMime: "image/jpeg",
    familia: "imagen",
    tiposDeclarados: ["image/jpeg", "image/jpg"],
  },
  ".png": {
    extension: ".jpg",
    tipoMime: "image/png",
    familia: "imagen",
    tiposDeclarados: ["image/png"],
  },
  ".webp": {
    extension: ".jpg",
    tipoMime: "image/webp",
    familia: "imagen",
    tiposDeclarados: ["image/webp"],
  },
  ".pdf": {
    extension: ".pdf",
    tipoMime: "application/pdf",
    familia: "pdf",
    tiposDeclarados: ["application/pdf"],
  },
  ".doc": {
    extension: ".doc",
    tipoMime: "application/msword",
    familia: "word",
    tiposDeclarados: ["application/msword"],
  },
  ".docx": {
    extension: ".docx",
    tipoMime:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    familia: "word",
    marcadorZip: "word/",
    tiposDeclarados: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  ".xls": {
    extension: ".xls",
    tipoMime: "application/vnd.ms-excel",
    familia: "excel",
    tiposDeclarados: ["application/vnd.ms-excel"],
  },
  ".xlsx": {
    extension: ".xlsx",
    tipoMime:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    familia: "excel",
    marcadorZip: "xl/",
    tiposDeclarados: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  },
  ".ppt": {
    extension: ".ppt",
    tipoMime: "application/vnd.ms-powerpoint",
    familia: "powerpoint",
    tiposDeclarados: ["application/vnd.ms-powerpoint"],
  },
  ".pptx": {
    extension: ".pptx",
    tipoMime:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    familia: "powerpoint",
    marcadorZip: "ppt/",
    tiposDeclarados: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  },
  ".odt": {
    extension: ".odt",
    tipoMime: "application/vnd.oasis.opendocument.text",
    familia: "opendocument",
    marcadorZip: "application/vnd.oasis.opendocument.text",
    tiposDeclarados: ["application/vnd.oasis.opendocument.text"],
  },
  ".ods": {
    extension: ".ods",
    tipoMime: "application/vnd.oasis.opendocument.spreadsheet",
    familia: "opendocument",
    marcadorZip: "application/vnd.oasis.opendocument.spreadsheet",
    tiposDeclarados: ["application/vnd.oasis.opendocument.spreadsheet"],
  },
  ".odp": {
    extension: ".odp",
    tipoMime: "application/vnd.oasis.opendocument.presentation",
    familia: "opendocument",
    marcadorZip: "application/vnd.oasis.opendocument.presentation",
    tiposDeclarados: ["application/vnd.oasis.opendocument.presentation"],
  },
};

const tiposGenericos = new Set([
  "",
  "application/octet-stream",
  "application/x-ole-storage",
  "application/cdfv2",
]);

export function formatoAdjuntoAtencion(
  nombre: string,
  tipoDeclarado: string,
): FormatoAdjuntoAtencion | null {
  const formato = formatos[extname(nombre).toLowerCase()];
  const tipo = tipoDeclarado.trim().toLowerCase();
  return formato &&
    (tiposGenericos.has(tipo) || formato.tiposDeclarados.includes(tipo))
    ? formato
    : null;
}
