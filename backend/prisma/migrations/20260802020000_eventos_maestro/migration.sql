-- Catálogo técnico y versionado de los eventos funcionales permitidos.
CREATE TABLE eventos.eventos_maestro (
  id_eventos_maestro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  tipo_agregado TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  visible_actividad BOOLEAN NOT NULL DEFAULT FALSE,
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT eventos_maestro_codigo_version_key UNIQUE (codigo, version),
  CONSTRAINT eventos_maestro_version_positiva CHECK (version > 0),
  CONSTRAINT eventos_maestro_estado_valido CHECK (estado IN (0, 1))
);

CREATE INDEX eventos_maestro_tipo_agregado_idx
  ON eventos.eventos_maestro(tipo_agregado);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON eventos.eventos_maestro
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

-- Los contratos aprobados existen desde la migración para poder relacionar filas
-- anteriores antes de ejecutar el seed de aplicación.
INSERT INTO eventos.eventos_maestro
  (codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
VALUES
  (
    'autenticacion.ingreso.exito',
    'usuarios',
    'Inicio de sesión exitoso',
    'El usuario inició sesión correctamente.',
    1,
    TRUE,
    1
  ),
  (
    'autenticacion.cierre.exito',
    'sesiones',
    'Cierre de sesión',
    'El usuario cerró una sesión activa.',
    1,
    TRUE,
    1
  ),
  (
    'perfil.apariencia.actualizada',
    'preferencias_usuario',
    'Apariencia actualizada',
    'El usuario cambió su región o zona horaria.',
    1,
    TRUE,
    1
  );

-- Conserva eventos históricos desconocidos. Quedan inactivos y no visibles: no
-- podrán emitirse de nuevo, pero tampoco se destruye información preexistente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM eventos.eventos
    GROUP BY tipo_evento, version
    HAVING COUNT(DISTINCT tipo_agregado) > 1
  ) THEN
    RAISE EXCEPTION
      'Un mismo tipo_evento/version tiene más de un tipo_agregado';
  END IF;
END $$;

INSERT INTO eventos.eventos_maestro
  (codigo, tipo_agregado, nombre, descripcion, version, visible_actividad, estado)
SELECT DISTINCT
  evento.tipo_evento,
  evento.tipo_agregado,
  evento.tipo_evento,
  'Contrato histórico migrado automáticamente.',
  evento.version,
  FALSE,
  0
FROM eventos.eventos AS evento
ON CONFLICT (codigo, version) DO NOTHING;

ALTER TABLE eventos.eventos
  ADD COLUMN fid_eventos_maestro UUID;

UPDATE eventos.eventos AS evento
SET fid_eventos_maestro = maestro.id_eventos_maestro
FROM eventos.eventos_maestro AS maestro
WHERE maestro.codigo = evento.tipo_evento
  AND maestro.version = evento.version;

ALTER TABLE eventos.eventos
  ALTER COLUMN fid_eventos_maestro SET NOT NULL,
  ADD CONSTRAINT eventos_fid_eventos_maestro_fkey
    FOREIGN KEY (fid_eventos_maestro)
    REFERENCES eventos.eventos_maestro(id_eventos_maestro)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT;

DROP INDEX eventos.eventos_tipo_agregado_id_agregado_idx;

ALTER TABLE eventos.eventos
  DROP COLUMN tipo_agregado,
  DROP COLUMN tipo_evento,
  DROP COLUMN version;

CREATE INDEX eventos_fid_eventos_maestro_id_agregado_idx
  ON eventos.eventos(fid_eventos_maestro, id_agregado);
