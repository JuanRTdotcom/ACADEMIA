CREATE TABLE nucleo.procedimientos_veterinarios (
  id_procedimientos_veterinarios uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones uuid NOT NULL,
  nombre varchar(160) NOT NULL,
  descripcion_guia varchar(1000) NOT NULL,
  estado integer NOT NULL DEFAULT 1,
  created_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by text,
  updated_at timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by text,
  eliminado_en timestamptz(3),
  eliminado_por uuid,
  CONSTRAINT procedimientos_veterinarios_estado_check CHECK (estado IN (0, 1)),
  CONSTRAINT procedimientos_veterinarios_nombre_check CHECK (char_length(btrim(nombre)) BETWEEN 2 AND 160),
  CONSTRAINT procedimientos_veterinarios_descripcion_check CHECK (char_length(btrim(descripcion_guia)) BETWEEN 5 AND 1000),
  CONSTRAINT procedimientos_veterinarios_organizacion_fk FOREIGN KEY (fid_organizaciones)
    REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE,
  CONSTRAINT procedimientos_veterinarios_id_organizacion_unique UNIQUE (id_procedimientos_veterinarios, fid_organizaciones)
);
CREATE INDEX procedimientos_veterinarios_organizacion_idx ON nucleo.procedimientos_veterinarios(fid_organizaciones, eliminado_en, estado, nombre);
CREATE UNIQUE INDEX procedimientos_veterinarios_nombre_activo_unique ON nucleo.procedimientos_veterinarios(fid_organizaciones, upper(btrim(nombre))) WHERE eliminado_en IS NULL;
CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON nucleo.procedimientos_veterinarios FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();

