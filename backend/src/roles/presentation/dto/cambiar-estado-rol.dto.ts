import { IsBoolean, IsDefined } from "class-validator";

export class DtoCambiarEstadoRol {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
