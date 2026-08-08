// class-validator: decoradores que validan cada campo del body (los aplica el ValidationPipe global de Nest)
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { plataforma_dispositivo } from "../../../../prisma/generated/client/enums";
import { Transform } from "class-transformer";

// Clases de caracteres exigidas; la LONGITUD la impone @MinLength (no el regex).
const PATRON_CONTRASENIA =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export class DtoIngreso {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  @Matches(/^[A-Za-z0-9]+$/)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  usuario!: string;

  @IsString() // class-validator: exige que sea texto
  @MinLength(8) // longitud mínima (autoridad única del mínimo)
  @MaxLength(20) // límite funcional y protección ante entradas desproporcionadas
  @Matches(PATRON_CONTRASENIA) // exige mayúscula, minúscula, número y carácter especial
  contrasenia!: string;

  /** Organización (empresa/colegio). Se resuelve por subdomain; en dev se envía aquí. */
  @IsOptional() // class-validator: el campo puede faltar
  @IsString()
  slug_organizacion?: string;

  /** Identificador estable del dispositivo (web: uuid guardado; móvil: id nativo). */
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/) // rechaza identificadores compuestos únicamente por espacios
  uid_dispositivo!: string;

  /** Plataforma declarada por cliente; desconocido significa que no pudo detectarla. */
  @IsEnum(plataforma_dispositivo)
  plataforma!: plataforma_dispositivo;
}
