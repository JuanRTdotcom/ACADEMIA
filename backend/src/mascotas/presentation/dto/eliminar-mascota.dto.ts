import { IsBoolean, IsOptional } from "class-validator";

export class DtoEliminarMascota {
  @IsOptional()
  @IsBoolean()
  confirmar_desvinculacion?: boolean;
}
