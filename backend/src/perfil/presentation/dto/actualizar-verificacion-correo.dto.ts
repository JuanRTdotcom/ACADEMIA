import { IsBoolean, IsDefined } from "class-validator";

export class DtoActualizarVerificacionCorreo {
  @IsDefined()
  @IsBoolean()
  verificado!: boolean;
}
