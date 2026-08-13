import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosServicioPeluqueriaSpa, FiltrosServiciosPeluqueriaSpa } from "../entities/servicio-peluqueria-spa";
import { RepositorioServiciosPeluqueriaSpa } from "../repositories/repositorio-servicios-peluqueria-spa";

@Injectable()
export class CasoUsoGestionarServiciosPeluqueriaSpa {
  constructor(private repositorio: RepositorioServiciosPeluqueriaSpa) {}
  listar(organizacion: string, filtros: FiltrosServiciosPeluqueriaSpa) { return this.repositorio.listar(organizacion, filtros); }
  buscar(organizacion: string, consulta: string) { return this.repositorio.buscar(organizacion, consulta); }
  crear(organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud) { return this.repositorio.crear(organizacion, datos, usuario, peticion); }
  actualizar(id: string, organizacion: string, datos: DatosServicioPeluqueriaSpa, usuario: string, peticion: ContextoSolicitud) { return this.repositorio.actualizar(id, organizacion, datos, usuario, peticion); }
  cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, peticion: ContextoSolicitud) { return this.repositorio.cambiarEstado(id, organizacion, activo, usuario, peticion); }
  eliminar(id: string, organizacion: string, usuario: string, peticion: ContextoSolicitud) { return this.repositorio.eliminar(id, organizacion, usuario, peticion); }
}
