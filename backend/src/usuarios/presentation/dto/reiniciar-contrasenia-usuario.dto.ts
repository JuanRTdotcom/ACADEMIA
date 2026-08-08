import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class DtoReiniciarContraseniaUsuario {
  @IsString()
  @MinLength(8, { message: "profile.password.rule.length" })
  @MaxLength(80)
  @Matches(/[A-Z]/, { message: "profile.password.rule.uppercase" })
  @Matches(/[a-z]/, { message: "profile.password.rule.lowercase" })
  @Matches(/\d/, { message: "profile.password.rule.number" })
  @Matches(/[^A-Za-z0-9\s]/, { message: "profile.password.rule.special" })
  contrasenia_nueva: string;
}
