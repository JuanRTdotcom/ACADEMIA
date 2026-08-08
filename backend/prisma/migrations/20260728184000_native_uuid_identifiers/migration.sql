-- Convierte todas las PK y FK relacionales de TEXT a UUID nativo.
-- Los casts son transaccionales: cualquier valor inválido revierte la migración completa.

BEGIN;

ALTER TABLE "nucleo"."perfilOrganizacion" DROP CONSTRAINT "perfilOrganizacion_fidOrganizaciones_fkey";
ALTER TABLE "personas"."personas" DROP CONSTRAINT "personas_fidOrganizaciones_fkey";
ALTER TABLE "seguridad"."usuarios" DROP CONSTRAINT "usuarios_fidPersonas_fkey";
ALTER TABLE "seguridad"."usuarios" DROP CONSTRAINT "usuarios_fidOrganizaciones_fkey";
ALTER TABLE "seguridad"."credenciales" DROP CONSTRAINT "credenciales_fidUsuarios_fkey";
ALTER TABLE "seguridad"."credenciales" DROP CONSTRAINT "credenciales_fidDispositivos_fkey";
ALTER TABLE "seguridad"."historialContrasenias" DROP CONSTRAINT "historialContrasenias_fidUsuarios_fkey";
ALTER TABLE "seguridad"."usuarioMfa" DROP CONSTRAINT "usuarioMfa_fidUsuarios_fkey";
ALTER TABLE "seguridad"."codigosRecuperacionMfa" DROP CONSTRAINT "codigosRecuperacionMfa_fidUsuarios_fkey";
ALTER TABLE "seguridad"."dispositivos" DROP CONSTRAINT "dispositivos_fidUsuarios_fkey";
ALTER TABLE "seguridad"."sesiones" DROP CONSTRAINT "sesiones_fidDispositivos_fkey";
ALTER TABLE "seguridad"."tokensVerificacion" DROP CONSTRAINT "tokensVerificacion_fidUsuarios_fkey";
ALTER TABLE "seguridad"."roles" DROP CONSTRAINT "roles_fidOrganizaciones_fkey";
ALTER TABLE "seguridad"."rolesPermisos" DROP CONSTRAINT "rolesPermisos_fidRoles_fkey";
ALTER TABLE "seguridad"."rolesPermisos" DROP CONSTRAINT "rolesPermisos_fidPermisos_fkey";
ALTER TABLE "seguridad"."usuariosRoles" DROP CONSTRAINT "usuariosRoles_fidUsuarios_fkey";
ALTER TABLE "seguridad"."usuariosRoles" DROP CONSTRAINT "usuariosRoles_fidRoles_fkey";
ALTER TABLE "configuracion"."modulos" DROP CONSTRAINT "modulos_fidModulosPadre_fkey";
ALTER TABLE "configuracion"."organizacionesModulos" DROP CONSTRAINT "organizacionesModulos_fidOrganizaciones_fkey";
ALTER TABLE "configuracion"."organizacionesModulos" DROP CONSTRAINT "organizacionesModulos_fidModulos_fkey";
ALTER TABLE "configuracion"."configuracionOrganizacion" DROP CONSTRAINT "configuracionOrganizacion_fidOrganizaciones_fkey";
ALTER TABLE "configuracion"."configuracionUsuario" DROP CONSTRAINT "configuracionUsuario_fidUsuarios_fkey";
ALTER TABLE "configuracion"."preferenciasUsuario" DROP CONSTRAINT "preferenciasUsuario_fidUsuarios_fkey";

ALTER TABLE "nucleo"."organizaciones"
  ALTER COLUMN "idOrganizaciones" TYPE UUID USING "idOrganizaciones"::uuid;

ALTER TABLE "nucleo"."perfilOrganizacion"
  ALTER COLUMN "idPerfilOrganizacion" TYPE UUID USING "idPerfilOrganizacion"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "personas"."personas"
  ALTER COLUMN "idPersonas" TYPE UUID USING "idPersonas"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "seguridad"."usuarios"
  ALTER COLUMN "idUsuarios" TYPE UUID USING "idUsuarios"::uuid,
  ALTER COLUMN "fidPersonas" TYPE UUID USING "fidPersonas"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "seguridad"."credenciales"
  ALTER COLUMN "idCredenciales" TYPE UUID USING "idCredenciales"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid,
  ALTER COLUMN "fidDispositivos" TYPE UUID USING "fidDispositivos"::uuid;

ALTER TABLE "seguridad"."historialContrasenias"
  ALTER COLUMN "idHistorialContrasenias" TYPE UUID USING "idHistorialContrasenias"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "seguridad"."usuarioMfa"
  ALTER COLUMN "idUsuarioMfa" TYPE UUID USING "idUsuarioMfa"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "seguridad"."codigosRecuperacionMfa"
  ALTER COLUMN "idCodigosRecuperacionMfa" TYPE UUID USING "idCodigosRecuperacionMfa"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "seguridad"."dispositivos"
  ALTER COLUMN "idDispositivos" TYPE UUID USING "idDispositivos"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "seguridad"."sesiones"
  ALTER COLUMN "idSesiones" TYPE UUID USING "idSesiones"::uuid,
  ALTER COLUMN "fidDispositivos" TYPE UUID USING "fidDispositivos"::uuid;

ALTER TABLE "seguridad"."tokensVerificacion"
  ALTER COLUMN "idTokensVerificacion" TYPE UUID USING "idTokensVerificacion"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "seguridad"."roles"
  ALTER COLUMN "idRoles" TYPE UUID USING "idRoles"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "seguridad"."permisos"
  ALTER COLUMN "idPermisos" TYPE UUID USING "idPermisos"::uuid;

