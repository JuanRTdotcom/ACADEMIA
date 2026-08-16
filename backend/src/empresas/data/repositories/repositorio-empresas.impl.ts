import { Injectable } from "@nestjs/common";
import { RepositorioEmpresas } from "../../domain/repositories/repositorio-empresas";
import { FuenteDatosEmpresasPrisma } from "../datasources/empresas-prisma.datasource";
import type {
  SeccionEmpresa,
  SeccionesEmpresa,
} from "../../domain/entities/seccion-empresa";

@Injectable()
export class RepositorioEmpresasDatos extends RepositorioEmpresas {
  constructor(private readonly fuenteDatos: FuenteDatosEmpresasPrisma) {
    super();
  }

  listarSedesActual(
    ...argumentos: Parameters<RepositorioEmpresas["listarSedesActual"]>
  ) {
    return this.fuenteDatos.listarSedesActual(...argumentos);
  }
  crearSedeActual(
    ...argumentos: Parameters<RepositorioEmpresas["crearSedeActual"]>
  ) {
    return this.fuenteDatos.crearSedeActual(...argumentos);
  }
  actualizarSedeActual(
    ...argumentos: Parameters<RepositorioEmpresas["actualizarSedeActual"]>
  ) {
    return this.fuenteDatos.actualizarSedeActual(...argumentos);
  }
  eliminarSedeActual(
    ...argumentos: Parameters<RepositorioEmpresas["eliminarSedeActual"]>
  ) {
    return this.fuenteDatos.eliminarSedeActual(...argumentos);
  }
  seleccionarSedeActual(
    ...argumentos: Parameters<RepositorioEmpresas["seleccionarSedeActual"]>
  ) {
    return this.fuenteDatos.seleccionarSedeActual(...argumentos);
  }

  listar(...argumentos: Parameters<RepositorioEmpresas["listar"]>) {
    return this.fuenteDatos.listar(...argumentos);
  }

  obtener(...argumentos: Parameters<RepositorioEmpresas["obtener"]>) {
    return this.fuenteDatos.obtener(...argumentos);
  }

  obtenerResumen(
    ...argumentos: Parameters<RepositorioEmpresas["obtenerResumen"]>
  ) {
    return this.fuenteDatos.obtenerResumen(...argumentos);
  }

  obtenerSeccion<S extends SeccionEmpresa>(
    idOrganizacion: string,
    seccion: S,
    idOrganizacionActual: string,
  ): Promise<SeccionesEmpresa[S]> {
    return this.fuenteDatos.obtenerSeccion(
      idOrganizacion,
      seccion,
      idOrganizacionActual,
    );
  }

  crear(...argumentos: Parameters<RepositorioEmpresas["crear"]>) {
    return this.fuenteDatos.crear(...argumentos);
  }

  actualizar(...argumentos: Parameters<RepositorioEmpresas["actualizar"]>) {
    return this.fuenteDatos.actualizar(...argumentos);
  }

  actualizarSeccion(
    ...argumentos: Parameters<RepositorioEmpresas["actualizarSeccion"]>
  ) {
    return this.fuenteDatos.actualizarSeccion(...argumentos);
  }

  cambiarEstado(
    ...argumentos: Parameters<RepositorioEmpresas["cambiarEstado"]>
  ) {
    return this.fuenteDatos.cambiarEstado(...argumentos);
  }

  eliminar(...argumentos: Parameters<RepositorioEmpresas["eliminar"]>) {
    return this.fuenteDatos.eliminar(...argumentos);
  }

  renovar(...argumentos: Parameters<RepositorioEmpresas["renovar"]>) {
    return this.fuenteDatos.renovar(...argumentos);
  }

  obtenerResumenActual(
    ...argumentos: Parameters<RepositorioEmpresas["obtenerResumenActual"]>
  ) {
    return this.fuenteDatos.obtenerResumenActual(...argumentos);
  }

  obtenerSeccionActual<S extends SeccionEmpresa>(
    ...argumentos: Parameters<RepositorioEmpresas["obtenerSeccionActual"]>
  ): Promise<SeccionesEmpresa[S]> {
    return this.fuenteDatos.obtenerSeccionActual(...argumentos) as Promise<
      SeccionesEmpresa[S]
    >;
  }

  obtenerCatalogosUbicacionActual(
    ...argumentos: Parameters<
      RepositorioEmpresas["obtenerCatalogosUbicacionActual"]
    >
  ) {
    return this.fuenteDatos.obtenerCatalogosUbicacionActual(...argumentos);
  }

  actualizarSeccionActual(
    ...argumentos: Parameters<RepositorioEmpresas["actualizarSeccionActual"]>
  ) {
    return this.fuenteDatos.actualizarSeccionActual(...argumentos);
  }

  actualizarFiltroColorLoginActual(
    ...argumentos: Parameters<
      RepositorioEmpresas["actualizarFiltroColorLoginActual"]
    >
  ) {
    return this.fuenteDatos.actualizarFiltroColorLoginActual(...argumentos);
  }

  obtenerMarca(...argumentos: Parameters<RepositorioEmpresas["obtenerMarca"]>) {
    return this.fuenteDatos.obtenerMarca(...argumentos);
  }

  obtenerMarcaActual(
    ...argumentos: Parameters<RepositorioEmpresas["obtenerMarcaActual"]>
  ) {
    return this.fuenteDatos.obtenerMarcaActual(...argumentos);
  }

  guardarMedio(...argumentos: Parameters<RepositorioEmpresas["guardarMedio"]>) {
    return this.fuenteDatos.guardarMedio(...argumentos);
  }

  guardarMedioActual(
    ...argumentos: Parameters<RepositorioEmpresas["guardarMedioActual"]>
  ) {
    return this.fuenteDatos.guardarMedioActual(...argumentos);
  }

  eliminarMedio(
    ...argumentos: Parameters<RepositorioEmpresas["eliminarMedio"]>
  ) {
    return this.fuenteDatos.eliminarMedio(...argumentos);
  }

  eliminarMedioActual(
    ...argumentos: Parameters<RepositorioEmpresas["eliminarMedioActual"]>
  ) {
    return this.fuenteDatos.eliminarMedioActual(...argumentos);
  }

  compartirMedioActual(
    ...argumentos: Parameters<RepositorioEmpresas["compartirMedioActual"]>
  ) {
    return this.fuenteDatos.compartirMedioActual(...argumentos);
  }

  obtenerMedio(...argumentos: Parameters<RepositorioEmpresas["obtenerMedio"]>) {
    return this.fuenteDatos.obtenerMedio(...argumentos);
  }

  obtenerMedioActual(
    ...argumentos: Parameters<RepositorioEmpresas["obtenerMedioActual"]>
  ) {
    return this.fuenteDatos.obtenerMedioActual(...argumentos);
  }

  listarRenovaciones(
    ...argumentos: Parameters<RepositorioEmpresas["listarRenovaciones"]>
  ) {
    return this.fuenteDatos.listarRenovaciones(...argumentos);
  }
}
