import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsDefined,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const booleano = ({ value }: { value: unknown }) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return value;
};
const uuidOpcional = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const textoOpcional = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const limpio = value.trim().replace(/\s+/g, " ");
  return limpio || undefined;
};

export class DtoGuardarMascota {
  @IsOptional() @IsBoolean() @Transform(booleano) eliminar_foto?: boolean;
  @IsOptional() @IsUUID() @Transform(uuidOpcional) fid_propietarios?: string;
  @IsDefined() @IsBoolean() @Transform(booleano) sin_propietario!: boolean;
  @IsOptional() @IsBoolean() @Transform(booleano) animal_servicio?: boolean;
  @IsOptional() @IsBoolean() @Transform(booleano) apoyo_emocional?: boolean;
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{M}\p{N}' .\-]+$/u)
  @Transform(limpiar)
  nombre!: string;
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9.\/_\-]{4,50}$/)
  @Transform(textoOpcional)
  codigo_chip?: string;
  @IsDefined() @IsUUID() fid_especies_animales!: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_subespecies_animales?: string;
  @IsOptional() @IsUUID() @Transform(uuidOpcional) fid_razas_animales?: string;
  @IsDefined() @IsUUID() fid_parametros_genero!: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_parametros_color?: string;
  @IsOptional()
  @IsDateString({ strict: true })
  @Transform(textoOpcional)
  fecha_nacimiento?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,5}(?:\.\d{1,3})?$/)
  @Transform(textoOpcional)
  peso?: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_parametros_unidad_peso?: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_parametros_talla?: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_parametros_estado_reproductivo?: string;
  @IsOptional()
  @IsUUID()
  @Transform(uuidOpcional)
  fid_parametros_temperamento?: string;
  @IsOptional()
  @IsString()
  @MaxLength(250)
  @Transform(textoOpcional)
  alimento?: string;
}
