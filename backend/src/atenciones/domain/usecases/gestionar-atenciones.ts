import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  DatosCrearAtencion,
  DatosEditarRegistroAtencion,
  DatosRegistroAtencion,
  ArchivoAdjuntoAtencion,
  EliminacionAtencion,
  FiltrosAtenciones,
} from "../entities/atencion";
import { RepositorioAtenciones } from "../repositories/repositorio-atenciones";

@Injectable()
export class CasoUsoGestionarAtenciones {
  constructor(private atenciones: RepositorioAtenciones) {}
  validarAccesoSede(id: string, organizacion: string, sede: string) {
    return this.atenciones.validarAccesoSede(id, organizacion, sede);
  }
  listarHoy(
    organizacion: string,
    sede: string,
    filtros: FiltrosAtenciones,
    idioma: string,
  ) {
    return this.atenciones.listarHoy(organizacion, sede, filtros, idioma);
  }
  opciones(organizacion: string, idioma: string) {
    return this.atenciones.opciones(organizacion, idioma);
  }
  buscarPropietarios(organizacion: string, sede: string, q: string) {
    return this.atenciones.buscarPropietarios(organizacion, sede, q);
  }
  mascotasPropietario(
    organizacion: string,
    sede: string,
    propietario: string,
    idioma: string,
  ) {
    return this.atenciones.mascotasPropietario(
      organizacion,
      sede,
      propietario,
      idioma,
    );
  }
  ultimoRegistroMascota(
    organizacion: string,
    sede: string,
    mascota: string,
    tipo: string,
  ) {
    return this.atenciones.ultimoRegistroMascota(
      organizacion,
      sede,
      mascota,
      tipo,
    );
  }
  historialMascota(
    organizacion: string,
    sede: string,
    mascota: string,
    idioma: string,
  ) {
    return this.atenciones.historialMascota(
      organizacion,
      sede,
      mascota,
      idioma,
    );
  }
  obtener(id: string, organizacion: string, idioma: string) {
    return this.atenciones.obtener(id, organizacion, idioma);
  }
  crear(
    organizacion: string,
    sede: string,
    datos: DatosCrearAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.crear(
      organizacion,
      sede,
      datos,
      adjuntos,
      usuario,
      contexto,
    );
  }
  agregarRegistro(
    id: string,
    organizacion: string,
    datos: DatosRegistroAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.agregarRegistro(
      id,
      organizacion,
      datos,
      adjuntos,
      usuario,
      contexto,
    );
  }
  editarRegistro(
    id: string,
    registro: string,
    organizacion: string,
    datos: DatosEditarRegistroAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.editarRegistro(
      id,
      registro,
      organizacion,
      datos,
      adjuntos,
      usuario,
      contexto,
    );
  }
  obtenerAdjunto(
    id: string,
    registro: string,
    adjunto: string,
    organizacion: string,
  ) {
    return this.atenciones.obtenerAdjunto(id, registro, adjunto, organizacion);
  }
  cambiarEstado(
    id: string,
    organizacion: string,
    estado: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.cambiarEstado(
      id,
      organizacion,
      estado,
      usuario,
      contexto,
    );
  }
  eliminarRegistro(
    id: string,
    registro: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.eliminarRegistro(
      id,
      registro,
      organizacion,
      usuario,
      contexto,
    );
  }
  eliminar(
    id: string,
    organizacion: string,
    datos: EliminacionAtencion,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.eliminar(id, organizacion, datos, usuario, contexto);
  }
}
