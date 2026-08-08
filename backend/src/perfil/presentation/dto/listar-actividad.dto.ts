import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class DtoListarActividad {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  pagina = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limite = 20;
}
