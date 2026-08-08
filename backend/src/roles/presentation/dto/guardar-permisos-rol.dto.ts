import { ArrayMaxSize, ArrayUnique, IsArray, IsDefined, IsUUID } from "class-validator";

/** Lista total deseada: permite sincronizar altas y bajas en una sola transacción. */
export class DtoGuardarPermisosRol {
  @IsDefined()
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  permisos!: string[];
}
