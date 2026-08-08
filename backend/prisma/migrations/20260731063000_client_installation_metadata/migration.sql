-- Identidad Firebase independiente del permiso de notificaciones y categoría
-- honesta del cliente. Modelo/SO/app usan las columnas ya existentes.
CREATE TYPE seguridad.tipo_dispositivo AS ENUM (
  'escritorio',
  'movil',
  'tableta',
  'desconocido'
);

ALTER TABLE seguridad.dispositivos
  ADD COLUMN id_instalacion_firebase TEXT,
  ADD COLUMN tipo_dispositivo seguridad.tipo_dispositivo NOT NULL DEFAULT 'desconocido';
