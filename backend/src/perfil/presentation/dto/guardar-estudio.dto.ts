import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const CODIGO = /^[a-z0-9_]+$/;
const TEXTO = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u;

class DtoPeriodoEstudio {
  @IsDefined()
  @IsDateString({ strict: true })
  fecha_inicio!: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_fin?: string;

  @IsDefined()
  @IsBoolean()
  en_curso!: boolean;
}

export class DtoGuardarEstudioRealizado extends DtoPeriodoEstudio {
  @IsDefined()
  @IsString()
  @MaxLength(80)
  @Matches(CODIGO)
  codigo_nivel_instruccion!: string;

  @IsDefined()
  @IsString()
  @MaxLength(80)
  @Matches(CODIGO)
  codigo_grado_obtenido!: string;

  @IsOptional()
  @IsString()
  @Transform(limpiar)
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXTO)
  grado_obtenido_otro?: string;

  @IsDefined()
  @IsString()
  @MaxLength(80)
  @Matches(CODIGO)
  codigo_profesion!: string;

  @IsOptional()
  @IsString()
  @Transform(limpiar)
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXTO)
  profesion_otro?: string;
}

export class DtoGuardarEstudioComplementario extends DtoPeriodoEstudio {
  @IsDefined()
  @IsString()
  @MaxLength(80)
  @Matches(CODIGO)
  codigo_tipo_estudio!: string;

  @IsOptional()
  @IsString()
  @Transform(limpiar)
  @MinLength(2)
  @MaxLength(120)
  @Matches(TEXTO)
  tipo_estudio_otro?: string;

  @IsDefined()
  @IsString()
  @Transform(limpiar)
  @MinLength(2)
  @MaxLength(150)
  @Matches(TEXTO)
  nombre_estudio!: string;

  @IsDefined()
  @IsString()
  @Transform(limpiar)
  @MinLength(2)
  @MaxLength(150)
  @Matches(TEXTO)
  institucion!: string;
}
