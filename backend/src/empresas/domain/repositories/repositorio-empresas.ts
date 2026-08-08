import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosCrearEmpresa, ListadoEmpresas } from "../entities/empresa";
import type {
  CatalogosUbicacionEmpresa,
  ResumenEmpresa,
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../entities/seccion-empresa";
import type {
  ComandoCompartirMedioEmpresa,
  ComandoEliminarMedioEmpresa,
  ComandoGuardarMedioEmpresa,
  ConsultaMedioEmpresa,
  MarcaEmpresa,
  MedioEmpresa,
} from "../entities/marca-empresa";

export abstract class RepositorioEmpresas {
  abstract listar(
    idOrganizacionActual: string,
    busqueda?: string,
  ): Promise<ListadoEmpresas>;
  abstract obtener(
    idOrganizacion: string,
    idOrganizacionActual: string,
  ): Promise<ListadoEmpresas["empresas"][number]>;
  abstract obtenerResumen(
    idOrganizacion: string,
    idOrganizacionActual: string,
  ): Promise<ResumenEmpresa>;
  abstract obtenerSeccion<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    idOrganizacionActual: string,
  ): Promise<SeccionesEmpresa[S]>;

  abstract crear(
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ): Promise<void>;

  abstract actualizar(
    idOrganizacion: string,
    datos: DatosCrearEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    zonaHoraria: string,
  ): Promise<void>;

  abstract actualizarSeccion<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;

  abstract cambiarEstado(
    idOrganizacion: string,
    activo: boolean,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract eliminar(
    idOrganizacion: string,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;

  abstract renovar(
    idOrganizacion: string,
    datos: {
      fid_planes: string;
      fecha_inicio: Date;
      fecha_fin: Date;
      monto?: number;
      metodo_pago?: string;
    },
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;

  abstract obtenerResumenActual(
    idOrganizacion: string,
  ): Promise<ResumenEmpresa>;
  abstract obtenerSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
  ): Promise<SeccionesEmpresa[S]>;
  abstract obtenerCatalogosUbicacionActual(
    idOrganizacion: string,
  ): Promise<CatalogosUbicacionEmpresa>;
  abstract actualizarSeccionActual<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;
  abstract actualizarFiltroColorLoginActual(
    idOrganizacion: string,
    activo: boolean,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<void>;

  abstract obtenerMarca(
    idOrganizacion: string,
    idOrganizacionActual: string,
  ): Promise<MarcaEmpresa>;
  abstract obtenerMarcaActual(idOrganizacion: string): Promise<MarcaEmpresa>;
  abstract guardarMedio(
    idOrganizacion: string,
    comando: ComandoGuardarMedioEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa>;
  abstract guardarMedioActual(
    idOrganizacion: string,
    comando: ComandoGuardarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa>;
  abstract eliminarMedio(
    idOrganizacion: string,
    comando: ComandoEliminarMedioEmpresa,
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa>;
  abstract eliminarMedioActual(
    idOrganizacion: string,
    comando: ComandoEliminarMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa>;
  abstract compartirMedioActual(
    idOrganizacion: string,
    comando: ComandoCompartirMedioEmpresa,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
  ): Promise<MarcaEmpresa>;
  abstract obtenerMedio(
    idOrganizacion: string,
    consulta: ConsultaMedioEmpresa,
    idOrganizacionActual: string,
  ): Promise<MedioEmpresa>;
  abstract obtenerMedioActual(
    idOrganizacion: string,
    consulta: ConsultaMedioEmpresa,
  ): Promise<MedioEmpresa>;
  abstract listarRenovaciones(
    idOrganizacionActual: string,
    idUsuarioActual: string,
    contexto: ContextoSolicitud,
    q?: string,
    limit?: number,
    idOrganizacionFiltrar?: string,
  ): Promise<any[]>;
}
