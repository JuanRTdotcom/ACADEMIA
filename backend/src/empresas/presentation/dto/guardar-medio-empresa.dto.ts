import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class DtoGuardarMedioEmpresa {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value,
  )
  texto_alternativo?: string;
}
