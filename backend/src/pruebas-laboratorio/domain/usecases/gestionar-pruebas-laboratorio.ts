import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosPruebaLaboratorio, FiltrosPruebasLaboratorio } from "../entities/prueba-laboratorio";
import { RepositorioPruebasLaboratorio } from "../repositories/repositorio-pruebas-laboratorio";

@Injectable()
export class CasoUsoGestionarPruebasLaboratorio {
  constructor(private pruebas: RepositorioPruebasLaboratorio) {}
  listar(organizacion: string, filtros: FiltrosPruebasLaboratorio) {
    return this.pruebas.listar(organizacion, filtros);
  }
  buscar(organizacion: string, consulta: string) { return this.pruebas.buscar(organizacion, consulta); }
  crear(
    organizacion: string,
    datos: DatosPruebaLaboratorio,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.pruebas.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosPruebaLaboratorio,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.pruebas.actualizar(id, organizacion, datos, usuario, contexto);
  }
  cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.pruebas.cambiarEstado(
      id,
      organizacion,
      activo,
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
    return this.pruebas.eliminar(id, organizacion, usuario, contexto);
  }
}
