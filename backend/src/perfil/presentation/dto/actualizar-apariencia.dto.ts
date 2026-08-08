import { IsDefined, IsUUID } from "class-validator";

/** Apariencia exige ambos valores: no admite actualizaciones parciales. */
export class DtoActualizarApariencia {
  @IsDefined()
  @IsUUID()
  fid_admin_level_0!: string;

  @IsDefined()
  @IsUUID()
  fid_zonas_horarias!: string;
}
