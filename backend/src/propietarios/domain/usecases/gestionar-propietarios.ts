import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  DatosPropietario,
  EliminacionPropietario,
  FiltrosPropietarios,
} from "../entities/propietario";
import { RepositorioPropietarios } from "../repositories/repositorio-propietarios";

@Injectable()
export class CasoUsoGestionarPropietarios {
  constructor(private propietarios: RepositorioPropietarios) {}
  listar(organizacion: string, filtros: FiltrosPropietarios) {
    return this.propietarios.listar(organizacion, filtros);
  }
  opciones(organizacion: string, idioma: string) {
    return this.propietarios.opciones(organizacion, idioma);
  }
  obtener(id: string, organizacion: string) {
    return this.propietarios.obtener(id, organizacion);
  }
  crear(
    organizacion: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.propietarios.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.propietarios.actualizar(
      id,
      organizacion,
      datos,
      usuario,
      contexto,
    );
  }
  eliminar(
    id: string,
    organizacion: string,
    datos: EliminacionPropietario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.propietarios.eliminar(
      id,
      organizacion,
      datos,
      usuario,
      contexto,
    );
  }
}
