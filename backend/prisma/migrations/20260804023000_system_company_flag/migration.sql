ALTER TABLE nucleo.organizaciones
  ADD COLUMN es_sistema BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE nucleo.organizaciones o
SET es_sistema = TRUE
WHERE EXISTS (
  SELECT 1
  FROM seguridad.roles r
  JOIN seguridad.roles_permisos rp
    ON rp.fid_roles = r.id_roles AND rp.estado = 1
  JOIN seguridad.permisos p
    ON p.id_permisos = rp.fid_permisos
   AND p.codigo = 'companies.read'
   AND p.estado = 1
  WHERE r.fid_organizaciones = o.id_organizaciones
    AND r.codigo = 'SUPERADMIN'
    AND r.estado = 1
);

CREATE INDEX organizaciones_es_sistema_estado_idx
  ON nucleo.organizaciones(es_sistema, estado);
