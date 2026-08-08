ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN escudo_oscuro_url TEXT,
  ADD COLUMN escudo_misma_imagen BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN imagotipo_oscuro_url TEXT,
  ADD COLUMN imagotipo_misma_imagen BOOLEAN NOT NULL DEFAULT TRUE;

-- La marca existente continúa visible en ambos temas sin duplicar el objeto R2.
UPDATE nucleo.perfil_organizacion
SET
  escudo_oscuro_url = escudo_url,
  imagotipo_oscuro_url = imagotipo_url;
