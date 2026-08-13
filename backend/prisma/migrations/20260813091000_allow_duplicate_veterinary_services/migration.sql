DROP INDEX IF EXISTS nucleo.servicios_veterinaria_nombre_activo_unique;

CREATE INDEX servicios_veterinaria_nombre_busqueda_idx
ON nucleo.servicios_veterinaria (fid_organizaciones, upper(btrim(nombre)))
WHERE eliminado_en IS NULL;
