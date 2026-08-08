import { IsBoolean, IsIn, ValidateIf } from "class-validator";

/** Valores que entiende actualmente la interfaz. Son cerrados: no aceptamos texto libre. */
export const TEMAS_PERMITIDOS = ["light", "dark", "system"] as const;
export const IDIOMAS_PERMITIDOS = ["en", "es"] as const;

export type TemaPreferido = (typeof TEMAS_PERMITIDOS)[number];
export type IdiomaPreferido = (typeof IDIOMAS_PERMITIDOS)[number];

/**
 * PATCH parcial: el cliente puede guardar solo el tema o solo el idioma.
 * ValidateIf omite exclusivamente undefined; null y valores desconocidos fallan.
 */
export class DtoActualizarPreferencias {
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsIn(TEMAS_PERMITIDOS)
  tema?: TemaPreferido;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsIn(IDIOMAS_PERMITIDOS)
  idioma?: IdiomaPreferido;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsBoolean()
  menu_colapsado?: boolean;
}
