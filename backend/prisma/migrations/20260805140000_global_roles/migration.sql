-- Roles son catálogo global de seguridad. La empresa pertenece al usuario,
-- no al rol; usuarios_roles expresa la asignación entre ambos conceptos.
DROP INDEX IF EXISTS "seguridad"."roles_organizacion_nombre_activo_key";
DROP INDEX IF EXISTS "seguridad"."roles_organizacion_eliminado_creado_idx";

ALTER TABLE "seguridad"."roles"
  DROP CONSTRAINT IF EXISTS "roles_fid_organizaciones_fkey",
  DROP COLUMN IF EXISTS "fid_organizaciones";

CREATE UNIQUE INDEX "roles_codigo_activo_key"
  ON "seguridad"."roles" (UPPER("codigo"))
  WHERE "eliminado_en" IS NULL;

CREATE UNIQUE INDEX "roles_nombre_activo_key"
  ON "seguridad"."roles" (LOWER("nombre"))
  WHERE "eliminado_en" IS NULL;

CREATE INDEX "roles_eliminado_creado_idx"
  ON "seguridad"."roles" ("eliminado_en", "created_at" DESC);
