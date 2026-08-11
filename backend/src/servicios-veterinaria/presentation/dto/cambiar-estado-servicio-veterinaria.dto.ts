import { IsBoolean, IsDefined } from "class-validator";

export class DtoCambiarEstadoServicioVeterinaria {
  @IsDefined()
  @IsBoolean()
  activo!: boolean;
}
