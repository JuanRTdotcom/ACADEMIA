ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN escudo_url TEXT,
  ADD COLUMN imagotipo_url TEXT,
  ADD COLUMN login_mostrar_panel BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN login_mostrar_etiqueta BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN login_mostrar_destacados BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN login_mostrar_comunidad BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN login_mostrar_recuperar BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN login_mostrar_recordar BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN login_mostrar_google BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN login_mostrar_sso BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN login_mostrar_solicitud BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN login_mostrar_pie BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN login_etiqueta VARCHAR(60),
  ADD COLUMN login_titulo VARCHAR(120),
  ADD COLUMN login_subtitulo VARCHAR(240),
  ADD COLUMN login_destacado_1 VARCHAR(120),
  ADD COLUMN login_destacado_2 VARCHAR(120),
  ADD COLUMN login_destacado_3 VARCHAR(120),
  ADD COLUMN login_texto_comunidad VARCHAR(120),
  ADD COLUMN login_bienvenida_titulo VARCHAR(80),
  ADD COLUMN login_bienvenida_subtitulo VARCHAR(160),
  ADD COLUMN login_pie VARCHAR(160);

CREATE TABLE nucleo.imagenes_login_organizacion (
  id_imagenes_login_organizacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones UUID NOT NULL,
  clave_objeto TEXT NOT NULL UNIQUE,
  orden INTEGER NOT NULL,
  texto_alternativo VARCHAR(120),
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT imagenes_login_organizacion_fid_organizaciones_fkey
    FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT imagenes_login_organizacion_fid_organizaciones_orden_key
    UNIQUE (fid_organizaciones, orden)
);

CREATE INDEX imagenes_login_organizacion_fid_organizaciones_estado_orden_idx
  ON nucleo.imagenes_login_organizacion(fid_organizaciones, estado, orden);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON nucleo.imagenes_login_organizacion
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
