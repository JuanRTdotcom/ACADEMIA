import { Transform } from "class-transformer";
import {
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from "class-validator";

const recortar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;

export class DtoAgregarHobby {
  @IsDefined()
  @IsString()
  @Transform(recortar)
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[a-z0-9_]+$/)
  codigo_hobby!: string;

  @IsOptional()
  @IsString()
  @Transform(recortar)
  @MaxLength(100)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  hobby_personalizado?: string;

  @IsDefined()
  @IsString()
  @Transform(recortar)
  @MinLength(1)
  @MaxLength(80)
  codigo_frecuencia!: string;
}
