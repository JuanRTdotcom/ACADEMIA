import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosTipoHospitalizacion, FiltrosTiposHospitalizacion } from "../entities/tipo-hospitalizacion";
import { RepositorioTiposHospitalizacion } from "../repositories/repositorio-tipos-hospitalizacion";

@Injectable()
export class CasoUsoGestionarTiposHospitalizacion {
  constructor(private tipos: RepositorioTiposHospitalizacion) {}
  listar(organizacion: string, filtros: FiltrosTiposHospitalizacion) {
    return this.tipos.listar(organizacion, filtros);
  }
  buscar(organizacion: string, consulta: string) { return this.tipos.buscar(organizacion, consulta); }
  crear(
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.tipos.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosTipoHospitalizacion,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.tipos.actualizar(id, organizacion, datos, usuario, contexto);
  }
  cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.tipos.cambiarEstado(id, organizacion, activo, usuario, contexto);
  }
  eliminar(
    id: string,
    organizacion: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.tipos.eliminar(id, organizacion, usuario, contexto);
  }
}
