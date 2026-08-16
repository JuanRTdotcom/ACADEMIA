import { Transform } from "class-transformer";
import {
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
export class DtoGuardarSede {
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(24)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  codigo!: string;
  @Transform(limpiar) @IsString() @MinLength(2) @MaxLength(120) nombre!: string;
}

export class DtoSeleccionarSede {
  @IsUUID() fid_sedes!: string;
}
