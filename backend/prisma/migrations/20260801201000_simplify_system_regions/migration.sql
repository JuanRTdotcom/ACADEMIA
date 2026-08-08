-- La plataforma operará inicialmente solo en Perú. Las zonas horarias siguen
-- siendo globales e independientes, por lo que la tabla puente ya no corresponde.
DROP TABLE system.paises_zonas_horarias;

-- Toda preferencia histórica que apuntaba a otro país pasa a Perú antes de
-- eliminar filas, para conservar integridad referencial durante la migración.
UPDATE configuracion.preferencias_usuario AS preferencia
SET fid_paises = peru.id_paises
FROM system.paises AS peru
WHERE peru.codigo_iso2 = 'PE'
  AND preferencia.fid_paises IS NOT NULL
  AND preferencia.fid_paises <> peru.id_paises;

DELETE FROM system.paises
WHERE codigo_iso2 <> 'PE';
