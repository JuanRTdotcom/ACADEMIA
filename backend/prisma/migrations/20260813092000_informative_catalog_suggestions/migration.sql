DROP INDEX IF EXISTS nucleo.motivos_consulta_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.vacunas_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.tipos_hospitalizacion_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.procedimientos_veterinarios_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.pruebas_laboratorio_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.estudios_diagnosticos_nombre_activo_unique;
DROP INDEX IF EXISTS nucleo.servicios_peluqueria_spa_nombre_activo_unique;

CREATE INDEX motivos_consulta_nombre_busqueda_idx
ON nucleo.motivos_consulta (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX vacunas_nombre_busqueda_idx
ON nucleo.vacunas (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX tipos_hospitalizacion_nombre_busqueda_idx
ON nucleo.tipos_hospitalizacion (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX procedimientos_veterinarios_nombre_busqueda_idx
ON nucleo.procedimientos_veterinarios (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX pruebas_laboratorio_nombre_busqueda_idx
ON nucleo.pruebas_laboratorio (fid_organizaciones, fid_categorias_pruebas_laboratorio, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX estudios_diagnosticos_nombre_busqueda_idx
ON nucleo.estudios_diagnosticos (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;

CREATE INDEX servicios_peluqueria_spa_nombre_busqueda_idx
ON nucleo.servicios_peluqueria_spa (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;
