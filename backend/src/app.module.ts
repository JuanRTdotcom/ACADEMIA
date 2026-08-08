import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core"; // APP_FILTER: registra un filtro de excepciones global
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ModuloAutenticacion } from "./autenticacion/autenticacion.module";
import { GuardiaCsrf } from "./autenticacion/presentation/guards/guardia-csrf";
import { GuardiaAcceso } from "./autenticacion/presentation/guards/guardia-acceso";
import { GuardiaRoles } from "./autenticacion/presentation/guards/guardia-roles";
import { GuardiaPermisos } from "./autenticacion/presentation/guards/guardia-permisos";
import { ModuloEmpresas } from "./empresas/empresas.module";
import { ModuloInquilinos } from "./inquilinos/inquilinos.module";
import { ModuloDispositivos } from "./dispositivos/dispositivos.module";
import { ModuloI18n } from "./comun/i18n/i18n.module";
import { ModuloAuditoria } from "./comun/auditoria/auditoria.module";
import { ModuloCookies } from "./comun/cookies/cookies.module";
import { ModuloPush } from "./comun/push/push.module";
import { FiltroExcepcionesI18n } from "./comun/filtros/filtro-excepciones-i18n";
import { validarEntorno } from "./comun/configuracion/validar-entorno";
import { ModuloRelojBaseDatos } from "./comun/reloj-base-datos/reloj-base-datos.module";
import { ModuloEventosSesion } from "./comun/eventos-sesion/eventos-sesion.module";
import { ModuloPrisma } from "./comun/prisma.module";
import { ModuloPreferencias } from "./preferencias/preferencias.module";
import { ModuloCatalogosSistema } from "./sistema/catalogos-sistema.module";
import { ModuloPerfil } from "./perfil/perfil.module";
import { ModuloAccionesRequeridas } from "./comun/acciones-requeridas/acciones-requeridas.module";
import { ModuloAlmacenamiento } from "./storage/storage.module";
import { ModuloRoles } from "./roles/roles.module";
import { ModuloUsuarios } from "./usuarios/usuarios.module";
import { ModuloPaises } from "./paises/paises.module";
import { PlanesModule } from "./planes/planes.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validarEntorno, // detiene el arranque si falta una variable obligatoria
    }),
    ModuloPrisma,
    ModuloAlmacenamiento,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Código común traducido por el filtro global cuando cualquier ruta supera su límite.
      errorMessage: "common.tooManyRequests",
    }),
    ModuloI18n,
    ModuloRelojBaseDatos,
    ModuloAccionesRequeridas,
    ModuloEventosSesion,
    ModuloAuditoria,
    ModuloCookies,
    ModuloPush,
    ModuloAutenticacion,
    ModuloEmpresas,
    ModuloInquilinos,
    ModuloDispositivos,
    ModuloPreferencias,
    ModuloCatalogosSistema,
    ModuloPerfil,
    ModuloRoles,
    ModuloUsuarios,
    ModuloPaises,
    PlanesModule,
  ],
  providers: [
    // Filtro global: traduce el mensaje de toda excepción al idioma de la petición.
    { provide: APP_FILTER, useClass: FiltroExcepcionesI18n },
    // Orden: límite de peticiones → anti-CSRF → acceso → roles → permisos.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: GuardiaCsrf },
    { provide: APP_GUARD, useClass: GuardiaAcceso },
    { provide: APP_GUARD, useClass: GuardiaRoles },
    { provide: APP_GUARD, useClass: GuardiaPermisos },
  ],
})
export class ModuloAplicacion {}
