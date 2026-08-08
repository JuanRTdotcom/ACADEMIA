import { IsIn, IsUUID } from "class-validator";
import {
  TIPOS_USO_CORREO,
  type TipoUsoCorreo,
} from "../../domain/entities/correo-persona";

export class DtoSeleccionarCorreoUso {
  @IsUUID("4")
  id_personas_correos!: string;

  @IsIn(TIPOS_USO_CORREO)
  tipo!: TipoUsoCorreo;
}
