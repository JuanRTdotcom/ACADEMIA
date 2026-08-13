import { plainToInstance, Transform } from "class-transformer";
import {
  IsBoolean,
  IsArray,
  IsDefined,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { DtoListarCatalogoPaginado } from "../../../comun/presentation/dto/catalogo-paginado.dto";

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
const booleano = ({ value }: { value: unknown }) => {
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return value;
};
const json = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed;
  } catch {
    return value;
  }
};

export class DtoListarAtenciones extends DtoListarCatalogoPaginado {
  @IsOptional()
  @Transform(booleano)
  @IsBoolean()
  incluir_ayer?: boolean;
}

export class DtoBuscarPropietariosAtencion {
  @Transform(limpiar)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  q!: string;
}

export class DtoRegistroAtencion {
  @IsUUID("4", { message: "attentions.invalidRecordType" })
  fid_tipos_registro_atencion!: string;

  @IsOptional()
  @IsUUID("4", { message: "attentions.invalidFollowUpOrigin" })
  fid_registros_atencion_origen?: string;

  @Transform(json)
  @IsObject({ message: "attentions.invalidRecord" })
  detalle!: Record<string, unknown>;
}

export class DtoEditarRegistroAtencion extends DtoRegistroAtencion {
  @IsOptional()
  @Transform(json)
  @IsArray({ message: "attentions.invalidAttachments" })
  adjuntos_conservados?: string[][];
}

export class DtoCrearAtencion {
  @IsUUID("4", { message: "attentions.invalidPet" })
  fid_mascotas!: string;

  @Transform(({ value }: { value: unknown }) => {
    const parsed = json({ value });
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? plainToInstance(DtoRegistroAtencion, parsed)
      : parsed;
  })
  @IsDefined({ message: "attentions.invalidRecord" })
  @IsObject({ message: "attentions.invalidRecord" })
  @ValidateNested({ message: "attentions.invalidRecord" })
  registro!: DtoRegistroAtencion;
}

export class DtoCambiarEstadoAtencion {
  @IsUUID("4", { message: "attentions.invalidStatus" })
  fid_parametros_estado!: string;
}

export class DtoEliminarAtencion {
  @IsOptional()
  @IsBoolean({
    message: "attentions.protectedDeletionConfirmationRequired",
  })
  confirmar_eliminacion_protegida?: boolean;
}
