import { IsBoolean, IsDefined } from "class-validator";

export class DtoActualizarSegundoFactor {
  @IsDefined()
  @IsBoolean()
  habilitado!: boolean;
}
