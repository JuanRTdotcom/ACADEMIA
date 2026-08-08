ALTER TABLE "nucleo"."perfil_organizacion"
  ADD COLUMN "referencia" VARCHAR(200),
  ADD COLUMN "fid_admin_level_0" UUID,
  ADD COLUMN "fid_admin_level_3" UUID,
  ADD COLUMN "soporte_correo" VARCHAR(120),
  ADD COLUMN "soporte_telefono" VARCHAR(30),
  ADD COLUMN "soporte_whatsapp" VARCHAR(30),
  ADD COLUMN "soporte_url" VARCHAR(200),
  ADD COLUMN "soporte_horario" VARCHAR(160);

CREATE INDEX "perfil_organizacion_fid_admin_level_0_idx"
  ON "nucleo"."perfil_organizacion"("fid_admin_level_0");
CREATE INDEX "perfil_organizacion_fid_admin_level_3_idx"
  ON "nucleo"."perfil_organizacion"("fid_admin_level_3");

ALTER TABLE "nucleo"."perfil_organizacion"
  ADD CONSTRAINT "perfil_organizacion_fid_admin_level_0_fkey"
  FOREIGN KEY ("fid_admin_level_0") REFERENCES "configuracion"."admin_level_0"("id_admin_level_0")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "perfil_organizacion_fid_admin_level_3_fkey"
  FOREIGN KEY ("fid_admin_level_3") REFERENCES "configuracion"."admin_level_3"("id_admin_level_3")
  ON DELETE RESTRICT ON UPDATE CASCADE;
