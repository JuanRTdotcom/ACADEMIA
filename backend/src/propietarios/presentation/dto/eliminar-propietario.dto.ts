import { IsBoolean, IsOptional } from "class-validator";

export class DtoEliminarPropietario {
  @IsOptional()
  @IsBoolean()
  confirmar_desvinculacion?: boolean;
}
