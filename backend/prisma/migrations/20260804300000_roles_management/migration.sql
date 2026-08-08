ALTER TABLE "seguridad"."roles"
  ADD COLUMN "icono" VARCHAR(40) NOT NULL DEFAULT 'shield-check',
  ADD COLUMN "eliminado_en" TIMESTAMPTZ(3),
  ADD COLUMN "eliminado_por" TEXT;

ALTER TABLE "seguridad"."roles"
  ADD CONSTRAINT "roles_estado_check" CHECK ("estado" IN (0, 1)),
  ADD CONSTRAINT "roles_icono_check" CHECK (
    "icono" IN ('shield', 'shield-check', 'user-cog', 'users', 'graduation-cap', 'briefcase-business', 'key-round', 'badge-check')
  ),
  ADD CONSTRAINT "roles_eliminacion_check" CHECK (
    ("eliminado_en" IS NULL AND "eliminado_por" IS NULL)
    OR
    ("eliminado_en" IS NOT NULL AND "eliminado_por" IS NOT NULL AND "estado" = 0)
  );

CREATE UNIQUE INDEX "roles_organizacion_nombre_activo_key"
  ON "seguridad"."roles" ("fid_organizaciones", LOWER("nombre"))
  WHERE "eliminado_en" IS NULL;

CREATE INDEX "roles_organizacion_eliminado_creado_idx"
  ON "seguridad"."roles" ("fid_organizaciones", "eliminado_en", "created_at" DESC);
