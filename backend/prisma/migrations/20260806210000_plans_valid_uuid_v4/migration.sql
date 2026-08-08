-- Remapea las PK de los planes semilla a UUID v4 VÁLIDOS.
-- Los ids previos (40000000-0000-0000-0000-00000000000X) tenían el nibble de
-- versión (grupo 3) y de variante (grupo 4) en 0, por lo que no eran UUID v4 y
-- el filtro estricto del frontend los rechazaba. Se conservan ids fijos y
-- mnemónicos (solo se corrigen los nibbles: grupo 3 -> 4xxx, grupo 4 -> 8xxx)
-- para que el @default de nucleo.organizaciones.fid_planes y las referencias de
-- migraciones sigan siendo estables y deterministas tras un reset.
--
--   BASIC   40000000-0000-0000-0000-000000000001 -> 40000000-0000-4000-8000-000000000001
--   PREMIUM 40000000-0000-0000-0000-000000000002 -> 40000000-0000-4000-8000-000000000002
--   FULL    40000000-0000-0000-0000-000000000003 -> 40000000-0000-4000-8000-000000000003

-- Se liberan las FKs para poder actualizar las PK referenciadas.
ALTER TABLE configuracion.planes_modulos DROP CONSTRAINT fk_planes_modulos_planes;
ALTER TABLE nucleo.organizaciones DROP CONSTRAINT fk_organizaciones_planes;

-- Padre
UPDATE configuracion.planes SET id_planes = '40000000-0000-4000-8000-000000000001' WHERE id_planes = '40000000-0000-0000-0000-000000000001';
UPDATE configuracion.planes SET id_planes = '40000000-0000-4000-8000-000000000002' WHERE id_planes = '40000000-0000-0000-0000-000000000002';
UPDATE configuracion.planes SET id_planes = '40000000-0000-4000-8000-000000000003' WHERE id_planes = '40000000-0000-0000-0000-000000000003';

-- Hijos: planes_modulos
UPDATE configuracion.planes_modulos SET fid_planes = '40000000-0000-4000-8000-000000000001' WHERE fid_planes = '40000000-0000-0000-0000-000000000001';
UPDATE configuracion.planes_modulos SET fid_planes = '40000000-0000-4000-8000-000000000002' WHERE fid_planes = '40000000-0000-0000-0000-000000000002';
UPDATE configuracion.planes_modulos SET fid_planes = '40000000-0000-4000-8000-000000000003' WHERE fid_planes = '40000000-0000-0000-0000-000000000003';

-- Hijos: organizaciones
UPDATE nucleo.organizaciones SET fid_planes = '40000000-0000-4000-8000-000000000001' WHERE fid_planes = '40000000-0000-0000-0000-000000000001';
UPDATE nucleo.organizaciones SET fid_planes = '40000000-0000-4000-8000-000000000002' WHERE fid_planes = '40000000-0000-0000-0000-000000000002';
UPDATE nucleo.organizaciones SET fid_planes = '40000000-0000-4000-8000-000000000003' WHERE fid_planes = '40000000-0000-0000-0000-000000000003';

-- Se restauran las FKs.
ALTER TABLE configuracion.planes_modulos
  ADD CONSTRAINT fk_planes_modulos_planes FOREIGN KEY (fid_planes) REFERENCES configuracion.planes (id_planes) ON DELETE CASCADE;
ALTER TABLE nucleo.organizaciones
  ADD CONSTRAINT fk_organizaciones_planes FOREIGN KEY (fid_planes) REFERENCES configuracion.planes (id_planes);
