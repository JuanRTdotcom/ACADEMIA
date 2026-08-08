ALTER TABLE "nucleo"."perfil_organizacion"
  ADD COLUMN "telefono_secundario" VARCHAR(30),
  ADD COLUMN "correo_contacto_secundario" VARCHAR(120),
  ADD COLUMN "facebook_url" VARCHAR(200),
  ADD COLUMN "instagram_url" VARCHAR(200),
  ADD COLUMN "tiktok_url" VARCHAR(200),
  ADD COLUMN "youtube_url" VARCHAR(200),
  ADD COLUMN "linkedin_url" VARCHAR(200),
  ADD COLUMN "x_url" VARCHAR(200),
  DROP COLUMN "soporte_url",
  DROP COLUMN "soporte_horario";

CREATE TABLE "nucleo"."horarios_atencion_organizacion" (
  "id_horarios_atencion_organizacion" UUID NOT NULL DEFAULT gen_random_uuid(),
  "fid_organizaciones" UUID NOT NULL,
  "dia_semana" INTEGER NOT NULL,
  "cerrado" BOOLEAN NOT NULL DEFAULT false,
  "hora_apertura" CHAR(5),
  "hora_cierre" CHAR(5),
  "estado" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" TEXT,
  CONSTRAINT "horarios_atencion_organizacion_pkey" PRIMARY KEY ("id_horarios_atencion_organizacion"),
  CONSTRAINT "horarios_atencion_organizacion_dia_check" CHECK ("dia_semana" BETWEEN 1 AND 7),
  CONSTRAINT "horarios_atencion_organizacion_estado_check" CHECK ("estado" IN (0, 1)),
  CONSTRAINT "horarios_atencion_organizacion_horas_check" CHECK (
    ("cerrado" = true AND "hora_apertura" IS NULL AND "hora_cierre" IS NULL)
    OR
    ("cerrado" = false AND "hora_apertura" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' AND "hora_cierre" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' AND "hora_apertura" < "hora_cierre")
  ),
  CONSTRAINT "horarios_atencion_organizacion_fid_organizaciones_fkey"
    FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "horarios_atencion_organizacion_fid_organizaciones_dia_semana_key"
  ON "nucleo"."horarios_atencion_organizacion"("fid_organizaciones", "dia_semana");
CREATE INDEX "horarios_atencion_organizacion_fid_organizaciones_estado_dia_semana_idx"
  ON "nucleo"."horarios_atencion_organizacion"("fid_organizaciones", "estado", "dia_semana");
