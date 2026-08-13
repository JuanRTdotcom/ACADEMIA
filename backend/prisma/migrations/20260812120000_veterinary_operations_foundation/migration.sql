CREATE SCHEMA IF NOT EXISTS "facturacion";

ALTER TABLE "personas"."registros_atencion"
  ADD COLUMN "realizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "personas"."registros_atencion" SET "realizado_en" = "created_at";
CREATE INDEX "registros_atencion_organizacion_realizado_idx"
  ON "personas"."registros_atencion"("fid_organizaciones", "realizado_en");

CREATE TABLE "nucleo"."categorias_productos" (
    "id_categorias_productos" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(300),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "categorias_productos_pkey" PRIMARY KEY ("id_categorias_productos")
);

CREATE TABLE "nucleo"."productos" (
    "id_productos" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_categorias_productos" UUID,
    "fid_parametros_tipo" UUID NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "descripcion" VARCHAR(500),
    "sku" VARCHAR(80),
    "codigo_barras" VARCHAR(80),
    "precio_venta" DECIMAL(12,2) NOT NULL,
    "costo_referencia" DECIMAL(12,2),
    "stock_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "controla_lotes" BOOLEAN NOT NULL DEFAULT false,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id_productos")
);

CREATE TABLE "nucleo"."lotes_productos" (
    "id_lotes_productos" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_productos" UUID NOT NULL,
    "numero_lote" VARCHAR(100) NOT NULL,
    "fecha_vencimiento" DATE,
    "costo_unitario" DECIMAL(12,4),
    "cantidad_inicial" DECIMAL(12,3) NOT NULL,
    "cantidad_disponible" DECIMAL(12,3) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "lotes_productos_pkey" PRIMARY KEY ("id_lotes_productos")
);

CREATE TABLE "nucleo"."movimientos_inventario" (
    "id_movimientos_inventario" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_productos" UUID NOT NULL,
    "fid_lotes_productos" UUID,
    "fid_parametros_tipo" UUID NOT NULL,
    "fid_detalles_venta" UUID,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costo_unitario" DECIMAL(12,4),
    "observaciones" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id_movimientos_inventario")
);

CREATE TABLE "nucleo"."ventas" (
    "id_ventas" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_propietarios" UUID,
    "fid_mascotas" UUID,
    "fid_atenciones" UUID,
    "fid_usuarios_responsable" UUID NOT NULL,
    "fid_parametros_estado" UUID NOT NULL,
    "numero" BIGINT NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "saldo" DECIMAL(14,2) NOT NULL,
    "observaciones" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id_ventas")
);

CREATE TABLE "nucleo"."detalles_venta" (
    "id_detalles_venta" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_ventas" UUID NOT NULL,
    "fid_productos" UUID,
    "fid_servicios_veterinaria" UUID,
    "descripcion" VARCHAR(250) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio_unitario" DECIMAL(14,4) NOT NULL,
    "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id_detalles_venta")
);

CREATE TABLE "nucleo"."pagos_venta" (
    "id_pagos_venta" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_ventas" UUID NOT NULL,
    "fid_parametros_metodo" UUID NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "referencia" VARCHAR(120),
    "pagado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "pagos_venta_pkey" PRIMARY KEY ("id_pagos_venta")
);

CREATE TABLE "nucleo"."citas" (
    "id_citas" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_propietarios" UUID,
    "fid_mascotas" UUID,
    "fid_usuarios_responsable" UUID,
    "fid_parametros_estado" UUID NOT NULL,
    "inicia_en" TIMESTAMPTZ(3) NOT NULL,
    "termina_en" TIMESTAMPTZ(3) NOT NULL,
    "motivo" VARCHAR(250) NOT NULL,
    "observaciones" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id_citas")
);

