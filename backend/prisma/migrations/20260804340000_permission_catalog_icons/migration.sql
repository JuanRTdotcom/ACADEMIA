-- Iconos limitados al registro real de Icon.svelte. Evita SVG vacío en catálogo.
UPDATE configuracion.modulos
SET icono = CASE codigo
  WHEN 'dashboard' THEN 'grid'
  WHEN 'superadmin.companies' THEN 'building-2'
  WHEN 'superadmin.users' THEN 'users'
  WHEN 'superadmin.roles' THEN 'shield-check'
  WHEN 'administrator.company.general' THEN 'building-2'
  WHEN 'administrator.company.contact' THEN 'map-pin'
  WHEN 'administrator.company.digital_presence' THEN 'globe'
  WHEN 'administrator.company.identity' THEN 'palette'
  WHEN 'administrator.company.login_branding' THEN 'log-in'
  WHEN 'administrator.company.communications' THEN 'message-circle'
  WHEN 'administrator.company.region' THEN 'languages'
  WHEN 'profile.personal' THEN 'contact'
  WHEN 'profile.authentication' THEN 'key-round'
  WHEN 'profile.emails' THEN 'mail'
  WHEN 'profile.sessions' THEN 'monitor-smartphone'
  WHEN 'profile.privacy' THEN 'shield'
  WHEN 'profile.nationalities' THEN 'flag'
  WHEN 'profile.insurance' THEN 'heart'
  WHEN 'profile.phones' THEN 'phone'
  WHEN 'profile.hobbies' THEN 'sparkles'
  WHEN 'profile.documents' THEN 'files'
  WHEN 'profile.studies' THEN 'graduation-cap'
  WHEN 'profile.family' THEN 'users-round'
  WHEN 'profile.appearance' THEN 'palette'
  WHEN 'profile.notifications' THEN 'bell'
  WHEN 'profile.activity' THEN 'history'
  WHEN 'profile.help' THEN 'help-circle'
  WHEN 'profile.legal' THEN 'scroll-text'
  WHEN 'resources' THEN 'boxes'
  ELSE icono
END,
updated_at = CURRENT_TIMESTAMP
WHERE codigo IN (
  'dashboard', 'superadmin.companies', 'superadmin.users', 'superadmin.roles',
  'administrator.company.general', 'administrator.company.contact',
  'administrator.company.digital_presence', 'administrator.company.identity',
  'administrator.company.login_branding', 'administrator.company.communications',
  'administrator.company.region', 'profile.personal', 'profile.authentication',
  'profile.emails', 'profile.sessions', 'profile.privacy', 'profile.nationalities',
  'profile.insurance', 'profile.phones', 'profile.hobbies', 'profile.documents',
  'profile.studies', 'profile.family', 'profile.appearance', 'profile.notifications',
  'profile.activity', 'profile.help', 'profile.legal', 'resources'
);
