import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class DtoBuscarEmpresas {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  q?: string;
}
