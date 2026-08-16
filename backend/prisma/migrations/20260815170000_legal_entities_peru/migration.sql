-- La organización es el tenant; la entidad legal es el límite fiscal y la sede
-- es el límite operativo. Perú/SUNAT es el primer proveedor, sin incrustarlo en sedes.
CREATE TABLE configuracion.proveedores_fiscales (
  id_proveedores_fiscales uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_admin_level_0 uuid NOT NULL,
  codigo varchar(40) NOT NULL,
  nombre varchar(120) NOT NULL,
  clave_adaptador varchar(80) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT proveedores_fiscales_pais_fk FOREIGN KEY (fid_admin_level_0)
    REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT proveedores_fiscales_codigo_uk UNIQUE (codigo),
  CONSTRAINT proveedores_fiscales_adaptador_uk UNIQUE (clave_adaptador),
  CONSTRAINT proveedores_fiscales_estado_ck CHECK (estado IN (0, 1))
);
CREATE INDEX proveedores_fiscales_pais_idx
  ON configuracion.proveedores_fiscales(fid_admin_level_0, estado);

CREATE TABLE configuracion.tipos_identificacion_fiscal (
  id_tipos_identificacion_fiscal uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_admin_level_0 uuid NOT NULL,
  codigo varchar(30) NOT NULL,
  nombre varchar(80) NOT NULL,
  patron varchar(200),
  longitud_minima integer,
  longitud_maxima integer,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT tipos_identificacion_fiscal_pais_fk FOREIGN KEY (fid_admin_level_0)
    REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT tipos_identificacion_fiscal_pais_codigo_uk UNIQUE (fid_admin_level_0, codigo),
  CONSTRAINT tipos_identificacion_fiscal_estado_ck CHECK (estado IN (0, 1)),
  CONSTRAINT tipos_identificacion_fiscal_longitud_ck CHECK (
    longitud_minima IS NULL OR longitud_maxima IS NULL OR
    (longitud_minima > 0 AND longitud_maxima >= longitud_minima)
  )
);
CREATE INDEX tipos_identificacion_fiscal_pais_idx
  ON configuracion.tipos_identificacion_fiscal(fid_admin_level_0, estado);

INSERT INTO configuracion.proveedores_fiscales
  (fid_admin_level_0, codigo, nombre, clave_adaptador, created_by, updated_by)
SELECT id_admin_level_0, 'SUNAT', 'SUNAT', 'sunat_peru', 'migration', 'migration'
FROM configuracion.admin_level_0 WHERE codigo_iso2 = 'PE'
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = 1, updated_by = 'migration';

INSERT INTO configuracion.tipos_identificacion_fiscal
  (fid_admin_level_0, codigo, nombre, patron, longitud_minima, longitud_maxima, created_by, updated_by)
