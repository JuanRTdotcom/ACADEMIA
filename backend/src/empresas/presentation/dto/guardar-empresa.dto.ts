import { Transform } from "class-transformer";
import {
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** Recorta y colapsa espacios internos. */
const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
/** Recorta y pasa a minúsculas (slug, correo). */
const minusculas = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;
/** Recorta y pasa a mayúsculas (RUC/NIF). */
const mayusculas = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

/**
 * Campos comunes de alta y edición de una empresa. `nombre` y `slug` son
 * obligatorios; los datos de perfil son opcionales. El backend vuelve a validar
 * todo aunque el frontend ya lo haya hecho (regla de autoridad).
 */
export class DtoGuardarEmpresa {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  nombre!: string;

  // Slug = subdominio del tenant: minúsculas, dígitos y guiones internos.
  @IsDefined()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(minusculas)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^$|^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  razon_social?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^$|^[A-Z0-9.\-]+$/)
  @Transform(mayusculas)
  ruc_nif?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(texto)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^$|^[+0-9()\-\s]+$/)
  @Transform(texto)
  telefono?: string;

  @IsOptional()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(minusculas)
  correo_contacto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  sitio_web?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  logo_url?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  color_primario?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  correo_remitente_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(minusculas)
  correo_remitente_direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(texto)
  cabecera_impresion?: string;
}