WITH procedimientos(nombre, descripcion) AS (
  VALUES
    ('Ovariohisterectomía', 'Se realiza preparación del campo quirúrgico, abordaje, procedimiento, control de hemostasia y cierre por planos.'),
    ('Orquiectomía / castración', 'Se realiza preparación del campo quirúrgico, abordaje, ligadura, resección y cierre según técnica empleada.'),
    ('Cesárea', 'Se realiza abordaje abdominal, extracción y valoración de neonatos, control de hemostasia y cierre por planos.'),
    ('Cirugía de piometra', 'Se realiza abordaje abdominal, aislamiento y extracción del útero afectado, lavado cuando corresponde y cierre por planos.'),
    ('Criptorquidectomía', 'Se localiza el testículo retenido, se realiza abordaje, ligadura y extracción, con cierre según la localización.'),
    ('Mastectomía', 'Se delimita el tejido afectado, se realiza resección con márgenes, control de hemostasia y cierre por planos.'),
    ('Herniorrafia umbilical', 'Se identifica el defecto, se reduce el contenido, se repara el anillo herniario y se realiza cierre por planos.'),
    ('Herniorrafia inguinal', 'Se identifica el defecto inguinal, se reduce el contenido, se repara el anillo y se realiza cierre por planos.'),
    ('Gastropexia', 'Se fija el estómago a la pared abdominal mediante la técnica seleccionada y se verifica la posición final.'),
    ('Gastrotomía', 'Se realiza abordaje gástrico, procedimiento indicado, revisión de la cavidad y cierre por planos.'),
    ('Enterotomía', 'Se realiza aislamiento intestinal, incisión controlada, procedimiento indicado y cierre verificando la integridad.'),
    ('Enterectomía y anastomosis', 'Se reseca el segmento afectado y se realiza anastomosis, verificando perfusión, estanqueidad y continuidad.'),
    ('Esplenectomía', 'Se realiza exposición, ligadura vascular, extracción del bazo, control de hemostasia y cierre por planos.'),
    ('Cistotomía', 'Se aborda la vejiga, se realiza el procedimiento indicado, lavado, comprobación de estanqueidad y cierre por planos.'),
    ('Uretrostomía', 'Se realiza el abordaje y creación de la nueva abertura uretral, control de hemostasia y fijación mucocutánea.'),
    ('Nefrectomía', 'Se identifica y liga el pedículo renal y uréter, se extrae el riñón y se verifica la hemostasia.'),
    ('Enucleación ocular', 'Se realiza preparación periocular, disección y extracción del globo ocular, hemostasia y cierre correspondiente.'),
    ('Corrección de entropión', 'Se marca y reseca el tejido necesario para corregir la posición palpebral y se realiza cierre fino.'),
    ('Profilaxis dental', 'Se realiza evaluación oral, remoción de cálculo, pulido y revisión final de piezas y tejidos.'),
    ('Extracción dental', 'Se realiza bloqueo local cuando corresponde, luxación y extracción de la pieza, revisión y cierre del alvéolo.'),
    ('Osteosíntesis de fractura', 'Se expone y reduce la fractura, se coloca el sistema de fijación seleccionado y se verifica la estabilidad.'),
    ('Corrección de luxación patelar', 'Se corrige la alineación del mecanismo extensor mediante la técnica seleccionada y se verifica estabilidad.'),
    ('Reparación de ligamento cruzado', 'Se aborda la articulación y se aplica la técnica de estabilización seleccionada, verificando rango y estabilidad.'),
    ('Amputación de extremidad', 'Se realiza ligadura vascular, sección controlada de tejidos y hueso, hemostasia y cierre por planos.'),
    ('Resección de masa cutánea', 'Se delimita y reseca la masa con los márgenes definidos, se controla hemostasia y se cierra el defecto.'),
    ('Biopsia incisional', 'Se obtiene una muestra representativa preservando la orientación, se controla hemostasia y se acondiciona para estudio.'),
    ('Biopsia excisional', 'Se retira completamente la lesión con los márgenes definidos y se acondiciona la muestra para estudio.'),
    ('Sutura de herida', 'Se realiza limpieza, evaluación de tejidos, hemostasia y cierre por planos según las características de la herida.'),
    ('Desbridamiento quirúrgico', 'Se retira tejido desvitalizado, se lava el área y se acondiciona la herida para el manejo indicado.'),
    ('Drenaje de absceso', 'Se realiza apertura, evacuación, lavado y colocación de drenaje cuando corresponde.'),
    ('Laparotomía exploratoria', 'Se realiza abordaje abdominal y exploración sistemática, documentando hallazgos y procedimientos adicionales.'),
    ('Extracción de cuerpo extraño', 'Se localiza y extrae el cuerpo extraño mediante el abordaje indicado, verificando la integridad de los tejidos.'),
    ('Toracocentesis', 'Se prepara el sitio, se realiza punción torácica controlada, evacuación y seguimiento de la respuesta.'),
    ('Abdominocentesis', 'Se prepara el sitio, se realiza punción abdominal controlada y se obtiene o evacua el contenido indicado.'),
    ('Colocación de sonda urinaria', 'Se realiza antisepsia, colocación atraumática de la sonda, comprobación de permeabilidad y fijación.'),
    ('Colocación de sonda de alimentación', 'Se coloca la sonda por la vía seleccionada, se verifica su posición y se fija de forma segura.')
)
INSERT INTO nucleo.procedimientos_veterinarios (fid_organizaciones, nombre, descripcion_guia, created_by, updated_by)
SELECT organizacion.id_organizaciones, procedimiento.nombre, procedimiento.descripcion, 'migration', 'migration'
FROM nucleo.organizaciones organizacion CROSS JOIN procedimientos procedimiento
WHERE organizacion.estado = 1 AND organizacion.eliminado_en IS NULL;

ALTER TABLE personas.registros_atencion
  ADD COLUMN fid_procedimientos_veterinarios uuid,
  ADD CONSTRAINT registros_atencion_procedimiento_tenant_fk FOREIGN KEY (fid_procedimientos_veterinarios, fid_organizaciones)
    REFERENCES nucleo.procedimientos_veterinarios(id_procedimientos_veterinarios, fid_organizaciones) ON DELETE RESTRICT;
CREATE INDEX registros_atencion_procedimiento_idx ON personas.registros_atencion(fid_procedimientos_veterinarios);

