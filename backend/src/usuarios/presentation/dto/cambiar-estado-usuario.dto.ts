import { IsBoolean, IsDefined } from "class-validator";
export class DtoCambiarEstadoUsuario { @IsDefined() @IsBoolean() activo!: boolean; }
