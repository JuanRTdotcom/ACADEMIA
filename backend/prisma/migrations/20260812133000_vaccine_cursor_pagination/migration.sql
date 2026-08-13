CREATE INDEX "vacunas_cursor_idx"
ON "nucleo"."vacunas" (
  "fid_organizaciones",
  "eliminado_en",
  "created_at" DESC,
  "id_vacunas" DESC
);
