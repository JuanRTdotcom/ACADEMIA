import {
  IsDefined,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

const textoONulo = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const recortarTexto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const NOMBRE_PERSONA = /^[\p{L}\p{M}]+(?:[- '][\p{L}\p{M}]+)*$/u;

export class DtoActualizarDatosPersonales {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(NOMBRE_PERSONA)
  @Transform(recortarTexto)
  nombres!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(NOMBRE_PERSONA)
  @Transform(recortarTexto)
  apellido_paterno!: string;

  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(NOMBRE_PERSONA)
  @Transform(recortarTexto)
  apellido_materno!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(textoONulo)
  codigo_sexo!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(textoONulo)
  codigo_estado_civil!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(textoONulo)
  codigo_nivel_instruccion!: string | null;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @Transform(textoONulo)
  fecha_nacimiento!: string | null;

  @IsDefined()
  @IsBoolean()
  discapacidad!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  @Matches(/^[0-9a-f-]{36}$/i)
  @Transform(textoONulo)
  fid_admin_level_0_procedencia!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9._-]+$/)
  @Transform(textoONulo)
  codigo_admin_level_3_procedencia!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  @Matches(/^[0-9a-f-]{36}$/i)
  @Transform(textoONulo)
  fid_admin_level_0_residencia!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9._-]+$/)
  @Transform(textoONulo)
  codigo_admin_level_3_residencia!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(textoONulo)
  direccion!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(textoONulo)
  referencia!: string | null;
}
