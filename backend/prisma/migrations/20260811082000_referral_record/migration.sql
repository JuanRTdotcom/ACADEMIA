ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_usuarios_remitente uuid;

ALTER TABLE personas.registros_atencion
  ADD CONSTRAINT registros_atencion_usuario_remitente_tenant_fk
  FOREIGN KEY (fid_usuarios_remitente, fid_organizaciones)
  REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones)
  ON DELETE RESTRICT;

CREATE INDEX registros_atencion_usuario_remitente_idx
  ON personas.registros_atencion(fid_usuarios_remitente);

UPDATE configuracion.tipos_registro_atencion
SET nombre_es = 'Remisión',
    nombre_en = 'Referral',
    descripcion_es = 'Derivación de la mascota a otra clínica veterinaria.',
    descripcion_en = 'Referral of the pet to another veterinary clinic.',
    icono = 'send',
    campos = '[
      {"clave":"fid_usuarios_remitente","etiqueta_es":"Usuario que remite","etiqueta_en":"Referring user","tipo":"uuid","fuente":"usuarios_organizacion","requerido":false},
      {"clave":"clinica_veterinaria_destino","etiqueta_es":"Clínica veterinaria de destino","etiqueta_en":"Destination veterinary clinic","tipo":"text","requerido":true,"max":200},
      {"clave":"razon_procedimiento","etiqueta_es":"Razón / procedimiento","etiqueta_en":"Reason / procedure","tipo":"textarea","requerido":false,"max":2000},
      {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":3000}
    ]'::jsonb,
    acepta_adjuntos = false,
    max_adjuntos = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'remision';
