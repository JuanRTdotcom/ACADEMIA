-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "configuracion";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "eventos";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "nucleo";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "personas";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "seguridad";

-- CreateEnum
CREATE TYPE "seguridad"."EstadoUsuario" AS ENUM ('ACTIVO', 'INVITADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "seguridad"."TipoCredencial" AS ENUM ('CONTRASENIA', 'PASSKEY');

-- CreateEnum
CREATE TYPE "seguridad"."PlataformaDispositivo" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "seguridad"."TipoToken" AS ENUM ('VERIFICACION_CORREO', 'RESET_CONTRASENIA', 'ENLACE_MAGICO', 'INVITACION', 'DISPOSITIVO_NUEVO');

-- CreateEnum
CREATE TYPE "seguridad"."TipoMfa" AS ENUM ('TOTP', 'SMS', 'CORREO');

-- CreateTable
CREATE TABLE "nucleo"."organizaciones" (
    "idOrganizaciones" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("idOrganizaciones")
);

-- CreateTable
CREATE TABLE "nucleo"."perfilOrganizacion" (
    "idPerfilOrganizacion" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "razonSocial" TEXT,
    "rucNif" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correoContacto" TEXT,
    "sitioWeb" TEXT,
    "logoUrl" TEXT,
    "colorPrimario" TEXT,
    "correoRemitenteNombre" TEXT,
    "correoRemitenteDireccion" TEXT,
    "cabeceraImpresion" TEXT,
    "idiomaPorDefecto" TEXT NOT NULL DEFAULT 'es',
    "zonaHorariaPorDefecto" TEXT NOT NULL DEFAULT 'America/Lima',
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "perfilOrganizacion_pkey" PRIMARY KEY ("idPerfilOrganizacion")
);

-- CreateTable
CREATE TABLE "personas"."personas" (
    "idPersonas" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidoPaterno" TEXT NOT NULL,
    "apellidoMaterno" TEXT,
    "codigoTipoDocumento" TEXT,
    "numeroDocumento" TEXT,
    "codigoSexo" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "correo" TEXT,
    "fotoUrl" TEXT,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("idPersonas")
);

-- CreateTable
CREATE TABLE "seguridad"."usuarios" (
    "idUsuarios" TEXT NOT NULL,
    "fidPersonas" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "correoVerificadoEn" TIMESTAMP(3),
    "estadoCuenta" "seguridad"."EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoHasta" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("idUsuarios")
);

-- CreateTable
CREATE TABLE "seguridad"."credenciales" (
    "idCredenciales" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "fidDispositivos" TEXT,
    "tipo" "seguridad"."TipoCredencial" NOT NULL,
    "hashContrasenia" TEXT,
    "llavePublica" TEXT,
    "idCredencialWebauthn" TEXT,
    "contador" INTEGER,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "credenciales_pkey" PRIMARY KEY ("idCredenciales")
);

-- CreateTable
CREATE TABLE "seguridad"."historialContrasenias" (
    "idHistorialContrasenias" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "hashContrasenia" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "historialContrasenias_pkey" PRIMARY KEY ("idHistorialContrasenias")
);

-- CreateTable
CREATE TABLE "seguridad"."usuarioMfa" (
    "idUsuarioMfa" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "tipo" "seguridad"."TipoMfa" NOT NULL,
    "secreto" TEXT,
    "telefono" TEXT,
    "habilitado" BOOLEAN NOT NULL DEFAULT false,
    "confirmadoEn" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "usuarioMfa_pkey" PRIMARY KEY ("idUsuarioMfa")
);

-- CreateTable
CREATE TABLE "seguridad"."codigosRecuperacionMfa" (
    "idCodigosRecuperacionMfa" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "hashCodigo" TEXT NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "codigosRecuperacionMfa_pkey" PRIMARY KEY ("idCodigosRecuperacionMfa")
);

-- CreateTable
CREATE TABLE "seguridad"."dispositivos" (
    "idDispositivos" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "uidDispositivo" TEXT NOT NULL,
    "plataforma" "seguridad"."PlataformaDispositivo" NOT NULL,
    "modelo" TEXT,
    "versionSo" TEXT,
    "versionApp" TEXT,
    "tokenPush" TEXT,
    "confiable" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAccesoEn" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("idDispositivos")
);

-- CreateTable
CREATE TABLE "seguridad"."sesiones" (
    "idSesiones" TEXT NOT NULL,
    "fidDispositivos" TEXT NOT NULL,
    "hashTokenRefresco" TEXT NOT NULL,
    "agenteUsuario" TEXT,
    "ip" TEXT,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadaEn" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("idSesiones")
);

-- CreateTable
CREATE TABLE "seguridad"."tokensVerificacion" (
    "idTokensVerificacion" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "tipo" "seguridad"."TipoToken" NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "tokensVerificacion_pkey" PRIMARY KEY ("idTokensVerificacion")
);

-- CreateTable
CREATE TABLE "seguridad"."roles" (
    "idRoles" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("idRoles")
);

-- CreateTable
CREATE TABLE "seguridad"."permisos" (
    "idPermisos" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("idPermisos")
);

-- CreateTable
CREATE TABLE "seguridad"."rolesPermisos" (
    "idRolesPermisos" TEXT NOT NULL,
    "fidRoles" TEXT NOT NULL,
    "fidPermisos" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "rolesPermisos_pkey" PRIMARY KEY ("idRolesPermisos")
);

-- CreateTable
CREATE TABLE "seguridad"."usuariosRoles" (
    "idUsuariosRoles" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "fidRoles" TEXT NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "usuariosRoles_pkey" PRIMARY KEY ("idUsuariosRoles")
);

-- CreateTable
CREATE TABLE "seguridad"."auditoria" (
    "idAuditoria" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "fidUsuarios" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "idEntidad" TEXT,
    "ip" TEXT,
    "agenteUsuario" TEXT,
    "metadatos" JSONB,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("idAuditoria")
);

-- CreateTable
CREATE TABLE "configuracion"."modulos" (
    "idModulos" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "ruta" TEXT,
    "fidModulosPadre" TEXT,
    "requierePermiso" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("idModulos")
);

-- CreateTable
CREATE TABLE "configuracion"."organizacionesModulos" (
    "idOrganizacionesModulos" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "fidModulos" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "organizacionesModulos_pkey" PRIMARY KEY ("idOrganizacionesModulos")
);

-- CreateTable
CREATE TABLE "configuracion"."parametros" (
    "idParametros" TEXT NOT NULL,
    "codigoGrupo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "parametros_pkey" PRIMARY KEY ("idParametros")
);

-- CreateTable
CREATE TABLE "configuracion"."configuracionOrganizacion" (
    "idConfiguracionOrganizacion" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "configuracionOrganizacion_pkey" PRIMARY KEY ("idConfiguracionOrganizacion")
);

-- CreateTable
CREATE TABLE "configuracion"."configuracionUsuario" (
    "idConfiguracionUsuario" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "configuracionUsuario_pkey" PRIMARY KEY ("idConfiguracionUsuario")
);

-- CreateTable
CREATE TABLE "configuracion"."preferenciasUsuario" (
    "idPreferenciasUsuario" TEXT NOT NULL,
    "fidUsuarios" TEXT NOT NULL,
    "tema" TEXT,
    "idioma" TEXT,
    "zonaHoraria" TEXT,
    "formatoFecha" TEXT,
    "notificaciones" JSONB,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "preferenciasUsuario_pkey" PRIMARY KEY ("idPreferenciasUsuario")
);

-- CreateTable
CREATE TABLE "eventos"."eventos" (
    "idEventos" TEXT NOT NULL,
    "fidOrganizaciones" TEXT NOT NULL,
    "tipoAgregado" TEXT NOT NULL,
    "idAgregado" TEXT NOT NULL,
    "tipoEvento" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "datos" JSONB NOT NULL,
    "metadatos" JSONB,
    "ocurridoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("idEventos")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_slug_key" ON "nucleo"."organizaciones"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "perfilOrganizacion_fidOrganizaciones_key" ON "nucleo"."perfilOrganizacion"("fidOrganizaciones");

-- CreateIndex
CREATE INDEX "personas_fidOrganizaciones_idx" ON "personas"."personas"("fidOrganizaciones");

-- CreateIndex
CREATE INDEX "usuarios_fidOrganizaciones_idx" ON "seguridad"."usuarios"("fidOrganizaciones");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_fidOrganizaciones_correo_key" ON "seguridad"."usuarios"("fidOrganizaciones", "correo");

-- CreateIndex
CREATE INDEX "credenciales_fidUsuarios_idx" ON "seguridad"."credenciales"("fidUsuarios");

-- CreateIndex
CREATE INDEX "historialContrasenias_fidUsuarios_idx" ON "seguridad"."historialContrasenias"("fidUsuarios");

-- CreateIndex
CREATE UNIQUE INDEX "usuarioMfa_fidUsuarios_tipo_key" ON "seguridad"."usuarioMfa"("fidUsuarios", "tipo");

-- CreateIndex
CREATE INDEX "codigosRecuperacionMfa_fidUsuarios_idx" ON "seguridad"."codigosRecuperacionMfa"("fidUsuarios");

-- CreateIndex
CREATE INDEX "dispositivos_fidUsuarios_idx" ON "seguridad"."dispositivos"("fidUsuarios");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_fidUsuarios_uidDispositivo_key" ON "seguridad"."dispositivos"("fidUsuarios", "uidDispositivo");

-- CreateIndex
CREATE INDEX "sesiones_fidDispositivos_idx" ON "seguridad"."sesiones"("fidDispositivos");

-- CreateIndex
CREATE INDEX "tokensVerificacion_fidUsuarios_idx" ON "seguridad"."tokensVerificacion"("fidUsuarios");

-- CreateIndex
CREATE UNIQUE INDEX "roles_fidOrganizaciones_codigo_key" ON "seguridad"."roles"("fidOrganizaciones", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_codigo_key" ON "seguridad"."permisos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "rolesPermisos_fidRoles_fidPermisos_key" ON "seguridad"."rolesPermisos"("fidRoles", "fidPermisos");

-- CreateIndex
CREATE UNIQUE INDEX "usuariosRoles_fidUsuarios_fidRoles_key" ON "seguridad"."usuariosRoles"("fidUsuarios", "fidRoles");

-- CreateIndex
CREATE INDEX "auditoria_fidOrganizaciones_idx" ON "seguridad"."auditoria"("fidOrganizaciones");

-- CreateIndex
CREATE INDEX "auditoria_fidUsuarios_idx" ON "seguridad"."auditoria"("fidUsuarios");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_codigo_key" ON "configuracion"."modulos"("codigo");

-- CreateIndex
CREATE INDEX "organizacionesModulos_fidOrganizaciones_idx" ON "configuracion"."organizacionesModulos"("fidOrganizaciones");

-- CreateIndex
CREATE UNIQUE INDEX "organizacionesModulos_fidOrganizaciones_fidModulos_key" ON "configuracion"."organizacionesModulos"("fidOrganizaciones", "fidModulos");

-- CreateIndex
CREATE UNIQUE INDEX "parametros_codigoGrupo_codigo_key" ON "configuracion"."parametros"("codigoGrupo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "configuracionOrganizacion_fidOrganizaciones_clave_key" ON "configuracion"."configuracionOrganizacion"("fidOrganizaciones", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "configuracionUsuario_fidUsuarios_clave_key" ON "configuracion"."configuracionUsuario"("fidUsuarios", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "preferenciasUsuario_fidUsuarios_key" ON "configuracion"."preferenciasUsuario"("fidUsuarios");

-- CreateIndex
CREATE INDEX "eventos_tipoAgregado_idAgregado_idx" ON "eventos"."eventos"("tipoAgregado", "idAgregado");

-- CreateIndex
CREATE INDEX "eventos_fidOrganizaciones_idx" ON "eventos"."eventos"("fidOrganizaciones");

-- AddForeignKey
ALTER TABLE "nucleo"."perfilOrganizacion" ADD CONSTRAINT "perfilOrganizacion_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas"."personas" ADD CONSTRAINT "personas_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "usuarios_fidPersonas_fkey" FOREIGN KEY ("fidPersonas") REFERENCES "personas"."personas"("idPersonas") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "usuarios_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."credenciales" ADD CONSTRAINT "credenciales_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."credenciales" ADD CONSTRAINT "credenciales_fidDispositivos_fkey" FOREIGN KEY ("fidDispositivos") REFERENCES "seguridad"."dispositivos"("idDispositivos") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."historialContrasenias" ADD CONSTRAINT "historialContrasenias_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."usuarioMfa" ADD CONSTRAINT "usuarioMfa_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."codigosRecuperacionMfa" ADD CONSTRAINT "codigosRecuperacionMfa_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."dispositivos" ADD CONSTRAINT "dispositivos_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."sesiones" ADD CONSTRAINT "sesiones_fidDispositivos_fkey" FOREIGN KEY ("fidDispositivos") REFERENCES "seguridad"."dispositivos"("idDispositivos") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."tokensVerificacion" ADD CONSTRAINT "tokensVerificacion_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."roles" ADD CONSTRAINT "roles_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."rolesPermisos" ADD CONSTRAINT "rolesPermisos_fidRoles_fkey" FOREIGN KEY ("fidRoles") REFERENCES "seguridad"."roles"("idRoles") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."rolesPermisos" ADD CONSTRAINT "rolesPermisos_fidPermisos_fkey" FOREIGN KEY ("fidPermisos") REFERENCES "seguridad"."permisos"("idPermisos") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."usuariosRoles" ADD CONSTRAINT "usuariosRoles_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seguridad"."usuariosRoles" ADD CONSTRAINT "usuariosRoles_fidRoles_fkey" FOREIGN KEY ("fidRoles") REFERENCES "seguridad"."roles"("idRoles") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."modulos" ADD CONSTRAINT "modulos_fidModulosPadre_fkey" FOREIGN KEY ("fidModulosPadre") REFERENCES "configuracion"."modulos"("idModulos") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."organizacionesModulos" ADD CONSTRAINT "organizacionesModulos_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."organizacionesModulos" ADD CONSTRAINT "organizacionesModulos_fidModulos_fkey" FOREIGN KEY ("fidModulos") REFERENCES "configuracion"."modulos"("idModulos") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."configuracionOrganizacion" ADD CONSTRAINT "configuracionOrganizacion_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."configuracionUsuario" ADD CONSTRAINT "configuracionUsuario_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion"."preferenciasUsuario" ADD CONSTRAINT "preferenciasUsuario_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
