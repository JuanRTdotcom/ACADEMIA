import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, Matches } from "class-validator";
export class DtoListarUsuarios {
  @IsOptional() @IsString() @MaxLength(120) @Matches(/^[\p{L}\p{N}\s@._'()\-]*$/u)
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value)
  q?: string;
}
