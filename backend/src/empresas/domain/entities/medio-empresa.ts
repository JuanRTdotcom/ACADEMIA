export const TIPOS_MEDIO_EMPRESA = [
  "escudo",
  "escudo_oscuro",
  "imagotipo",
  "imagotipo_oscuro",
  "portada",
  "login_escudo",
  "login_escudo_oscuro",
] as const;
export type TipoMedioEmpresa = (typeof TIPOS_MEDIO_EMPRESA)[number];

export const TIPOS_MARCA_EMPRESA = ["escudo", "imagotipo", "login_escudo"] as const;
export type TipoMarcaEmpresa = (typeof TIPOS_MARCA_EMPRESA)[number];

export interface ArchivoMedioEmpresa {
  contenido: Buffer;
  tipo_mime: string;
  nombre_original: string;
}

export interface MedioEmpresa {
  contenido: Buffer;
  tipo_mime: "image/png" | "image/jpeg" | "image/webp";
  version: string;
}

export function versionMedioEmpresa(clave: string | null): string | null {
  return clave?.split("/").at(-1) ?? null;
}
