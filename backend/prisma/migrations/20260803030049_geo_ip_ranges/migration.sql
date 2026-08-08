-- Rangos de IP pública → ubicación (país/región), referenciando la jerarquía
-- territorial. Se llena/actualiza fácil (p. ej. exportar GeoLite2 a filas).
-- Las IP locales/privadas NO se guardan aquí: la consulta las detecta aparte.

-- CreateTable
CREATE TABLE "system"."rangos_geo_ip" (
    "id_rangos_geo_ip" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ip_inicio" inet NOT NULL,
    "ip_fin" inet NOT NULL,
    "fid_admin_level_0" UUID,
    "fid_admin_level_1" UUID,
    "ciudad" VARCHAR(120),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,

    CONSTRAINT "rangos_geo_ip_pkey" PRIMARY KEY ("id_rangos_geo_ip"),
    CONSTRAINT "rangos_geo_ip_rango_valido" CHECK ("ip_fin" >= "ip_inicio"),
    CONSTRAINT "rangos_geo_ip_ubicacion_presente" CHECK ("fid_admin_level_0" IS NOT NULL OR "ciudad" IS NOT NULL)
);

-- CreateIndex
CREATE INDEX "rangos_geo_ip_fid_admin_level_0_idx" ON "system"."rangos_geo_ip"("fid_admin_level_0");
CREATE INDEX "rangos_geo_ip_fid_admin_level_1_idx" ON "system"."rangos_geo_ip"("fid_admin_level_1");
-- Búsqueda por contención de IP: ip_inicio <= ip <= ip_fin.
CREATE INDEX "rangos_geo_ip_rango_idx" ON "system"."rangos_geo_ip"("ip_inicio", "ip_fin");

-- AddForeignKey
ALTER TABLE "system"."rangos_geo_ip" ADD CONSTRAINT "rangos_geo_ip_fid_admin_level_0_fkey" FOREIGN KEY ("fid_admin_level_0") REFERENCES "configuracion"."admin_level_0"("id_admin_level_0") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "system"."rangos_geo_ip" ADD CONSTRAINT "rangos_geo_ip_fid_admin_level_1_fkey" FOREIGN KEY ("fid_admin_level_1") REFERENCES "configuracion"."admin_level_1"("id_admin_level_1") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conversión segura texto → inet: NULL si el valor no es una IP válida.
-- Evita que la consulta de sesiones falle si `sesiones.ip` trae algo no-IP.
CREATE OR REPLACE FUNCTION "system"."a_inet"(txt text)
RETURNS inet
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
  RETURN txt::inet;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;
