--
-- PostgreSQL database dump
--

\restrict gEDqA229Ri6Q7OYb6oLdvhhaU4xUkXYdFWfglXR0NFSl6O3h29uh3NUBrXx8NfU

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: configuracion; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA configuracion;


--
-- Name: eventos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA eventos;


--
-- Name: nucleo; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA nucleo;


--
-- Name: personas; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA personas;


--
-- Name: seguridad; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA seguridad;


--
-- Name: system; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA system;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: tipo_uso_correo; Type: TYPE; Schema: personas; Owner: -
--

CREATE TYPE personas.tipo_uso_correo AS ENUM (
    'principal',
    'mensajes',
    'respaldo'
);


--
-- Name: estado_usuario; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.estado_usuario AS ENUM (
    'activo',
    'invitado',
    'suspendido'
);


--
-- Name: plataforma_dispositivo; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.plataforma_dispositivo AS ENUM (
    'ios',
    'android',
    'web',
    'desconocido'
);


--
-- Name: tipo_credencial; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.tipo_credencial AS ENUM (
    'contrasenia',
    'passkey'
);


--
-- Name: tipo_dispositivo; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.tipo_dispositivo AS ENUM (
    'escritorio',
    'movil',
    'tableta',
    'desconocido'
);


--
-- Name: tipo_mfa; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.tipo_mfa AS ENUM (
    'totp',
    'sms',
    'correo'
);


--
-- Name: tipo_token; Type: TYPE; Schema: seguridad; Owner: -
--

CREATE TYPE seguridad.tipo_token AS ENUM (
    'verificacion_correo',
    'reset_contrasenia',
    'enlace_magico',
    'invitacion',
    'dispositivo_nuevo'
);


--
-- Name: establecer_updated_at(); Type: FUNCTION; Schema: configuracion; Owner: -
--

CREATE FUNCTION configuracion.establecer_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: a_inet(text); Type: FUNCTION; Schema: system; Owner: -
--

CREATE FUNCTION system.a_inet(txt text) RETURNS inet
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
    AS $$
BEGIN
  RETURN txt::inet;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acciones_requeridas_maestro; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.acciones_requeridas_maestro (
    id_acciones_requeridas_maestro uuid DEFAULT gen_random_uuid() CONSTRAINT acciones_requeridas_maestro_id_acciones_requeridas_mae_not_null NOT NULL,
    codigo character varying(120) NOT NULL,
    seccion character varying(60) NOT NULL,
    nombre character varying(160) NOT NULL,
    descripcion text,
    prioridad integer DEFAULT 1 NOT NULL,
    icono character varying(60),
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT acciones_requeridas_maestro_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT acciones_requeridas_maestro_prioridad_valida CHECK (((prioridad >= 1) AND (prioridad <= 3)))
);


--
-- Name: admin_level_0; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.admin_level_0 (
    id_admin_level_0 uuid DEFAULT gen_random_uuid() CONSTRAINT paises_id_paises_not_null NOT NULL,
    codigo_iso2 character(2) CONSTRAINT paises_codigo_iso2_not_null NOT NULL,
    nombre_es text CONSTRAINT paises_nombre_es_not_null NOT NULL,
    nombre_en text CONSTRAINT paises_nombre_en_not_null NOT NULL,
    estado integer DEFAULT 1 CONSTRAINT paises_estado_not_null NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT paises_created_at_not_null NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT paises_updated_at_not_null NOT NULL,
    updated_by text,
    etiqueta_admin_level_1 character varying(50) NOT NULL,
    etiqueta_admin_level_2 character varying(50),
    etiqueta_admin_level_3 character varying(50) NOT NULL
);


--
-- Name: admin_level_1; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.admin_level_1 (
    id_admin_level_1 uuid DEFAULT gen_random_uuid() CONSTRAINT departamentos_id_departamentos_not_null NOT NULL,
    codigo character varying(20) CONSTRAINT departamentos_codigo_ubigeo_not_null NOT NULL,
    nombre character varying(100) CONSTRAINT departamentos_nombre_not_null NOT NULL,
    estado integer DEFAULT 1 CONSTRAINT departamentos_estado_not_null NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT departamentos_created_at_not_null NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT departamentos_updated_at_not_null NOT NULL,
    updated_by text,
    fid_admin_level_0 uuid NOT NULL
);


--
-- Name: admin_level_2; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.admin_level_2 (
    id_admin_level_2 uuid DEFAULT gen_random_uuid() CONSTRAINT provincias_id_provincias_not_null NOT NULL,
    fid_admin_level_1 uuid CONSTRAINT provincias_fid_departamentos_not_null NOT NULL,
    codigo character varying(20) CONSTRAINT provincias_codigo_ubigeo_not_null NOT NULL,
    nombre character varying(100) CONSTRAINT provincias_nombre_not_null NOT NULL,
    estado integer DEFAULT 1 CONSTRAINT provincias_estado_not_null NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT provincias_created_at_not_null NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT provincias_updated_at_not_null NOT NULL,
    updated_by text
);


--
-- Name: admin_level_3; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.admin_level_3 (
    id_admin_level_3 uuid DEFAULT gen_random_uuid() CONSTRAINT distritos_id_distritos_not_null NOT NULL,
    fid_admin_level_2 uuid,
    codigo character varying(20) CONSTRAINT distritos_ubigeo_not_null NOT NULL,
    nombre character varying(120) CONSTRAINT distritos_nombre_not_null NOT NULL,
    estado integer DEFAULT 1 CONSTRAINT distritos_estado_not_null NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT distritos_created_at_not_null NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP CONSTRAINT distritos_updated_at_not_null NOT NULL,
    updated_by text,
    fid_admin_level_1 uuid NOT NULL
);


