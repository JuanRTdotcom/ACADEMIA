import {
  IsDefined,
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
  IsNumber,
  IsISO8601,
} from "class-validator";

export class DtoRenovarSuscripcion {
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i)
  fid_planes!: string;

  @IsDefined()
  @IsISO8601()
  fecha_inicio!: string;

  @IsDefined()
  @IsISO8601()
  fecha_fin!: string;

  @IsOptional()
  @IsNumber()
  monto?: number;

  @IsOptional()
  @IsString()
  metodo_pago?: string;
}
