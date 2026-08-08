import { Injectable } from "@nestjs/common";
import { RepositorioRoles } from "../../domain/repositories/repositorio-roles";
import { FuenteDatosRolesPrisma } from "../datasources/roles-prisma.datasource";

@Injectable()
export class RepositorioRolesDatos extends RepositorioRoles {
  constructor(private fuente: FuenteDatosRolesPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioRoles["listar"]>) {
    return this.fuente.listar(...args);
  }
  catalogoPermisos(...args: Parameters<RepositorioRoles["catalogoPermisos"]>) {
    return this.fuente.catalogoPermisos(...args);
  }
  guardarPermisos(...args: Parameters<RepositorioRoles["guardarPermisos"]>) {
    return this.fuente.guardarPermisos(...args);
  }
  crear(...args: Parameters<RepositorioRoles["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioRoles["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  cambiarEstado(...args: Parameters<RepositorioRoles["cambiarEstado"]>) {
    return this.fuente.cambiarEstado(...args);
  }
  eliminar(...args: Parameters<RepositorioRoles["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
