CREATE INDEX "propietarios_cursor_idx"
ON "personas"."propietarios" ("fid_organizaciones", "eliminado_en", "created_at" DESC, "id_propietarios" DESC);

CREATE INDEX "mascotas_cursor_idx"
ON "personas"."mascotas" ("fid_organizaciones", "eliminado_en", "created_at" DESC, "id_mascotas" DESC);

CREATE INDEX "atenciones_listado_cursor_idx"
ON "personas"."atenciones" ("fid_organizaciones", "eliminado_en", "fecha_atencion" DESC, "llegada_en" DESC, "id_atenciones" DESC);
