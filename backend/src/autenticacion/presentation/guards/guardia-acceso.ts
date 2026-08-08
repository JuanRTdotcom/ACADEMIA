import { ExecutionContext, Injectable } from "@nestjs/common"; // NestJS: ExecutionContext = petición actual; Injectable = provider (DI)
import { Reflector } from "@nestjs/core"; // NestJS: lee la metadata que pusieron los decoradores (@Publico, etc.)
import { AuthGuard } from "@nestjs/passport"; // NestJS: guardia base que ejecuta una estrategia Passport por nombre
import { LLAVE_PUBLICO } from "../decorators/publico.decorador";

/** Guardia global: exige token de acceso válido, salvo rutas marcadas @Publico(). */
@Injectable()
export class GuardiaAcceso extends AuthGuard("jwt-acceso") {
  // AuthGuard("jwt-acceso"): usa la EstrategiaAcceso registrada con ese nombre
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    // Reflector.getAllAndOverride: busca la llave en el método y en la clase (método gana).
    const esPublico = this.reflector.getAllAndOverride<boolean>(LLAVE_PUBLICO, [
      contexto.getHandler(), // el método de la ruta
      contexto.getClass(), // el controlador
    ]);
    if (esPublico) return true; // ruta @Publico → sin token
    return super.canActivate(contexto); // resto → valida el JWT vía la estrategia
  }
}
