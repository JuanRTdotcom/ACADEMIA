CREATE TABLE nucleo.servicios_peluqueria_spa (
  id_servicios_peluqueria_spa uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(160) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT servicios_peluqueria_spa_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT servicios_peluqueria_spa_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 160),
  CONSTRAINT servicios_peluqueria_spa_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT servicios_peluqueria_spa_id_organizacion_unique UNIQUE (id_servicios_peluqueria_spa, fid_organizaciones)
);
CREATE INDEX servicios_peluqueria_spa_organizacion_idx ON nucleo.servicios_peluqueria_spa(fid_organizaciones, eliminado_en, estado, created_at DESC);
CREATE UNIQUE INDEX servicios_peluqueria_spa_nombre_activo_unique ON nucleo.servicios_peluqueria_spa(fid_organizaciones, upper(btrim(nombre))) WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON nucleo.servicios_peluqueria_spa FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

INSERT INTO nucleo.servicios_peluqueria_spa (fid_organizaciones, nombre, created_by, updated_by)
SELECT organizacion.id_organizaciones, servicio.nombre, 'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN (VALUES ('Baño'), ('Baño medicado'), ('Corte de pelo'), ('Baño y corte'), ('Cepillado y deslanado'), ('Corte de uñas'), ('Limpieza de oídos'), ('Limpieza dental estética'), ('Tratamiento antipulgas'), ('Hidratación y spa')) servicio(nombre)
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