--
-- Name: auditoria; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.auditoria (
    id_auditoria uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    fid_usuarios uuid,
    accion text NOT NULL,
    entidad text,
    id_entidad text,
    ip text,
    agente_usuario text,
    metadatos jsonb,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: configuracion_organizacion; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.configuracion_organizacion (
    id_configuracion_organizacion uuid CONSTRAINT configuracion_organizacion_id_configuracion_organizacion_not_nu NOT NULL,
    fid_organizaciones uuid NOT NULL,
    clave text NOT NULL,
    valor jsonb NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: modulos; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.modulos (
    id_modulos uuid NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    icono text,
    ruta text,
    fid_modulos_padre uuid,
    requiere_permiso text,
    orden integer DEFAULT 0 NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: organizaciones_modulos; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.organizaciones_modulos (
    id_organizaciones_modulos uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    fid_modulos uuid NOT NULL,
    habilitado boolean DEFAULT true NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: parametros; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.parametros (
    id_parametros uuid NOT NULL,
    codigo_grupo text NOT NULL,
    codigo text NOT NULL,
    etiqueta text NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: parametros_traducciones; Type: TABLE; Schema: configuracion; Owner: -
--

CREATE TABLE configuracion.parametros_traducciones (
    id_parametros_traducciones uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_parametros uuid NOT NULL,
    codigo_idioma character varying(10) NOT NULL,
    etiqueta character varying(160) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT parametros_traducciones_etiqueta_valida CHECK (((char_length(btrim((etiqueta)::text)) >= 1) AND (char_length(btrim((etiqueta)::text)) <= 160))),
    CONSTRAINT parametros_traducciones_idioma_valido CHECK (((codigo_idioma)::text ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'::text))
);


--
-- Name: eventos; Type: TABLE; Schema: eventos; Owner: -
--

CREATE TABLE eventos.eventos (
    id_eventos uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    id_agregado text NOT NULL,
    datos jsonb NOT NULL,
    metadatos jsonb,
    ocurrido_en timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    fid_usuarios uuid,
    fid_eventos_maestro uuid NOT NULL
);


--
-- Name: eventos_maestro; Type: TABLE; Schema: eventos; Owner: -
--

CREATE TABLE eventos.eventos_maestro (
    id_eventos_maestro uuid NOT NULL,
    codigo text NOT NULL,
    tipo_agregado text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    version integer DEFAULT 1 NOT NULL,
    visible_actividad boolean DEFAULT false NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT eventos_maestro_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT eventos_maestro_version_positiva CHECK ((version > 0))
);


--
-- Name: organizaciones; Type: TABLE; Schema: nucleo; Owner: -
--

CREATE TABLE nucleo.organizaciones (
    id_organizaciones uuid NOT NULL,
    slug text NOT NULL,
    nombre text NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: perfil_organizacion; Type: TABLE; Schema: nucleo; Owner: -
--

CREATE TABLE nucleo.perfil_organizacion (
    id_perfil_organizacion uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    razon_social text,
    ruc_nif text,
    direccion text,
    telefono text,
    correo_contacto text,
    sitio_web text,
    logo_url text,
    color_primario text,
    correo_remitente_nombre text,
    correo_remitente_direccion text,
    cabecera_impresion text,
    idioma_por_defecto text DEFAULT 'es'::text NOT NULL,
    zona_horaria_por_defecto text DEFAULT 'America/Lima'::text NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: personas; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas (
    id_personas uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    nombres character varying(50) NOT NULL,
    apellido_paterno character varying(30) NOT NULL,
    apellido_materno character varying(30),
    codigo_sexo text,
    fecha_nacimiento date,
    foto_url text,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    fid_admin_level_0_residencia uuid,
    fid_admin_level_3_residencia uuid,
    codigo_estado_civil text,
    codigo_nivel_instruccion text,
    direccion character varying(200),
    referencia character varying(200),
    fid_admin_level_0_procedencia uuid,
    fid_admin_level_3_procedencia uuid,
    discapacidad boolean DEFAULT false NOT NULL,
    CONSTRAINT personas_procedencia_completa_check CHECK (((fid_admin_level_0_procedencia IS NULL) = (fid_admin_level_3_procedencia IS NULL))),
    CONSTRAINT personas_residencia_completa_check CHECK (((fid_admin_level_0_residencia IS NULL) = (fid_admin_level_3_residencia IS NULL)))
);


--
-- Name: personas_correos; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_correos (
    id_personas_correos uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    correo character varying(254) NOT NULL,
    verificado_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    fid_organizaciones uuid NOT NULL,
    CONSTRAINT personas_correos_normalizado_check CHECK (((correo)::text = lower(btrim((correo)::text))))
);


--
-- Name: personas_correos_usos; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_correos_usos (
    id_personas_correos_usos uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    fid_personas_correos uuid NOT NULL,
    tipo personas.tipo_uso_correo NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: personas_documentos; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_documentos (
    id_personas_documentos uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    codigo_tipo_documento character varying(80) NOT NULL,
    numero_documento character varying(40) NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    fid_organizaciones uuid NOT NULL,
    CONSTRAINT personas_documentos_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT personas_documentos_numero_valido CHECK (((numero_documento)::text ~ '^[A-Za-z0-9][A-Za-z0-9 ./-]{0,39}$'::text))
);


--
-- Name: personas_estudios_complementarios; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_estudios_complementarios (
    id_personas_estudios_complementarios uuid DEFAULT gen_random_uuid() CONSTRAINT personas_estudios_complemen_id_personas_estudios_compl_not_null NOT NULL,
    fid_personas uuid NOT NULL,
    codigo_tipo_estudio character varying(80) NOT NULL,
    institucion character varying(150) NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    en_curso boolean DEFAULT false NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    tipo_estudio_otro character varying(120),
    nombre_estudio character varying(150) NOT NULL,
    CONSTRAINT estudios_complementarios_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT estudios_complementarios_fechas_validas CHECK (((en_curso AND (fecha_fin IS NULL)) OR ((NOT en_curso) AND (fecha_fin IS NOT NULL) AND (fecha_fin > fecha_inicio)))),
    CONSTRAINT estudios_complementarios_institucion_valida CHECK (((char_length(btrim((institucion)::text)) >= 2) AND (char_length(btrim((institucion)::text)) <= 150))),
    CONSTRAINT estudios_complementarios_nombre_valido CHECK (((char_length(btrim((nombre_estudio)::text)) >= 2) AND (char_length(btrim((nombre_estudio)::text)) <= 150))),
    CONSTRAINT estudios_complementarios_tipo_otro_valido CHECK (((((codigo_tipo_estudio)::text = 'otro'::text) AND ((char_length(btrim((tipo_estudio_otro)::text)) >= 2) AND (char_length(btrim((tipo_estudio_otro)::text)) <= 120))) OR (((codigo_tipo_estudio)::text <> 'otro'::text) AND (tipo_estudio_otro IS NULL)))),
    CONSTRAINT personas_estudios_complementarios_fechas_check CHECK (((en_curso AND (fecha_fin IS NULL)) OR ((NOT en_curso) AND (fecha_fin IS NOT NULL) AND (fecha_fin >= fecha_inicio))))
);


--
-- Name: personas_estudios_realizados; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_estudios_realizados (
    id_personas_estudios_realizados uuid DEFAULT gen_random_uuid() CONSTRAINT personas_estudios_realizado_id_personas_estudios_reali_not_null NOT NULL,
    fid_personas uuid NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date,
    en_curso boolean DEFAULT false NOT NULL,
    codigo_nivel_instruccion character varying(80) NOT NULL,
    codigo_grado_obtenido character varying(120) NOT NULL,
    codigo_profesion character varying(120) NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    grado_obtenido_otro character varying(120),
    profesion_otro character varying(120),
    CONSTRAINT estudios_realizados_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT estudios_realizados_fechas_validas CHECK (((en_curso AND (fecha_fin IS NULL)) OR ((NOT en_curso) AND (fecha_fin IS NOT NULL) AND (fecha_fin > fecha_inicio)))),
    CONSTRAINT estudios_realizados_grado_otro_valido CHECK (((((codigo_grado_obtenido)::text = 'otro'::text) AND ((char_length(btrim((grado_obtenido_otro)::text)) >= 2) AND (char_length(btrim((grado_obtenido_otro)::text)) <= 120))) OR (((codigo_grado_obtenido)::text <> 'otro'::text) AND (grado_obtenido_otro IS NULL)))),
    CONSTRAINT estudios_realizados_profesion_otra_valida CHECK (((((codigo_profesion)::text = 'otro'::text) AND ((char_length(btrim((profesion_otro)::text)) >= 2) AND (char_length(btrim((profesion_otro)::text)) <= 120))) OR (((codigo_profesion)::text <> 'otro'::text) AND (profesion_otro IS NULL)))),
    CONSTRAINT personas_estudios_realizados_fechas_check CHECK (((en_curso AND (fecha_fin IS NULL)) OR ((NOT en_curso) AND (fecha_fin IS NOT NULL) AND (fecha_fin >= fecha_inicio))))
);


--
-- Name: personas_hobbies; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_hobbies (
    id_personas_hobbies uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    codigo_frecuencia character varying(80) NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    codigo_hobby character varying(80) NOT NULL,
    hobby_personalizado character varying(100),
    CONSTRAINT personas_hobbies_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT personas_hobbies_personalizado_valido CHECK (((hobby_personalizado IS NULL) OR ((char_length(btrim((hobby_personalizado)::text)) >= 2) AND (char_length(btrim((hobby_personalizado)::text)) <= 100))))
);


--
-- Name: personas_nacionalidades; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_nacionalidades (
    id_personas_nacionalidades uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    fid_admin_level_0 uuid NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT personas_nacionalidades_estado_valido CHECK ((estado = ANY (ARRAY[0, 1])))
);


--
-- Name: personas_seguros; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_seguros (
    id_personas_seguros uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    numero_seguro character varying(80) NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    nombre_otro character varying(120),
    codigo_seguro character varying(80) NOT NULL,
    CONSTRAINT personas_seguros_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT personas_seguros_nombre_otro_valido CHECK (((nombre_otro IS NULL) OR ((char_length(btrim((nombre_otro)::text)) >= 2) AND (char_length(btrim((nombre_otro)::text)) <= 120)))),
    CONSTRAINT personas_seguros_numero_valido CHECK (((char_length(btrim((numero_seguro)::text)) >= 1) AND (char_length(btrim((numero_seguro)::text)) <= 80)))
);


--
-- Name: personas_telefonos; Type: TABLE; Schema: personas; Owner: -
--

CREATE TABLE personas.personas_telefonos (
    id_personas_telefonos uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_personas uuid NOT NULL,
    codigo_tipo_telefono character varying(80) NOT NULL,
    numero character varying(30) NOT NULL,
    titular character varying(120) NOT NULL,
    es_emergencia boolean DEFAULT false NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT personas_telefonos_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT personas_telefonos_numero_valido CHECK (((numero)::text ~ '^\+?[0-9][0-9 ()\.-]{5,29}$'::text)),
    CONSTRAINT personas_telefonos_titular_valido CHECK (((char_length(btrim((titular)::text)) >= 2) AND (char_length(btrim((titular)::text)) <= 120)))
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: acciones_requeridas; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.acciones_requeridas (
    id_acciones_requeridas uuid DEFAULT gen_random_uuid() NOT NULL,
    fid_organizaciones uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    fid_acciones_requeridas_maestro uuid NOT NULL,
    clave_recurso character varying(120) NOT NULL,
    metadatos jsonb,
    resuelta_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT acciones_requeridas_estado_valido CHECK ((estado = ANY (ARRAY[0, 1]))),
    CONSTRAINT acciones_requeridas_resolucion_coherente CHECK ((((estado = 1) AND (resuelta_en IS NULL)) OR ((estado = 0) AND (resuelta_en IS NOT NULL))))
);


--
-- Name: codigos_recuperacion_mfa; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.codigos_recuperacion_mfa (
    id_codigos_recuperacion_mfa uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    hash_codigo text NOT NULL,
    usado_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: configuracion_usuario; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.configuracion_usuario (
    id_configuracion_usuario uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    clave text NOT NULL,
    valor jsonb NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: credenciales; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.credenciales (
    id_credenciales uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    fid_dispositivos uuid,
    tipo seguridad.tipo_credencial NOT NULL,
    hash_contrasenia text,
    llave_publica text,
    id_credencial_webauthn text,
    contador integer,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: dispositivos; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.dispositivos (
    id_dispositivos uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    uid_dispositivo text NOT NULL,
    plataforma seguridad.plataforma_dispositivo NOT NULL,
    modelo text,
    version_so text,
    version_app text,
    firebase_token_fcm text,
    confiable boolean DEFAULT false NOT NULL,
    ultimo_acceso_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    firebase_id_instalacion text,
    tipo_dispositivo seguridad.tipo_dispositivo DEFAULT 'desconocido'::seguridad.tipo_dispositivo NOT NULL
);


--
-- Name: historial_contrasenias; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.historial_contrasenias (
    id_historial_contrasenias uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    hash_contrasenia text NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: permisos; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.permisos (
    id_permisos uuid NOT NULL,
    codigo text NOT NULL,
    descripcion text,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: preferencias_usuario; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.preferencias_usuario (
    id_preferencias_usuario uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    tema text,
    idioma text,
    formato_fecha text,
    notificaciones jsonb,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    menu_colapsado boolean DEFAULT false NOT NULL,
    fid_admin_level_0 uuid,
    fid_zonas_horarias uuid
);


--
-- Name: roles; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.roles (
    id_roles uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    codigo text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    es_sistema boolean DEFAULT false NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: roles_permisos; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.roles_permisos (
    id_roles_permisos uuid NOT NULL,
    fid_roles uuid NOT NULL,
    fid_permisos uuid NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: sesiones; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.sesiones (
    id_sesiones uuid NOT NULL,
    fid_dispositivos uuid NOT NULL,
    hash_token_refresco text NOT NULL,
    agente_usuario text,
    ip text,
    expira_en timestamp(3) with time zone NOT NULL,
    revocada_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    iniciada_en timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ultimo_uso_en timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expira_inactividad_en timestamp(3) with time zone NOT NULL,
    expira_absoluta_en timestamp(3) with time zone NOT NULL,
    rotada_en timestamp(3) with time zone,
    reuso_detectado_en timestamp(3) with time zone,
    generacion integer DEFAULT 0 NOT NULL
);


--
-- Name: tokens_verificacion; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.tokens_verificacion (
    id_tokens_verificacion uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    tipo seguridad.tipo_token NOT NULL,
    hash_token text NOT NULL,
    expira_en timestamp(3) with time zone NOT NULL,
    usado_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: usuario_mfa; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.usuario_mfa (
    id_usuario_mfa uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    tipo seguridad.tipo_mfa NOT NULL,
    secreto text,
    telefono text,
    habilitado boolean DEFAULT false NOT NULL,
    confirmado_en timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: usuarios; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.usuarios (
    id_usuarios uuid NOT NULL,
    fid_personas uuid NOT NULL,
    fid_organizaciones uuid NOT NULL,
    estado_cuenta seguridad.estado_usuario DEFAULT 'activo'::seguridad.estado_usuario NOT NULL,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp(3) with time zone,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    usuario character varying(20) NOT NULL,
    CONSTRAINT usuarios_usuario_formato_check CHECK (((usuario)::text ~ '^[A-Z0-9]{1,20}$'::text))
);


--
-- Name: usuarios_roles; Type: TABLE; Schema: seguridad; Owner: -
--

CREATE TABLE seguridad.usuarios_roles (
    id_usuarios_roles uuid NOT NULL,
    fid_usuarios uuid NOT NULL,
    fid_roles uuid NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: rangos_geo_ip; Type: TABLE; Schema: system; Owner: -
--

CREATE TABLE system.rangos_geo_ip (
    id_rangos_geo_ip uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_inicio inet NOT NULL,
    ip_fin inet NOT NULL,
    fid_admin_level_0 uuid,
    fid_admin_level_1 uuid,
    ciudad character varying(120),
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text,
    CONSTRAINT rangos_geo_ip_rango_valido CHECK ((ip_fin >= ip_inicio)),
    CONSTRAINT rangos_geo_ip_ubicacion_presente CHECK (((fid_admin_level_0 IS NOT NULL) OR (ciudad IS NOT NULL)))
);


--
-- Name: zonas_horarias; Type: TABLE; Schema: system; Owner: -
--

CREATE TABLE system.zonas_horarias (
    id_zonas_horarias uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_iana text NOT NULL,
    estado integer DEFAULT 1 NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by text,
    updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by text
);


--
-- Name: acciones_requeridas_maestro acciones_requeridas_maestro_codigo_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.acciones_requeridas_maestro
    ADD CONSTRAINT acciones_requeridas_maestro_codigo_key UNIQUE (codigo);


--
-- Name: acciones_requeridas_maestro acciones_requeridas_maestro_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.acciones_requeridas_maestro
    ADD CONSTRAINT acciones_requeridas_maestro_pkey PRIMARY KEY (id_acciones_requeridas_maestro);


--
-- Name: admin_level_1 admin_level_1_fid_admin_level_0_codigo_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_1
    ADD CONSTRAINT admin_level_1_fid_admin_level_0_codigo_key UNIQUE (fid_admin_level_0, codigo);


--
-- Name: admin_level_2 admin_level_2_fid_admin_level_1_codigo_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_2
    ADD CONSTRAINT admin_level_2_fid_admin_level_1_codigo_key UNIQUE (fid_admin_level_1, codigo);


--
-- Name: admin_level_2 admin_level_2_id_admin_level_2_fid_admin_level_1_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_2
    ADD CONSTRAINT admin_level_2_id_admin_level_2_fid_admin_level_1_key UNIQUE (id_admin_level_2, fid_admin_level_1);


--
-- Name: admin_level_3 admin_level_3_fid_admin_level_1_codigo_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_3
    ADD CONSTRAINT admin_level_3_fid_admin_level_1_codigo_key UNIQUE (fid_admin_level_1, codigo);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);


--
-- Name: configuracion_organizacion configuracion_organizacion_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.configuracion_organizacion
    ADD CONSTRAINT configuracion_organizacion_pkey PRIMARY KEY (id_configuracion_organizacion);


--
-- Name: admin_level_1 departamentos_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_1
    ADD CONSTRAINT departamentos_pkey PRIMARY KEY (id_admin_level_1);


--
-- Name: admin_level_3 distritos_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_3
    ADD CONSTRAINT distritos_pkey PRIMARY KEY (id_admin_level_3);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id_modulos);


--
-- Name: organizaciones_modulos organizaciones_modulos_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.organizaciones_modulos
    ADD CONSTRAINT organizaciones_modulos_pkey PRIMARY KEY (id_organizaciones_modulos);


--
-- Name: admin_level_0 paises_codigo_iso2_key; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_0
    ADD CONSTRAINT paises_codigo_iso2_key UNIQUE (codigo_iso2);


--
-- Name: admin_level_0 paises_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_0
    ADD CONSTRAINT paises_pkey PRIMARY KEY (id_admin_level_0);


--
-- Name: parametros parametros_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.parametros
    ADD CONSTRAINT parametros_pkey PRIMARY KEY (id_parametros);


--
-- Name: parametros_traducciones parametros_traducciones_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.parametros_traducciones
    ADD CONSTRAINT parametros_traducciones_pkey PRIMARY KEY (id_parametros_traducciones);


--
-- Name: parametros_traducciones parametros_traducciones_unica; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.parametros_traducciones
    ADD CONSTRAINT parametros_traducciones_unica UNIQUE (fid_parametros, codigo_idioma);


--
-- Name: admin_level_2 provincias_pkey; Type: CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_2
    ADD CONSTRAINT provincias_pkey PRIMARY KEY (id_admin_level_2);


--
-- Name: eventos_maestro eventos_maestro_codigo_version_key; Type: CONSTRAINT; Schema: eventos; Owner: -
--

ALTER TABLE ONLY eventos.eventos_maestro
    ADD CONSTRAINT eventos_maestro_codigo_version_key UNIQUE (codigo, version);


--
-- Name: eventos_maestro eventos_maestro_pkey; Type: CONSTRAINT; Schema: eventos; Owner: -
--

ALTER TABLE ONLY eventos.eventos_maestro
    ADD CONSTRAINT eventos_maestro_pkey PRIMARY KEY (id_eventos_maestro);


--
-- Name: eventos eventos_pkey; Type: CONSTRAINT; Schema: eventos; Owner: -
--

ALTER TABLE ONLY eventos.eventos
    ADD CONSTRAINT eventos_pkey PRIMARY KEY (id_eventos);


--
-- Name: organizaciones organizaciones_pkey; Type: CONSTRAINT; Schema: nucleo; Owner: -
--

ALTER TABLE ONLY nucleo.organizaciones
    ADD CONSTRAINT organizaciones_pkey PRIMARY KEY (id_organizaciones);


--
-- Name: perfil_organizacion perfil_organizacion_pkey; Type: CONSTRAINT; Schema: nucleo; Owner: -
--

ALTER TABLE ONLY nucleo.perfil_organizacion
    ADD CONSTRAINT perfil_organizacion_pkey PRIMARY KEY (id_perfil_organizacion);


--
-- Name: personas_correos personas_correos_id_persona_key; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos
    ADD CONSTRAINT personas_correos_id_persona_key UNIQUE (id_personas_correos, fid_personas);


--
-- Name: personas_correos personas_correos_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos
    ADD CONSTRAINT personas_correos_pkey PRIMARY KEY (id_personas_correos);


--
-- Name: personas_correos_usos personas_correos_usos_persona_tipo_key; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos_usos
    ADD CONSTRAINT personas_correos_usos_persona_tipo_key UNIQUE (fid_personas, tipo);


--
-- Name: personas_correos_usos personas_correos_usos_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos_usos
    ADD CONSTRAINT personas_correos_usos_pkey PRIMARY KEY (id_personas_correos_usos);


--
-- Name: personas_documentos personas_documentos_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_documentos
    ADD CONSTRAINT personas_documentos_pkey PRIMARY KEY (id_personas_documentos);


--
-- Name: personas_estudios_complementarios personas_estudios_complementarios_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_estudios_complementarios
    ADD CONSTRAINT personas_estudios_complementarios_pkey PRIMARY KEY (id_personas_estudios_complementarios);


--
-- Name: personas_estudios_realizados personas_estudios_realizados_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_estudios_realizados
    ADD CONSTRAINT personas_estudios_realizados_pkey PRIMARY KEY (id_personas_estudios_realizados);


--
-- Name: personas_hobbies personas_hobbies_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_hobbies
    ADD CONSTRAINT personas_hobbies_pkey PRIMARY KEY (id_personas_hobbies);


--
-- Name: personas personas_id_organizacion_key; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_id_organizacion_key UNIQUE (id_personas, fid_organizaciones);


--
-- Name: personas_nacionalidades personas_nacionalidades_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_nacionalidades
    ADD CONSTRAINT personas_nacionalidades_pkey PRIMARY KEY (id_personas_nacionalidades);


--
-- Name: personas_nacionalidades personas_nacionalidades_unicas; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_nacionalidades
    ADD CONSTRAINT personas_nacionalidades_unicas UNIQUE (fid_personas, fid_admin_level_0);


--
-- Name: personas personas_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_pkey PRIMARY KEY (id_personas);


--
-- Name: personas_seguros personas_seguros_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_seguros
    ADD CONSTRAINT personas_seguros_pkey PRIMARY KEY (id_personas_seguros);


--
-- Name: personas_telefonos personas_telefonos_pkey; Type: CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_telefonos
    ADD CONSTRAINT personas_telefonos_pkey PRIMARY KEY (id_personas_telefonos);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: acciones_requeridas acciones_requeridas_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.acciones_requeridas
    ADD CONSTRAINT acciones_requeridas_pkey PRIMARY KEY (id_acciones_requeridas);


--
-- Name: acciones_requeridas acciones_requeridas_usuario_maestro_recurso_key; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.acciones_requeridas
    ADD CONSTRAINT acciones_requeridas_usuario_maestro_recurso_key UNIQUE (fid_usuarios, fid_acciones_requeridas_maestro, clave_recurso);


--
-- Name: codigos_recuperacion_mfa codigos_recuperacion_mfa_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.codigos_recuperacion_mfa
    ADD CONSTRAINT codigos_recuperacion_mfa_pkey PRIMARY KEY (id_codigos_recuperacion_mfa);


--
-- Name: configuracion_usuario configuracion_usuario_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.configuracion_usuario
    ADD CONSTRAINT configuracion_usuario_pkey PRIMARY KEY (id_configuracion_usuario);


--
-- Name: credenciales credenciales_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.credenciales
    ADD CONSTRAINT credenciales_pkey PRIMARY KEY (id_credenciales);


--
-- Name: dispositivos dispositivos_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.dispositivos
    ADD CONSTRAINT dispositivos_pkey PRIMARY KEY (id_dispositivos);


--
-- Name: historial_contrasenias historial_contrasenias_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.historial_contrasenias
    ADD CONSTRAINT historial_contrasenias_pkey PRIMARY KEY (id_historial_contrasenias);


--
-- Name: permisos permisos_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.permisos
    ADD CONSTRAINT permisos_pkey PRIMARY KEY (id_permisos);


--
-- Name: preferencias_usuario preferencias_usuario_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_pkey PRIMARY KEY (id_preferencias_usuario);


--
-- Name: roles_permisos roles_permisos_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.roles_permisos
    ADD CONSTRAINT roles_permisos_pkey PRIMARY KEY (id_roles_permisos);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id_roles);


--
-- Name: sesiones sesiones_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.sesiones
    ADD CONSTRAINT sesiones_pkey PRIMARY KEY (id_sesiones);


--
-- Name: tokens_verificacion tokens_verificacion_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.tokens_verificacion
    ADD CONSTRAINT tokens_verificacion_pkey PRIMARY KEY (id_tokens_verificacion);


--
-- Name: usuario_mfa usuario_mfa_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuario_mfa
    ADD CONSTRAINT usuario_mfa_pkey PRIMARY KEY (id_usuario_mfa);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuarios);


--
-- Name: usuarios_roles usuarios_roles_pkey; Type: CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios_roles
    ADD CONSTRAINT usuarios_roles_pkey PRIMARY KEY (id_usuarios_roles);


--
-- Name: rangos_geo_ip rangos_geo_ip_pkey; Type: CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.rangos_geo_ip
    ADD CONSTRAINT rangos_geo_ip_pkey PRIMARY KEY (id_rangos_geo_ip);


--
-- Name: zonas_horarias zonas_horarias_nombre_iana_key; Type: CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.zonas_horarias
    ADD CONSTRAINT zonas_horarias_nombre_iana_key UNIQUE (nombre_iana);


--
-- Name: zonas_horarias zonas_horarias_pkey; Type: CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.zonas_horarias
    ADD CONSTRAINT zonas_horarias_pkey PRIMARY KEY (id_zonas_horarias);


--
-- Name: acciones_requeridas_maestro_seccion_estado_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX acciones_requeridas_maestro_seccion_estado_idx ON configuracion.acciones_requeridas_maestro USING btree (seccion, estado);


--
-- Name: admin_level_1_fid_admin_level_0_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX admin_level_1_fid_admin_level_0_idx ON configuracion.admin_level_1 USING btree (fid_admin_level_0);


--
-- Name: admin_level_2_fid_admin_level_1_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX admin_level_2_fid_admin_level_1_idx ON configuracion.admin_level_2 USING btree (fid_admin_level_1);


--
-- Name: admin_level_3_fid_admin_level_1_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX admin_level_3_fid_admin_level_1_idx ON configuracion.admin_level_3 USING btree (fid_admin_level_1);


--
-- Name: admin_level_3_fid_admin_level_2_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX admin_level_3_fid_admin_level_2_idx ON configuracion.admin_level_3 USING btree (fid_admin_level_2);


--
-- Name: auditoria_fid_organizaciones_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX auditoria_fid_organizaciones_idx ON configuracion.auditoria USING btree (fid_organizaciones);


--
-- Name: auditoria_fid_usuarios_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX auditoria_fid_usuarios_idx ON configuracion.auditoria USING btree (fid_usuarios);


--
-- Name: configuracion_organizacion_fid_organizaciones_clave_key; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE UNIQUE INDEX configuracion_organizacion_fid_organizaciones_clave_key ON configuracion.configuracion_organizacion USING btree (fid_organizaciones, clave);


--
-- Name: modulos_codigo_key; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE UNIQUE INDEX modulos_codigo_key ON configuracion.modulos USING btree (codigo);


--
-- Name: organizaciones_modulos_fid_organizaciones_fid_modulos_key; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE UNIQUE INDEX organizaciones_modulos_fid_organizaciones_fid_modulos_key ON configuracion.organizaciones_modulos USING btree (fid_organizaciones, fid_modulos);


--
-- Name: organizaciones_modulos_fid_organizaciones_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX organizaciones_modulos_fid_organizaciones_idx ON configuracion.organizaciones_modulos USING btree (fid_organizaciones);


--
-- Name: parametros_codigo_grupo_codigo_key; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE UNIQUE INDEX parametros_codigo_grupo_codigo_key ON configuracion.parametros USING btree (codigo_grupo, codigo);


--
-- Name: parametros_traducciones_idioma_idx; Type: INDEX; Schema: configuracion; Owner: -
--

CREATE INDEX parametros_traducciones_idioma_idx ON configuracion.parametros_traducciones USING btree (codigo_idioma);


--
-- Name: eventos_fid_eventos_maestro_id_agregado_idx; Type: INDEX; Schema: eventos; Owner: -
--

CREATE INDEX eventos_fid_eventos_maestro_id_agregado_idx ON eventos.eventos USING btree (fid_eventos_maestro, id_agregado);


--
-- Name: eventos_fid_organizaciones_idx; Type: INDEX; Schema: eventos; Owner: -
--

CREATE INDEX eventos_fid_organizaciones_idx ON eventos.eventos USING btree (fid_organizaciones);


--
-- Name: eventos_fid_usuarios_ocurrido_en_idx; Type: INDEX; Schema: eventos; Owner: -
--

CREATE INDEX eventos_fid_usuarios_ocurrido_en_idx ON eventos.eventos USING btree (fid_usuarios, ocurrido_en);


--
-- Name: eventos_maestro_tipo_agregado_idx; Type: INDEX; Schema: eventos; Owner: -
--

CREATE INDEX eventos_maestro_tipo_agregado_idx ON eventos.eventos_maestro USING btree (tipo_agregado);


--
-- Name: organizaciones_slug_key; Type: INDEX; Schema: nucleo; Owner: -
--

CREATE UNIQUE INDEX organizaciones_slug_key ON nucleo.organizaciones USING btree (slug);


--
-- Name: perfil_organizacion_fid_organizaciones_key; Type: INDEX; Schema: nucleo; Owner: -
--

CREATE UNIQUE INDEX perfil_organizacion_fid_organizaciones_key ON nucleo.perfil_organizacion USING btree (fid_organizaciones);


--
-- Name: estudios_complementarios_activo_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX estudios_complementarios_activo_uidx ON personas.personas_estudios_complementarios USING btree (fid_personas, codigo_tipo_estudio, lower((nombre_estudio)::text), lower((institucion)::text), fecha_inicio) WHERE (estado = 1);


--
-- Name: estudios_complementarios_tipo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX estudios_complementarios_tipo_idx ON personas.personas_estudios_complementarios USING btree (codigo_tipo_estudio);


--
-- Name: estudios_realizados_activo_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX estudios_realizados_activo_uidx ON personas.personas_estudios_realizados USING btree (fid_personas, codigo_nivel_instruccion, codigo_grado_obtenido, codigo_profesion, fecha_inicio) WHERE (estado = 1);


--
-- Name: estudios_realizados_grado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX estudios_realizados_grado_idx ON personas.personas_estudios_realizados USING btree (codigo_grado_obtenido);


--
-- Name: estudios_realizados_nivel_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX estudios_realizados_nivel_idx ON personas.personas_estudios_realizados USING btree (codigo_nivel_instruccion);


--
-- Name: estudios_realizados_profesion_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX estudios_realizados_profesion_idx ON personas.personas_estudios_realizados USING btree (codigo_profesion);


--
-- Name: personas_correos_organizacion_correo_activo_key; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX personas_correos_organizacion_correo_activo_key ON personas.personas_correos USING btree (fid_organizaciones, correo) WHERE (estado = 1);


--
-- Name: personas_correos_organizacion_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_correos_organizacion_estado_idx ON personas.personas_correos USING btree (fid_organizaciones, estado);


--
-- Name: personas_correos_usos_correo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_correos_usos_correo_idx ON personas.personas_correos_usos USING btree (fid_personas_correos);


--
-- Name: personas_documentos_identidad_activa_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX personas_documentos_identidad_activa_uidx ON personas.personas_documentos USING btree (fid_organizaciones, codigo_tipo_documento, upper((numero_documento)::text)) WHERE (estado = 1);


--
-- Name: personas_documentos_organizacion_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_documentos_organizacion_idx ON personas.personas_documentos USING btree (fid_organizaciones);


--
-- Name: personas_documentos_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_documentos_persona_estado_idx ON personas.personas_documentos USING btree (fid_personas, estado);


--
-- Name: personas_documentos_tipo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_documentos_tipo_idx ON personas.personas_documentos USING btree (codigo_tipo_documento);


--
-- Name: personas_estudios_complementarios_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_estudios_complementarios_persona_estado_idx ON personas.personas_estudios_complementarios USING btree (fid_personas, estado);


--
-- Name: personas_estudios_realizados_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_estudios_realizados_persona_estado_idx ON personas.personas_estudios_realizados USING btree (fid_personas, estado);


--
-- Name: personas_fid_admin_level_0_procedencia_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_fid_admin_level_0_procedencia_idx ON personas.personas USING btree (fid_admin_level_0_procedencia);


--
-- Name: personas_fid_admin_level_0_residencia_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_fid_admin_level_0_residencia_idx ON personas.personas USING btree (fid_admin_level_0_residencia);


--
-- Name: personas_fid_admin_level_3_procedencia_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_fid_admin_level_3_procedencia_idx ON personas.personas USING btree (fid_admin_level_3_procedencia);


--
-- Name: personas_fid_admin_level_3_residencia_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_fid_admin_level_3_residencia_idx ON personas.personas USING btree (fid_admin_level_3_residencia);


--
-- Name: personas_fid_organizaciones_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_fid_organizaciones_idx ON personas.personas USING btree (fid_organizaciones);


--
-- Name: personas_hobbies_codigo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_hobbies_codigo_idx ON personas.personas_hobbies USING btree (codigo_hobby);


--
-- Name: personas_hobbies_frecuencia_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_hobbies_frecuencia_idx ON personas.personas_hobbies USING btree (codigo_frecuencia);


--
-- Name: personas_hobbies_identidad_activa_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX personas_hobbies_identidad_activa_uidx ON personas.personas_hobbies USING btree (fid_personas, codigo_hobby, lower((COALESCE(hobby_personalizado, ''::character varying))::text)) WHERE (estado = 1);


--
-- Name: personas_hobbies_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_hobbies_persona_estado_idx ON personas.personas_hobbies USING btree (fid_personas, estado);


--
-- Name: personas_nacionalidades_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_nacionalidades_persona_estado_idx ON personas.personas_nacionalidades USING btree (fid_personas, estado);


--
-- Name: personas_seguros_codigo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_seguros_codigo_idx ON personas.personas_seguros USING btree (codigo_seguro);


--
-- Name: personas_seguros_identidad_activa_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX personas_seguros_identidad_activa_uidx ON personas.personas_seguros USING btree (fid_personas, codigo_seguro, lower((COALESCE(nombre_otro, ''::character varying))::text), lower((numero_seguro)::text)) WHERE (estado = 1);


--
-- Name: personas_seguros_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_seguros_persona_estado_idx ON personas.personas_seguros USING btree (fid_personas, estado);


--
-- Name: personas_telefonos_numero_activo_uidx; Type: INDEX; Schema: personas; Owner: -
--

CREATE UNIQUE INDEX personas_telefonos_numero_activo_uidx ON personas.personas_telefonos USING btree (fid_personas, regexp_replace((numero)::text, '[^0-9]'::text, ''::text, 'g'::text)) WHERE (estado = 1);


--
-- Name: personas_telefonos_persona_estado_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_telefonos_persona_estado_idx ON personas.personas_telefonos USING btree (fid_personas, estado);


--
-- Name: personas_telefonos_tipo_idx; Type: INDEX; Schema: personas; Owner: -
--

CREATE INDEX personas_telefonos_tipo_idx ON personas.personas_telefonos USING btree (codigo_tipo_telefono);


--
-- Name: acciones_requeridas_maestro_estado_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX acciones_requeridas_maestro_estado_idx ON seguridad.acciones_requeridas USING btree (fid_acciones_requeridas_maestro, estado);


--
-- Name: acciones_requeridas_organizacion_usuario_estado_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX acciones_requeridas_organizacion_usuario_estado_idx ON seguridad.acciones_requeridas USING btree (fid_organizaciones, fid_usuarios, estado);


--
-- Name: codigos_recuperacion_mfa_fid_usuarios_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX codigos_recuperacion_mfa_fid_usuarios_idx ON seguridad.codigos_recuperacion_mfa USING btree (fid_usuarios);


--
-- Name: configuracion_usuario_fid_usuarios_clave_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX configuracion_usuario_fid_usuarios_clave_key ON seguridad.configuracion_usuario USING btree (fid_usuarios, clave);


--
-- Name: credenciales_contrasenia_activa_unica; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX credenciales_contrasenia_activa_unica ON seguridad.credenciales USING btree (fid_usuarios) WHERE ((tipo = 'contrasenia'::seguridad.tipo_credencial) AND (estado = 1));


--
-- Name: credenciales_fid_usuarios_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX credenciales_fid_usuarios_idx ON seguridad.credenciales USING btree (fid_usuarios);


--
-- Name: credenciales_fid_usuarios_tipo_estado_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX credenciales_fid_usuarios_tipo_estado_idx ON seguridad.credenciales USING btree (fid_usuarios, tipo, estado);


--
-- Name: dispositivos_fid_usuarios_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX dispositivos_fid_usuarios_idx ON seguridad.dispositivos USING btree (fid_usuarios);


--
-- Name: dispositivos_fid_usuarios_uid_dispositivo_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX dispositivos_fid_usuarios_uid_dispositivo_key ON seguridad.dispositivos USING btree (fid_usuarios, uid_dispositivo);


--
-- Name: historial_contrasenias_fid_usuarios_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX historial_contrasenias_fid_usuarios_idx ON seguridad.historial_contrasenias USING btree (fid_usuarios);


--
-- Name: permisos_codigo_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX permisos_codigo_key ON seguridad.permisos USING btree (codigo);


--
-- Name: preferencias_usuario_fid_admin_level_0_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX preferencias_usuario_fid_admin_level_0_idx ON seguridad.preferencias_usuario USING btree (fid_admin_level_0);


--
-- Name: preferencias_usuario_fid_usuarios_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX preferencias_usuario_fid_usuarios_key ON seguridad.preferencias_usuario USING btree (fid_usuarios);


--
-- Name: preferencias_usuario_fid_zonas_horarias_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX preferencias_usuario_fid_zonas_horarias_idx ON seguridad.preferencias_usuario USING btree (fid_zonas_horarias);


--
-- Name: roles_fid_organizaciones_codigo_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX roles_fid_organizaciones_codigo_key ON seguridad.roles USING btree (fid_organizaciones, codigo);


--
-- Name: roles_permisos_fid_roles_fid_permisos_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX roles_permisos_fid_roles_fid_permisos_key ON seguridad.roles_permisos USING btree (fid_roles, fid_permisos);


--
-- Name: sesiones_expira_inactividad_en_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX sesiones_expira_inactividad_en_idx ON seguridad.sesiones USING btree (expira_inactividad_en);


--
-- Name: sesiones_fid_dispositivos_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX sesiones_fid_dispositivos_idx ON seguridad.sesiones USING btree (fid_dispositivos);


--
-- Name: tokens_verificacion_fid_usuarios_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX tokens_verificacion_fid_usuarios_idx ON seguridad.tokens_verificacion USING btree (fid_usuarios);


--
-- Name: usuario_mfa_fid_usuarios_tipo_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX usuario_mfa_fid_usuarios_tipo_key ON seguridad.usuario_mfa USING btree (fid_usuarios, tipo);


--
-- Name: usuarios_fid_organizaciones_idx; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE INDEX usuarios_fid_organizaciones_idx ON seguridad.usuarios USING btree (fid_organizaciones);


--
-- Name: usuarios_fid_organizaciones_usuario_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX usuarios_fid_organizaciones_usuario_key ON seguridad.usuarios USING btree (fid_organizaciones, usuario);


--
-- Name: usuarios_roles_fid_usuarios_fid_roles_key; Type: INDEX; Schema: seguridad; Owner: -
--

CREATE UNIQUE INDEX usuarios_roles_fid_usuarios_fid_roles_key ON seguridad.usuarios_roles USING btree (fid_usuarios, fid_roles);


--
-- Name: rangos_geo_ip_fid_admin_level_0_idx; Type: INDEX; Schema: system; Owner: -
--

CREATE INDEX rangos_geo_ip_fid_admin_level_0_idx ON system.rangos_geo_ip USING btree (fid_admin_level_0);


--
-- Name: rangos_geo_ip_fid_admin_level_1_idx; Type: INDEX; Schema: system; Owner: -
--

CREATE INDEX rangos_geo_ip_fid_admin_level_1_idx ON system.rangos_geo_ip USING btree (fid_admin_level_1);


--
-- Name: rangos_geo_ip_rango_idx; Type: INDEX; Schema: system; Owner: -
--

CREATE INDEX rangos_geo_ip_rango_idx ON system.rangos_geo_ip USING btree (ip_inicio, ip_fin);


--
-- Name: acciones_requeridas_maestro establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.acciones_requeridas_maestro FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: admin_level_0 establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.admin_level_0 FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: admin_level_1 establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.admin_level_1 FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: admin_level_2 establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.admin_level_2 FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: admin_level_3 establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.admin_level_3 FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: auditoria establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.auditoria FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: configuracion_organizacion establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.configuracion_organizacion FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: modulos establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.modulos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: organizaciones_modulos establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.organizaciones_modulos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: parametros establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.parametros FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: parametros_traducciones establecer_updated_at; Type: TRIGGER; Schema: configuracion; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON configuracion.parametros_traducciones FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: eventos establecer_updated_at; Type: TRIGGER; Schema: eventos; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON eventos.eventos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: eventos_maestro establecer_updated_at; Type: TRIGGER; Schema: eventos; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON eventos.eventos_maestro FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: organizaciones establecer_updated_at; Type: TRIGGER; Schema: nucleo; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON nucleo.organizaciones FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: perfil_organizacion establecer_updated_at; Type: TRIGGER; Schema: nucleo; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON nucleo.perfil_organizacion FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_correos establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_correos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_correos_usos establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_correos_usos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_documentos establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_documentos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_estudios_complementarios establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_estudios_complementarios FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_estudios_realizados establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_estudios_realizados FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_hobbies establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_hobbies FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_nacionalidades establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_nacionalidades FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_seguros establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_seguros FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: personas_telefonos establecer_updated_at; Type: TRIGGER; Schema: personas; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON personas.personas_telefonos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: acciones_requeridas establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.acciones_requeridas FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: codigos_recuperacion_mfa establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.codigos_recuperacion_mfa FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: configuracion_usuario establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.configuracion_usuario FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: credenciales establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.credenciales FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: dispositivos establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.dispositivos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: historial_contrasenias establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.historial_contrasenias FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: permisos establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.permisos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: preferencias_usuario establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.preferencias_usuario FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: roles establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.roles FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: roles_permisos establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.roles_permisos FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: sesiones establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.sesiones FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: tokens_verificacion establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.tokens_verificacion FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: usuario_mfa establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.usuario_mfa FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: usuarios establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.usuarios FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: usuarios_roles establecer_updated_at; Type: TRIGGER; Schema: seguridad; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON seguridad.usuarios_roles FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: zonas_horarias establecer_updated_at; Type: TRIGGER; Schema: system; Owner: -
--

CREATE TRIGGER establecer_updated_at BEFORE UPDATE ON system.zonas_horarias FOR EACH ROW EXECUTE FUNCTION configuracion.establecer_updated_at();


--
-- Name: admin_level_1 admin_level_1_fid_admin_level_0_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_1
    ADD CONSTRAINT admin_level_1_fid_admin_level_0_fkey FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT;


--
-- Name: admin_level_3 admin_level_3_fid_admin_level_1_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_3
    ADD CONSTRAINT admin_level_3_fid_admin_level_1_fkey FOREIGN KEY (fid_admin_level_1) REFERENCES configuracion.admin_level_1(id_admin_level_1) ON DELETE RESTRICT;


--
-- Name: admin_level_3 admin_level_3_fid_admin_level_2_fid_admin_level_1_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_3
    ADD CONSTRAINT admin_level_3_fid_admin_level_2_fid_admin_level_1_fkey FOREIGN KEY (fid_admin_level_2, fid_admin_level_1) REFERENCES configuracion.admin_level_2(id_admin_level_2, fid_admin_level_1) ON DELETE RESTRICT;


--
-- Name: configuracion_organizacion configuracion_organizacion_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.configuracion_organizacion
    ADD CONSTRAINT configuracion_organizacion_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: modulos modulos_fid_modulos_padre_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.modulos
    ADD CONSTRAINT modulos_fid_modulos_padre_fkey FOREIGN KEY (fid_modulos_padre) REFERENCES configuracion.modulos(id_modulos) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: organizaciones_modulos organizaciones_modulos_fid_modulos_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.organizaciones_modulos
    ADD CONSTRAINT organizaciones_modulos_fid_modulos_fkey FOREIGN KEY (fid_modulos) REFERENCES configuracion.modulos(id_modulos) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: organizaciones_modulos organizaciones_modulos_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.organizaciones_modulos
    ADD CONSTRAINT organizaciones_modulos_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: parametros_traducciones parametros_traducciones_parametro_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.parametros_traducciones
    ADD CONSTRAINT parametros_traducciones_parametro_fkey FOREIGN KEY (fid_parametros) REFERENCES configuracion.parametros(id_parametros) ON DELETE CASCADE;


--
-- Name: admin_level_2 provincias_fid_departamentos_fkey; Type: FK CONSTRAINT; Schema: configuracion; Owner: -
--

ALTER TABLE ONLY configuracion.admin_level_2
    ADD CONSTRAINT provincias_fid_departamentos_fkey FOREIGN KEY (fid_admin_level_1) REFERENCES configuracion.admin_level_1(id_admin_level_1) ON DELETE RESTRICT;


--
-- Name: eventos eventos_fid_eventos_maestro_fkey; Type: FK CONSTRAINT; Schema: eventos; Owner: -
--

ALTER TABLE ONLY eventos.eventos
    ADD CONSTRAINT eventos_fid_eventos_maestro_fkey FOREIGN KEY (fid_eventos_maestro) REFERENCES eventos.eventos_maestro(id_eventos_maestro) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: perfil_organizacion perfil_organizacion_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: nucleo; Owner: -
--

ALTER TABLE ONLY nucleo.perfil_organizacion
    ADD CONSTRAINT perfil_organizacion_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personas_correos personas_correos_persona_organizacion_fk; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos
    ADD CONSTRAINT personas_correos_persona_organizacion_fk FOREIGN KEY (fid_personas, fid_organizaciones) REFERENCES personas.personas(id_personas, fid_organizaciones) ON DELETE CASCADE;


--
-- Name: personas_correos_usos personas_correos_usos_correo_persona_fk; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos_usos
    ADD CONSTRAINT personas_correos_usos_correo_persona_fk FOREIGN KEY (fid_personas_correos, fid_personas) REFERENCES personas.personas_correos(id_personas_correos, fid_personas) ON DELETE CASCADE;


--
-- Name: personas_correos_usos personas_correos_usos_persona_fk; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_correos_usos
    ADD CONSTRAINT personas_correos_usos_persona_fk FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas_documentos personas_documentos_persona_organizacion_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_documentos
    ADD CONSTRAINT personas_documentos_persona_organizacion_fkey FOREIGN KEY (fid_personas, fid_organizaciones) REFERENCES personas.personas(id_personas, fid_organizaciones) ON DELETE CASCADE;


--
-- Name: personas_estudios_complementarios personas_estudios_complementarios_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_estudios_complementarios
    ADD CONSTRAINT personas_estudios_complementarios_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas_estudios_realizados personas_estudios_realizados_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_estudios_realizados
    ADD CONSTRAINT personas_estudios_realizados_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas personas_fid_admin_level_0_procedencia_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_fid_admin_level_0_procedencia_fkey FOREIGN KEY (fid_admin_level_0_procedencia) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT;


--
-- Name: personas personas_fid_admin_level_3_procedencia_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_fid_admin_level_3_procedencia_fkey FOREIGN KEY (fid_admin_level_3_procedencia) REFERENCES configuracion.admin_level_3(id_admin_level_3) ON DELETE RESTRICT;


--
-- Name: personas personas_fid_distritos_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_fid_distritos_fkey FOREIGN KEY (fid_admin_level_3_residencia) REFERENCES configuracion.admin_level_3(id_admin_level_3) ON DELETE RESTRICT;


--
-- Name: personas personas_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personas personas_fid_paises_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas
    ADD CONSTRAINT personas_fid_paises_fkey FOREIGN KEY (fid_admin_level_0_residencia) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT;


--
-- Name: personas_hobbies personas_hobbies_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_hobbies
    ADD CONSTRAINT personas_hobbies_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas_nacionalidades personas_nacionalidades_pais_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_nacionalidades
    ADD CONSTRAINT personas_nacionalidades_pais_fkey FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON DELETE RESTRICT;


--
-- Name: personas_nacionalidades personas_nacionalidades_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_nacionalidades
    ADD CONSTRAINT personas_nacionalidades_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas_seguros personas_seguros_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_seguros
    ADD CONSTRAINT personas_seguros_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: personas_telefonos personas_telefonos_persona_fkey; Type: FK CONSTRAINT; Schema: personas; Owner: -
--

ALTER TABLE ONLY personas.personas_telefonos
    ADD CONSTRAINT personas_telefonos_persona_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON DELETE CASCADE;


--
-- Name: acciones_requeridas acciones_requeridas_maestro_fk; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.acciones_requeridas
    ADD CONSTRAINT acciones_requeridas_maestro_fk FOREIGN KEY (fid_acciones_requeridas_maestro) REFERENCES configuracion.acciones_requeridas_maestro(id_acciones_requeridas_maestro) ON DELETE RESTRICT;


--
-- Name: acciones_requeridas acciones_requeridas_organizacion_fk; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.acciones_requeridas
    ADD CONSTRAINT acciones_requeridas_organizacion_fk FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON DELETE CASCADE;


--
-- Name: acciones_requeridas acciones_requeridas_usuario_fk; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.acciones_requeridas
    ADD CONSTRAINT acciones_requeridas_usuario_fk FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON DELETE CASCADE;


--
-- Name: codigos_recuperacion_mfa codigos_recuperacion_mfa_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.codigos_recuperacion_mfa
    ADD CONSTRAINT codigos_recuperacion_mfa_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: configuracion_usuario configuracion_usuario_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.configuracion_usuario
    ADD CONSTRAINT configuracion_usuario_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credenciales credenciales_fid_dispositivos_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.credenciales
    ADD CONSTRAINT credenciales_fid_dispositivos_fkey FOREIGN KEY (fid_dispositivos) REFERENCES seguridad.dispositivos(id_dispositivos) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: credenciales credenciales_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.credenciales
    ADD CONSTRAINT credenciales_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: dispositivos dispositivos_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.dispositivos
    ADD CONSTRAINT dispositivos_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: historial_contrasenias historial_contrasenias_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.historial_contrasenias
    ADD CONSTRAINT historial_contrasenias_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: preferencias_usuario preferencias_usuario_fid_paises_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_fid_paises_fkey FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0);


--
-- Name: preferencias_usuario preferencias_usuario_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: preferencias_usuario preferencias_usuario_fid_zonas_horarias_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.preferencias_usuario
    ADD CONSTRAINT preferencias_usuario_fid_zonas_horarias_fkey FOREIGN KEY (fid_zonas_horarias) REFERENCES system.zonas_horarias(id_zonas_horarias);


--
-- Name: roles roles_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.roles
    ADD CONSTRAINT roles_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_fid_permisos_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.roles_permisos
    ADD CONSTRAINT roles_permisos_fid_permisos_fkey FOREIGN KEY (fid_permisos) REFERENCES seguridad.permisos(id_permisos) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: roles_permisos roles_permisos_fid_roles_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.roles_permisos
    ADD CONSTRAINT roles_permisos_fid_roles_fkey FOREIGN KEY (fid_roles) REFERENCES seguridad.roles(id_roles) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sesiones sesiones_fid_dispositivos_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.sesiones
    ADD CONSTRAINT sesiones_fid_dispositivos_fkey FOREIGN KEY (fid_dispositivos) REFERENCES seguridad.dispositivos(id_dispositivos) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tokens_verificacion tokens_verificacion_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.tokens_verificacion
    ADD CONSTRAINT tokens_verificacion_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuario_mfa usuario_mfa_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuario_mfa
    ADD CONSTRAINT usuario_mfa_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios usuarios_fid_organizaciones_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios
    ADD CONSTRAINT usuarios_fid_organizaciones_fkey FOREIGN KEY (fid_organizaciones) REFERENCES nucleo.organizaciones(id_organizaciones) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios usuarios_fid_personas_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios
    ADD CONSTRAINT usuarios_fid_personas_fkey FOREIGN KEY (fid_personas) REFERENCES personas.personas(id_personas) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_fid_roles_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios_roles
    ADD CONSTRAINT usuarios_roles_fid_roles_fkey FOREIGN KEY (fid_roles) REFERENCES seguridad.roles(id_roles) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuarios_roles usuarios_roles_fid_usuarios_fkey; Type: FK CONSTRAINT; Schema: seguridad; Owner: -
--

ALTER TABLE ONLY seguridad.usuarios_roles
    ADD CONSTRAINT usuarios_roles_fid_usuarios_fkey FOREIGN KEY (fid_usuarios) REFERENCES seguridad.usuarios(id_usuarios) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rangos_geo_ip rangos_geo_ip_fid_admin_level_0_fkey; Type: FK CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.rangos_geo_ip
    ADD CONSTRAINT rangos_geo_ip_fid_admin_level_0_fkey FOREIGN KEY (fid_admin_level_0) REFERENCES configuracion.admin_level_0(id_admin_level_0) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rangos_geo_ip rangos_geo_ip_fid_admin_level_1_fkey; Type: FK CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.rangos_geo_ip
    ADD CONSTRAINT rangos_geo_ip_fid_admin_level_1_fkey FOREIGN KEY (fid_admin_level_1) REFERENCES configuracion.admin_level_1(id_admin_level_1) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict gEDqA229Ri6Q7OYb6oLdvhhaU4xUkXYdFWfglXR0NFSl6O3h29uh3NUBrXx8NfU

