ALTER TABLE personas.personas_nacionalidades
ADD CONSTRAINT personas_nacionalidades_estado_valido
CHECK (estado IN (0, 1));

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_nacionalidades
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
