-- La lógica de negocio vive en los casos de uso transaccionales. Se conservan
-- únicamente restricciones declarativas y los triggers técnicos de updated_at.

DROP TRIGGER IF EXISTS personas_validar_ubicaciones_administrativas
ON personas.personas;
DROP FUNCTION IF EXISTS personas.validar_ubicaciones_administrativas();

DROP TRIGGER IF EXISTS validar_correo_verificado
ON personas.personas_correos_usos;
DROP FUNCTION IF EXISTS personas.validar_uso_correo_verificado();

DROP TRIGGER IF EXISTS retirar_usos_si_no_verificado
ON personas.personas_correos;
DROP FUNCTION IF EXISTS personas.retirar_usos_correo_no_verificado();
