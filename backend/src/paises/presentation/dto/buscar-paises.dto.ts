import { IsOptional, IsString, MaxLength } from "class-validator";

export class DtoBuscarPaises {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
