CREATE INDEX "productos_cursor_idx"
ON "nucleo"."productos" ("fid_organizaciones", "eliminado_en", "created_at" DESC, "id_productos" DESC);

CREATE INDEX "ventas_cursor_idx"
ON "nucleo"."ventas" ("fid_organizaciones", "eliminado_en", "created_at" DESC, "id_ventas" DESC);

CREATE INDEX "comprobantes_electronicos_cursor_idx"
ON "facturacion"."comprobantes_electronicos" ("fid_organizaciones", "eliminado_en", "created_at" DESC, "id_comprobantes_electronicos" DESC);
