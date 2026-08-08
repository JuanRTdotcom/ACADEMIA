UPDATE seguridad.usuarios SET usuario = UPPER(usuario);

ALTER TABLE seguridad.usuarios DROP CONSTRAINT usuarios_usuario_formato_check;
ALTER TABLE seguridad.usuarios
  ADD CONSTRAINT usuarios_usuario_formato_check
  CHECK (usuario ~ '^[A-Z0-9]{1,20}$');
