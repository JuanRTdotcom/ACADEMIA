import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { CatalogoPermisosRol, DatosRol, RolListado } from "../entities/rol";

export abstract class RepositorioRoles {
  abstract listar(
    idOrganizacion: string,
  ): Promise<{ roles: RolListado[]; total: number }>;
  abstract catalogoPermisos(
    idRol: string,
    idOrganizacion: string,
  ): Promise<CatalogoPermisosRol>;
  abstract guardarPermisos(
    idRol: string,
    idsPermisos: string[],
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract crear(
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract actualizar(
    idRol: string,
    datos: DatosRol,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract cambiarEstado(
    idRol: string,
    activo: boolean,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    idRol: string,
    idOrganizacion: string,
    idUsuario: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
}
