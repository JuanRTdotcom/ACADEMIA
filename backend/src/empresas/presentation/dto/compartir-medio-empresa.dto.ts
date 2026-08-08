import { IsBoolean } from "class-validator";

export class DtoCompartirMedioEmpresa {
  @IsBoolean()
  usar_misma_imagen!: boolean;
}
