ALTER TABLE nucleo.sedes
  ADD COLUMN sitio_web TEXT,
  ADD COLUMN facebook_url VARCHAR(200),
  ADD COLUMN instagram_url VARCHAR(200),
  ADD COLUMN tiktok_url VARCHAR(200),
  ADD COLUMN youtube_url VARCHAR(200),
  ADD COLUMN linkedin_url VARCHAR(200),
  ADD COLUMN x_url VARCHAR(200),
  ADD COLUMN escudo_url TEXT,
  ADD COLUMN escudo_oscuro_url TEXT,
  ADD COLUMN escudo_misma_imagen BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN login_escudo_url TEXT,
  ADD COLUMN login_escudo_oscuro_url TEXT,
  ADD COLUMN login_escudo_misma_imagen BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN imagotipo_url TEXT,
  ADD COLUMN imagotipo_oscuro_url TEXT,
  ADD COLUMN imagotipo_misma_imagen BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN color_primario TEXT,
  ADD COLUMN ui_cabecera_claro VARCHAR(7),
  ADD COLUMN ui_cabecera_oscuro VARCHAR(7),
  ADD COLUMN ui_esquinero_claro VARCHAR(7),
  ADD COLUMN ui_esquinero_oscuro VARCHAR(7),
  ADD COLUMN ui_menu_claro VARCHAR(7),
  ADD COLUMN ui_menu_oscuro VARCHAR(7),
  ADD COLUMN ui_mostrar_escudo_menu BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ui_mostrar_nombre_empresa_menu BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN ui_ocultar_esquinero_expandido BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ui_esquinero_fondo_activo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ui_cabecera_ocultar_borde BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ui_menu_ocultar_borde BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN ui_tamano_escudo_menu SMALLINT NOT NULL DEFAULT 100,
  ADD COLUMN soporte_correo VARCHAR(120),
  ADD COLUMN soporte_telefono VARCHAR(30),
  ADD COLUMN soporte_whatsapp VARCHAR(30),
  ADD COLUMN login_usar_filtro_color BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN login_mostrar_etiqueta BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN login_mostrar_destacados BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN login_mostrar_comunidad BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN login_etiqueta VARCHAR(60),
  ADD COLUMN login_titulo VARCHAR(120),
  ADD COLUMN login_subtitulo VARCHAR(240),
  ADD COLUMN login_destacado_1 VARCHAR(120),
  ADD COLUMN login_destacado_2 VARCHAR(120),
  ADD COLUMN login_destacado_3 VARCHAR(120),
  ADD COLUMN login_destacado_icono_1 VARCHAR(40) NOT NULL DEFAULT 'book',
  ADD COLUMN login_destacado_icono_2 VARCHAR(40) NOT NULL DEFAULT 'users',
  ADD COLUMN login_destacado_icono_3 VARCHAR(40) NOT NULL DEFAULT 'award',
  ADD COLUMN login_texto_comunidad VARCHAR(120);

