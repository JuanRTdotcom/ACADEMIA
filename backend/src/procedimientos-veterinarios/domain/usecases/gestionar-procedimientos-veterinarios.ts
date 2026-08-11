import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosProcedimientoVeterinario } from "../entities/procedimiento-veterinario";
import { RepositorioProcedimientosVeterinarios } from "../repositories/repositorio-procedimientos-veterinarios";

@Injectable()
export class CasoUsoGestionarProcedimientosVeterinarios {
  constructor(private tipos: RepositorioProcedimientosVeterinarios) {}
  listar(organizacion: string) {
    return this.tipos.listar(organizacion);
  }
  crear(
    organizacion: string,
    datos: DatosProcedimientoVeterinario,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.tipos.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosProcedimientoVeterinario,
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
