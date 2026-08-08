import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosRol } from "../entities/rol";
import { RepositorioRoles } from "../repositories/repositorio-roles";

@Injectable()
export class CasoUsoGestionarRoles {
  constructor(private roles: RepositorioRoles) {}
  listar(idOrganizacion: string) {
    return this.roles.listar(idOrganizacion);
  }
  catalogoPermisos(idRol: string, idOrganizacion: string) {
    return this.roles.catalogoPermisos(idRol, idOrganizacion);
  }
  guardarPermisos(
    idRol: string,
    idsPermisos: string[],
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.roles.guardarPermisos(
      idRol,
      idsPermisos,
      idOrganizacion,
      idUsuario,
      contexto,
    );
  }
  crear(
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.roles.crear(datos, idOrganizacion, idUsuario, contexto);
  }
  actualizar(
    idRol: string,
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.roles.actualizar(
      idRol,
      datos,
      idOrganizacion,
      idUsuario,
      contexto,
    );
  }
  cambiarEstado(
    idRol: string,
    activo: boolean,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.roles.cambiarEstado(
      idRol,
      activo,
      idOrganizacion,
      idUsuario,
      contexto,
    );
  }
  eliminar(
    idRol: string,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.roles.eliminar(idRol, idOrganizacion, idUsuario, contexto);
  }
}
