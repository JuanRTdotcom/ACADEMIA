ALTER TABLE personas.propietarios
  ADD CONSTRAINT propietarios_id_organizacion_unique
  UNIQUE (id_propietarios, fid_organizaciones);

ALTER TABLE configuracion.subespecies_animales
  ADD CONSTRAINT subespecies_id_especie_unique
  UNIQUE (id_subespecies_animales, fid_especies_animales);

ALTER TABLE personas.mascotas
  DROP CONSTRAINT mascotas_fid_propietarios_fkey,
  DROP CONSTRAINT mascotas_fid_subespecies_animales_fkey;

ALTER TABLE personas.mascotas
  ADD CONSTRAINT mascotas_propietario_tenant_fk
    FOREIGN KEY (fid_propietarios, fid_organizaciones)
    REFERENCES personas.propietarios(id_propietarios, fid_organizaciones)
    ON DELETE RESTRICT,
  ADD CONSTRAINT mascotas_subespecie_especie_fk
    FOREIGN KEY (fid_subespecies_animales, fid_especies_animales)
    REFERENCES configuracion.subespecies_animales(id_subespecies_animales, fid_especies_animales)
    ON DELETE RESTRICT;
