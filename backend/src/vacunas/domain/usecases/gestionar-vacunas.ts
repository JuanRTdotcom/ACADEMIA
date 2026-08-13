import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosVacuna, FiltrosVacunas } from "../entities/vacuna";
import { RepositorioVacunas } from "../repositories/repositorio-vacunas";

@Injectable()
export class CasoUsoGestionarVacunas {
  constructor(private vacunas: RepositorioVacunas) {}
  listar(organizacion: string, filtros: FiltrosVacunas) {
    return this.vacunas.listar(organizacion, filtros);
  }
  buscar(organizacion: string, consulta: string) {
    return this.vacunas.buscar(organizacion, consulta);
  }
  crear(
    organizacion: string,
    datos: DatosVacuna,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.vacunas.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosVacuna,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.vacunas.actualizar(id, organizacion, datos, usuario, contexto);
  }
  cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.vacunas.cambiarEstado(
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
    return this.vacunas.eliminar(id, organizacion, usuario, contexto);
  }
}
