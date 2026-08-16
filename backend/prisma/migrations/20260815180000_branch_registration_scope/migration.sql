ALTER TABLE nucleo.sedes
  ADD COLUMN correo_contacto_secundario varchar(120);

UPDATE nucleo.sedes AS s
SET correo_contacto_secundario = p.correo_contacto_secundario
FROM nucleo.perfil_organizacion AS p
WHERE p.fid_organizaciones = s.fid_organizaciones
  AND s.es_principal = true;

ALTER TABLE personas.propietarios
  ADD COLUMN fid_sedes_registro uuid;

ALTER TABLE personas.mascotas
  ADD COLUMN fid_sedes_registro uuid;

UPDATE personas.propietarios AS p
SET fid_sedes_registro = s.id_sedes
FROM nucleo.sedes AS s
WHERE s.fid_organizaciones = p.fid_organizaciones
  AND s.es_principal = true
  AND s.eliminado_en IS NULL;

UPDATE personas.mascotas AS m
SET fid_sedes_registro = s.id_sedes
FROM nucleo.sedes AS s
WHERE s.fid_organizaciones = m.fid_organizaciones
  AND s.es_principal = true
  AND s.eliminado_en IS NULL;

ALTER TABLE personas.propietarios
  ALTER COLUMN fid_sedes_registro SET NOT NULL,
  ADD CONSTRAINT propietarios_sede_registro_fk
    FOREIGN KEY (fid_sedes_registro, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones)
    ON DELETE RESTRICT;

CREATE TABLE nucleo.sedes_especies_atendidas (
  id_sedes_especies_atendidas uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_sedes uuid NOT NULL,
  fid_parametros uuid NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT sedes_especies_atendidas_sede_fk
    FOREIGN KEY (fid_sedes, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones)
    ON DELETE CASCADE,
  CONSTRAINT sedes_especies_atendidas_parametro_fk
    FOREIGN KEY (fid_parametros)
    REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT,
  CONSTRAINT sedes_especies_atendidas_unique
    UNIQUE (fid_sedes, fid_parametros)
);

CREATE INDEX sedes_especies_atendidas_sede_idx
  ON nucleo.sedes_especies_atendidas(fid_organizaciones, fid_sedes, estado);
CREATE INDEX sedes_especies_atendidas_parametro_idx
  ON nucleo.sedes_especies_atendidas(fid_parametros);

INSERT INTO nucleo.sedes_especies_atendidas (
  fid_organizaciones, fid_sedes, fid_parametros, created_by, updated_by
)
SELECT s.fid_organizaciones, s.id_sedes, e.fid_parametros, 'migration', 'migration'
FROM nucleo.sedes AS s
JOIN nucleo.organizaciones_especies_atendidas AS e
  ON e.fid_organizaciones = s.fid_organizaciones
 AND e.estado = 1
WHERE s.estado = 1
  AND s.eliminado_en IS NULL
ON CONFLICT (fid_sedes, fid_parametros) DO NOTHING;

CREATE TRIGGER sedes_especies_atendidas_updated_at
BEFORE UPDATE ON nucleo.sedes_especies_atendidas
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

ALTER TABLE personas.mascotas
  ALTER COLUMN fid_sedes_registro SET NOT NULL,
  ADD CONSTRAINT mascotas_sede_registro_fk
    FOREIGN KEY (fid_sedes_registro, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones)
    ON DELETE RESTRICT;

CREATE INDEX propietarios_sede_registro_listado_idx
  ON personas.propietarios(fid_sedes_registro, eliminado_en, created_at DESC, id_propietarios DESC);

CREATE INDEX mascotas_sede_registro_listado_idx
  ON personas.mascotas(fid_sedes_registro, eliminado_en, created_at DESC, id_mascotas DESC);

UPDATE configuracion.modulos
SET fid_modulos_padre = NULL,
    orden = 112,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'administrator.company.branches';
