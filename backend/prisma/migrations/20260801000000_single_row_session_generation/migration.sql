-- Modelo de sesión de una sola fila con rotación in-place.
-- Se retira la familia (uid_familia_sesion) y se agrega un contador de generación
-- que distingue el token vigente de uno ya rotado (detección de reuso sin filas extra).
DROP INDEX IF EXISTS "seguridad"."sesiones_uid_familia_sesion_idx";
ALTER TABLE "seguridad"."sesiones" DROP COLUMN "uid_familia_sesion";
ALTER TABLE "seguridad"."sesiones" ADD COLUMN "generacion" INTEGER NOT NULL DEFAULT 0;
