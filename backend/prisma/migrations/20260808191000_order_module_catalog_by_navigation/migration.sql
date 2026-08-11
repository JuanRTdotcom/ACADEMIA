-- Mantiene los grupos consecutivos como se presentan en el menú y en los
-- selectores de planes/permisos. Los códigos permanecen estables.
UPDATE configuracion.modulos
SET orden = CASE codigo
  WHEN 'profile.personal' THEN 300
  WHEN 'profile.authentication' THEN 310
  WHEN 'profile.emails' THEN 320
  WHEN 'profile.sessions' THEN 330
  WHEN 'profile.privacy' THEN 340
  WHEN 'profile.nationalities' THEN 350
  WHEN 'profile.phones' THEN 360
  WHEN 'profile.documents' THEN 370
  WHEN 'profile.studies' THEN 380
  WHEN 'profile.appearance' THEN 390
  WHEN 'profile.notifications' THEN 400
  WHEN 'profile.activity' THEN 410
  WHEN 'profile.help' THEN 420
  WHEN 'profile.legal' THEN 430
  WHEN 'resources' THEN 500
  ELSE orden
END,
updated_at = CURRENT_TIMESTAMP
WHERE codigo IN (
  'profile.personal', 'profile.authentication', 'profile.emails',
  'profile.sessions', 'profile.privacy', 'profile.nationalities',
  'profile.phones', 'profile.documents', 'profile.studies',
  'profile.appearance', 'profile.notifications', 'profile.activity',
  'profile.help', 'profile.legal', 'resources'
);
