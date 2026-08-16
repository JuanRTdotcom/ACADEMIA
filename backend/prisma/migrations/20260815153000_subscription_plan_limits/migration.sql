ALTER TABLE configuracion.planes
  ADD COLUMN IF NOT EXISTS maximo_sedes integer,
  ADD COLUMN IF NOT EXISTS maximo_usuarios integer;

ALTER TABLE configuracion.planes
  DROP CONSTRAINT IF EXISTS planes_maximo_sedes_positivo,
  DROP CONSTRAINT IF EXISTS planes_maximo_usuarios_positivo,
  ADD CONSTRAINT planes_maximo_sedes_positivo
    CHECK (maximo_sedes IS NULL OR maximo_sedes > 0),
  ADD CONSTRAINT planes_maximo_usuarios_positivo
    CHECK (maximo_usuarios IS NULL OR maximo_usuarios > 0);

UPDATE configuracion.planes
SET codigo = 'INICIAL',
    nombre = 'Plan Inicial',
    descripcion = 'Operación clínica esencial para una veterinaria pequeña.',
    almacenamiento_max_bytes = 5::bigint * 1024 * 1024 * 1024,
    maximo_sedes = 1,
    maximo_usuarios = 3,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE id_planes = '40000000-0000-4000-8000-000000000001';

UPDATE configuracion.planes
SET codigo = 'PROFESIONAL',
    nombre = 'Plan Profesional',
    descripcion = 'Gestión clínica y comercial para veterinarias en crecimiento.',
    almacenamiento_max_bytes = 25::bigint * 1024 * 1024 * 1024,
    maximo_sedes = 3,
    maximo_usuarios = 15,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE id_planes = '40000000-0000-4000-8000-000000000002';

UPDATE configuracion.planes
SET codigo = 'EMPRESARIAL',
    nombre = 'Plan Empresarial',
    descripcion = 'Acceso completo sin límites para cadenas veterinarias.',
    almacenamiento_max_bytes = NULL,
    maximo_sedes = NULL,
    maximo_usuarios = NULL,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE id_planes = '40000000-0000-4000-8000-000000000003';

INSERT INTO configuracion.planes (
  id_planes, codigo, nombre, descripcion, almacenamiento_max_bytes,
  maximo_sedes, maximo_usuarios, estado, created_by, updated_by
)
VALUES (
  '40000000-0000-4000-8000-000000000004',
  'DEMO',
  'Plan Demo',
  'Acceso temporal a todas las funciones para demostraciones.',
  2::bigint * 1024 * 1024 * 1024,
  1,
  5,
  1,
  'migration',
  'migration'
)
ON CONFLICT (id_planes) DO UPDATE SET
  codigo = EXCLUDED.codigo,
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  almacenamiento_max_bytes = EXCLUDED.almacenamiento_max_bytes,
  maximo_sedes = EXCLUDED.maximo_sedes,
  maximo_usuarios = EXCLUDED.maximo_usuarios,
  estado = 1,
  eliminado_en = NULL,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

UPDATE configuracion.planes
SET almacenamiento_max_bytes = NULL,
    maximo_sedes = NULL,
    maximo_usuarios = NULL,
    estado = 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'SYSTEM';

-- Los planes comerciales se reconstruyen desde el catálogo vigente. Esto
-- conserva una sola fuente de verdad y evita permisos inventados en la UI.
UPDATE configuracion.planes_modulos
SET estado = 0, updated_at = CURRENT_TIMESTAMP, updated_by = 'migration'
WHERE fid_planes IN (
  '40000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000004'
);

-- Inicial: configuración, equipo y operación clínica; sin gestión comercial.
INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), '40000000-0000-4000-8000-000000000001', m.id_modulos, 1, 'migration', 'migration'
FROM configuracion.modulos m
WHERE m.estado = 1
  AND m.codigo NOT LIKE 'superadmin.%'
  AND m.codigo NOT LIKE 'operations.%'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET
  estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'migration';

-- Demo muestra todo el producto; Profesional y Empresarial operan todos los
-- módulos tenant. Sus diferencias comerciales quedan en las capacidades.
INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), plan.id_planes, modulo.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes plan
CROSS JOIN configuracion.modulos modulo
WHERE plan.id_planes IN (
    '40000000-0000-4000-8000-000000000002',
    '40000000-0000-4000-8000-000000000003',
    '40000000-0000-4000-8000-000000000004'
  )
  AND modulo.estado = 1
  AND modulo.codigo NOT LIKE 'superadmin.%'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET
  estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'migration';

ALTER TABLE nucleo.organizaciones
  ALTER COLUMN fid_planes
  SET DEFAULT '40000000-0000-4000-8000-000000000004';
