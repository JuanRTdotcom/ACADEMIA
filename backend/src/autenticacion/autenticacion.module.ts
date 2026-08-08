import { Module } from "@nestjs/common"; // NestJS: declara un módulo (agrupa controladores y providers)
import { JwtModule } from "@nestjs/jwt"; // NestJS: provee JwtService para firmar/verificar JWT
import { PassportModule } from "@nestjs/passport"; // NestJS: integra Passport (motor de estrategias de auth)
import { ControladorAutenticacion } from "./presentation/controllers/autenticacion.controller";
import { FuenteDatosAutenticacionPrisma } from "./data/datasources/autenticacion-prisma.datasource";
import { EstrategiaAcceso } from "./presentation/strategies/estrategia-acceso";
import { EstrategiaRefresco } from "./presentation/strategies/estrategia-refresco";
import { FuenteDatosContextoUsuarioPrisma } from "./data/datasources/contexto-usuario-prisma.datasource";
import { ServicioHashTokenRefresco } from "./data/security/hash-token-refresco.service";
import { GuardiaLimiteRefresco } from "./presentation/guards/guardia-limite-refresco";
import { CasoUsoIngresar } from "./domain/usecases/ingresar";
import { CasoUsoRefrescarSesion } from "./domain/usecases/refrescar-sesion";
import { CasoUsoCerrarSesion } from "./domain/usecases/cerrar-sesion";
import { RepositorioAutenticacion } from "./domain/repositories/repositorio-autenticacion";
import { RepositorioAutenticacionDatos } from "./data/repositories/repositorio-autenticacion.impl";
import { CasoUsoRotarSesionActual } from "./domain/usecases/rotar-sesion-actual";

@Module({
  // imports: otros módulos que este necesita. JwtModule.register({}) = config vacía; el secreto/expiración se pasa por llamada.
  // ServicioCookies y ServicioAuditoria viven en comun (globales), no se declaran aquí.
  imports: [PassportModule, JwtModule.register({})],
  controllers: [ControladorAutenticacion], // manejan las rutas HTTP
  providers: [
    // providers: clases inyectables (DI). Nest crea una instancia y la comparte.
    FuenteDatosAutenticacionPrisma,
    RepositorioAutenticacionDatos,
    {
      provide: RepositorioAutenticacion,
      useExisting: RepositorioAutenticacionDatos,
    },
    CasoUsoIngresar,
    CasoUsoRefrescarSesion,
    CasoUsoCerrarSesion,
    CasoUsoRotarSesionActual,
    FuenteDatosContextoUsuarioPrisma,
    ServicioHashTokenRefresco,
    GuardiaLimiteRefresco,
    EstrategiaAcceso,
    EstrategiaRefresco,
  ],
  exports: [CasoUsoRotarSesionActual, CasoUsoCerrarSesion],
})
export class ModuloAutenticacion {}
