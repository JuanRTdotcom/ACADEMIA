import { IsBoolean, IsDefined } from "class-validator";

export class DtoCambiarEstadoEmpresa {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
