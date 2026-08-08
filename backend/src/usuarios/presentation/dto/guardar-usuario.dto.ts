import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsDefined, IsEmail, IsString, IsUUID, Matches, MaxLength, MinLength } from "class-validator";

const texto = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const usuario = ({ value }: { value: unknown }) => typeof value === "string" ? value.trim().toUpperCase() : value;
const PATRON_NOMBRE = /^[\p{L}][\p{L}\s'\-]*$/u;
const PATRON_USUARIO = /^[A-Z0-9]+$/;
const PATRON_CONTRASENIA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export class DtoGuardarUsuario {
  @IsDefined() @IsUUID("4") fid_organizaciones!: string;
  @IsDefined() @IsString() @MinLength(3) @MaxLength(12) @Matches(PATRON_USUARIO) @Transform(usuario) usuario!: string;
  @IsDefined() @IsString() @MinLength(2) @MaxLength(50) @Matches(PATRON_NOMBRE) @Transform(texto) nombres!: string;
  @IsDefined() @IsString() @MinLength(2) @MaxLength(30) @Matches(PATRON_NOMBRE) @Transform(texto) apellido_paterno!: string;
  @IsDefined() @IsString() @MinLength(2) @MaxLength(30) @Matches(PATRON_NOMBRE) @Transform(texto) apellido_materno!: string;
  @IsDefined() @IsEmail() @MaxLength(254) @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim().toLowerCase() : value) correo!: string;
  @IsDefined() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ArrayUnique() @IsUUID("4", { each: true }) fid_roles!: string[];
}

export class DtoCrearUsuario extends DtoGuardarUsuario {
  @IsDefined() @IsString() @MinLength(8) @MaxLength(20) @Matches(PATRON_CONTRASENIA) contrasenia_temporal!: string;
  @IsDefined() @IsString() @MinLength(8) @MaxLength(20) confirmacion_contrasenia!: string;
}