CREATE TABLE "nucleo"."recordatorios" (
    "id_recordatorios" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_propietarios" UUID,
    "fid_mascotas" UUID NOT NULL,
    "fid_parametros_tipo" UUID NOT NULL,
    "fid_parametros_estado" UUID NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "detalle" VARCHAR(500),
    "programado_para" TIMESTAMPTZ(3) NOT NULL,
    "enviado_en" TIMESTAMPTZ(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "recordatorios_pkey" PRIMARY KEY ("id_recordatorios")
);

CREATE TABLE "personas"."documentos_mascota" (
    "id_documentos_mascota" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_mascotas" UUID NOT NULL,
    "fid_parametros_tipo" UUID NOT NULL,
    "fid_archivos_organizacion" UUID,
    "titulo" VARCHAR(180) NOT NULL,
    "entidad_emisora" VARCHAR(180),
    "realizado_en" TIMESTAMPTZ(3) NOT NULL,
    "observaciones" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "documentos_mascota_pkey" PRIMARY KEY ("id_documentos_mascota")
);

CREATE TABLE "facturacion"."series_comprobante" (
    "id_series_comprobante" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_parametros_tipo" UUID NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo_actual" BIGINT NOT NULL DEFAULT 0,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "series_comprobante_pkey" PRIMARY KEY ("id_series_comprobante")
);

CREATE TABLE "facturacion"."comprobantes_electronicos" (
    "id_comprobantes_electronicos" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_ventas" UUID NOT NULL,
    "fid_series_comprobante" UUID NOT NULL,
    "fid_parametros_tipo" UUID NOT NULL,
    "fid_parametros_estado" UUID NOT NULL,
    "fid_parametros_moneda" UUID NOT NULL,
    "serie" VARCHAR(4) NOT NULL,
    "correlativo" BIGINT NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fid_parametros_tipo_documento_cliente" UUID NOT NULL,
    "cliente_numero_documento" VARCHAR(20) NOT NULL,
    "cliente_nombre" VARCHAR(200) NOT NULL,
    "cliente_direccion" VARCHAR(250),
    "subtotal" DECIMAL(14,2) NOT NULL,
    "igv" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "proveedor" VARCHAR(80),
    "identificador_proveedor" VARCHAR(160),
    "clave_xml" VARCHAR(1024),
    "clave_cdr" VARCHAR(1024),
    "codigo_respuesta" VARCHAR(20),
    "mensaje_respuesta" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "eliminado_en" TIMESTAMPTZ(3),
    "eliminado_por" UUID,

    CONSTRAINT "comprobantes_electronicos_pkey" PRIMARY KEY ("id_comprobantes_electronicos")
);

CREATE TABLE "facturacion"."detalles_comprobante" (
    "id_detalles_comprobante" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_comprobantes_electronicos" UUID NOT NULL,
    "fid_detalles_venta" UUID,
    "descripcion" VARCHAR(250) NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio_unitario" DECIMAL(14,4) NOT NULL,
    "valor_venta" DECIMAL(14,2) NOT NULL,
    "igv" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "codigo_producto_sunat" VARCHAR(8),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "detalles_comprobante_pkey" PRIMARY KEY ("id_detalles_comprobante")
);

CREATE TABLE "facturacion"."intentos_envio_comprobante" (
    "id_intentos_envio_comprobante" UUID NOT NULL,
    "fid_organizaciones" UUID NOT NULL,
    "fid_comprobantes_electronicos" UUID NOT NULL,
    "fid_parametros_estado" UUID NOT NULL,
    "proveedor" VARCHAR(80) NOT NULL,
    "solicitud_id" VARCHAR(160),
    "codigo_respuesta" VARCHAR(20),
    "mensaje_respuesta" VARCHAR(500),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "intentos_envio_comprobante_pkey" PRIMARY KEY ("id_intentos_envio_comprobante")
);

CREATE INDEX "categorias_productos_fid_organizaciones_eliminado_en_create_idx" ON "nucleo"."categorias_productos"("fid_organizaciones", "eliminado_en", "created_at");

CREATE UNIQUE INDEX "categorias_productos_id_categorias_productos_fid_organizaci_key" ON "nucleo"."categorias_productos"("id_categorias_productos", "fid_organizaciones");

CREATE INDEX "productos_fid_organizaciones_eliminado_en_created_at_idx" ON "nucleo"."productos"("fid_organizaciones", "eliminado_en", "created_at");

CREATE INDEX "productos_fid_categorias_productos_idx" ON "nucleo"."productos"("fid_categorias_productos");

CREATE INDEX "productos_fid_parametros_tipo_idx" ON "nucleo"."productos"("fid_parametros_tipo");

CREATE UNIQUE INDEX "productos_id_productos_fid_organizaciones_key" ON "nucleo"."productos"("id_productos", "fid_organizaciones");

CREATE INDEX "lotes_productos_fid_productos_fecha_vencimiento_idx" ON "nucleo"."lotes_productos"("fid_productos", "fecha_vencimiento");

CREATE UNIQUE INDEX "lotes_productos_id_lotes_productos_fid_organizaciones_key" ON "nucleo"."lotes_productos"("id_lotes_productos", "fid_organizaciones");

CREATE UNIQUE INDEX "lotes_productos_fid_organizaciones_fid_productos_numero_lot_key" ON "nucleo"."lotes_productos"("fid_organizaciones", "fid_productos", "numero_lote");

CREATE INDEX "movimientos_inventario_fid_organizaciones_created_at_idx" ON "nucleo"."movimientos_inventario"("fid_organizaciones", "created_at");

CREATE INDEX "movimientos_inventario_fid_productos_idx" ON "nucleo"."movimientos_inventario"("fid_productos");

CREATE INDEX "movimientos_inventario_fid_lotes_productos_idx" ON "nucleo"."movimientos_inventario"("fid_lotes_productos");

CREATE INDEX "movimientos_inventario_fid_parametros_tipo_idx" ON "nucleo"."movimientos_inventario"("fid_parametros_tipo");

CREATE INDEX "movimientos_inventario_fid_detalles_venta_idx" ON "nucleo"."movimientos_inventario"("fid_detalles_venta");

CREATE INDEX "ventas_fid_organizaciones_eliminado_en_created_at_idx" ON "nucleo"."ventas"("fid_organizaciones", "eliminado_en", "created_at");

CREATE INDEX "ventas_fid_propietarios_idx" ON "nucleo"."ventas"("fid_propietarios");

CREATE INDEX "ventas_fid_mascotas_idx" ON "nucleo"."ventas"("fid_mascotas");

CREATE INDEX "ventas_fid_atenciones_idx" ON "nucleo"."ventas"("fid_atenciones");

CREATE INDEX "ventas_fid_usuarios_responsable_idx" ON "nucleo"."ventas"("fid_usuarios_responsable");

CREATE INDEX "ventas_fid_parametros_estado_idx" ON "nucleo"."ventas"("fid_parametros_estado");

CREATE UNIQUE INDEX "ventas_id_ventas_fid_organizaciones_key" ON "nucleo"."ventas"("id_ventas", "fid_organizaciones");

CREATE UNIQUE INDEX "ventas_fid_organizaciones_numero_key" ON "nucleo"."ventas"("fid_organizaciones", "numero");

CREATE INDEX "detalles_venta_fid_ventas_idx" ON "nucleo"."detalles_venta"("fid_ventas");

CREATE INDEX "detalles_venta_fid_productos_idx" ON "nucleo"."detalles_venta"("fid_productos");

CREATE INDEX "detalles_venta_fid_servicios_veterinaria_idx" ON "nucleo"."detalles_venta"("fid_servicios_veterinaria");

CREATE UNIQUE INDEX "detalles_venta_id_detalles_venta_fid_organizaciones_key" ON "nucleo"."detalles_venta"("id_detalles_venta", "fid_organizaciones");

CREATE INDEX "pagos_venta_fid_ventas_eliminado_en_created_at_idx" ON "nucleo"."pagos_venta"("fid_ventas", "eliminado_en", "created_at");

CREATE INDEX "pagos_venta_fid_parametros_metodo_idx" ON "nucleo"."pagos_venta"("fid_parametros_metodo");

CREATE INDEX "citas_fid_organizaciones_inicia_en_eliminado_en_idx" ON "nucleo"."citas"("fid_organizaciones", "inicia_en", "eliminado_en");

CREATE INDEX "citas_fid_propietarios_idx" ON "nucleo"."citas"("fid_propietarios");

CREATE INDEX "citas_fid_mascotas_idx" ON "nucleo"."citas"("fid_mascotas");

CREATE INDEX "citas_fid_usuarios_responsable_idx" ON "nucleo"."citas"("fid_usuarios_responsable");

CREATE INDEX "citas_fid_parametros_estado_idx" ON "nucleo"."citas"("fid_parametros_estado");

CREATE UNIQUE INDEX "citas_id_citas_fid_organizaciones_key" ON "nucleo"."citas"("id_citas", "fid_organizaciones");

CREATE INDEX "recordatorios_fid_organizaciones_programado_para_eliminado__idx" ON "nucleo"."recordatorios"("fid_organizaciones", "programado_para", "eliminado_en");

CREATE INDEX "recordatorios_fid_mascotas_idx" ON "nucleo"."recordatorios"("fid_mascotas");

CREATE INDEX "recordatorios_fid_propietarios_idx" ON "nucleo"."recordatorios"("fid_propietarios");

CREATE INDEX "recordatorios_fid_parametros_tipo_idx" ON "nucleo"."recordatorios"("fid_parametros_tipo");

CREATE INDEX "recordatorios_fid_parametros_estado_idx" ON "nucleo"."recordatorios"("fid_parametros_estado");

CREATE UNIQUE INDEX "recordatorios_id_recordatorios_fid_organizaciones_key" ON "nucleo"."recordatorios"("id_recordatorios", "fid_organizaciones");

CREATE INDEX "documentos_mascota_fid_organizaciones_fid_mascotas_realizad_idx" ON "personas"."documentos_mascota"("fid_organizaciones", "fid_mascotas", "realizado_en");

CREATE INDEX "documentos_mascota_fid_parametros_tipo_idx" ON "personas"."documentos_mascota"("fid_parametros_tipo");

CREATE INDEX "documentos_mascota_fid_archivos_organizacion_idx" ON "personas"."documentos_mascota"("fid_archivos_organizacion");

CREATE UNIQUE INDEX "documentos_mascota_id_documentos_mascota_fid_organizaciones_key" ON "personas"."documentos_mascota"("id_documentos_mascota", "fid_organizaciones");

CREATE INDEX "series_comprobante_fid_parametros_tipo_idx" ON "facturacion"."series_comprobante"("fid_parametros_tipo");

CREATE UNIQUE INDEX "series_comprobante_id_series_comprobante_fid_organizaciones_key" ON "facturacion"."series_comprobante"("id_series_comprobante", "fid_organizaciones");

CREATE UNIQUE INDEX "series_comprobante_fid_organizaciones_fid_parametros_tipo_s_key" ON "facturacion"."series_comprobante"("fid_organizaciones", "fid_parametros_tipo", "serie");

CREATE INDEX "comprobantes_electronicos_fid_ventas_idx" ON "facturacion"."comprobantes_electronicos"("fid_ventas");

CREATE INDEX "comprobantes_electronicos_fid_series_comprobante_idx" ON "facturacion"."comprobantes_electronicos"("fid_series_comprobante");

CREATE INDEX "comprobantes_electronicos_fid_parametros_estado_idx" ON "facturacion"."comprobantes_electronicos"("fid_parametros_estado");

CREATE INDEX "comprobantes_electronicos_fid_parametros_tipo_documento_cli_idx" ON "facturacion"."comprobantes_electronicos"("fid_parametros_tipo_documento_cliente");

CREATE UNIQUE INDEX "comprobantes_electronicos_id_comprobantes_electronicos_fid__key" ON "facturacion"."comprobantes_electronicos"("id_comprobantes_electronicos", "fid_organizaciones");

CREATE UNIQUE INDEX "comprobantes_electronicos_fid_organizaciones_fid_parametros_key" ON "facturacion"."comprobantes_electronicos"("fid_organizaciones", "fid_parametros_tipo", "serie", "correlativo");

CREATE INDEX "detalles_comprobante_fid_comprobantes_electronicos_idx" ON "facturacion"."detalles_comprobante"("fid_comprobantes_electronicos");

CREATE INDEX "detalles_comprobante_fid_detalles_venta_idx" ON "facturacion"."detalles_comprobante"("fid_detalles_venta");

CREATE INDEX "intentos_envio_comprobante_fid_comprobantes_electronicos_cr_idx" ON "facturacion"."intentos_envio_comprobante"("fid_comprobantes_electronicos", "created_at");

CREATE INDEX "intentos_envio_comprobante_fid_parametros_estado_idx" ON "facturacion"."intentos_envio_comprobante"("fid_parametros_estado");

ALTER TABLE "nucleo"."categorias_productos" ADD CONSTRAINT "categorias_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."productos" ADD CONSTRAINT "productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."productos" ADD CONSTRAINT "productos_fid_categorias_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_categorias_productos", "fid_organizaciones") REFERENCES "nucleo"."categorias_productos"("id_categorias_productos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."productos" ADD CONSTRAINT "productos_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."lotes_productos" ADD CONSTRAINT "lotes_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."lotes_productos" ADD CONSTRAINT "lotes_productos_fid_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_productos", "fid_organizaciones") REFERENCES "nucleo"."productos"("id_productos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_fid_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_productos", "fid_organizaciones") REFERENCES "nucleo"."productos"("id_productos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_fid_lotes_productos_fid_organizacio_fkey" FOREIGN KEY ("fid_lotes_productos", "fid_organizaciones") REFERENCES "nucleo"."lotes_productos"("id_lotes_productos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_fid_detalles_venta_fid_organizacion_fkey" FOREIGN KEY ("fid_detalles_venta", "fid_organizaciones") REFERENCES "nucleo"."detalles_venta"("id_detalles_venta", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_propietarios_fid_organizaciones_fkey" FOREIGN KEY ("fid_propietarios", "fid_organizaciones") REFERENCES "personas"."propietarios"("id_propietarios", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_mascotas_fid_organizaciones_fkey" FOREIGN KEY ("fid_mascotas", "fid_organizaciones") REFERENCES "personas"."mascotas"("id_mascotas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_atenciones_fid_organizaciones_fkey" FOREIGN KEY ("fid_atenciones", "fid_organizaciones") REFERENCES "personas"."atenciones"("id_atenciones", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_usuarios_responsable_fid_organizaciones_fkey" FOREIGN KEY ("fid_usuarios_responsable", "fid_organizaciones") REFERENCES "seguridad"."usuarios"("id_usuarios", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."ventas" ADD CONSTRAINT "ventas_fid_parametros_estado_fkey" FOREIGN KEY ("fid_parametros_estado") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."detalles_venta" ADD CONSTRAINT "detalles_venta_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."detalles_venta" ADD CONSTRAINT "detalles_venta_fid_ventas_fid_organizaciones_fkey" FOREIGN KEY ("fid_ventas", "fid_organizaciones") REFERENCES "nucleo"."ventas"("id_ventas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."detalles_venta" ADD CONSTRAINT "detalles_venta_fid_productos_fid_organizaciones_fkey" FOREIGN KEY ("fid_productos", "fid_organizaciones") REFERENCES "nucleo"."productos"("id_productos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."detalles_venta" ADD CONSTRAINT "detalles_venta_fid_servicios_veterinaria_fkey" FOREIGN KEY ("fid_servicios_veterinaria") REFERENCES "nucleo"."servicios_veterinaria"("id_servicios_veterinaria") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."pagos_venta" ADD CONSTRAINT "pagos_venta_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."pagos_venta" ADD CONSTRAINT "pagos_venta_fid_ventas_fid_organizaciones_fkey" FOREIGN KEY ("fid_ventas", "fid_organizaciones") REFERENCES "nucleo"."ventas"("id_ventas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."pagos_venta" ADD CONSTRAINT "pagos_venta_fid_parametros_metodo_fkey" FOREIGN KEY ("fid_parametros_metodo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."citas" ADD CONSTRAINT "citas_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."citas" ADD CONSTRAINT "citas_fid_propietarios_fid_organizaciones_fkey" FOREIGN KEY ("fid_propietarios", "fid_organizaciones") REFERENCES "personas"."propietarios"("id_propietarios", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."citas" ADD CONSTRAINT "citas_fid_mascotas_fid_organizaciones_fkey" FOREIGN KEY ("fid_mascotas", "fid_organizaciones") REFERENCES "personas"."mascotas"("id_mascotas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."citas" ADD CONSTRAINT "citas_fid_usuarios_responsable_fid_organizaciones_fkey" FOREIGN KEY ("fid_usuarios_responsable", "fid_organizaciones") REFERENCES "seguridad"."usuarios"("id_usuarios", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."citas" ADD CONSTRAINT "citas_fid_parametros_estado_fkey" FOREIGN KEY ("fid_parametros_estado") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."recordatorios" ADD CONSTRAINT "recordatorios_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."recordatorios" ADD CONSTRAINT "recordatorios_fid_propietarios_fid_organizaciones_fkey" FOREIGN KEY ("fid_propietarios", "fid_organizaciones") REFERENCES "personas"."propietarios"("id_propietarios", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."recordatorios" ADD CONSTRAINT "recordatorios_fid_mascotas_fid_organizaciones_fkey" FOREIGN KEY ("fid_mascotas", "fid_organizaciones") REFERENCES "personas"."mascotas"("id_mascotas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."recordatorios" ADD CONSTRAINT "recordatorios_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "nucleo"."recordatorios" ADD CONSTRAINT "recordatorios_fid_parametros_estado_fkey" FOREIGN KEY ("fid_parametros_estado") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personas"."documentos_mascota" ADD CONSTRAINT "documentos_mascota_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personas"."documentos_mascota" ADD CONSTRAINT "documentos_mascota_fid_mascotas_fid_organizaciones_fkey" FOREIGN KEY ("fid_mascotas", "fid_organizaciones") REFERENCES "personas"."mascotas"("id_mascotas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personas"."documentos_mascota" ADD CONSTRAINT "documentos_mascota_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "personas"."documentos_mascota" ADD CONSTRAINT "documentos_mascota_fid_archivos_organizacion_fkey" FOREIGN KEY ("fid_archivos_organizacion") REFERENCES "nucleo"."archivos_organizacion"("id_archivos_organizacion") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."series_comprobante" ADD CONSTRAINT "series_comprobante_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."series_comprobante" ADD CONSTRAINT "series_comprobante_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_ventas_fid_organizaciones_fkey" FOREIGN KEY ("fid_ventas", "fid_organizaciones") REFERENCES "nucleo"."ventas"("id_ventas", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_series_comprobante_fid_organ_fkey" FOREIGN KEY ("fid_series_comprobante", "fid_organizaciones") REFERENCES "facturacion"."series_comprobante"("id_series_comprobante", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_parametros_tipo_fkey" FOREIGN KEY ("fid_parametros_tipo") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_parametros_estado_fkey" FOREIGN KEY ("fid_parametros_estado") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_parametros_moneda_fkey" FOREIGN KEY ("fid_parametros_moneda") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."comprobantes_electronicos" ADD CONSTRAINT "comprobantes_electronicos_fid_parametros_tipo_documento_cl_fkey" FOREIGN KEY ("fid_parametros_tipo_documento_cliente") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."detalles_comprobante" ADD CONSTRAINT "detalles_comprobante_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."detalles_comprobante" ADD CONSTRAINT "detalles_comprobante_fid_comprobantes_electronicos_fid_org_fkey" FOREIGN KEY ("fid_comprobantes_electronicos", "fid_organizaciones") REFERENCES "facturacion"."comprobantes_electronicos"("id_comprobantes_electronicos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."detalles_comprobante" ADD CONSTRAINT "detalles_comprobante_fid_detalles_venta_fid_organizaciones_fkey" FOREIGN KEY ("fid_detalles_venta", "fid_organizaciones") REFERENCES "nucleo"."detalles_venta"("id_detalles_venta", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."intentos_envio_comprobante" ADD CONSTRAINT "intentos_envio_comprobante_fid_organizaciones_fkey" FOREIGN KEY ("fid_organizaciones") REFERENCES "nucleo"."organizaciones"("id_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."intentos_envio_comprobante" ADD CONSTRAINT "intentos_envio_comprobante_fid_comprobantes_electronicos_f_fkey" FOREIGN KEY ("fid_comprobantes_electronicos", "fid_organizaciones") REFERENCES "facturacion"."comprobantes_electronicos"("id_comprobantes_electronicos", "fid_organizaciones") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "facturacion"."intentos_envio_comprobante" ADD CONSTRAINT "intentos_envio_comprobante_fid_parametros_estado_fkey" FOREIGN KEY ("fid_parametros_estado") REFERENCES "configuracion"."parametros"("id_parametros") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE nucleo.productos ADD CONSTRAINT productos_montos_validos_check
  CHECK (precio_venta >= 0 AND (costo_referencia IS NULL OR costo_referencia >= 0) AND stock_minimo >= 0);
ALTER TABLE nucleo.lotes_productos ADD CONSTRAINT lotes_cantidades_validas_check
  CHECK (cantidad_inicial >= 0 AND cantidad_disponible >= 0 AND cantidad_disponible <= cantidad_inicial);
ALTER TABLE nucleo.detalles_venta ADD CONSTRAINT detalle_venta_origen_check
  CHECK ((fid_productos IS NOT NULL)::int + (fid_servicios_veterinaria IS NOT NULL)::int = 1);
ALTER TABLE nucleo.detalles_venta ADD CONSTRAINT detalle_venta_montos_check
  CHECK (cantidad > 0 AND precio_unitario >= 0 AND descuento >= 0 AND impuesto >= 0 AND total >= 0);
ALTER TABLE nucleo.ventas ADD CONSTRAINT ventas_montos_check
  CHECK (subtotal >= 0 AND descuento >= 0 AND impuesto >= 0 AND total >= 0 AND saldo >= 0 AND saldo <= total);
ALTER TABLE nucleo.pagos_venta ADD CONSTRAINT pagos_monto_check CHECK (monto > 0);
ALTER TABLE nucleo.citas ADD CONSTRAINT citas_rango_check CHECK (termina_en > inicia_en);
ALTER TABLE facturacion.series_comprobante ADD CONSTRAINT series_formato_check CHECK (serie ~ '^[A-Z0-9]{4}$' AND correlativo_actual >= 0);
ALTER TABLE facturacion.comprobantes_electronicos ADD CONSTRAINT comprobantes_montos_check CHECK (correlativo > 0 AND subtotal >= 0 AND igv >= 0 AND total >= 0);

CREATE UNIQUE INDEX categorias_productos_nombre_activo_unique
  ON nucleo.categorias_productos(fid_organizaciones, lower(nombre)) WHERE eliminado_en IS NULL;
CREATE UNIQUE INDEX productos_sku_activo_unique
  ON nucleo.productos(fid_organizaciones, lower(sku)) WHERE eliminado_en IS NULL AND sku IS NOT NULL;
CREATE UNIQUE INDEX productos_codigo_barras_activo_unique
  ON nucleo.productos(fid_organizaciones, codigo_barras) WHERE eliminado_en IS NULL AND codigo_barras IS NOT NULL;
DO $actualizaciones$
DECLARE tabla regclass;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'nucleo.categorias_productos'::regclass, 'nucleo.productos'::regclass,
    'nucleo.lotes_productos'::regclass, 'nucleo.movimientos_inventario'::regclass,
    'nucleo.ventas'::regclass, 'nucleo.detalles_venta'::regclass,
    'nucleo.pagos_venta'::regclass, 'nucleo.citas'::regclass,
    'nucleo.recordatorios'::regclass, 'personas.documentos_mascota'::regclass,
    'facturacion.series_comprobante'::regclass,
    'facturacion.comprobantes_electronicos'::regclass,
    'facturacion.detalles_comprobante'::regclass,
    'facturacion.intentos_envio_comprobante'::regclass
  ] LOOP
    EXECUTE format('CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at()', tabla);
  END LOOP;
END
$actualizaciones$;

WITH catalogo(grupo, codigo, etiqueta, orden) AS (
  VALUES
    ('tipos_producto','medicamento','Medicamento',10),
    ('tipos_producto','alimento','Alimento',20),
    ('tipos_producto','accesorio','Accesorio o juguete',30),
    ('tipos_producto','insumo','Insumo clínico',40),
    ('tipos_producto','otro','Otro',999),
    ('tipos_movimiento_inventario','entrada','Entrada',10),
    ('tipos_movimiento_inventario','ajuste_positivo','Ajuste positivo',20),
    ('tipos_movimiento_inventario','venta','Venta',30),
    ('tipos_movimiento_inventario','consumo_interno','Consumo interno',40),
    ('tipos_movimiento_inventario','merma','Merma',50),
    ('tipos_movimiento_inventario','ajuste_negativo','Ajuste negativo',60),
    ('estados_venta','pendiente','Pendiente de pago',10),
    ('estados_venta','pagada','Pagada',20),
    ('estados_venta','parcial','Pago parcial',30),
    ('estados_venta','anulada','Anulada',40),
    ('metodos_pago','efectivo','Efectivo',10),
    ('metodos_pago','tarjeta','Tarjeta',20),
    ('metodos_pago','transferencia','Transferencia bancaria',30),
    ('metodos_pago','yape','Yape',40),
    ('metodos_pago','plin','Plin',50),
    ('metodos_pago','otro','Otro',999),
    ('estados_cita','solicitada','Solicitada',10),
    ('estados_cita','confirmada','Confirmada',20),
    ('estados_cita','en_espera','En espera',30),
    ('estados_cita','atendida','Atendida',40),
    ('estados_cita','cancelada','Cancelada',50),
    ('estados_cita','no_asistio','No asistió',60),
    ('tipos_recordatorio','vacuna','Vacuna',10),
    ('tipos_recordatorio','control','Control clínico',20),
    ('tipos_recordatorio','desparasitacion','Desparasitación',30),
    ('tipos_recordatorio','recompra','Recompra de producto',40),
    ('tipos_recordatorio','cita','Cita',50),
    ('tipos_recordatorio','otro','Otro',999),
    ('estados_recordatorio','pendiente','Pendiente',10),
    ('estados_recordatorio','enviado','Enviado',20),
    ('estados_recordatorio','cancelado','Cancelado',30),
    ('tipos_documento_mascota','historia_externa','Historia clínica externa',10),
    ('tipos_documento_mascota','resultado','Resultado o informe',20),
    ('tipos_documento_mascota','consentimiento','Consentimiento',30),
    ('tipos_documento_mascota','certificado','Certificado',40),
    ('tipos_documento_mascota','otro','Otro',999),
    ('tipos_comprobante_electronico','factura','Factura electrónica',10),
    ('tipos_comprobante_electronico','boleta','Boleta de venta electrónica',20),
    ('tipos_comprobante_electronico','nota_credito','Nota de crédito electrónica',30),
    ('tipos_comprobante_electronico','nota_debito','Nota de débito electrónica',40),
    ('estados_comprobante_electronico','borrador','Borrador',10),
    ('estados_comprobante_electronico','pendiente_envio','Pendiente de envío',20),
    ('estados_comprobante_electronico','aceptado','Aceptado',30),
    ('estados_comprobante_electronico','observado','Aceptado con observaciones',40),
    ('estados_comprobante_electronico','rechazado','Rechazado',50),
    ('estados_comprobante_electronico','anulado','Anulado',60),
    ('estados_envio_comprobante','pendiente','Pendiente',10),
    ('estados_envio_comprobante','enviado','Enviado',20),
    ('estados_envio_comprobante','respondido','Respondido',30),
    ('estados_envio_comprobante','fallido','Fallido',40)
)
INSERT INTO configuracion.parametros (id_parametros,codigo_grupo,codigo,etiqueta,orden,estado,created_by,updated_by)
SELECT gen_random_uuid(),grupo,codigo,etiqueta,orden,1,'migration','migration' FROM catalogo
ON CONFLICT (codigo_grupo,codigo) DO UPDATE SET etiqueta=EXCLUDED.etiqueta,orden=EXCLUDED.orden,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO configuracion.parametros_traducciones
  (id_parametros_traducciones,fid_parametros,codigo_idioma,etiqueta,created_by,updated_by)
SELECT gen_random_uuid(),p.id_parametros,'es',p.etiqueta,'migration','migration'
FROM configuracion.parametros p
WHERE p.codigo_grupo IN ('tipos_producto','tipos_movimiento_inventario','estados_venta','metodos_pago','estados_cita','tipos_recordatorio','estados_recordatorio','tipos_documento_mascota','tipos_comprobante_electronico','estados_comprobante_electronico','estados_envio_comprobante')
ON CONFLICT (fid_parametros,codigo_idioma) DO UPDATE SET etiqueta=EXCLUDED.etiqueta,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

WITH nuevos(codigo,nombre,descripcion,icono,ruta,orden) AS (
  VALUES
    ('operations.sales','Ventas','Registra ventas, pagos y cuentas pendientes.','shopping-cart','/operations/sales',400),
    ('operations.inventory','Inventario','Administra productos, lotes, vencimientos y kardex.','package-search','/operations/inventory',410),
    ('operations.appointments','Agenda y citas','Organiza solicitudes y citas de la veterinaria.','calendar-days','/operations/appointments',420),
    ('operations.reminders','Recordatorios','Programa avisos clínicos y de recompra.','bell-ring','/operations/reminders',430),
    ('operations.billing','Facturación electrónica','Prepara comprobantes electrónicos para Perú.','receipt-text','/operations/billing',440),
    ('operations.reports','Reportes','Resume la operación clínica y comercial.','chart-no-axes-combined','/operations/reports',450)
)
INSERT INTO configuracion.modulos (id_modulos,codigo,nombre,descripcion,icono,ruta,orden,estado,created_by,updated_by)
SELECT gen_random_uuid(),codigo,nombre,descripcion,icono,ruta,orden,1,'migration','migration' FROM nuevos
ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre,descripcion=EXCLUDED.descripcion,icono=EXCLUDED.icono,ruta=EXCLUDED.ruta,orden=EXCLUDED.orden,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

WITH capacidades(modulo,accion,descripcion) AS (
  VALUES
    ('operations.sales','read','Ventas: Ver'),('operations.sales','create','Ventas: Crear'),('operations.sales','update','Ventas: Actualizar'),('operations.sales','delete','Ventas: Eliminar'),
    ('operations.inventory','read','Inventario: Ver'),('operations.inventory','create','Inventario: Crear'),('operations.inventory','update','Inventario: Actualizar'),('operations.inventory','delete','Inventario: Eliminar'),
    ('operations.appointments','read','Agenda: Ver'),('operations.appointments','create','Agenda: Crear'),('operations.appointments','update','Agenda: Actualizar'),('operations.appointments','delete','Agenda: Eliminar'),
    ('operations.reminders','read','Recordatorios: Ver'),('operations.reminders','create','Recordatorios: Crear'),('operations.reminders','update','Recordatorios: Actualizar'),('operations.reminders','delete','Recordatorios: Eliminar'),
    ('operations.billing','read','Facturación electrónica: Ver'),('operations.billing','create','Facturación electrónica: Crear'),('operations.billing','update','Facturación electrónica: Actualizar'),('operations.billing','delete','Facturación electrónica: Eliminar'),
    ('operations.reports','read','Reportes: Ver')
)
INSERT INTO seguridad.permisos (id_permisos,fid_modulos,codigo,accion,descripcion,estado,created_by,updated_by)
SELECT gen_random_uuid(),m.id_modulos,c.modulo||'.'||c.accion,c.accion,c.descripcion,1,'migration','migration'
FROM capacidades c JOIN configuracion.modulos m ON m.codigo=c.modulo
ON CONFLICT (codigo) DO UPDATE SET fid_modulos=EXCLUDED.fid_modulos,accion=EXCLUDED.accion,descripcion=EXCLUDED.descripcion,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO configuracion.planes_modulos (id_planes_modulos,fid_planes,fid_modulos,estado,created_by,updated_by)
SELECT gen_random_uuid(),p.id_planes,m.id_modulos,1,'migration','migration'
FROM configuracion.planes p CROSS JOIN configuracion.modulos m
WHERE p.estado=1 AND p.eliminado_en IS NULL AND m.codigo LIKE 'operations.%'
ON CONFLICT (fid_planes,fid_modulos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO seguridad.roles_permisos (id_roles_permisos,fid_roles,fid_permisos,estado,created_by,updated_by)
SELECT gen_random_uuid(),r.id_roles,p.id_permisos,1,'migration','migration'
FROM seguridad.roles r CROSS JOIN seguridad.permisos p
WHERE r.codigo IN ('ADMIN','SUPERADMIN') AND r.eliminado_en IS NULL AND p.codigo LIKE 'operations.%'
ON CONFLICT (fid_roles,fid_permisos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
