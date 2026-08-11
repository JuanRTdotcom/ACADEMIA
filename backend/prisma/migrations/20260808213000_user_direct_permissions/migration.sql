CREATE OR REPLACE FUNCTION configuracion.establecer_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS seguridad.usuarios_permisos (
  id_usuarios_permisos uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_usuarios uuid NOT NULL REFERENCES seguridad.usuarios(id_usuarios) ON DELETE CASCADE,
  fid_permisos uuid NOT NULL REFERENCES seguridad.permisos(id_permisos) ON DELETE CASCADE,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  UNIQUE (fid_usuarios, fid_permisos)
);

CREATE INDEX IF NOT EXISTS usuarios_permisos_usuario_estado_idx
  ON seguridad.usuarios_permisos (fid_usuarios, estado);

DROP TRIGGER IF EXISTS usuarios_permisos_updated_at ON seguridad.usuarios_permisos;
CREATE TRIGGER usuarios_permisos_updated_at
BEFORE UPDATE ON seguridad.usuarios_permisos
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

-- Conserva el acceso actual al activar el nuevo modelo: cada usuario recibe
-- inicialmente los permisos vigentes de sus roles. Desde aquí las ediciones
-- se gestionan exclusivamente mediante usuarios_permisos.
INSERT INTO seguridad.usuarios_permisos (
  id_usuarios_permisos, fid_usuarios, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), ur.fid_usuarios, rp.fid_permisos, 1, 'migration', 'migration'
FROM seguridad.usuarios_roles ur
JOIN seguridad.roles r ON r.id_roles = ur.fid_roles AND r.estado = 1 AND r.eliminado_en IS NULL
JOIN seguridad.roles_permisos rp ON rp.fid_roles = ur.fid_roles AND rp.estado = 1
JOIN seguridad.permisos p ON p.id_permisos = rp.fid_permisos AND p.estado = 1
WHERE ur.estado = 1
ON CONFLICT (fid_usuarios, fid_permisos) DO UPDATE SET estado = 1, updated_by = 'migration';
