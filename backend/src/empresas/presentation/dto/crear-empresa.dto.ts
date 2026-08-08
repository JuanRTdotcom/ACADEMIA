import { Transform } from "class-transformer";
import {
  IsEmail,
  IsDefined,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsOptional,
  IsISO8601,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

/** El alta inicial solo identifica la empresa; el perfil se completa después. */
export class DtoCrearEmpresa {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  nombre!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  razon_social!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^[A-Z0-9.\-]+$/)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  ruc_nif!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  slug!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(120)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  correo_contacto!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(30)
  @Matches(/^\+?(?=(?:\D*\d){7,15}\D*$)[0-9][0-9\s-]*$/)
  @Transform(texto)
  telefono!: string;

}
