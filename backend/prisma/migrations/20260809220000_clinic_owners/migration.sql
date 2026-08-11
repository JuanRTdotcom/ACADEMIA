WITH fuentes(codigo, etiqueta, orden) AS (
  VALUES
    ('redes_sociales', 'Redes sociales', 10),
    ('recomendacion_cliente', 'Recomendación de otro cliente', 20),
    ('referido_veterinaria', 'Referido por otra veterinaria', 30),
    ('busqueda_internet', 'Búsqueda en internet', 40),
    ('publicidad_fisica', 'Publicidad física', 50),
    ('evento_campana', 'Evento o campaña veterinaria', 60),
    ('ubicacion_cercania', 'Ubicación o cercanía', 70),
    ('otro', 'Otro', 80)
)
INSERT INTO configuracion.parametros (
  id_parametros, codigo_grupo, codigo, etiqueta, orden, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), 'como_conocio_veterinaria', codigo, etiqueta, orden, 1,
       'migration', 'migration'
FROM fuentes
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_by = 'migration';

WITH etiquetas(codigo, etiqueta_es, etiqueta_en) AS (
  VALUES
    ('redes_sociales', 'Redes sociales', 'Social media'),
    ('recomendacion_cliente', 'Recomendación de otro cliente', 'Recommendation from another client'),
    ('referido_veterinaria', 'Referido por otra veterinaria', 'Referred by another veterinary practice'),
    ('busqueda_internet', 'Búsqueda en internet', 'Internet search'),
    ('publicidad_fisica', 'Publicidad física', 'Print advertising'),
    ('evento_campana', 'Evento o campaña veterinaria', 'Veterinary event or campaign'),
    ('ubicacion_cercania', 'Ubicación o cercanía', 'Location or proximity'),
    ('otro', 'Otro', 'Other')
), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
  FROM etiquetas
  JOIN configuracion.parametros parametro
    ON parametro.codigo_grupo = 'como_conocio_veterinaria'
   AND parametro.codigo = etiquetas.codigo
  CROSS JOIN LATERAL (
    VALUES ('es', etiquetas.etiqueta_es), ('en', etiquetas.etiqueta_en)
  ) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (
  id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta,
  created_by, updated_by
)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta,
       'migration', 'migration'
FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
  etiqueta = EXCLUDED.etiqueta,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';

CREATE TABLE personas.propietarios (
  id_propietarios uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_parametros_tipo_documento uuid NOT NULL,
  numero_documento varchar(40) NOT NULL,
  nombre_completo varchar(150) NOT NULL,
  celular varchar(30) NOT NULL,
  celular_verificado_en timestamptz(3),
  sin_correo boolean NOT NULL DEFAULT false,
  correo varchar(254),
  correo_verificado_en timestamptz(3),
  telefono_fijo varchar(30),
  direccion varchar(200) NOT NULL,
  fid_admin_level_0 uuid NOT NULL,
  fid_admin_level_3 uuid NOT NULL,
  contacto_alternativo_nombre varchar(150),
  contacto_alternativo_telefono varchar(30),
  fid_parametros_como_conocio uuid NOT NULL,
  como_conocio_otro varchar(150),
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT propietarios_organizacion_fk
    FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT propietarios_tipo_documento_fk
    FOREIGN KEY (fid_parametros_tipo_documento)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT propietarios_como_conocio_fk
    FOREIGN KEY (fid_parametros_como_conocio)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT propietarios_pais_fk
    FOREIGN KEY (fid_admin_level_0)
    REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT propietarios_admin_level_3_fk
    FOREIGN KEY (fid_admin_level_3)
    REFERENCES configuracion.admin_level_3(id_admin_level_3) ON DELETE RESTRICT,
  CONSTRAINT propietarios_nombre_valido_check
    CHECK (char_length(btrim(nombre_completo)) BETWEEN 2 AND 150),
  CONSTRAINT propietarios_documento_valido_check
    CHECK (char_length(btrim(numero_documento)) BETWEEN 3 AND 40),
  CONSTRAINT propietarios_celular_valido_check
    CHECK (char_length(btrim(celular)) BETWEEN 6 AND 30),
  CONSTRAINT propietarios_direccion_valida_check
    CHECK (char_length(btrim(direccion)) BETWEEN 3 AND 200),
  CONSTRAINT propietarios_correo_check
    CHECK (
      (sin_correo = true AND correo IS NULL AND correo_verificado_en IS NULL)
      OR (sin_correo = false AND correo IS NOT NULL)
    ),
  CONSTRAINT propietarios_contacto_alternativo_check
    CHECK (
      (contacto_alternativo_nombre IS NULL AND contacto_alternativo_telefono IS NULL)
      OR (contacto_alternativo_nombre IS NOT NULL AND contacto_alternativo_telefono IS NOT NULL)
    ),
  CONSTRAINT propietarios_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT propietarios_eliminado_estado_check
    CHECK (eliminado_en IS NULL OR estado = 0)
);

