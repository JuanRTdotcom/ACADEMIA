-- La configuración veterinaria referencia maestros por UUID. Los códigos
-- quedan como identificadores funcionales administrables en el maestro.
INSERT INTO configuracion.parametros
  (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado, created_by, updated_by)
VALUES
  (gen_random_uuid(), 'idiomas', 'es', 'Español', 10, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'idiomas', 'en', 'Inglés', 20, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'monedas', 'PEN', 'Sol peruano (PEN)', 10, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'monedas', 'USD', 'Dólar estadounidense (USD)', 20, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'monedas', 'EUR', 'Euro (EUR)', 30, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'monedas', 'MXN', 'Peso mexicano (MXN)', 40, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_persona_fiscal', 'persona_natural', 'Persona natural', 10, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_persona_fiscal', 'persona_juridica', 'Empresa', 20, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'responsabilidades_fiscales', 'nuevo_rus', 'Nuevo RUS', 10, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'responsabilidades_fiscales', 'regimen_especial_renta', 'Régimen Especial de Renta', 20, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'responsabilidades_fiscales', 'regimen_mype_tributario', 'Régimen MYPE Tributario', 30, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'responsabilidades_fiscales', 'regimen_general', 'Régimen General', 40, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'responsabilidades_fiscales', 'otro', 'Otra', 50, 1, 'migration', 'migration')
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN fid_parametros_idioma uuid,
  ADD COLUMN fid_zonas_horarias uuid,
  ADD COLUMN fid_parametros_moneda uuid,
  ADD COLUMN fid_parametros_tipo_persona_fiscal uuid,
  ADD COLUMN fid_parametros_tipo_documento_fiscal uuid,
  ADD COLUMN fid_parametros_responsabilidad_fiscal uuid;

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_idioma = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE parametro.codigo_grupo = 'idiomas'
  AND parametro.codigo = perfil.idioma_por_defecto;

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_idioma = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE perfil.fid_parametros_idioma IS NULL
  AND parametro.codigo_grupo = 'idiomas'
  AND parametro.codigo = 'es';

UPDATE nucleo.perfil_organizacion perfil
SET fid_zonas_horarias = zona.id_zonas_horarias
FROM system.zonas_horarias zona
WHERE zona.nombre_iana = perfil.zona_horaria_por_defecto;

UPDATE nucleo.perfil_organizacion perfil
SET fid_zonas_horarias = zona.id_zonas_horarias
FROM system.zonas_horarias zona
WHERE perfil.fid_zonas_horarias IS NULL
  AND zona.nombre_iana = 'America/Lima';

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_moneda = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE parametro.codigo_grupo = 'monedas'
  AND parametro.codigo = perfil.codigo_moneda;

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_moneda = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE perfil.fid_parametros_moneda IS NULL
  AND parametro.codigo_grupo = 'monedas'
  AND parametro.codigo = 'PEN';

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_tipo_persona_fiscal = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE parametro.codigo_grupo = 'tipos_persona_fiscal'
  AND parametro.codigo = perfil.fiscal_tipo_persona;

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_tipo_documento_fiscal = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE parametro.codigo_grupo = 'tipos_documento'
  AND lower(parametro.codigo) = lower(perfil.fiscal_tipo_documento);

UPDATE nucleo.perfil_organizacion perfil
SET fid_parametros_responsabilidad_fiscal = parametro.id_parametros
FROM configuracion.parametros parametro
WHERE parametro.codigo_grupo = 'responsabilidades_fiscales'
  AND lower(parametro.codigo) = lower(perfil.fiscal_regimen);

ALTER TABLE nucleo.perfil_organizacion
  ALTER COLUMN fid_parametros_idioma SET NOT NULL,
  ALTER COLUMN fid_zonas_horarias SET NOT NULL,
  ALTER COLUMN fid_parametros_moneda SET NOT NULL;

CREATE INDEX perfil_organizacion_fid_parametros_idioma_idx
  ON nucleo.perfil_organizacion (fid_parametros_idioma);
CREATE INDEX perfil_organizacion_fid_zonas_horarias_idx
  ON nucleo.perfil_organizacion (fid_zonas_horarias);
CREATE INDEX perfil_organizacion_fid_parametros_moneda_idx
  ON nucleo.perfil_organizacion (fid_parametros_moneda);
CREATE INDEX perfil_organizacion_fid_parametros_tipo_persona_fiscal_idx
  ON nucleo.perfil_organizacion (fid_parametros_tipo_persona_fiscal);
CREATE INDEX perfil_organizacion_fid_parametros_tipo_documento_fiscal_idx
  ON nucleo.perfil_organizacion (fid_parametros_tipo_documento_fiscal);
CREATE INDEX perfil_organizacion_fid_parametros_responsabilidad_fiscal_idx
  ON nucleo.perfil_organizacion (fid_parametros_responsabilidad_fiscal);

ALTER TABLE nucleo.perfil_organizacion
  ADD CONSTRAINT perfil_organizacion_idioma_fk FOREIGN KEY (fid_parametros_idioma)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT perfil_organizacion_zona_horaria_fk FOREIGN KEY (fid_zonas_horarias)
    REFERENCES system.zonas_horarias(id_zonas_horarias) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT perfil_organizacion_moneda_fk FOREIGN KEY (fid_parametros_moneda)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT perfil_organizacion_tipo_persona_fiscal_fk FOREIGN KEY (fid_parametros_tipo_persona_fiscal)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT perfil_organizacion_tipo_documento_fiscal_fk FOREIGN KEY (fid_parametros_tipo_documento_fiscal)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT perfil_organizacion_responsabilidad_fiscal_fk FOREIGN KEY (fid_parametros_responsabilidad_fiscal)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE nucleo.organizaciones_especies_atendidas (
  id_organizaciones_especies_atendidas uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_parametros uuid NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT organizaciones_especies_atendidas_organizacion_fk
    FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT organizaciones_especies_atendidas_parametro_fk
    FOREIGN KEY (fid_parametros) REFERENCES configuracion.parametros(id_parametros)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT organizaciones_especies_atendidas_unique
    UNIQUE (fid_organizaciones, fid_parametros)
);

CREATE INDEX organizaciones_especies_atendidas_organizacion_estado_idx
  ON nucleo.organizaciones_especies_atendidas (fid_organizaciones, estado);
CREATE INDEX organizaciones_especies_atendidas_parametro_idx
  ON nucleo.organizaciones_especies_atendidas (fid_parametros);

INSERT INTO nucleo.organizaciones_especies_atendidas
  (fid_organizaciones, fid_parametros, estado, created_by, updated_by)
SELECT perfil.fid_organizaciones, parametro.id_parametros, 1, 'migration', 'migration'
FROM nucleo.perfil_organizacion perfil
CROSS JOIN LATERAL unnest(perfil.especies_atendidas) especie(codigo)
JOIN configuracion.parametros parametro
  ON parametro.codigo_grupo = 'especies_animales'
 AND parametro.codigo = especie.codigo
ON CONFLICT (fid_organizaciones, fid_parametros) DO NOTHING;

ALTER TABLE nucleo.perfil_organizacion
  DROP COLUMN idioma_por_defecto,
  DROP COLUMN zona_horaria_por_defecto,
  DROP COLUMN codigo_moneda,
  DROP COLUMN fiscal_tipo_persona,
  DROP COLUMN fiscal_tipo_documento,
  DROP COLUMN fiscal_regimen,
  DROP COLUMN especies_atendidas,
  DROP COLUMN servicios_ofrecidos;
