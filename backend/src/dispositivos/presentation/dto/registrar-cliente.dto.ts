import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { tipo_dispositivo } from "../../../../prisma/generated/client/enums";

/** Datos disponibles sin solicitar permiso de notificaciones. */
export class DtoRegistrarCliente {
  @IsString()
  @IsNotEmpty()
  uid_dispositivo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firebase_id_instalacion!: string;

  @IsEnum(tipo_dispositivo)
  tipo_dispositivo!: tipo_dispositivo;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  modelo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  version_so?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  version_app!: string;
}
