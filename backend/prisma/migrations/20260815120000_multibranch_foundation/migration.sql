-- Multisede: la organización sigue siendo el tenant y cada operación local
-- referencia una sede autorizada. Los catálogos visibles se relacionan por UUID.

INSERT INTO configuracion.parametros (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado, created_by, updated_by)
VALUES
  (gen_random_uuid(), 'dias_semana', 'lunes', 'Lunes', 1, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'martes', 'Martes', 2, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'miercoles', 'Miércoles', 3, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'jueves', 'Jueves', 4, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'viernes', 'Viernes', 5, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'sabado', 'Sábado', 6, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'dias_semana', 'domingo', 'Domingo', 7, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'estados_sesion_caja', 'abierta', 'Abierta', 1, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'estados_sesion_caja', 'cerrada', 'Cerrada', 2, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'estados_sesion_caja', 'anulada', 'Anulada', 3, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_movimiento_caja', 'ingreso', 'Ingreso', 1, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_movimiento_caja', 'egreso', 'Egreso', 2, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_movimiento_caja', 'venta', 'Venta', 3, 1, 'migration', 'migration'),
  (gen_random_uuid(), 'tipos_movimiento_caja', 'devolucion', 'Devolución', 4, 1, 'migration', 'migration')
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, orden = EXCLUDED.orden, estado = 1, updated_by = 'migration';

INSERT INTO configuracion.parametros_traducciones (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by)
SELECT gen_random_uuid(), p.id_parametros, idioma.codigo_idioma,
  CASE idioma.codigo_idioma
    WHEN 'en' THEN CASE p.codigo
      WHEN 'lunes' THEN 'Monday' WHEN 'martes' THEN 'Tuesday' WHEN 'miercoles' THEN 'Wednesday'
      WHEN 'jueves' THEN 'Thursday' WHEN 'viernes' THEN 'Friday' WHEN 'sabado' THEN 'Saturday'
      WHEN 'domingo' THEN 'Sunday' WHEN 'abierta' THEN 'Open' WHEN 'cerrada' THEN 'Closed'
      WHEN 'anulada' THEN 'Void' WHEN 'ingreso' THEN 'Income' WHEN 'egreso' THEN 'Expense'
      WHEN 'venta' THEN 'Sale' WHEN 'devolucion' THEN 'Refund' END
    ELSE p.etiqueta
  END,
  'migration', 'migration'
FROM configuracion.parametros p
CROSS JOIN (VALUES ('es'), ('en')) idioma(codigo_idioma)
WHERE p.codigo_grupo IN ('dias_semana', 'estados_sesion_caja', 'tipos_movimiento_caja')
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET etiqueta = EXCLUDED.etiqueta, updated_by = 'migration';

CREATE TABLE nucleo.sedes (
  id_sedes uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL,
  codigo varchar(30) NOT NULL, nombre varchar(120) NOT NULL, es_principal boolean NOT NULL DEFAULT false,
  sin_sede_fisica boolean NOT NULL DEFAULT false, direccion varchar(250), referencia varchar(200),
  fid_admin_level_0 uuid, fid_admin_level_3 uuid, latitud numeric(10,8), longitud numeric(11,8),
  telefono varchar(30), telefono_secundario varchar(30), correo_contacto varchar(120),
  agenda_activa boolean NOT NULL DEFAULT true, duracion_cita_estimada integer NOT NULL DEFAULT 20,
  estado integer NOT NULL DEFAULT 1, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text, updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  eliminado_en timestamptz(3), eliminado_por uuid,
  CONSTRAINT sedes_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sedes_pais_fk FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT,
  CONSTRAINT sedes_ubigeo_fk FOREIGN KEY (fid_admin_level_3) REFERENCES configuracion.admin_level_3(id_admin_level_3) ON DELETE RESTRICT,
  CONSTRAINT sedes_codigo_uk UNIQUE (fid_organizaciones, codigo),
  CONSTRAINT sedes_tenant_uk UNIQUE (id_sedes, fid_organizaciones),
  CONSTRAINT sedes_estado_ck CHECK (estado IN (0,1)),
  CONSTRAINT sedes_duracion_ck CHECK (duracion_cita_estimada BETWEEN 5 AND 480),
  CONSTRAINT sedes_geo_ck CHECK ((latitud IS NULL AND longitud IS NULL) OR (latitud BETWEEN -90 AND 90 AND longitud BETWEEN -180 AND 180)),
  CONSTRAINT sedes_direccion_ck CHECK (sin_sede_fisica OR direccion IS NOT NULL)
);
CREATE UNIQUE INDEX sedes_principal_activa_uk ON nucleo.sedes(fid_organizaciones) WHERE es_principal AND eliminado_en IS NULL;
CREATE INDEX sedes_listado_idx ON nucleo.sedes(fid_organizaciones, eliminado_en, created_at DESC, id_sedes DESC);

CREATE TABLE seguridad.usuarios_sedes (
  id_usuarios_sedes uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL,
  fid_usuarios uuid NOT NULL, fid_sedes uuid NOT NULL, estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  CONSTRAINT usuarios_sedes_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT usuarios_sedes_usuario_fk FOREIGN KEY (fid_usuarios, fid_organizaciones) REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT usuarios_sedes_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT usuarios_sedes_uk UNIQUE (fid_usuarios, fid_sedes)
);
CREATE INDEX usuarios_sedes_usuario_idx ON seguridad.usuarios_sedes(fid_organizaciones, fid_usuarios, estado);
CREATE INDEX usuarios_sedes_sede_idx ON seguridad.usuarios_sedes(fid_sedes, estado);

CREATE TABLE nucleo.sedes_servicios_veterinaria (
  id_sedes_servicios_veterinaria uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL,
  fid_sedes uuid NOT NULL, fid_servicios_veterinaria uuid NOT NULL, precio numeric(12,2), estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  CONSTRAINT sedes_servicios_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT sedes_servicios_servicio_fk FOREIGN KEY (fid_servicios_veterinaria, fid_organizaciones) REFERENCES nucleo.servicios_veterinaria(id_servicios_veterinaria, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sedes_servicios_uk UNIQUE (fid_sedes, fid_servicios_veterinaria),
  CONSTRAINT sedes_servicios_precio_ck CHECK (precio IS NULL OR precio >= 0)
);
CREATE INDEX sedes_servicios_sede_idx ON nucleo.sedes_servicios_veterinaria(fid_organizaciones, fid_sedes, estado);

CREATE TABLE nucleo.horarios_atencion_sedes (
  id_horarios_atencion_sedes uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL,
  fid_sedes uuid NOT NULL, fid_parametros_dia_semana uuid NOT NULL, turno integer NOT NULL DEFAULT 1,
  hora_apertura varchar(5), hora_cierre varchar(5), cerrado boolean NOT NULL DEFAULT false, estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  CONSTRAINT horarios_sedes_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT horarios_sedes_dia_fk FOREIGN KEY (fid_parametros_dia_semana) REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT horarios_sedes_uk UNIQUE (fid_sedes, fid_parametros_dia_semana, turno),
  CONSTRAINT horarios_sedes_turno_ck CHECK (turno BETWEEN 1 AND 10),
  CONSTRAINT horarios_sedes_horas_ck CHECK ((cerrado AND hora_apertura IS NULL AND hora_cierre IS NULL) OR (NOT cerrado AND hora_apertura ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND hora_cierre ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND hora_apertura < hora_cierre))
);
CREATE INDEX horarios_sedes_idx ON nucleo.horarios_atencion_sedes(fid_organizaciones, fid_sedes, estado);

CREATE TABLE nucleo.almacenes (
  id_almacenes uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL, fid_sedes uuid NOT NULL,
  codigo varchar(30) NOT NULL, nombre varchar(120) NOT NULL, es_principal boolean NOT NULL DEFAULT false,
  estado integer NOT NULL DEFAULT 1, created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text, eliminado_en timestamptz(3), eliminado_por uuid,
  CONSTRAINT almacenes_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT almacenes_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT almacenes_tenant_uk UNIQUE (id_almacenes, fid_organizaciones), CONSTRAINT almacenes_codigo_uk UNIQUE (fid_organizaciones, codigo)
);
CREATE INDEX almacenes_sede_idx ON nucleo.almacenes(fid_sedes, estado);

CREATE TABLE nucleo.cajas (
  id_cajas uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL, fid_sedes uuid NOT NULL,
  codigo varchar(30) NOT NULL, nombre varchar(120) NOT NULL, estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text, eliminado_en timestamptz(3), eliminado_por uuid,
  CONSTRAINT cajas_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT cajas_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT cajas_tenant_uk UNIQUE (id_cajas, fid_organizaciones), CONSTRAINT cajas_codigo_uk UNIQUE (fid_organizaciones, codigo)
);
CREATE INDEX cajas_sede_idx ON nucleo.cajas(fid_sedes, estado);

CREATE TABLE nucleo.sesiones_caja (
  id_sesiones_caja uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL, fid_cajas uuid NOT NULL,
  fid_usuarios_apertura uuid NOT NULL, fid_usuarios_cierre uuid, fid_parametros_estado uuid NOT NULL,
  monto_apertura numeric(14,2) NOT NULL, monto_cierre numeric(14,2), abierta_en timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrada_en timestamptz(3), observaciones varchar(500), estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  CONSTRAINT sesiones_caja_tenant_uk UNIQUE (id_sesiones_caja, fid_organizaciones),
  CONSTRAINT sesiones_caja_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sesiones_caja_caja_fk FOREIGN KEY (fid_cajas, fid_organizaciones) REFERENCES nucleo.cajas(id_cajas, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sesiones_caja_apertura_fk FOREIGN KEY (fid_usuarios_apertura, fid_organizaciones) REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sesiones_caja_cierre_fk FOREIGN KEY (fid_usuarios_cierre, fid_organizaciones) REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT sesiones_caja_estado_fk FOREIGN KEY (fid_parametros_estado) REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT
);
CREATE INDEX sesiones_caja_idx ON nucleo.sesiones_caja(fid_cajas, estado, abierta_en);

CREATE TABLE nucleo.movimientos_caja (
  id_movimientos_caja uuid PRIMARY KEY DEFAULT gen_random_uuid(), fid_organizaciones uuid NOT NULL,
  fid_sesiones_caja uuid NOT NULL, fid_parametros_tipo uuid NOT NULL, monto numeric(14,2) NOT NULL,
  concepto varchar(250) NOT NULL, referencia varchar(120), estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_by text,
  CONSTRAINT movimientos_caja_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT movimientos_caja_sesion_fk FOREIGN KEY (fid_sesiones_caja, fid_organizaciones) REFERENCES nucleo.sesiones_caja(id_sesiones_caja, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT movimientos_caja_tipo_fk FOREIGN KEY (fid_parametros_tipo) REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT movimientos_caja_monto_ck CHECK (monto > 0)
);
CREATE INDEX movimientos_caja_sesion_idx ON nucleo.movimientos_caja(fid_sesiones_caja, created_at);

ALTER TABLE seguridad.preferencias_usuario ADD COLUMN fid_sedes uuid;
ALTER TABLE seguridad.preferencias_usuario ADD CONSTRAINT preferencias_usuario_sede_fk FOREIGN KEY (fid_sedes) REFERENCES nucleo.sedes(id_sedes) ON DELETE SET NULL;
CREATE INDEX preferencias_usuario_sede_idx ON seguridad.preferencias_usuario(fid_sedes);
ALTER TABLE personas.atenciones ADD COLUMN fid_sedes uuid;
ALTER TABLE nucleo.ventas ADD COLUMN fid_sedes uuid, ADD COLUMN fid_sesiones_caja uuid;
ALTER TABLE nucleo.citas ADD COLUMN fid_sedes uuid;
ALTER TABLE nucleo.lotes_productos ADD COLUMN fid_almacenes uuid;
ALTER TABLE nucleo.movimientos_inventario ADD COLUMN fid_almacenes uuid;

-- Cada tenant existente recibe una sede principal conservando su configuración actual.
INSERT INTO nucleo.sedes (
  id_sedes, fid_organizaciones, codigo, nombre, es_principal, sin_sede_fisica, direccion, referencia,
  fid_admin_level_0, fid_admin_level_3, latitud, longitud, telefono, telefono_secundario, correo_contacto,
  agenda_activa, duracion_cita_estimada, created_by, updated_by
)
SELECT gen_random_uuid(), o.id_organizaciones, 'PRINCIPAL', o.nombre, true,
  (COALESCE(p.sin_sede_fisica, false) OR p.direccion IS NULL), p.direccion, p.referencia, p.fid_admin_level_0, p.fid_admin_level_3,
  p.latitud, p.longitud, p.telefono, p.telefono_secundario, p.correo_contacto,
  o.agenda_activa, o.duracion_cita_estimada, 'migration', 'migration'
FROM nucleo.organizaciones o
LEFT JOIN nucleo.perfil_organizacion p ON p.fid_organizaciones = o.id_organizaciones AND p.estado = 1;

INSERT INTO seguridad.usuarios_sedes (fid_organizaciones, fid_usuarios, fid_sedes, created_by, updated_by)
SELECT u.fid_organizaciones, u.id_usuarios, s.id_sedes, 'migration', 'migration'
FROM seguridad.usuarios u JOIN nucleo.sedes s ON s.fid_organizaciones = u.fid_organizaciones AND s.es_principal
WHERE u.eliminado_en IS NULL ON CONFLICT (fid_usuarios, fid_sedes) DO NOTHING;
UPDATE seguridad.preferencias_usuario p SET fid_sedes = s.id_sedes, updated_by = 'migration'
FROM seguridad.usuarios u JOIN nucleo.sedes s ON s.fid_organizaciones = u.fid_organizaciones AND s.es_principal
WHERE p.fid_usuarios = u.id_usuarios;

INSERT INTO nucleo.sedes_servicios_veterinaria (fid_organizaciones, fid_sedes, fid_servicios_veterinaria, created_by, updated_by)
SELECT sv.fid_organizaciones, s.id_sedes, sv.id_servicios_veterinaria, 'migration', 'migration'
FROM nucleo.servicios_veterinaria sv JOIN nucleo.sedes s ON s.fid_organizaciones = sv.fid_organizaciones AND s.es_principal
WHERE sv.eliminado_en IS NULL ON CONFLICT DO NOTHING;

INSERT INTO nucleo.horarios_atencion_sedes (fid_organizaciones, fid_sedes, fid_parametros_dia_semana, turno, hora_apertura, hora_cierre, cerrado, created_by, updated_by)
SELECT h.fid_organizaciones, s.id_sedes, p.id_parametros, h.turno, h.hora_apertura, h.hora_cierre, h.cerrado, 'migration', 'migration'
FROM nucleo.horarios_atencion_organizacion h
JOIN nucleo.sedes s ON s.fid_organizaciones = h.fid_organizaciones AND s.es_principal
JOIN configuracion.parametros p ON p.codigo_grupo = 'dias_semana' AND p.orden = h.dia_semana
WHERE h.estado = 1 ON CONFLICT DO NOTHING;

INSERT INTO nucleo.almacenes (fid_organizaciones, fid_sedes, codigo, nombre, es_principal, created_by, updated_by)
SELECT fid_organizaciones, id_sedes, 'PRINCIPAL', 'Almacén principal', true, 'migration', 'migration' FROM nucleo.sedes WHERE es_principal;
INSERT INTO nucleo.cajas (fid_organizaciones, fid_sedes, codigo, nombre, created_by, updated_by)
SELECT fid_organizaciones, id_sedes, 'PRINCIPAL', 'Caja principal', 'migration', 'migration' FROM nucleo.sedes WHERE es_principal;

UPDATE personas.atenciones a SET fid_sedes = s.id_sedes FROM nucleo.sedes s WHERE s.fid_organizaciones = a.fid_organizaciones AND s.es_principal;
UPDATE nucleo.ventas v SET fid_sedes = s.id_sedes FROM nucleo.sedes s WHERE s.fid_organizaciones = v.fid_organizaciones AND s.es_principal;
UPDATE nucleo.citas c SET fid_sedes = s.id_sedes FROM nucleo.sedes s WHERE s.fid_organizaciones = c.fid_organizaciones AND s.es_principal;
UPDATE nucleo.lotes_productos l SET fid_almacenes = a.id_almacenes FROM nucleo.almacenes a WHERE a.fid_organizaciones = l.fid_organizaciones AND a.es_principal;
UPDATE nucleo.movimientos_inventario m SET fid_almacenes = a.id_almacenes FROM nucleo.almacenes a WHERE a.fid_organizaciones = m.fid_organizaciones AND a.es_principal;

ALTER TABLE personas.atenciones ALTER COLUMN fid_sedes SET NOT NULL;
ALTER TABLE nucleo.ventas ALTER COLUMN fid_sedes SET NOT NULL;
ALTER TABLE nucleo.citas ALTER COLUMN fid_sedes SET NOT NULL;
ALTER TABLE nucleo.lotes_productos ALTER COLUMN fid_almacenes SET NOT NULL;
ALTER TABLE nucleo.movimientos_inventario ALTER COLUMN fid_almacenes SET NOT NULL;
ALTER TABLE personas.atenciones ADD CONSTRAINT atenciones_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT;
ALTER TABLE nucleo.ventas ADD CONSTRAINT ventas_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT;
ALTER TABLE nucleo.ventas ADD CONSTRAINT ventas_sesion_caja_fk FOREIGN KEY (fid_sesiones_caja, fid_organizaciones) REFERENCES nucleo.sesiones_caja(id_sesiones_caja, fid_organizaciones) ON DELETE RESTRICT;
ALTER TABLE nucleo.citas ADD CONSTRAINT citas_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones) REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE RESTRICT;
ALTER TABLE nucleo.lotes_productos ADD CONSTRAINT lotes_almacen_fk FOREIGN KEY (fid_almacenes, fid_organizaciones) REFERENCES nucleo.almacenes(id_almacenes, fid_organizaciones) ON DELETE RESTRICT;
ALTER TABLE nucleo.movimientos_inventario ADD CONSTRAINT movimientos_almacen_fk FOREIGN KEY (fid_almacenes, fid_organizaciones) REFERENCES nucleo.almacenes(id_almacenes, fid_organizaciones) ON DELETE RESTRICT;
CREATE INDEX atenciones_sede_idx ON personas.atenciones(fid_sedes, fecha_atencion, llegada_en);
CREATE INDEX ventas_sede_idx ON nucleo.ventas(fid_sedes, created_at);
CREATE INDEX citas_sede_idx ON nucleo.citas(fid_sedes, inicia_en);
CREATE INDEX lotes_almacen_idx ON nucleo.lotes_productos(fid_almacenes);
CREATE INDEX movimientos_almacen_idx ON nucleo.movimientos_inventario(fid_almacenes);

DO $$ DECLARE tabla regclass; BEGIN
  FOREACH tabla IN ARRAY ARRAY['nucleo.sedes'::regclass,'seguridad.usuarios_sedes'::regclass,'nucleo.sedes_servicios_veterinaria'::regclass,'nucleo.horarios_atencion_sedes'::regclass,'nucleo.almacenes'::regclass,'nucleo.cajas'::regclass,'nucleo.sesiones_caja'::regclass,'nucleo.movimientos_caja'::regclass]
  LOOP EXECUTE format('CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at()', tabla); END LOOP;
END $$;

INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, descripcion, icono, ruta, fid_modulos_padre, requiere_permiso, orden, estado, created_by, updated_by)
SELECT gen_random_uuid(), 'administrator.company.branches', 'Sedes', 'Administra las sedes, servicios y horarios de atención de la veterinaria.',
  'map-pin', '/administrator/company/branches', padre.id_modulos, 'administrator.company.branches.read', 115, 1, 'migration', 'migration'
FROM configuracion.modulos padre WHERE padre.codigo = 'administrator.company.general'
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, icono = EXCLUDED.icono, ruta = EXCLUDED.ruta, fid_modulos_padre = EXCLUDED.fid_modulos_padre, requiere_permiso = EXCLUDED.requiere_permiso, orden = EXCLUDED.orden, estado = 1, updated_by = 'migration';

WITH capacidades(codigo, accion) AS (VALUES
 ('administrator.company.branches.read','read'),('administrator.company.branches.create','create'),
 ('administrator.company.branches.update','update'),('administrator.company.branches.delete','delete'))
INSERT INTO seguridad.permisos (id_permisos, fid_modulos, codigo, accion, descripcion, estado, created_by, updated_by)
SELECT gen_random_uuid(), m.id_modulos, c.codigo, c.accion,
  'Sedes: ' || CASE c.accion WHEN 'read' THEN 'Ver' WHEN 'create' THEN 'Crear' WHEN 'update' THEN 'Actualizar' ELSE 'Eliminar' END,
  1, 'migration', 'migration'
FROM capacidades c CROSS JOIN configuracion.modulos m WHERE m.codigo = 'administrator.company.branches'
ON CONFLICT (codigo) DO UPDATE SET fid_modulos = EXCLUDED.fid_modulos, accion = EXCLUDED.accion, descripcion = EXCLUDED.descripcion, estado = 1, updated_by = 'migration';

INSERT INTO configuracion.planes_modulos (id_planes_modulos, fid_planes, fid_modulos, estado, created_by, updated_by)
SELECT gen_random_uuid(), pl.id_planes, m.id_modulos, 1, 'migration', 'migration'
FROM configuracion.planes pl CROSS JOIN configuracion.modulos m
WHERE pl.estado = 1 AND pl.eliminado_en IS NULL AND m.codigo = 'administrator.company.branches'
ON CONFLICT (fid_planes, fid_modulos) DO UPDATE SET estado = 1, updated_by = 'migration';

INSERT INTO seguridad.roles_permisos (id_roles_permisos, fid_roles, fid_permisos, estado, created_by, updated_by)
SELECT gen_random_uuid(), r.id_roles, p.id_permisos, 1, 'migration', 'migration'
FROM seguridad.roles r CROSS JOIN seguridad.permisos p
WHERE r.codigo IN ('ADMIN','SUPERADMIN') AND r.estado = 1 AND p.codigo LIKE 'administrator.company.branches.%'
ON CONFLICT (fid_roles, fid_permisos) DO UPDATE SET estado = 1, updated_by = 'migration';
