import { Injectable } from "@nestjs/common";
import { RepositorioAutenticacion } from "../../domain/repositories/repositorio-autenticacion";
import { FuenteDatosAutenticacionPrisma } from "../datasources/autenticacion-prisma.datasource";

/** Implementa el contrato del dominio delegando la persistencia al datasource Prisma. */
@Injectable()
export class RepositorioAutenticacionDatos extends RepositorioAutenticacion {
  constructor(private readonly fuenteDatos: FuenteDatosAutenticacionPrisma) {
    super();
  }

  ingresar(...argumentos: Parameters<RepositorioAutenticacion["ingresar"]>) {
    return this.fuenteDatos.ingresar(...argumentos);
  }

  refrescar(...argumentos: Parameters<RepositorioAutenticacion["refrescar"]>) {
    return this.fuenteDatos.refrescar(...argumentos);
  }

  rotarSesionActual(
    ...argumentos: Parameters<RepositorioAutenticacion["rotarSesionActual"]>
  ) {
    return this.fuenteDatos.rotarSesionActual(...argumentos);
  }

  cerrarSesion(
    ...argumentos: Parameters<RepositorioAutenticacion["cerrarSesion"]>
  ) {
    return this.fuenteDatos.cerrarSesion(...argumentos);
  }
}
