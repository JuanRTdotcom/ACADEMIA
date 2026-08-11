import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  DatosCrearAtencion,
  DatosRegistroAtencion,
  ArchivoAdjuntoAtencion,
  FiltrosAtenciones,
} from "../entities/atencion";
import { RepositorioAtenciones } from "../repositories/repositorio-atenciones";

@Injectable()
export class CasoUsoGestionarAtenciones {
  constructor(private atenciones: RepositorioAtenciones) {}
  listarHoy(organizacion: string, filtros: FiltrosAtenciones, idioma: string) {
    return this.atenciones.listarHoy(organizacion, filtros, idioma);
  }
  opciones(organizacion: string, idioma: string) {
    return this.atenciones.opciones(organizacion, idioma);
  }
  buscarPropietarios(organizacion: string, q: string) {
    return this.atenciones.buscarPropietarios(organizacion, q);
  }
  mascotasPropietario(
    organizacion: string,
    propietario: string,
    idioma: string,
  ) {
    return this.atenciones.mascotasPropietario(
      organizacion,
      propietario,
      idioma,
    );
  }
  ultimoRegistroMascota(organizacion: string, mascota: string, tipo: string) {
    return this.atenciones.ultimoRegistroMascota(organizacion, mascota, tipo);
  }
  obtener(id: string, organizacion: string, idioma: string) {
    return this.atenciones.obtener(id, organizacion, idioma);
  }
  crear(
    organizacion: string,
    datos: DatosCrearAtencion,
    adjuntos: ArchivoAdjuntoAtencion[],
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.crear(
      organizacion,
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
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.atenciones.eliminar(id, organizacion, usuario, contexto);
  }
}
