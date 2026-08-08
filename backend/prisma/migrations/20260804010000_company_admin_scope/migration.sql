ALTER TABLE nucleo.organizaciones
  ADD COLUMN eliminado_en TIMESTAMPTZ(3),
  ADD COLUMN eliminado_por TEXT;

CREATE INDEX organizaciones_eliminado_en_estado_nombre_idx
  ON nucleo.organizaciones(eliminado_en, estado, nombre);

INSERT INTO seguridad.permisos (id_permisos, codigo, descripcion, estado)
VALUES
  (gen_random_uuid(), 'companyProfile.read', 'Ver configuración de la empresa propia', 1),
  (gen_random_uuid(), 'companyProfile.update', 'Editar configuración de la empresa propia', 1)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion, estado = 1;

INSERT INTO seguridad.roles
  (id_roles, fid_organizaciones, codigo, nombre, descripcion, es_sistema, estado)
SELECT gen_random_uuid(), o.id_organizaciones, 'ADMIN', 'Administrador',
       'Administra únicamente su propia organización', TRUE, 1
FROM nucleo.organizaciones o
ON CONFLICT (fid_organizaciones, codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    es_sistema = TRUE,
    estado = 1;

INSERT INTO seguridad.roles_permisos
  (id_roles_permisos, fid_roles, fid_permisos, estado)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1
FROM seguridad.roles r
JOIN seguridad.permisos p
  ON p.codigo IN ('companyProfile.read', 'companyProfile.update')
WHERE r.codigo IN ('ADMIN', 'SUPERADMIN')
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1;
