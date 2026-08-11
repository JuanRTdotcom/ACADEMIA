ALTER TABLE nucleo.servicios_veterinaria
  ALTER COLUMN created_at TYPE timestamptz(3),
  ALTER COLUMN updated_at TYPE timestamptz(3);

ALTER TABLE nucleo.servicios_veterinaria
  DROP CONSTRAINT servicios_veterinaria_fid_organizaciones_fkey,
  ADD CONSTRAINT servicios_veterinaria_fid_organizaciones_fkey
    FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones)
    ON DELETE CASCADE ON UPDATE CASCADE;
