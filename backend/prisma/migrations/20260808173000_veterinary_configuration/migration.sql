-- Datos propios de la veterinaria. Se preservan los datos existentes y se
-- completan las columnas que ya podían existir en instalaciones locales.
ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN IF NOT EXISTS servicios_ofrecidos text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS fiscal_afecto_igv boolean NOT NULL DEFAULT false;

ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN IF NOT EXISTS latitud numeric(10,8),
  ADD COLUMN IF NOT EXISTS longitud numeric(11,8),
  ADD COLUMN IF NOT EXISTS especies_atendidas text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS precio_consulta numeric(10,2),
  ADD COLUMN IF NOT EXISTS es_24_horas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codigo_moneda varchar(10) NOT NULL DEFAULT 'PEN',
  ADD COLUMN IF NOT EXISTS fiscal_tipo_persona varchar(20),
  ADD COLUMN IF NOT EXISTS fiscal_tipo_documento varchar(20),
  ADD COLUMN IF NOT EXISTS fiscal_numero_documento varchar(30),
  ADD COLUMN IF NOT EXISTS fiscal_razon_social varchar(150),
  ADD COLUMN IF NOT EXISTS fiscal_regimen varchar(100),
  ADD COLUMN IF NOT EXISTS fiscal_direccion varchar(250),
  ADD COLUMN IF NOT EXISTS fiscal_telefono varchar(30),
  ADD COLUMN IF NOT EXISTS fiscal_correo varchar(120);

ALTER TABLE nucleo.organizaciones
  ADD COLUMN IF NOT EXISTS duracion_cita_estimada integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS agenda_activa boolean NOT NULL DEFAULT true;

ALTER TABLE nucleo.horarios_atencion_organizacion
  ADD COLUMN IF NOT EXISTS turno integer NOT NULL DEFAULT 1;

ALTER TABLE nucleo.horarios_atencion_organizacion
  DROP CONSTRAINT IF EXISTS horarios_atencion_organizacion_fid_organizaciones_dia_semana_key;
CREATE UNIQUE INDEX IF NOT EXISTS horarios_atencion_organizacion_turno_key
  ON nucleo.horarios_atencion_organizacion (fid_organizaciones, dia_semana, turno);