CREATE UNIQUE INDEX propietarios_documento_activo_unique
  ON personas.propietarios (
    fid_organizaciones,
    fid_parametros_tipo_documento,
    upper(btrim(numero_documento))
  )
  WHERE eliminado_en IS NULL;
CREATE INDEX propietarios_organizacion_eliminado_nombre_idx
  ON personas.propietarios (fid_organizaciones, eliminado_en, nombre_completo);
CREATE INDEX propietarios_tipo_documento_idx
  ON personas.propietarios (fid_parametros_tipo_documento);
CREATE INDEX propietarios_como_conocio_idx
  ON personas.propietarios (fid_parametros_como_conocio);
CREATE INDEX propietarios_pais_idx
  ON personas.propietarios (fid_admin_level_0);
CREATE INDEX propietarios_admin_level_3_idx
  ON personas.propietarios (fid_admin_level_3);

CREATE TRIGGER establecer_updated_at
BEFORE UPDATE ON personas.propietarios
FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado,
  created_by, updated_by
)
VALUES (
  gen_random_uuid(), 'clinic', 'Consultorio',
  'Agrupa la operación clínica de propietarios, mascotas y visitas.',
  'heart', NULL, 300, 1, 'migration', 'migration'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_by = 'migration';

INSERT INTO configuracion.modulos (
  id_modulos, codigo, nombre, descripcion, icono, ruta,
  fid_modulos_padre, orden, estado, created_by, updated_by
)
SELECT gen_random_uuid(), 'clinic.owners', 'Propietarios',
       'Registra y administra a los responsables de las mascotas.',
       'contact', '/clinic/owners', padre.id_modulos, 310, 1,
       'migration', 'migration'
FROM configuracion.modulos padre
WHERE padre.codigo = 'clinic'
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  icono = EXCLUDED.icono,
  ruta = EXCLUDED.ruta,
  fid_modulos_padre = EXCLUDED.fid_modulos_padre,
  orden = EXCLUDED.orden,
  estado = 1,
  updated_by = 'migration';

WITH capacidades(codigo, accion, descripcion) AS (
  VALUES
    ('clinic.owners.read', 'read', 'Propietarios: Ver'),
    ('clinic.owners.create', 'create', 'Propietarios: Crear'),
    ('clinic.owners.update', 'update', 'Propietarios: Actualizar'),
    ('clinic.owners.delete', 'delete', 'Propietarios: Eliminar')
)
INSERT INTO seguridad.permisos (
  id_permisos, fid_modulos, codigo, accion, descripcion, estado,
  created_by, updated_by
)
SELECT gen_random_uuid(), modulo.id_modulos, capacidad.codigo,
       capacidad.accion, capacidad.descripcion, 1, 'migration', 'migration'
FROM capacidades capacidad
JOIN configuracion.modulos modulo ON modulo.codigo = 'clinic.owners'
ON CONFLICT (codigo) DO UPDATE SET
  fid_modulos = EXCLUDED.fid_modulos,
  accion = EXCLUDED.accion,
  descripcion = EXCLUDED.descripcion,
  estado = 1,
  updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (
  id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), plan.id_planes, modulo.id_modulos, 1,
       'migration', 'migration'
FROM configuracion.planes plan
CROSS JOIN configuracion.modulos modulo
WHERE plan.codigo IN ('BASIC', 'PREMIUM', 'FULL', 'SYSTEM')
  AND modulo.codigo IN ('clinic', 'clinic.owners')
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET
  estado = 1,
  updated_by = 'migration';

INSERT INTO seguridad.roles_permisos (
  id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by
)
SELECT gen_random_uuid(), rol.id_roles, permiso.id_permisos, 1,
       'migration', 'migration'
FROM seguridad.roles rol
CROSS JOIN seguridad.permisos permiso
WHERE rol.codigo IN ('ADMIN', 'SUPERADMIN')
  AND rol.eliminado_en IS NULL
  AND permiso.codigo LIKE 'clinic.owners.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET
  estado = 1,
  updated_by = 'migration';
