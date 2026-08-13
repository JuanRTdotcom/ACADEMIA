-- Mantiene el catálogo de módulos en el mismo orden funcional del menú:
-- Consultorio → Gestión comercial → Agenda y seguimiento → Análisis.
UPDATE configuracion.modulos
SET orden = CASE codigo
  WHEN 'clinic' THEN 300
  WHEN 'clinic.attentions' THEN 310
  WHEN 'clinic.owners' THEN 320
  WHEN 'clinic.pets' THEN 330
  WHEN 'operations.sales' THEN 400
  WHEN 'operations.inventory' THEN 410
  WHEN 'operations.billing' THEN 420
  WHEN 'operations.appointments' THEN 500
  WHEN 'operations.reminders' THEN 510
  WHEN 'operations.reports' THEN 600
  ELSE orden
END,
updated_at = CURRENT_TIMESTAMP,
updated_by = 'migration'
WHERE codigo IN (
  'clinic',
  'clinic.attentions',
  'clinic.owners',
  'clinic.pets',
  'operations.sales',
  'operations.inventory',
  'operations.billing',
  'operations.appointments',
  'operations.reminders',
  'operations.reports'
);
