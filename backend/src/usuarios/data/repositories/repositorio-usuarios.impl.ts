import { Injectable } from "@nestjs/common";
import { FuenteDatosUsuariosPrisma } from "../datasources/usuarios-prisma.datasource";
import { RepositorioUsuarios } from "../../domain/repositories/repositorio-usuarios";

@Injectable()
export class RepositorioUsuariosDatos extends RepositorioUsuarios {
  constructor(private readonly fuente: FuenteDatosUsuariosPrisma) { super(); }
  listar(...args: Parameters<RepositorioUsuarios["listar"]>) { return this.fuente.listar(...args); }
  listarDeEmpresa(...args: Parameters<RepositorioUsuarios["listarDeEmpresa"]>) { return this.fuente.listarDeEmpresa(...args); }
  obtener(...args: Parameters<RepositorioUsuarios["obtener"]>) { return this.fuente.obtener(...args); }
  opciones(...args: Parameters<RepositorioUsuarios["opciones"]>) { return this.fuente.opciones(...args); }
  opcionesDeEmpresa(...args: Parameters<RepositorioUsuarios["opcionesDeEmpresa"]>) { return this.fuente.opcionesDeEmpresa(...args); }
  obtenerAvatar(...args: Parameters<RepositorioUsuarios["obtenerAvatar"]>) { return this.fuente.obtenerAvatar(...args); }
  crear(...args: Parameters<RepositorioUsuarios["crear"]>) { return this.fuente.crear(...args); }
  actualizar(...args: Parameters<RepositorioUsuarios["actualizar"]>) { return this.fuente.actualizar(...args); }
  cambiarEstado(...args: Parameters<RepositorioUsuarios["cambiarEstado"]>) { return this.fuente.cambiarEstado(...args); }
  reiniciarContrasenia(...args: Parameters<RepositorioUsuarios["reiniciarContrasenia"]>) { return this.fuente.reiniciarContrasenia(...args); }
  eliminar(...args: Parameters<RepositorioUsuarios["eliminar"]>) { return this.fuente.eliminar(...args); }
}
