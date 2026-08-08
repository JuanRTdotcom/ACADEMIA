import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../entities/seccion-empresa";
import type {
  ComandoCompartirMedioEmpresa,
  ComandoEliminarMedioEmpresa,
  ComandoGuardarMedioEmpresa,
  ConsultaMedioEmpresa,
} from "../entities/marca-empresa";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoGestionarEmpresaActual {
  constructor(private empresas: RepositorioEmpresas) {}

  resumen(organizacion: string) {
    return this.empresas.obtenerResumenActual(organizacion);
  }

  seccion<S extends SeccionEmpresa>(organizacion: string, seccion: S) {
    return this.empresas.obtenerSeccionActual(organizacion, seccion);
  }

  catalogosUbicacion(organizacion: string) {
    return this.empresas.obtenerCatalogosUbicacionActual(organizacion);
  }

  actualizar<S extends SeccionEmpresa>(
    organizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarSeccionActual(
      organizacion,
      seccion,
      datos,
      usuario,
      contexto,
    );
  }

  actualizarFiltroColorLogin(
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarFiltroColorLoginActual(
      organizacion,
      activo,
      usuario,
      contexto,
    );
  }

  marca(organizacion: string) {
    return this.empresas.obtenerMarcaActual(organizacion);
  }

  guardarMedio(
    organizacion: string,
    comando: ComandoGuardarMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.guardarMedioActual(
      organizacion,
      comando,
      usuario,
      contexto,
    );
  }

  eliminarMedio(
    organizacion: string,
    comando: ComandoEliminarMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.eliminarMedioActual(
      organizacion,
      comando,
      usuario,
      contexto,
    );
  }

  compartirMedio(
    organizacion: string,
    comando: ComandoCompartirMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.compartirMedioActual(
      organizacion,
      comando,
      usuario,
      contexto,
    );
  }

  leerMedio(organizacion: string, consulta: ConsultaMedioEmpresa) {
    return this.empresas.obtenerMedioActual(organizacion, consulta);
  }
}