CREATE TABLE personas.servicios_registro_peluqueria_spa (
  id_servicios_registro_peluqueria_spa uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  fid_registros_atencion uuid NOT NULL,
  fid_servicios_peluqueria_spa uuid NOT NULL,
  fid_usuarios_encargado uuid NOT NULL,
  motivo varchar(500) NOT NULL,
  detalle_observaciones varchar(2000),
  orden integer NOT NULL DEFAULT 0,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  CONSTRAINT servicios_registro_peluqueria_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT servicios_registro_peluqueria_motivo_check CHECK (char_length(btrim(motivo)) BETWEEN 2 AND 500),
  CONSTRAINT servicios_registro_peluqueria_detalle_check CHECK (detalle_observaciones IS NULL OR char_length(btrim(detalle_observaciones)) BETWEEN 1 AND 2000),
  CONSTRAINT servicios_registro_peluqueria_registro_tenant_fk FOREIGN KEY (fid_registros_atencion, fid_organizaciones) REFERENCES personas.registros_atencion(id_registros_atencion, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT servicios_registro_peluqueria_servicio_tenant_fk FOREIGN KEY (fid_servicios_peluqueria_spa, fid_organizaciones) REFERENCES nucleo.servicios_peluqueria_spa(id_servicios_peluqueria_spa, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT servicios_registro_peluqueria_encargado_tenant_fk FOREIGN KEY (fid_usuarios_encargado, fid_organizaciones) REFERENCES seguridad.usuarios(id_usuarios, fid_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT servicios_registro_peluqueria_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE RESTRICT,
  CONSTRAINT servicios_registro_peluqueria_id_tenant_unique UNIQUE (id_servicios_registro_peluqueria_spa, fid_organizaciones)
);
CREATE INDEX servicios_registro_peluqueria_registro_idx ON personas.servicios_registro_peluqueria_spa(fid_registros_atencion, orden);
CREATE INDEX servicios_registro_peluqueria_servicio_idx ON personas.servicios_registro_peluqueria_spa(fid_servicios_peluqueria_spa);
CREATE INDEX servicios_registro_peluqueria_encargado_idx ON personas.servicios_registro_peluqueria_spa(fid_usuarios_encargado);
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.servicios_registro_peluqueria_spa FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

WITH opciones(codigo, etiqueta_es, etiqueta_en, orden) AS (VALUES ('antes', 'Antes', 'Before', 10), ('despues', 'Después', 'After', 20))
INSERT INTO configuracion.parametros (id_parametros, codigo_grupo, codigo, etiqueta, orden, estado, created_by, updated_by)
SELECT gen_random_uuid(), 'etapas_foto_peluqueria_spa', codigo, etiqueta_es, orden, 1, 'migration', 'migration' FROM opciones
ON CONFLICT (codigo_grupo, codigo) DO UPDATE SET etiqueta=EXCLUDED.etiqueta, orden=EXCLUDED.orden, estado=1, updated_at=CURRENT_TIMESTAMP, updated_by='migration';

WITH opciones(codigo, etiqueta_es, etiqueta_en) AS (VALUES ('antes', 'Antes', 'Before'), ('despues', 'Después', 'After')), traducciones AS (
  SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta FROM opciones JOIN configuracion.parametros parametro ON parametro.codigo_grupo='etapas_foto_peluqueria_spa' AND parametro.codigo=opciones.codigo CROSS JOIN LATERAL (VALUES ('es', opciones.etiqueta_es), ('en', opciones.etiqueta_en)) idioma(codigo_idioma, etiqueta)
)
INSERT INTO configuracion.parametros_traducciones (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by)
SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'migration', 'migration' FROM traducciones
ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET etiqueta=EXCLUDED.etiqueta, updated_at=CURRENT_TIMESTAMP, updated_by='migration';

ALTER TABLE personas.adjuntos_registro_atencion ADD COLUMN fid_parametros_etapa_foto_peluqueria uuid,
  ADD CONSTRAINT adjuntos_registro_etapa_foto_peluqueria_fk FOREIGN KEY (fid_parametros_etapa_foto_peluqueria) REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT;
CREATE INDEX adjuntos_registro_etapa_foto_peluqueria_idx ON personas.adjuntos_registro_atencion(fid_parametros_etapa_foto_peluqueria, eliminado_en);

UPDATE configuracion.tipos_registro_atencion
SET nombre_es='Peluquería y spa', nombre_en='Grooming and spa', descripcion_es='Registra servicios de peluquería, responsable, fotos y próxima cita.', descripcion_en='Records grooming services, staff, photos, and the next appointment.', icono='sparkles',
campos='[
 {"clave":"servicios","etiqueta_es":"Servicios realizados","etiqueta_en":"Services provided","tipo":"list","requerido":true,"min_items":1,"max_items":30,"campos":[
   {"clave":"fid_servicios_peluqueria_spa","etiqueta_es":"Tipo de servicio","etiqueta_en":"Service type","tipo":"uuid","fuente":"servicios_peluqueria_spa","requerido":true},
   {"clave":"motivo","etiqueta_es":"Motivo","etiqueta_en":"Reason","tipo":"text","requerido":true,"min":2,"max":500},
   {"clave":"fid_usuarios_encargado","etiqueta_es":"Encargado","etiqueta_en":"Staff member","tipo":"uuid","fuente":"usuarios_organizacion","requerido":true},
   {"clave":"detalle_observaciones","etiqueta_es":"Detalle / observaciones","etiqueta_en":"Details / notes","tipo":"textarea","requerido":false,"max":2000}
 ]},
 {"clave":"observaciones_generales","etiqueta_es":"Observaciones generales","etiqueta_en":"General notes","tipo":"textarea","requerido":false,"max":4000},
 {"clave":"cantidad_fotos_antes","etiqueta_es":"Fotos antes","etiqueta_en":"Before photos","tipo":"number","requerido":true,"min":0,"max":5},
 {"clave":"cantidad_fotos_despues","etiqueta_es":"Fotos después","etiqueta_en":"After photos","tipo":"number","requerido":true,"min":0,"max":5},
 {"clave":"fecha_programada","etiqueta_es":"Próxima cita","etiqueta_en":"Next appointment","tipo":"date","requerido":false}
]'::jsonb, acepta_adjuntos=true, max_adjuntos=10, updated_at=CURRENT_TIMESTAMP, updated_by='migration'
WHERE codigo='peluqueria_spa';

UPDATE configuracion.modulos SET orden=orden+10, updated_by='migration' WHERE codigo='administrator.users' AND orden>=270;
INSERT INTO configuracion.modulos (id_modulos,codigo,nombre,descripcion,icono,ruta,orden,estado,created_by,updated_by)
VALUES (gen_random_uuid(),'administrator.grooming_services','Peluquería y spa','Administra los servicios de peluquería y spa de la veterinaria.','sparkles','/administrator/grooming-services',270,1,'migration','migration')
ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre,descripcion=EXCLUDED.descripcion,icono=EXCLUDED.icono,ruta=EXCLUDED.ruta,fid_modulos_padre=NULL,orden=EXCLUDED.orden,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

WITH capacidades(codigo,accion,descripcion) AS (VALUES
 ('administrator.grooming_services.read','read','Peluquería y spa: Ver'),
 ('administrator.grooming_services.create','create','Peluquería y spa: Crear'),
 ('administrator.grooming_services.update','update','Peluquería y spa: Actualizar'),
 ('administrator.grooming_services.delete','delete','Peluquería y spa: Eliminar'))
INSERT INTO seguridad.permisos (id_permisos,fid_modulos,codigo,accion,descripcion,estado,created_by,updated_by)
SELECT gen_random_uuid(),modulo.id_modulos,capacidad.codigo,capacidad.accion,capacidad.descripcion,1,'migration','migration' FROM capacidades capacidad JOIN configuracion.modulos modulo ON modulo.codigo='administrator.grooming_services'
ON CONFLICT (codigo) DO UPDATE SET fid_modulos=EXCLUDED.fid_modulos,accion=EXCLUDED.accion,descripcion=EXCLUDED.descripcion,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO configuracion.planes_modulos (id_planes_modulos,fid_planes,fid_modulos,estado,created_by,updated_by)
SELECT gen_random_uuid(),plan.id_planes,modulo.id_modulos,1,'migration','migration' FROM configuracion.planes plan JOIN configuracion.modulos modulo ON modulo.codigo='administrator.grooming_services' WHERE plan.codigo IN ('BASIC','PREMIUM','FULL','SYSTEM')
ON CONFLICT (fid_planes,fid_modulos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';

INSERT INTO seguridad.roles_permisos (id_roles_permisos,fid_roles,fid_permisos,estado,created_by,updated_by)
SELECT gen_random_uuid(),rol.id_roles,permiso.id_permisos,1,'migration','migration' FROM seguridad.roles rol CROSS JOIN seguridad.permisos permiso WHERE rol.codigo IN ('ADMIN','SUPERADMIN') AND rol.eliminado_en IS NULL AND permiso.codigo LIKE 'administrator.grooming_services.%'
ON CONFLICT (fid_roles,fid_permisos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
