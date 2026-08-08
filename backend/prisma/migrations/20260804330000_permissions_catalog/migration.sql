-- Catálogo global de capacidades. No habilita módulos por empresa ni asigna permisos;
-- solo define el vocabulario que luego podrán asignar los roles.
ALTER TABLE seguridad.permisos
  ADD COLUMN IF NOT EXISTS fid_modulos uuid,
  ADD COLUMN IF NOT EXISTS accion varchar(40);

INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', 'layout-dashboard', '/dashboard', 10, 1),
  (gen_random_uuid(), 'superadmin.companies', 'Empresas del sistema', 'building-2', '/superadmin/companies', 20, 1),
  (gen_random_uuid(), 'superadmin.users', 'Usuarios del sistema', 'users', '/superadmin/users', 30, 1),
  (gen_random_uuid(), 'superadmin.roles', 'Roles y permisos', 'shield-check', '/superadmin/roles', 40, 1),
  (gen_random_uuid(), 'administrator.company.general', 'Empresa: información general', 'building-2', '/administrator/company/general', 50, 1),
  (gen_random_uuid(), 'administrator.company.contact', 'Empresa: contacto y ubicación', 'map-pin', '/administrator/company/contact', 60, 1),
  (gen_random_uuid(), 'administrator.company.digital_presence', 'Empresa: presencia digital', 'globe-2', '/administrator/company/digital-presence', 70, 1),
  (gen_random_uuid(), 'administrator.company.identity', 'Empresa: apariencia del sistema', 'palette', '/administrator/company/identity', 80, 1),
  (gen_random_uuid(), 'administrator.company.login_branding', 'Empresa: inicio de sesión', 'log-in', '/administrator/company/login-branding', 90, 1),
  (gen_random_uuid(), 'administrator.company.communications', 'Empresa: comunicaciones', 'messages-square', '/administrator/company/communications', 100, 1),
  (gen_random_uuid(), 'administrator.company.region', 'Empresa: idioma y zona horaria', 'languages', '/administrator/company/region', 110, 1),
  (gen_random_uuid(), 'profile.personal', 'Tu cuenta: información personal', 'contact', '/profile', 120, 1),
  (gen_random_uuid(), 'profile.authentication', 'Tu cuenta: claves y acceso', 'key-round', '/profile/account', 130, 1),
  (gen_random_uuid(), 'profile.emails', 'Tu cuenta: emails', 'mail', '/profile/emails', 140, 1),
  (gen_random_uuid(), 'profile.sessions', 'Tu cuenta: sesiones', 'monitor-smartphone', '/profile/sessions', 150, 1),
  (gen_random_uuid(), 'profile.privacy', 'Tu cuenta: privacidad', 'shield', '/profile/privacy', 160, 1),
  (gen_random_uuid(), 'profile.nationalities', 'Profesional: nacionalidades', 'flag', '/profile/nationalities', 170, 1),
  (gen_random_uuid(), 'profile.insurance', 'Profesional: seguros', 'heart-pulse', '/profile/insurance', 180, 1),
  (gen_random_uuid(), 'profile.phones', 'Profesional: teléfonos', 'phone', '/profile/phones', 190, 1),
  (gen_random_uuid(), 'profile.hobbies', 'Profesional: hobbies', 'sparkles', '/profile/hobbies', 200, 1),
  (gen_random_uuid(), 'profile.documents', 'Profesional: documentos', 'file-badge', '/profile/documents', 210, 1),
  (gen_random_uuid(), 'profile.studies', 'Profesional: estudios', 'graduation-cap', '/profile/studies', 220, 1),
  (gen_random_uuid(), 'profile.family', 'Profesional: familia', 'heart-handshake', '/profile/family', 230, 1),
  (gen_random_uuid(), 'profile.appearance', 'Preferencias: apariencia y región', 'palette', '/profile/appearance', 240, 1),
  (gen_random_uuid(), 'profile.notifications', 'Preferencias: notificaciones', 'bell', '/profile/notifications', 250, 1),
  (gen_random_uuid(), 'profile.activity', 'Preferencias: actividad', 'history', '/profile/activity', 260, 1),
  (gen_random_uuid(), 'profile.help', 'Información: ayuda', 'circle-help', '/profile/help', 270, 1),
  (gen_random_uuid(), 'profile.legal', 'Información: legal', 'scale', '/profile/legal', 280, 1),
  (gen_random_uuid(), 'resources', 'Recursos de interfaz', 'boxes', '/recursos', 290, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP;

-- Migra los permisos ya existentes a su módulo semántico.
UPDATE seguridad.permisos p
SET fid_modulos = m.id_modulos,
    accion = CASE p.codigo
      WHEN 'companies.read' THEN 'read' WHEN 'companies.create' THEN 'create'
      WHEN 'companies.update' THEN 'update' WHEN 'companies.delete' THEN 'delete'
      WHEN 'systemUsers.read' THEN 'read' WHEN 'systemUsers.manage' THEN 'manage'
      WHEN 'companyProfile.read' THEN 'read' WHEN 'companyProfile.update' THEN 'update'
    END
FROM configuracion.modulos m
WHERE (p.codigo LIKE 'companies.%' AND m.codigo = 'superadmin.companies')
   OR (p.codigo LIKE 'systemUsers.%' AND m.codigo = 'superadmin.users')
   OR (p.codigo LIKE 'companyProfile.%' AND m.codigo = 'administrator.company.general');

-- Una capacidad por acción y módulo. Los permisos no se codifican en el frontend.
WITH capacidades(codigo_modulo, accion, descripcion) AS (
  VALUES
    ('dashboard','read','Ver el dashboard'),
    ('superadmin.companies','status','Cambiar estado de empresas'),
    ('superadmin.users','create','Crear usuarios del sistema'), ('superadmin.users','update','Editar usuarios del sistema'), ('superadmin.users','delete','Eliminar usuarios del sistema'),
    ('superadmin.roles','read','Listar roles'), ('superadmin.roles','create','Crear roles'), ('superadmin.roles','update','Editar roles'), ('superadmin.roles','delete','Eliminar roles'), ('superadmin.roles','status','Cambiar estado de roles'), ('superadmin.roles','assign','Asignar permisos a roles'),
    ('administrator.company.contact','read','Ver contacto y ubicación'), ('administrator.company.contact','update','Actualizar contacto y ubicación'),
    ('administrator.company.digital_presence','read','Ver presencia digital'), ('administrator.company.digital_presence','update','Actualizar presencia digital'),
    ('administrator.company.identity','read','Ver apariencia del sistema'), ('administrator.company.identity','update','Actualizar apariencia del sistema'),
    ('administrator.company.login_branding','read','Ver inicio de sesión'), ('administrator.company.login_branding','update','Actualizar inicio de sesión'),
    ('administrator.company.communications','read','Ver comunicaciones'), ('administrator.company.communications','update','Actualizar comunicaciones'),
    ('administrator.company.region','read','Ver idioma y zona horaria'), ('administrator.company.region','update','Actualizar idioma y zona horaria'),
    ('profile.personal','read','Ver información personal'), ('profile.personal','update','Actualizar información personal'), ('profile.personal','avatar','Gestionar avatar'),
    ('profile.authentication','read','Ver claves y acceso'), ('profile.authentication','update','Cambiar contraseña y autenticación de dos factores'),
    ('profile.emails','read','Ver emails'), ('profile.emails','create','Agregar emails'), ('profile.emails','update','Modificar emails'), ('profile.emails','delete','Eliminar emails'), ('profile.emails','verify','Verificar emails'), ('profile.emails','assign','Asignar uso de emails'),
    ('profile.sessions','read','Ver sesiones'), ('profile.sessions','delete','Cerrar sesiones'),
    ('profile.privacy','read','Ver privacidad'), ('profile.privacy','update','Actualizar privacidad'),
    ('profile.nationalities','read','Ver nacionalidades'), ('profile.nationalities','create','Agregar nacionalidades'), ('profile.nationalities','delete','Eliminar nacionalidades'),
    ('profile.insurance','read','Ver seguros'), ('profile.insurance','create','Agregar seguros'), ('profile.insurance','update','Editar seguros'), ('profile.insurance','delete','Eliminar seguros'),
    ('profile.phones','read','Ver teléfonos'), ('profile.phones','create','Agregar teléfonos'), ('profile.phones','update','Editar teléfonos'), ('profile.phones','delete','Eliminar teléfonos'),
    ('profile.hobbies','read','Ver hobbies'), ('profile.hobbies','create','Agregar hobbies'), ('profile.hobbies','update','Editar hobbies'), ('profile.hobbies','delete','Eliminar hobbies'),
    ('profile.documents','read','Ver documentos'), ('profile.documents','create','Agregar documentos'), ('profile.documents','update','Editar documentos'), ('profile.documents','delete','Eliminar documentos'),
    ('profile.studies','read','Ver estudios'), ('profile.studies','create','Agregar estudios'), ('profile.studies','update','Editar estudios'), ('profile.studies','delete','Eliminar estudios'),
    ('profile.family','read','Ver familia'), ('profile.family','create','Agregar relaciones familiares'), ('profile.family','update','Editar relaciones familiares'), ('profile.family','delete','Eliminar relaciones familiares'),
    ('profile.appearance','read','Ver apariencia y región'), ('profile.appearance','update','Actualizar apariencia y región'),
    ('profile.notifications','read','Ver notificaciones'), ('profile.notifications','update','Actualizar notificaciones'),
    ('profile.activity','read','Ver actividad'),
    ('profile.help','read','Ver ayuda'), ('profile.legal','read','Ver información legal'), ('resources','read','Ver recursos de interfaz')
)
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, c.codigo_modulo || '.' || c.accion, c.accion, c.descripcion, 1
FROM capacidades c JOIN configuracion.modulos m ON m.codigo = c.codigo_modulo
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

ALTER TABLE seguridad.permisos
  ALTER COLUMN fid_modulos SET NOT NULL,
  ALTER COLUMN accion SET NOT NULL,
  ADD CONSTRAINT permisos_fid_modulos_fkey FOREIGN KEY (fid_modulos)
    REFERENCES configuracion.modulos(id_modulos) ON DELETE RESTRICT,
  ADD CONSTRAINT permisos_fid_modulos_accion_key UNIQUE (fid_modulos, accion);

CREATE INDEX permisos_fid_modulos_estado_idx ON seguridad.permisos(fid_modulos, estado);
