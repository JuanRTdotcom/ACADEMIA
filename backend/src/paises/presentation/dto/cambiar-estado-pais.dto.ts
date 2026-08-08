import { IsBoolean, IsDefined } from "class-validator";

export class DtoCambiarEstadoPais {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
