-- La configuración propia de una cuenta vive junto a la identidad del usuario.
ALTER TABLE configuracion.configuracion_usuario SET SCHEMA seguridad;
ALTER TABLE configuracion.preferencias_usuario SET SCHEMA seguridad;

-- La bitácora transversal solicitada se agrupa en configuración del sistema.
ALTER TABLE seguridad.auditoria SET SCHEMA configuracion;

-- Los eventos deben poder consultarse eficientemente por usuario y fecha.
-- No se agrega FK deliberadamente: el historial debe sobrevivir a una eventual
-- eliminación física de la cuenta, igual que ocurre con auditoría.
ALTER TABLE eventos.eventos
  ADD COLUMN fid_usuarios UUID;

CREATE INDEX eventos_fid_usuarios_ocurrido_en_idx
  ON eventos.eventos(fid_usuarios, ocurrido_en);