ALTER TABLE "seguridad"."rolesPermisos"
  ALTER COLUMN "idRolesPermisos" TYPE UUID USING "idRolesPermisos"::uuid,
  ALTER COLUMN "fidRoles" TYPE UUID USING "fidRoles"::uuid,
  ALTER COLUMN "fidPermisos" TYPE UUID USING "fidPermisos"::uuid;

ALTER TABLE "seguridad"."usuariosRoles"
  ALTER COLUMN "idUsuariosRoles" TYPE UUID USING "idUsuariosRoles"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid,
  ALTER COLUMN "fidRoles" TYPE UUID USING "fidRoles"::uuid;

ALTER TABLE "seguridad"."auditoria"
  ALTER COLUMN "idAuditoria" TYPE UUID USING "idAuditoria"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "configuracion"."modulos"
  ALTER COLUMN "idModulos" TYPE UUID USING "idModulos"::uuid,
  ALTER COLUMN "fidModulosPadre" TYPE UUID USING "fidModulosPadre"::uuid;

ALTER TABLE "configuracion"."organizacionesModulos"
  ALTER COLUMN "idOrganizacionesModulos" TYPE UUID USING "idOrganizacionesModulos"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid,
  ALTER COLUMN "fidModulos" TYPE UUID USING "fidModulos"::uuid;

ALTER TABLE "configuracion"."parametros"
  ALTER COLUMN "idParametros" TYPE UUID USING "idParametros"::uuid;

ALTER TABLE "configuracion"."configuracionOrganizacion"
  ALTER COLUMN "idConfiguracionOrganizacion" TYPE UUID USING "idConfiguracionOrganizacion"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "configuracion"."configuracionUsuario"
  ALTER COLUMN "idConfiguracionUsuario" TYPE UUID USING "idConfiguracionUsuario"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "configuracion"."preferenciasUsuario"
  ALTER COLUMN "idPreferenciasUsuario" TYPE UUID USING "idPreferenciasUsuario"::uuid,
  ALTER COLUMN "fidUsuarios" TYPE UUID USING "fidUsuarios"::uuid;

ALTER TABLE "eventos"."eventos"
  ALTER COLUMN "idEventos" TYPE UUID USING "idEventos"::uuid,
  ALTER COLUMN "fidOrganizaciones" TYPE UUID USING "fidOrganizaciones"::uuid;

ALTER TABLE "nucleo"."perfilOrganizacion" ADD CONSTRAINT "perfilOrganizacion_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "personas"."personas" ADD CONSTRAINT "personas_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "usuarios_fidPersonas_fkey" FOREIGN KEY ("fidPersonas") REFERENCES "personas"."personas"("idPersonas") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuarios" ADD CONSTRAINT "usuarios_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."credenciales" ADD CONSTRAINT "credenciales_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."credenciales" ADD CONSTRAINT "credenciales_fidDispositivos_fkey" FOREIGN KEY ("fidDispositivos") REFERENCES "seguridad"."dispositivos"("idDispositivos") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."historialContrasenias" ADD CONSTRAINT "historialContrasenias_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuarioMfa" ADD CONSTRAINT "usuarioMfa_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."codigosRecuperacionMfa" ADD CONSTRAINT "codigosRecuperacionMfa_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."dispositivos" ADD CONSTRAINT "dispositivos_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."sesiones" ADD CONSTRAINT "sesiones_fidDispositivos_fkey" FOREIGN KEY ("fidDispositivos") REFERENCES "seguridad"."dispositivos"("idDispositivos") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."tokensVerificacion" ADD CONSTRAINT "tokensVerificacion_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."roles" ADD CONSTRAINT "roles_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."rolesPermisos" ADD CONSTRAINT "rolesPermisos_fidRoles_fkey" FOREIGN KEY ("fidRoles") REFERENCES "seguridad"."roles"("idRoles") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."rolesPermisos" ADD CONSTRAINT "rolesPermisos_fidPermisos_fkey" FOREIGN KEY ("fidPermisos") REFERENCES "seguridad"."permisos"("idPermisos") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuariosRoles" ADD CONSTRAINT "usuariosRoles_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seguridad"."usuariosRoles" ADD CONSTRAINT "usuariosRoles_fidRoles_fkey" FOREIGN KEY ("fidRoles") REFERENCES "seguridad"."roles"("idRoles") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracion"."modulos" ADD CONSTRAINT "modulos_fidModulosPadre_fkey" FOREIGN KEY ("fidModulosPadre") REFERENCES "configuracion"."modulos"("idModulos") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "configuracion"."organizacionesModulos" ADD CONSTRAINT "organizacionesModulos_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracion"."organizacionesModulos" ADD CONSTRAINT "organizacionesModulos_fidModulos_fkey" FOREIGN KEY ("fidModulos") REFERENCES "configuracion"."modulos"("idModulos") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracion"."configuracionOrganizacion" ADD CONSTRAINT "configuracionOrganizacion_fidOrganizaciones_fkey" FOREIGN KEY ("fidOrganizaciones") REFERENCES "nucleo"."organizaciones"("idOrganizaciones") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracion"."configuracionUsuario" ADD CONSTRAINT "configuracionUsuario_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "configuracion"."preferenciasUsuario" ADD CONSTRAINT "preferenciasUsuario_fidUsuarios_fkey" FOREIGN KEY ("fidUsuarios") REFERENCES "seguridad"."usuarios"("idUsuarios") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;

