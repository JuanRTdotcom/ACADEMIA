-- 1. Crear las tablas de planes de suscripción
CREATE TABLE IF NOT EXISTS configuracion.planes (
  id_planes UUID NOT NULL DEFAULT gen_random_uuid(),
  codigo VARCHAR(40) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  eliminado_en TIMESTAMPTZ(3),
  CONSTRAINT planes_pkey PRIMARY KEY (id_planes),
  CONSTRAINT planes_codigo_unique UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS configuracion.planes_modulos (
  id_planes_modulos UUID NOT NULL DEFAULT gen_random_uuid(),
  fid_planes UUID NOT NULL,
  fid_modulos UUID NOT NULL,
  estado INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  CONSTRAINT planes_modulos_pkey PRIMARY KEY (id_planes_modulos),
  CONSTRAINT planes_modulos_relation_unique UNIQUE (fid_planes, fid_modulos),
  CONSTRAINT fk_planes_modulos_planes FOREIGN KEY (fid_planes) REFERENCES configuracion.planes (id_planes) ON DELETE CASCADE,
  CONSTRAINT fk_planes_modulos_modulos FOREIGN KEY (fid_modulos) REFERENCES configuracion.modulos (id_modulos) ON DELETE CASCADE
);

-- 2. Insertar planes semilla
INSERT INTO configuracion.planes (id_planes, codigo, nombre, descripcion, estado)
VALUES
  ('40000000-0000-0000-0000-000000000001', 'BASIC', 'Plan Básico', 'Funcionalidades básicas para nidos y colegios pequeños.', 1),
  ('40000000-0000-0000-0000-000000000002', 'PREMIUM', 'Plan Premium', 'Mayor personalización visual y presencia digital de marca.', 1),
  ('40000000-0000-0000-0000-000000000003', 'FULL', 'Plan Completo', 'Acceso a todas las funciones avanzadas y gestión de usuarios.', 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado;

-- 3. Vincular módulos iniciales a los planes semilla
-- Plan Básico: Dashboard, Tu cuenta (profile.*), Empresa (General, Contacto, Región, Identidad)
INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000001', id_modulos, 1
FROM configuracion.modulos
WHERE codigo IN (
  'dashboard',
  'profile.personal',
  'profile.authentication',
  'profile.emails',
  'profile.sessions',
  'profile.privacy',
  'profile.nationalities',
  'profile.insurance',
  'profile.phones',
  'profile.hobbies',
  'profile.documents',
  'profile.studies',
  'profile.family',
  'profile.appearance',
  'profile.notifications',
  'profile.activity',
  'administrator.company.general',
  'administrator.company.contact',
  'administrator.company.region',
  'administrator.company.identity'
)
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

-- Plan Premium: Plan Básico + Presencia digital, Apariencia de login
INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000002', id_modulos, 1
FROM configuracion.modulos
WHERE codigo IN (
  'dashboard',
  'profile.personal',
  'profile.authentication',
  'profile.emails',
  'profile.sessions',
  'profile.privacy',
  'profile.nationalities',
  'profile.insurance',
  'profile.phones',
  'profile.hobbies',
  'profile.documents',
  'profile.studies',
  'profile.family',
  'profile.appearance',
  'profile.notifications',
  'profile.activity',
  'administrator.company.general',
  'administrator.company.contact',
  'administrator.company.region',
  'administrator.company.identity',
  'administrator.company.digital_presence',
  'administrator.company.login_branding'
)
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

-- Plan Completo: Todos los módulos que no sean de superadmin
INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado)
SELECT gen_random_uuid(), '40000000-0000-0000-0000-000000000003', id_modulos, 1
FROM configuracion.modulos
WHERE codigo NOT LIKE 'superadmin.%'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1;

-- 4. Registrar el módulo de administración de planes en superadmin
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, icono, ruta, orden, estado)
VALUES (gen_random_uuid(), 'superadmin.plans', 'Planes de suscripción', 'package', '/superadmin/plans', 45, 1)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden, estado = EXCLUDED.estado, updated_at = CURRENT_TIMESTAMP;

-- Registrar los permisos del módulo de planes
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.plans.read', 'read', 'Ver planes de suscripción', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.plans'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.plans.create', 'create', 'Crear planes de suscripción', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.plans'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.plans.update', 'update', 'Actualizar planes de suscripción', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.plans'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado)
SELECT gen_random_uuid(), m.id_modulos, 'superadmin.plans.delete', 'delete', 'Eliminar planes de suscripción', 1
FROM configuracion.modulos m WHERE m.codigo = 'superadmin.plans'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion, estado = 1, updated_at = CURRENT_TIMESTAMP;

-- Asignar los permisos del módulo de planes a SUPERADMIN
INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
CROSS JOIN seguridad.permisos p
WHERE r.codigo = 'SUPERADMIN' 
  AND p.codigo IN (
    'superadmin.plans.read', 
    'superadmin.plans.create', 
    'superadmin.plans.update', 
    'superadmin.plans.delete'
  )
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;

-- 5. Agregar la columna fid_planes a nucleo.organizaciones
ALTER TABLE nucleo.organizaciones
  ADD COLUMN IF NOT EXISTS fid_planes UUID;

-- Asignar el plan Completo por defecto a todas las empresas existentes
UPDATE nucleo.organizaciones
  SET fid_planes = '40000000-0000-0000-0000-000000000003'
  WHERE fid_planes IS NULL;

-- Hacer obligatoria la columna fid_planes y establecer la llave foránea
ALTER TABLE nucleo.organizaciones
  ALTER COLUMN fid_planes SET NOT NULL,
  ADD CONSTRAINT fk_organizaciones_planes FOREIGN KEY (fid_planes) REFERENCES configuracion.planes (id_planes);