UPDATE configuracion.tipos_registro_atencion
SET campos = '[
  {"clave":"fid_procedimientos_veterinarios","etiqueta_es":"Procedimiento","etiqueta_en":"Procedure","tipo":"uuid","fuente":"procedimientos_veterinarios","requerido":true},
  {"clave":"descripcion_quirurgica","etiqueta_es":"Descripción quirúrgica","etiqueta_en":"Surgical description","tipo":"textarea","requerido":true,"max":4000},
  {"clave":"preanestesico","etiqueta_es":"Preanestésico","etiqueta_en":"Pre-anesthetic","tipo":"textarea","requerido":false,"max":2000},
  {"clave":"anestesico","etiqueta_es":"Anestésico","etiqueta_en":"Anesthetic","tipo":"textarea","requerido":false,"max":2000},
  {"clave":"otros_medicamentos","etiqueta_es":"Otros medicamentos (separados por comas)","etiqueta_en":"Other medications (comma separated)","tipo":"text","requerido":false,"max":1000},
  {"clave":"tratamiento","etiqueta_es":"Tratamiento","etiqueta_en":"Treatment","tipo":"textarea","requerido":false,"max":3000},
  {"clave":"observaciones","etiqueta_es":"Observaciones","etiqueta_en":"Notes","tipo":"textarea","requerido":false,"max":3000},
  {"clave":"complicaciones","etiqueta_es":"Complicaciones","etiqueta_en":"Complications","tipo":"textarea","requerido":false,"max":3000}
]'::jsonb, acepta_adjuntos = true, max_adjuntos = 10, updated_by = 'migration'
WHERE codigo = 'cirugia_procedimiento';

UPDATE configuracion.modulos SET orden = orden + 10, updated_by = 'migration' WHERE codigo = 'administrator.users' AND orden >= 240;
INSERT INTO configuracion.modulos (id_modulos, codigo, nombre, descripcion, icono, ruta, orden, estado, created_by, updated_by)
VALUES (gen_random_uuid(), 'administrator.procedures', 'Cirugías y procedimientos', 'Administra las cirugías y procedimientos disponibles y su descripción guía.', 'scissors', '/administrator/procedures', 240, 1, 'migration', 'migration')
ON CONFLICT (codigo) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, ruta=EXCLUDED.ruta, fid_modulos_padre=NULL, orden=EXCLUDED.orden, estado=1, updated_at=CURRENT_TIMESTAMP, updated_by='migration';

WITH capacidades(codigo, accion, descripcion) AS (VALUES
 ('administrator.procedures.read','read','Cirugías y procedimientos: Ver'),
 ('administrator.procedures.create','create','Cirugías y procedimientos: Crear'),
 ('administrator.procedures.update','update','Cirugías y procedimientos: Actualizar'),
 ('administrator.procedures.delete','delete','Cirugías y procedimientos: Eliminar'))
INSERT INTO seguridad.permisos (id_permisos,fid_modulos,codigo,accion,descripcion,estado,created_by,updated_by)
SELECT gen_random_uuid(),m.id_modulos,c.codigo,c.accion,c.descripcion,1,'migration','migration' FROM capacidades c JOIN configuracion.modulos m ON m.codigo='administrator.procedures'
ON CONFLICT (codigo) DO UPDATE SET fid_modulos=EXCLUDED.fid_modulos,accion=EXCLUDED.accion,descripcion=EXCLUDED.descripcion,estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
INSERT INTO configuracion.planes_modulos (id_planes_modulos,fid_planes,fid_modulos,estado,created_by,updated_by)
SELECT gen_random_uuid(),p.id_planes,m.id_modulos,1,'migration','migration' FROM configuracion.planes p JOIN configuracion.modulos m ON m.codigo='administrator.procedures' WHERE p.codigo IN ('BASIC','PREMIUM','FULL','SYSTEM')
ON CONFLICT (fid_planes,fid_modulos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
INSERT INTO seguridad.roles_permisos (id_roles_permisos,fid_roles,fid_permisos,estado,created_by,updated_by)
SELECT gen_random_uuid(),r.id_roles,p.id_permisos,1,'migration','migration' FROM seguridad.roles r CROSS JOIN seguridad.permisos p WHERE r.codigo IN ('ADMIN','SUPERADMIN') AND r.eliminado_en IS NULL AND p.codigo LIKE 'administrator.procedures.%'
ON CONFLICT (fid_roles,fid_permisos) DO UPDATE SET estado=1,updated_at=CURRENT_TIMESTAMP,updated_by='migration';