SELECT id_admin_level_0, 'RUC', 'RUC', '^[0-9]{11}$', 11, 11, 'migration', 'migration'
FROM configuracion.admin_level_0 WHERE codigo_iso2 = 'PE'
ON CONFLICT (fid_admin_level_0, codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, patron = EXCLUDED.patron,
  longitud_minima = EXCLUDED.longitud_minima, longitud_maxima = EXCLUDED.longitud_maxima,
  estado = 1, updated_by = 'migration';

CREATE TABLE nucleo.entidades_legales (
  id_entidades_legales uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  codigo varchar(30) NOT NULL,
  es_principal boolean NOT NULL DEFAULT false,
  fid_admin_level_0 uuid NOT NULL,
  fid_tipos_identificacion_fiscal uuid,
  numero_identificacion_fiscal varchar(30),
  razon_social varchar(150),
  fid_parametros_tipo_persona uuid,
  fid_parametros_responsabilidad_fiscal uuid,
  fid_parametros_moneda uuid NOT NULL,
  fid_proveedores_fiscales uuid,
  afecto_impuesto boolean NOT NULL DEFAULT false,
  direccion_fiscal varchar(250),
  telefono_fiscal varchar(30),
  correo_fiscal varchar(120),
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT entidades_legales_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_pais_fk FOREIGN KEY (fid_admin_level_0)
    REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_tipo_identificacion_fk FOREIGN KEY (fid_tipos_identificacion_fiscal)
    REFERENCES configuracion.tipos_identificacion_fiscal(id_tipos_identificacion_fiscal) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_tipo_persona_fk FOREIGN KEY (fid_parametros_tipo_persona)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_responsabilidad_fk FOREIGN KEY (fid_parametros_responsabilidad_fiscal)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_moneda_fk FOREIGN KEY (fid_parametros_moneda)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_proveedor_fk FOREIGN KEY (fid_proveedores_fiscales)
    REFERENCES configuracion.proveedores_fiscales(id_proveedores_fiscales) ON DELETE RESTRICT,
  CONSTRAINT entidades_legales_tenant_uk UNIQUE (id_entidades_legales, fid_organizaciones),
  CONSTRAINT entidades_legales_codigo_uk UNIQUE (fid_organizaciones, codigo),
  CONSTRAINT entidades_legales_estado_ck CHECK (estado IN (0, 1))
);
CREATE UNIQUE INDEX entidades_legales_principal_activa_uk
  ON nucleo.entidades_legales(fid_organizaciones)
  WHERE es_principal AND eliminado_en IS NULL;
CREATE INDEX entidades_legales_listado_idx
  ON nucleo.entidades_legales(fid_organizaciones, eliminado_en, estado);

INSERT INTO nucleo.entidades_legales (
  fid_organizaciones, codigo, es_principal, fid_admin_level_0,
  fid_tipos_identificacion_fiscal, numero_identificacion_fiscal, razon_social,
  fid_parametros_tipo_persona, fid_parametros_responsabilidad_fiscal,
  fid_parametros_moneda, fid_proveedores_fiscales, afecto_impuesto,
  direccion_fiscal, telefono_fiscal, correo_fiscal, created_by, updated_by
)
SELECT o.id_organizaciones, 'PRINCIPAL', true, pais.id_admin_level_0,
  tipo.id_tipos_identificacion_fiscal,
  COALESCE(p.fiscal_numero_documento, p.ruc_nif),
  COALESCE(p.fiscal_razon_social, p.razon_social, o.nombre),
  p.fid_parametros_tipo_persona_fiscal,
  p.fid_parametros_responsabilidad_fiscal,
  p.fid_parametros_moneda,
  proveedor.id_proveedores_fiscales,
  p.fiscal_afecto_igv,
  p.fiscal_direccion, p.fiscal_telefono, p.fiscal_correo,
  'migration', 'migration'
FROM nucleo.organizaciones o
JOIN nucleo.perfil_organizacion p ON p.fid_organizaciones = o.id_organizaciones
JOIN configuracion.admin_level_0 pais ON pais.codigo_iso2 = 'PE'
LEFT JOIN configuracion.tipos_identificacion_fiscal tipo
  ON tipo.fid_admin_level_0 = pais.id_admin_level_0 AND tipo.codigo = 'RUC'
LEFT JOIN configuracion.proveedores_fiscales proveedor
  ON proveedor.fid_admin_level_0 = pais.id_admin_level_0 AND proveedor.codigo = 'SUNAT';

ALTER TABLE nucleo.sedes
  ADD COLUMN fid_entidades_legales uuid,
  ADD COLUMN fid_parametros_idioma uuid,
  ADD COLUMN fid_zonas_horarias uuid;

UPDATE nucleo.sedes sede SET
  fid_entidades_legales = entidad.id_entidades_legales,
  fid_parametros_idioma = perfil.fid_parametros_idioma,
  fid_zonas_horarias = perfil.fid_zonas_horarias
FROM nucleo.entidades_legales entidad
JOIN nucleo.perfil_organizacion perfil
  ON perfil.fid_organizaciones = entidad.fid_organizaciones
WHERE entidad.es_principal
  AND sede.fid_organizaciones = entidad.fid_organizaciones;

ALTER TABLE nucleo.sedes
  ALTER COLUMN fid_entidades_legales SET NOT NULL,
  ALTER COLUMN fid_parametros_idioma SET NOT NULL,
  ALTER COLUMN fid_zonas_horarias SET NOT NULL,
  ADD CONSTRAINT sedes_entidad_legal_fk FOREIGN KEY (fid_entidades_legales, fid_organizaciones)
    REFERENCES nucleo.entidades_legales(id_entidades_legales, fid_organizaciones) ON DELETE RESTRICT,
  ADD CONSTRAINT sedes_idioma_fk FOREIGN KEY (fid_parametros_idioma)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  ADD CONSTRAINT sedes_zona_horaria_fk FOREIGN KEY (fid_zonas_horarias)
    REFERENCES system.zonas_horarias(id_zonas_horarias) ON DELETE RESTRICT;
CREATE INDEX sedes_entidad_legal_idx ON nucleo.sedes(fid_entidades_legales);

ALTER TABLE facturacion.series_comprobante
  ADD COLUMN fid_entidades_legales uuid,
  ADD COLUMN fid_sedes uuid;
UPDATE facturacion.series_comprobante serie SET
  fid_entidades_legales = entidad.id_entidades_legales,
  fid_sedes = sede.id_sedes
FROM nucleo.entidades_legales entidad
JOIN nucleo.sedes sede ON sede.fid_entidades_legales = entidad.id_entidades_legales AND sede.es_principal
WHERE serie.fid_organizaciones = entidad.fid_organizaciones;
ALTER TABLE facturacion.series_comprobante
  ALTER COLUMN fid_entidades_legales SET NOT NULL,
  ALTER COLUMN fid_sedes SET NOT NULL,
  ADD CONSTRAINT series_comprobante_entidad_legal_fk FOREIGN KEY (fid_entidades_legales, fid_organizaciones)
    REFERENCES nucleo.entidades_legales(id_entidades_legales, fid_organizaciones) ON DELETE RESTRICT,
  ADD CONSTRAINT series_comprobante_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT;
DROP INDEX IF EXISTS facturacion."series_comprobante_fid_organizaciones_fid_parametros_tipo_s_key";
CREATE UNIQUE INDEX series_comprobante_entidad_sede_tipo_serie_uk
  ON facturacion.series_comprobante(fid_entidades_legales, fid_sedes, fid_parametros_tipo, serie);
CREATE INDEX series_comprobante_entidad_idx ON facturacion.series_comprobante(fid_entidades_legales);
CREATE INDEX series_comprobante_sede_idx ON facturacion.series_comprobante(fid_sedes);

ALTER TABLE facturacion.comprobantes_electronicos
  ADD COLUMN fid_entidades_legales uuid,
  ADD COLUMN fid_sedes uuid;
UPDATE facturacion.comprobantes_electronicos comprobante SET
  fid_entidades_legales = sede.fid_entidades_legales,
  fid_sedes = venta.fid_sedes
FROM nucleo.ventas venta
JOIN nucleo.sedes sede ON sede.id_sedes = venta.fid_sedes
WHERE comprobante.fid_ventas = venta.id_ventas
  AND comprobante.fid_organizaciones = venta.fid_organizaciones;
ALTER TABLE facturacion.comprobantes_electronicos
  ALTER COLUMN fid_entidades_legales SET NOT NULL,
  ALTER COLUMN fid_sedes SET NOT NULL,
  ADD CONSTRAINT comprobantes_entidad_legal_fk FOREIGN KEY (fid_entidades_legales, fid_organizaciones)
    REFERENCES nucleo.entidades_legales(id_entidades_legales, fid_organizaciones) ON DELETE RESTRICT,
  ADD CONSTRAINT comprobantes_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT;
DROP INDEX IF EXISTS facturacion."comprobantes_electronicos_fid_organizaciones_fid_parametros_key";
CREATE UNIQUE INDEX comprobantes_entidad_tipo_serie_correlativo_uk
  ON facturacion.comprobantes_electronicos(fid_entidades_legales, fid_parametros_tipo, serie, correlativo);
CREATE INDEX comprobantes_entidad_idx ON facturacion.comprobantes_electronicos(fid_entidades_legales);
CREATE INDEX comprobantes_sede_idx ON facturacion.comprobantes_electronicos(fid_sedes);

DO $$ DECLARE tabla regclass; BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'configuracion.proveedores_fiscales'::regclass,
    'configuracion.tipos_identificacion_fiscal'::regclass,
    'nucleo.entidades_legales'::regclass
  ] LOOP
    EXECUTE format('CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at()', tabla);
  END LOOP;
END $$;
