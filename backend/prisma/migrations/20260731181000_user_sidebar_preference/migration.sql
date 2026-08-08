-- El estado del menú lateral forma parte de las preferencias 1:1 del usuario.
-- DEFAULT false conserva el comportamiento actual para filas existentes.
ALTER TABLE configuracion.preferencias_usuario
ADD COLUMN menu_colapsado BOOLEAN NOT NULL DEFAULT false;
