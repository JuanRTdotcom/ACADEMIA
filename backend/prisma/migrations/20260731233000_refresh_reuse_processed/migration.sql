-- Un refresh rotado reutilizado se procesa una sola vez. El marcador evita que
-- el mismo token antiguo pueda provocar revocaciones repetidas.
ALTER TABLE seguridad.sesiones
ADD COLUMN reuso_detectado_en TIMESTAMPTZ(3);
