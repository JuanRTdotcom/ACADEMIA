import { Transform } from "class-transformer";
import {
  IsDefined,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { ICONOS_ROL, type IconoRol } from "../../domain/entities/rol";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const alias = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;

export class DtoGuardarRol {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-]*$/u)
  @Transform(texto)
  nombre!: string;

  @IsDefined()
  @IsString()
  @MinLength(5)
  @MaxLength(250)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,;:'"()¿?¡!/_\-]*$/u)
  @Transform(texto)
  descripcion!: string;

  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  @Transform(alias)
  alias!: string;

  @IsDefined()
  @IsString()
  @IsIn(ICONOS_ROL)
  icono!: IconoRol;
}
