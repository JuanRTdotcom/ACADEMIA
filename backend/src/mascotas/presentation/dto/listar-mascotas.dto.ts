import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { DtoListarCatalogoPaginado } from "../../../comun/presentation/dto/catalogo-paginado.dto";

export class DtoListarMascotas extends DtoListarCatalogoPaginado {}

export class DtoBuscarPropietariosMascota {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  q!: string;
}
