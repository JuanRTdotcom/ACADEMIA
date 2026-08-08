-- Acelera la búsqueda de credenciales activas por usuario y mecanismo.
CREATE INDEX "credenciales_fidUsuarios_tipo_estado_idx"
ON "seguridad"."credenciales" ("fidUsuarios", "tipo", "estado");

-- Un usuario puede conservar varias passkeys, pero solo una contraseña activa.
CREATE UNIQUE INDEX "credenciales_contrasenia_activa_unica"
ON "seguridad"."credenciales" ("fidUsuarios")
WHERE "tipo" = 'CONTRASENIA' AND "estado" = 1;
