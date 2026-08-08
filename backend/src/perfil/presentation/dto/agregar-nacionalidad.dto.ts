import { IsDefined, IsUUID } from "class-validator";

export class DtoAgregarNacionalidad {
  @IsDefined()
  @IsUUID("4")
  fid_admin_level_0!: string;
}
