import * as v from "valibot";

export const LIMITES_CONTRASENIA = Object.freeze({ minimo: 8, maximo: 20 });
export const PATRON_CONTRASENIA =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/;

export const passwordSchema = v.pipe(
  v.object({
    contrasenia_actual: v.pipe(
      v.string(),
      v.nonEmpty("profile.password.required"),
      v.maxLength(LIMITES_CONTRASENIA.maximo, "profile.password.invalidPolicy"),
    ),
    contrasenia_nueva: v.pipe(
      v.string(),
      v.nonEmpty("profile.password.required"),
      v.minLength(LIMITES_CONTRASENIA.minimo, "profile.password.invalidPolicy"),
      v.maxLength(LIMITES_CONTRASENIA.maximo, "profile.password.invalidPolicy"),
      v.regex(PATRON_CONTRASENIA, "profile.password.invalidPolicy"),
    ),
    confirmacion_contrasenia: v.pipe(
      v.string(),
      v.nonEmpty("profile.password.required"),
      v.maxLength(LIMITES_CONTRASENIA.maximo, "profile.password.invalidPolicy"),
    ),
  }),
  v.forward(
    v.partialCheck(
      [["contrasenia_nueva"], ["confirmacion_contrasenia"]],
      ({ contrasenia_nueva, confirmacion_contrasenia }) =>
        contrasenia_nueva === confirmacion_contrasenia,
      "profile.password.confirmMismatch",
    ),
    ["confirmacion_contrasenia"],
  ),
);

export type PasswordSchema = typeof passwordSchema;
