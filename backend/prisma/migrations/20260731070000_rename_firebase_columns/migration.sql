-- Agrupa visualmente las columnas que pertenecen a Firebase.
ALTER TABLE seguridad.dispositivos
  RENAME COLUMN id_instalacion_firebase TO firebase_id_instalacion;

ALTER TABLE seguridad.dispositivos
  RENAME COLUMN token_push TO firebase_token_fcm;
