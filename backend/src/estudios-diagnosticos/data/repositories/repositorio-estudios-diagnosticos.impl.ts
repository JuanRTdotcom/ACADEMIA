import { Injectable } from "@nestjs/common";
import { RepositorioEstudiosDiagnosticos } from "../../domain/repositories/repositorio-estudios-diagnosticos";
import { FuenteDatosEstudiosDiagnosticosPrisma } from "../datasources/estudios-diagnosticos-prisma.datasource";

@Injectable()
export class RepositorioEstudiosDiagnosticosDatos extends RepositorioEstudiosDiagnosticos {
  constructor(private fuente: FuenteDatosEstudiosDiagnosticosPrisma) { super(); }
  listar(...args: Parameters<RepositorioEstudiosDiagnosticos["listar"]>) { return this.fuente.listar(...args); }
  buscar(...args: Parameters<RepositorioEstudiosDiagnosticos["buscar"]>) { return this.fuente.buscar(...args); }
  crear(...args: Parameters<RepositorioEstudiosDiagnosticos["crear"]>) { return this.fuente.crear(...args); }
  actualizar(...args: Parameters<RepositorioEstudiosDiagnosticos["actualizar"]>) { return this.fuente.actualizar(...args); }
  cambiarEstado(...args: Parameters<RepositorioEstudiosDiagnosticos["cambiarEstado"]>) { return this.fuente.cambiarEstado(...args); }
  eliminar(...args: Parameters<RepositorioEstudiosDiagnosticos["eliminar"]>) { return this.fuente.eliminar(...args); }
}
