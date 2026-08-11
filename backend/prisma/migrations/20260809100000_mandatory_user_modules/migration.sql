ALTER TABLE configuracion.modulos
  ADD COLUMN acceso_usuario_obligatorio BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE configuracion.modulos
SET acceso_usuario_obligatorio = TRUE
WHERE codigo = 'dashboard' OR codigo LIKE 'profile.%';

-- Corrige nombres que no existen en el catálogo SVG del frontend.
UPDATE configuracion.modulos SET icono = 'id-card' WHERE icono = 'file-badge';
UPDATE configuracion.modulos SET icono = 'help-circle' WHERE icono = 'circle-help';
UPDATE configuracion.modulos SET icono = 'file-text' WHERE icono = 'scale';