UPDATE nucleo.sedes sede
SET
  sitio_web = perfil.sitio_web,
  facebook_url = perfil.facebook_url,
  instagram_url = perfil.instagram_url,
  tiktok_url = perfil.tiktok_url,
  youtube_url = perfil.youtube_url,
  linkedin_url = perfil.linkedin_url,
  x_url = perfil.x_url,
  escudo_url = perfil.escudo_url,
  escudo_oscuro_url = perfil.escudo_oscuro_url,
  escudo_misma_imagen = perfil.escudo_misma_imagen,
  login_escudo_url = perfil.login_escudo_url,
  login_escudo_oscuro_url = perfil.login_escudo_oscuro_url,
  login_escudo_misma_imagen = perfil.login_escudo_misma_imagen,
  imagotipo_url = perfil.imagotipo_url,
  imagotipo_oscuro_url = perfil.imagotipo_oscuro_url,
  imagotipo_misma_imagen = perfil.imagotipo_misma_imagen,
  color_primario = perfil.color_primario,
  ui_cabecera_claro = perfil.ui_cabecera_claro,
  ui_cabecera_oscuro = perfil.ui_cabecera_oscuro,
  ui_esquinero_claro = perfil.ui_esquinero_claro,
  ui_esquinero_oscuro = perfil.ui_esquinero_oscuro,
  ui_menu_claro = perfil.ui_menu_claro,
  ui_menu_oscuro = perfil.ui_menu_oscuro,
  ui_mostrar_escudo_menu = perfil.ui_mostrar_escudo_menu,
  ui_mostrar_nombre_empresa_menu = perfil.ui_mostrar_nombre_empresa_menu,
  ui_ocultar_esquinero_expandido = perfil.ui_ocultar_esquinero_expandido,
  ui_esquinero_fondo_activo = perfil.ui_esquinero_fondo_activo,
  ui_cabecera_ocultar_borde = perfil.ui_cabecera_ocultar_borde,
  ui_menu_ocultar_borde = perfil.ui_menu_ocultar_borde,
  ui_tamano_escudo_menu = perfil.ui_tamano_escudo_menu,
  soporte_correo = perfil.soporte_correo,
  soporte_telefono = perfil.soporte_telefono,
  soporte_whatsapp = perfil.soporte_whatsapp,
  login_usar_filtro_color = perfil.login_usar_filtro_color,
  login_mostrar_etiqueta = perfil.login_mostrar_etiqueta,
  login_mostrar_destacados = perfil.login_mostrar_destacados,
  login_mostrar_comunidad = perfil.login_mostrar_comunidad,
  login_etiqueta = perfil.login_etiqueta,
  login_titulo = perfil.login_titulo,
  login_subtitulo = perfil.login_subtitulo,
  login_destacado_1 = perfil.login_destacado_1,
  login_destacado_2 = perfil.login_destacado_2,
  login_destacado_3 = perfil.login_destacado_3,
  login_destacado_icono_1 = perfil.login_destacado_icono_1,
  login_destacado_icono_2 = perfil.login_destacado_icono_2,
  login_destacado_icono_3 = perfil.login_destacado_icono_3,
  login_texto_comunidad = perfil.login_texto_comunidad
FROM nucleo.perfil_organizacion perfil
WHERE perfil.fid_organizaciones = sede.fid_organizaciones
  AND perfil.estado = 1;

CREATE TABLE nucleo.imagenes_login_sede (
  id_imagenes_login_sede UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones UUID NOT NULL,
  fid_sedes UUID NOT NULL,
  clave_objeto TEXT NOT NULL,
  orden INTEGER NOT NULL,
  texto_alternativo VARCHAR(120),
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT imagenes_login_sede_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT imagenes_login_sede_sede_orden_unique UNIQUE (fid_sedes, orden)
);
CREATE INDEX imagenes_login_sede_organizacion_sede_estado_orden_idx
  ON nucleo.imagenes_login_sede(fid_organizaciones, fid_sedes, estado, orden);
CREATE INDEX imagenes_login_sede_clave_objeto_idx
  ON nucleo.imagenes_login_sede(clave_objeto);

INSERT INTO nucleo.imagenes_login_sede (
  fid_organizaciones, fid_sedes, clave_objeto, orden, texto_alternativo,
  estado, created_at, created_by, updated_at, updated_by
)
SELECT sede.fid_organizaciones, sede.id_sedes, imagen.clave_objeto, imagen.orden,
       imagen.texto_alternativo, imagen.estado, imagen.created_at,
       imagen.created_by, imagen.updated_at, imagen.updated_by
FROM nucleo.sedes sede
JOIN nucleo.imagenes_login_organizacion imagen
  ON imagen.fid_organizaciones = sede.fid_organizaciones;

CREATE TEMP TABLE migracion_entidades_legales_sede (
  id_sede UUID PRIMARY KEY,
  id_entidad_legal UUID NOT NULL DEFAULT gen_random_uuid()
);

INSERT INTO migracion_entidades_legales_sede (id_sede)
SELECT id_sedes
FROM nucleo.sedes
WHERE es_principal = false AND eliminado_en IS NULL;

