import { Transform } from "class-transformer";
import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const opcional = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/\s+/g, " ");
};

export class DtoGuardarServicioVeterinaria {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(texto)
  nombre!: string;

  @IsDefined()
  @Transform(opcional)
  @IsString()
  @MaxLength(500)
  descripcion!: string;

  @IsDefined()
  @Transform(opcional)
  @IsString()
  @Matches(/^$|^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
  precio!: string;
}
