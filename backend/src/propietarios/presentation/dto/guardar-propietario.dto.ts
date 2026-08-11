import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const telefono = /^\+?[0-9][0-9 .()\-]{5,29}$/;
const textoOpcional = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const limpio = value.trim().replace(/\s+/g, " ");
  return limpio || undefined;
};
const uuidOpcional = ({ value }: { value: unknown }) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export class DtoGuardarPropietario {
  @IsDefined() @IsUUID("4") fid_parametros_tipo_documento!: string;
  @IsDefined()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[\p{L}\p{N}.\-]+$/u)
  @Transform(limpiar)
  numero_documento!: string;
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  @Matches(/^[\p{L}\p{M}' .\-]+$/u)
  @Transform(limpiar)
  nombre_completo!: string;
  @IsOptional()
  @IsString()
  @Matches(telefono)
  @Transform(textoOpcional)
  celular?: string;
  @IsOptional() @IsBoolean() celular_verificado?: boolean;
  @IsOptional() @IsBoolean() sin_correo?: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(254)
  @ValidateIf((o: DtoGuardarPropietario) => Boolean(o.correo))
  @IsEmail()
  @Transform(textoOpcional)
  correo?: string;
  @IsOptional() @IsBoolean() correo_verificado?: boolean;
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(telefono)
  @Transform(textoOpcional)
  telefono_fijo?: string;
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(textoOpcional)
  direccion?: string;
  @IsOptional()
  @IsUUID("4")
  @Transform(uuidOpcional)
  fid_admin_level_0?: string;
  @IsOptional()
  @IsUUID("4")
  @Transform(uuidOpcional)
  fid_admin_level_3?: string;
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(textoOpcional)
  contacto_alternativo_nombre?: string;
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(telefono)
  @Transform(textoOpcional)
  contacto_alternativo_telefono?: string;
  @IsOptional()
  @IsUUID("4")
  @Transform(uuidOpcional)
  fid_parametros_como_conocio?: string;
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(textoOpcional)
  como_conocio_otro?: string;
}