INSERT INTO nucleo.entidades_legales (
  id_entidades_legales, fid_organizaciones, codigo, es_principal,
  fid_admin_level_0, fid_tipos_identificacion_fiscal,
  numero_identificacion_fiscal, razon_social, fid_parametros_tipo_persona,
  fid_parametros_responsabilidad_fiscal, fid_parametros_moneda,
  fid_proveedores_fiscales, afecto_impuesto, direccion_fiscal,
  telefono_fiscal, correo_fiscal, estado, created_at, created_by,
  updated_at, updated_by, eliminado_en, eliminado_por
)
SELECT mapa.id_entidad_legal, original.fid_organizaciones,
       'SEDE-' || left(replace(sede.id_sedes::text, '-', ''), 20), false,
       original.fid_admin_level_0, original.fid_tipos_identificacion_fiscal,
       original.numero_identificacion_fiscal, original.razon_social,
       original.fid_parametros_tipo_persona,
       original.fid_parametros_responsabilidad_fiscal,
       original.fid_parametros_moneda, original.fid_proveedores_fiscales,
       original.afecto_impuesto, original.direccion_fiscal,
       original.telefono_fiscal, original.correo_fiscal, original.estado,
       CURRENT_TIMESTAMP, original.created_by, CURRENT_TIMESTAMP,
       original.updated_by, NULL, NULL
FROM migracion_entidades_legales_sede mapa
JOIN nucleo.sedes sede ON sede.id_sedes = mapa.id_sede
JOIN nucleo.entidades_legales original
  ON original.id_entidades_legales = sede.fid_entidades_legales;

UPDATE nucleo.sedes sede
SET fid_entidades_legales = mapa.id_entidad_legal
FROM migracion_entidades_legales_sede mapa
WHERE sede.id_sedes = mapa.id_sede;

DROP TABLE migracion_entidades_legales_sede;

CREATE TABLE nucleo.horarios_soporte_sedes (
  id_horarios_soporte_sedes UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fid_organizaciones UUID NOT NULL,
  fid_sedes UUID NOT NULL,
  fid_parametros_dia_semana UUID NOT NULL,
  hora_apertura VARCHAR(5),
  hora_cierre VARCHAR(5),
  cerrado BOOLEAN NOT NULL DEFAULT false,
  estado INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  CONSTRAINT horarios_soporte_sedes_sede_fk FOREIGN KEY (fid_sedes, fid_organizaciones)
    REFERENCES nucleo.sedes(id_sedes, fid_organizaciones) ON DELETE CASCADE,
  CONSTRAINT horarios_soporte_sedes_dia_fk FOREIGN KEY (fid_parametros_dia_semana)
    REFERENCES configuracion.parametros(id_parametros) ON DELETE RESTRICT,
  CONSTRAINT horarios_soporte_sedes_sede_dia_unique UNIQUE (fid_sedes, fid_parametros_dia_semana)
);
CREATE INDEX horarios_soporte_sedes_organizacion_sede_estado_idx
  ON nucleo.horarios_soporte_sedes(fid_organizaciones, fid_sedes, estado);
CREATE INDEX horarios_soporte_sedes_dia_idx
  ON nucleo.horarios_soporte_sedes(fid_parametros_dia_semana);

INSERT INTO nucleo.horarios_soporte_sedes (
  fid_organizaciones, fid_sedes, fid_parametros_dia_semana,
  hora_apertura, hora_cierre, cerrado, estado, created_at,
  created_by, updated_at, updated_by
)
SELECT sede.fid_organizaciones, sede.id_sedes, dia.id_parametros,
       horario.hora_apertura, horario.hora_cierre, horario.cerrado,
       horario.estado, horario.created_at, horario.created_by,
       horario.updated_at, horario.updated_by
FROM nucleo.sedes sede
JOIN nucleo.horarios_atencion_organizacion horario
  ON horario.fid_organizaciones = sede.fid_organizaciones AND horario.turno = 1
JOIN configuracion.parametros dia
  ON dia.codigo_grupo = 'dias_semana' AND dia.orden = horario.dia_semana;
