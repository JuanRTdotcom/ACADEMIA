import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength, MinLength, Matches } from "class-validator";
export class DtoListarUsuarios {
  @IsOptional() @IsString() @MaxLength(1000)
  p?: string;

  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) @Matches(/^[\p{L}\p{N}\s@._'()\-]*$/u)
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value)
  q?: string;
}
