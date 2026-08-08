import {
  IsDefined,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const PATRON_CONTRASENIA =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export class DtoCambiarContrasenia {
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  contrasenia_actual!: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(PATRON_CONTRASENIA)
  contrasenia_nueva!: string;

  @IsDefined()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  confirmacion_contrasenia!: string;
}
