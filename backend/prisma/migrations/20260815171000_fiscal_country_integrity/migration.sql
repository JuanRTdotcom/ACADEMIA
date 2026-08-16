-- Impide asociar identificadores o proveedores de un país a una entidad legal
-- de otro y normaliza el proveedor usado en los comprobantes.
ALTER TABLE configuracion.proveedores_fiscales
  ADD CONSTRAINT proveedores_fiscales_id_pais_uk
  UNIQUE (id_proveedores_fiscales, fid_admin_level_0);
ALTER TABLE configuracion.tipos_identificacion_fiscal
  ADD CONSTRAINT tipos_identificacion_fiscal_id_pais_uk
  UNIQUE (id_tipos_identificacion_fiscal, fid_admin_level_0);

ALTER TABLE nucleo.entidades_legales
  DROP CONSTRAINT entidades_legales_tipo_identificacion_fk,
  DROP CONSTRAINT entidades_legales_proveedor_fk,
  ADD CONSTRAINT entidades_legales_tipo_identificacion_pais_fk
    FOREIGN KEY (fid_tipos_identificacion_fiscal, fid_admin_level_0)
    REFERENCES configuracion.tipos_identificacion_fiscal(id_tipos_identificacion_fiscal, fid_admin_level_0)
    ON DELETE RESTRICT,
  ADD CONSTRAINT entidades_legales_proveedor_pais_fk
    FOREIGN KEY (fid_proveedores_fiscales, fid_admin_level_0)
    REFERENCES configuracion.proveedores_fiscales(id_proveedores_fiscales, fid_admin_level_0)
    ON DELETE RESTRICT;

ALTER TABLE facturacion.comprobantes_electronicos
  ADD COLUMN fid_proveedores_fiscales uuid;
UPDATE facturacion.comprobantes_electronicos comprobante
SET fid_proveedores_fiscales = entidad.fid_proveedores_fiscales
FROM nucleo.entidades_legales entidad
WHERE entidad.id_entidades_legales = comprobante.fid_entidades_legales
  AND entidad.fid_organizaciones = comprobante.fid_organizaciones;
ALTER TABLE facturacion.comprobantes_electronicos
  ADD CONSTRAINT comprobantes_proveedor_fiscal_fk
  FOREIGN KEY (fid_proveedores_fiscales)
  REFERENCES configuracion.proveedores_fiscales(id_proveedores_fiscales)
  ON DELETE RESTRICT;
CREATE INDEX comprobantes_proveedor_fiscal_idx
  ON facturacion.comprobantes_electronicos(fid_proveedores_fiscales);

ALTER TABLE facturacion.intentos_envio_comprobante
  ADD COLUMN fid_proveedores_fiscales uuid;
UPDATE facturacion.intentos_envio_comprobante intento
SET fid_proveedores_fiscales = comprobante.fid_proveedores_fiscales
FROM facturacion.comprobantes_electronicos comprobante
WHERE comprobante.id_comprobantes_electronicos = intento.fid_comprobantes_electronicos
  AND comprobante.fid_organizaciones = intento.fid_organizaciones;
ALTER TABLE facturacion.intentos_envio_comprobante
  ADD CONSTRAINT intentos_proveedor_fiscal_fk
  FOREIGN KEY (fid_proveedores_fiscales)
  REFERENCES configuracion.proveedores_fiscales(id_proveedores_fiscales)
  ON DELETE RESTRICT;
CREATE INDEX intentos_proveedor_fiscal_idx
  ON facturacion.intentos_envio_comprobante(fid_proveedores_fiscales);
