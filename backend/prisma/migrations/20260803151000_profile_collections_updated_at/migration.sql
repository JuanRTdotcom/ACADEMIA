CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_seguros
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.personas_hobbies
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();
