import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosMotivoConsulta } from "../entities/motivo-consulta";
import { RepositorioMotivosConsulta } from "../repositories/repositorio-motivos-consulta";

@Injectable()
export class CasoUsoGestionarMotivosConsulta {
  constructor(private motivos: RepositorioMotivosConsulta) {}
  listar(organizacion: string) {
    return this.motivos.listar(organizacion);
  }
  crear(
    organizacion: string,
    datos: DatosMotivoConsulta,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.motivos.crear(organizacion, datos, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosMotivoConsulta,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.motivos.actualizar(id, organizacion, datos, usuario, contexto);
  }
  cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.motivos.cambiarEstado(
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
    return this.motivos.eliminar(id, organizacion, usuario, contexto);
  }
}
