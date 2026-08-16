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
import type { DatosBasicosSede } from "../entities/sede";

@Injectable()
export class CasoUsoGestionarEmpresaActual {
  constructor(private empresas: RepositorioEmpresas) {}

  sedes(organizacion: string, idioma: string) {
    return this.empresas.listarSedesActual(organizacion, idioma);
  }
  crearSede(
    organizacion: string,
    datos: DatosBasicosSede,
    sedeOrigen: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.crearSedeActual(datos, {
      organizacion,
      usuario,
      sedeOrigen,
      contexto,
    });
  }
  actualizarSede(
    id: string,
    organizacion: string,
    datos: DatosBasicosSede,
    sedeOrigen: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarSedeActual(id, datos, {
      organizacion,
      usuario,
      sedeOrigen,
      contexto,
    });
  }
  eliminarSede(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.eliminarSedeActual(id, {
      organizacion,
      usuario,
      contexto,
    });
  }
  seleccionarSede(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.seleccionarSedeActual(id, {
      organizacion,
      usuario,
      contexto,
    });
  }

  resumen(organizacion: string, sede: string | null) {
    return this.empresas.obtenerResumenActual(organizacion, sede);
  }

  seccion<S extends SeccionEmpresa>(
    organizacion: string,
    seccion: S,
    sede: string | null,
  ) {
    return this.empresas.obtenerSeccionActual(organizacion, seccion, sede);
  }

  catalogosUbicacion(organizacion: string) {
    return this.empresas.obtenerCatalogosUbicacionActual(organizacion);
  }

  actualizar<S extends SeccionEmpresa>(
    organizacion: string,
    seccion: S,
    datos: SeccionesEmpresa[S],
    sede: string | null,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarSeccionActual(
      organizacion,
      seccion,
      datos,
      sede,
      usuario,
      contexto,
    );
  }

  actualizarFiltroColorLogin(
    organizacion: string,
    sede: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.actualizarFiltroColorLoginActual(
      organizacion,
      sede,
      activo,
      usuario,
      contexto,
    );
  }

  marca(organizacion: string, sede: string) {
    return this.empresas.obtenerMarcaActual(organizacion, sede);
  }

  guardarMedio(
    organizacion: string,
    sede: string,
    comando: ComandoGuardarMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.guardarMedioActual(
      organizacion,
      sede,
      comando,
      usuario,
      contexto,
    );
  }

  eliminarMedio(
    organizacion: string,
    sede: string,
    comando: ComandoEliminarMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.eliminarMedioActual(
      organizacion,
      sede,
      comando,
      usuario,
      contexto,
    );
  }

  compartirMedio(
    organizacion: string,
    sede: string,
    comando: ComandoCompartirMedioEmpresa,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.compartirMedioActual(
      organizacion,
      sede,
      comando,
      usuario,
      contexto,
    );
  }

  leerMedio(
    organizacion: string,
    sede: string,
    consulta: ConsultaMedioEmpresa,
  ) {
    return this.empresas.obtenerMedioActual(organizacion, sede, consulta);
  }
}
