ALTER TABLE personas.mascotas
  DROP CONSTRAINT mascotas_raza_o_subespecie_check,
  ADD CONSTRAINT mascotas_raza_o_subespecie_check
    CHECK (
      fid_razas_animales IS NULL
      OR fid_subespecies_animales IS NULL
    );
