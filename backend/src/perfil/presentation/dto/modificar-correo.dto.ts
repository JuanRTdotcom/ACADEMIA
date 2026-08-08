import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength } from "class-validator";

export class DtoModificarCorreo {
  @IsString()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  correo!: string;
}
