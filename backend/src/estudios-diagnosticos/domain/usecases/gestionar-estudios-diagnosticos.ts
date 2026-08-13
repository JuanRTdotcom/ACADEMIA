import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosEstudioDiagnostico, FiltrosEstudiosDiagnosticos } from "../entities/estudio-diagnostico";
import { RepositorioEstudiosDiagnosticos } from "../repositories/repositorio-estudios-diagnosticos";

@Injectable()
export class CasoUsoGestionarEstudiosDiagnosticos {
  constructor(private estudios: RepositorioEstudiosDiagnosticos) {}
  listar(organizacion: string, filtros: FiltrosEstudiosDiagnosticos) { return this.estudios.listar(organizacion, filtros); }
  buscar(organizacion: string, consulta: string) { return this.estudios.buscar(organizacion, consulta); }
  crear(organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, contexto: ContextoSolicitud) { return this.estudios.crear(organizacion, datos, usuario, contexto); }
  actualizar(id: string, organizacion: string, datos: DatosEstudioDiagnostico, usuario: string, contexto: ContextoSolicitud) { return this.estudios.actualizar(id, organizacion, datos, usuario, contexto); }
  cambiarEstado(id: string, organizacion: string, activo: boolean, usuario: string, contexto: ContextoSolicitud) { return this.estudios.cambiarEstado(id, organizacion, activo, usuario, contexto); }
  eliminar(id: string, organizacion: string, usuario: string, contexto: ContextoSolicitud) { return this.estudios.eliminar(id, organizacion, usuario, contexto); }
}
