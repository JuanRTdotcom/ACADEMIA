-- Restaura el catálogo que no se ejecutó en bases importadas sin historial de
-- migraciones. Es idempotente y no modifica organizaciones, usuarios ni roles.
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', 'layout-dashboard', '/dashboard', 10, 1),
  (gen_random_uuid(), 'superadmin.companies', 'Veterinarias del sistema', 'building-2', '/superadmin/companies', 20, 1),
  (gen_random_uuid(), 'superadmin.users', 'Usuarios del sistema', 'users', '/superadmin/users', 30, 1),
  (gen_random_uuid(), 'superadmin.roles', 'Roles y permisos', 'shield-check', '/superadmin/roles', 40, 1),
  (gen_random_uuid(), 'superadmin.countries', 'Países del sistema', 'globe', '/superadmin/countries', 45, 1),
  (gen_random_uuid(), 'superadmin.plans', 'Planes de suscripción', 'package', '/superadmin/plans', 46, 1),
  (gen_random_uuid(), 'superadmin.subscriptions', 'Control de suscripciones', 'credit-card', '/superadmin/subscriptions', 47, 1),
  (gen_random_uuid(), 'administrator.company.general', 'Veterinaria: información general', 'building-2', '/administrator/company/general', 50, 1),
  (gen_random_uuid(), 'administrator.company.contact', 'Veterinaria: contacto y ubicación', 'map-pin', '/administrator/company/contact', 60, 1),
  (gen_random_uuid(), 'administrator.company.digital_presence', 'Veterinaria: presencia digital', 'globe-2', '/administrator/company/digital-presence', 70, 1),
  (gen_random_uuid(), 'administrator.company.identity', 'Veterinaria: apariencia', 'palette', '/administrator/company/identity', 80, 1),
  (gen_random_uuid(), 'administrator.company.login_branding', 'Veterinaria: inicio de sesión', 'log-in', '/administrator/company/login-branding', 90, 1),
  (gen_random_uuid(), 'administrator.company.communications', 'Veterinaria: comunicaciones', 'messages-square', '/administrator/company/communications', 100, 1),
  (gen_random_uuid(), 'administrator.company.region', 'Veterinaria: internacionalización', 'languages', '/administrator/company/region', 110, 1),
  (gen_random_uuid(), 'administrator.company.subscription', 'Suscripción', 'credit-card', '/administrator/company/subscription', 120, 1),
  (gen_random_uuid(), 'administrator.users', 'Usuarios de la veterinaria', 'users', '/administrator/users', 130, 1),
  (gen_random_uuid(), 'profile.personal', 'Tu cuenta: información personal', 'contact', '/profile', 140, 1),
  (gen_random_uuid(), 'profile.authentication', 'Tu cuenta: claves y acceso', 'key-round', '/profile/account', 150, 1),
  (gen_random_uuid(), 'profile.emails', 'Tu cuenta: emails', 'mail', '/profile/emails', 160, 1),
  (gen_random_uuid(), 'profile.sessions', 'Tu cuenta: sesiones', 'monitor-smartphone', '/profile/sessions', 170, 1),
  (gen_random_uuid(), 'profile.privacy', 'Tu cuenta: privacidad', 'shield', '/profile/privacy', 180, 1),
  (gen_random_uuid(), 'profile.nationalities', 'Profesional: nacionalidades', 'flag', '/profile/nationalities', 190, 1),
  (gen_random_uuid(), 'profile.phones', 'Profesional: teléfonos', 'phone', '/profile/phones', 200, 1),
  (gen_random_uuid(), 'profile.documents', 'Profesional: documentos', 'file-badge', '/profile/documents', 210, 1),
  (gen_random_uuid(), 'profile.studies', 'Profesional: estudios', 'graduation-cap', '/profile/studies', 220, 1),
  (gen_random_uuid(), 'profile.appearance', 'Preferencias: apariencia y región', 'palette', '/profile/appearance', 230, 1),
  (gen_random_uuid(), 'profile.notifications', 'Preferencias: notificaciones', 'bell', '/profile/notifications', 240, 1),
  (gen_random_uuid(), 'profile.activity', 'Preferencias: actividad', 'history', '/profile/activity', 250, 1),
  (gen_random_uuid(), 'profile.help', 'Información: ayuda', 'circle-help', '/profile/help', 260, 1),
  (gen_random_uuid(), 'profile.legal', 'Información: legal', 'scale', '/profile/legal', 270, 1),
  (gen_random_uuid(), 'resources', 'Recursos de interfaz', 'boxes', '/recursos', 280, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = 1, updated_at = CURRENT_TIMESTAMP;

WITH capacidades(codigo, codigo_modulo, accion) AS (
  VALUES
    ('dashboard.read', 'dashboard', 'read'),
    ('superadmin.companies.read', 'superadmin.companies', 'read'), ('superadmin.companies.create', 'superadmin.companies', 'create'), ('superadmin.companies.update', 'superadmin.companies', 'update'), ('superadmin.companies.delete', 'superadmin.companies', 'delete'), ('superadmin.companies.status', 'superadmin.companies', 'status'),
    ('superadmin.users.read', 'superadmin.users', 'read'), ('superadmin.users.create', 'superadmin.users', 'create'), ('superadmin.users.update', 'superadmin.users', 'update'), ('superadmin.users.delete', 'superadmin.users', 'delete'),
    ('superadmin.roles.read', 'superadmin.roles', 'read'), ('superadmin.roles.create', 'superadmin.roles', 'create'), ('superadmin.roles.update', 'superadmin.roles', 'update'), ('superadmin.roles.delete', 'superadmin.roles', 'delete'), ('superadmin.roles.status', 'superadmin.roles', 'status'), ('superadmin.roles.assign', 'superadmin.roles', 'assign'),
    ('superadmin.countries.read', 'superadmin.countries', 'read'), ('superadmin.countries.status', 'superadmin.countries', 'status'),
    ('superadmin.plans.read', 'superadmin.plans', 'read'), ('superadmin.plans.create', 'superadmin.plans', 'create'), ('superadmin.plans.update', 'superadmin.plans', 'update'), ('superadmin.plans.delete', 'superadmin.plans', 'delete'),
    ('superadmin.subscriptions.read', 'superadmin.subscriptions', 'read'),
    ('administrator.company.general.read', 'administrator.company.general', 'read'), ('administrator.company.general.update', 'administrator.company.general', 'update'),
    ('administrator.company.contact.read', 'administrator.company.contact', 'read'), ('administrator.company.contact.update', 'administrator.company.contact', 'update'),
    ('administrator.company.digital_presence.read', 'administrator.company.digital_presence', 'read'), ('administrator.company.digital_presence.update', 'administrator.company.digital_presence', 'update'),
    ('administrator.company.identity.read', 'administrator.company.identity', 'read'), ('administrator.company.identity.update', 'administrator.company.identity', 'update'),
    ('administrator.company.login_branding.read', 'administrator.company.login_branding', 'read'), ('administrator.company.login_branding.update', 'administrator.company.login_branding', 'update'),
    ('administrator.company.communications.read', 'administrator.company.communications', 'read'), ('administrator.company.communications.update', 'administrator.company.communications', 'update'),
    ('administrator.company.region.read', 'administrator.company.region', 'read'), ('administrator.company.region.update', 'administrator.company.region', 'update'),
    ('administrator.company.subscription.read', 'administrator.company.subscription', 'read'),
    ('administrator.users.read', 'administrator.users', 'read'), ('administrator.users.create', 'administrator.users', 'create'), ('administrator.users.update', 'administrator.users', 'update'), ('administrator.users.delete', 'administrator.users', 'delete'),
    ('profile.personal.read', 'profile.personal', 'read'), ('profile.personal.update', 'profile.personal', 'update'), ('profile.personal.avatar', 'profile.personal', 'avatar'),
    ('profile.authentication.read', 'profile.authentication', 'read'), ('profile.authentication.update', 'profile.authentication', 'update'),
    ('profile.emails.read', 'profile.emails', 'read'), ('profile.emails.create', 'profile.emails', 'create'), ('profile.emails.update', 'profile.emails', 'update'), ('profile.emails.delete', 'profile.emails', 'delete'), ('profile.emails.verify', 'profile.emails', 'verify'), ('profile.emails.assign', 'profile.emails', 'assign'),
    ('profile.sessions.read', 'profile.sessions', 'read'), ('profile.sessions.delete', 'profile.sessions', 'delete'),
    ('profile.privacy.read', 'profile.privacy', 'read'), ('profile.privacy.update', 'profile.privacy', 'update'),
    ('profile.nationalities.read', 'profile.nationalities', 'read'), ('profile.nationalities.create', 'profile.nationalities', 'create'), ('profile.nationalities.delete', 'profile.nationalities', 'delete'),
    ('profile.phones.read', 'profile.phones', 'read'), ('profile.phones.create', 'profile.phones', 'create'), ('profile.phones.update', 'profile.phones', 'update'), ('profile.phones.delete', 'profile.phones', 'delete'),
    ('profile.documents.read', 'profile.documents', 'read'), ('profile.documents.create', 'profile.documents', 'create'), ('profile.documents.update', 'profile.documents', 'update'), ('profile.documents.delete', 'profile.documents', 'delete'),
    ('profile.studies.read', 'profile.studies', 'read'), ('profile.studies.create', 'profile.studies', 'create'), ('profile.studies.update', 'profile.studies', 'update'), ('profile.studies.delete', 'profile.studies', 'delete'),
    ('profile.appearance.read', 'profile.appearance', 'read'), ('profile.appearance.update', 'profile.appearance', 'update'),
    ('profile.notifications.read', 'profile.notifications', 'read'), ('profile.notifications.update', 'profile.notifications', 'update'),
    ('profile.activity.read', 'profile.activity', 'read'), ('profile.help.read', 'profile.help', 'read'), ('profile.legal.read', 'profile.legal', 'read'), ('resources.read', 'resources', 'read')
)
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, c.codigo, c.accion, c.codigo, 1
FROM capacidades c
JOIN configuracion.modulos m ON m.codigo = c.codigo_modulo
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

-- SUPERADMIN es propietario del sistema: todos los permisos activos, incluidos
-- los que se agreguen al catálogo antes de volver a ejecutar esta migración.
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN' AND p.estado = 1
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;
