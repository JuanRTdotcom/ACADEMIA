-- Valor explícito cuando un cliente no puede reconocer su plataforma.
-- No representa web ni funciona como fallback silencioso.
ALTER TYPE seguridad.plataforma_dispositivo
ADD VALUE IF NOT EXISTS 'desconocido';
