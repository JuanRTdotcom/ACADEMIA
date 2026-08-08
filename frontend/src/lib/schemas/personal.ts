import * as v from "valibot";

const NOMBRE_PERSONA = /^[\p{L}\p{M}]+(?:[- '][\p{L}\p{M}]+)*$/u;

export const LIMITES_PERSONALES = Object.freeze({
  nombres: 50,
  apellido_paterno: 30,
  apellido_materno: 30,
  direccion: 200,
  referencia: 200,
});

export const personalSchema = v.pipe(
  v.object({
    nombres: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("profile.personal.required"),
      v.maxLength(LIMITES_PERSONALES.nombres, "profile.personal.tooLong"),
      v.regex(NOMBRE_PERSONA, "profile.personal.invalidName"),
    ),
    apellido_paterno: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("profile.personal.required"),
      v.maxLength(
        LIMITES_PERSONALES.apellido_paterno,
        "profile.personal.tooLong",
      ),
      v.regex(NOMBRE_PERSONA, "profile.personal.invalidName"),
    ),
    apellido_materno: v.pipe(
      v.string(),
      v.trim(),
      v.nonEmpty("profile.personal.required"),
      v.maxLength(
        LIMITES_PERSONALES.apellido_materno,
        "profile.personal.tooLong",
      ),
      v.regex(NOMBRE_PERSONA, "profile.personal.invalidName"),
    ),
    codigo_sexo: v.pipe(
      v.string(),
      v.maxLength(80, "profile.personal.invalidCatalog"),
    ),
    codigo_estado_civil: v.pipe(
      v.string(),
      v.maxLength(80, "profile.personal.invalidCatalog"),
    ),
    codigo_nivel_instruccion: v.pipe(
      v.string(),
      v.maxLength(80, "profile.personal.invalidCatalog"),
    ),
    fecha_nacimiento: v.union([
      v.literal(""),
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, "profile.personal.invalidBirthDate"),
      ),
    ]),
    discapacidad: v.optional(v.boolean(), false),
    fid_admin_level_0_procedencia: v.union([
      v.literal(""),
      v.pipe(v.string(), v.uuid("profile.personal.invalidLocation")),
    ]),
    codigo_admin_level_3_procedencia: v.union([
      v.literal(""),
      v.pipe(
        v.string(),
        v.maxLength(20, "profile.personal.invalidLocation"),
        v.regex(/^[A-Za-z0-9._-]+$/, "profile.personal.invalidLocation"),
      ),
    ]),
    fid_admin_level_0_residencia: v.union([
      v.literal(""),
      v.pipe(v.string(), v.uuid("profile.personal.invalidLocation")),
    ]),
    codigo_admin_level_3_residencia: v.union([
      v.literal(""),
      v.pipe(
        v.string(),
        v.maxLength(20, "profile.personal.invalidLocation"),
        v.regex(/^[A-Za-z0-9._-]+$/, "profile.personal.invalidLocation"),
      ),
    ]),
    direccion: v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(LIMITES_PERSONALES.direccion, "profile.personal.tooLong"),
    ),
    referencia: v.pipe(
      v.string(),
      v.trim(),
      v.maxLength(LIMITES_PERSONALES.referencia, "profile.personal.tooLong"),
    ),
  }),
  v.forward(
    v.partialCheck(
      [["fid_admin_level_0_procedencia"], ["codigo_admin_level_3_procedencia"]],
      ({ fid_admin_level_0_procedencia, codigo_admin_level_3_procedencia }) =>
        Boolean(fid_admin_level_0_procedencia) ===
        Boolean(codigo_admin_level_3_procedencia),
      "profile.personal.invalidLocation",
    ),
    ["codigo_admin_level_3_procedencia"],
  ),
  v.forward(
    v.partialCheck(
      [["fid_admin_level_0_residencia"], ["codigo_admin_level_3_residencia"]],
      ({ fid_admin_level_0_residencia, codigo_admin_level_3_residencia }) =>
        Boolean(fid_admin_level_0_residencia) ===
        Boolean(codigo_admin_level_3_residencia),
      "profile.personal.invalidLocation",
    ),
    ["codigo_admin_level_3_residencia"],
  ),
);

export type PersonalSchema = typeof personalSchema;
