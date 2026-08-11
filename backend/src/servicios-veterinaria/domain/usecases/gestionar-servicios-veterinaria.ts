import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosServicioVeterinaria } from "../entities/servicio-veterinaria";
import { RepositorioServiciosVeterinaria } from "../repositories/repositorio-servicios-veterinaria";

@Injectable()
export class CasoUsoGestionarServiciosVeterinaria {
  constructor(private servicios: RepositorioServiciosVeterinaria) {}

  listar(organizacion: string) {
    return this.servicios.listar(organizacion);
  }

  obtener(id: string, organizacion: string) {
    return this.servicios.obtener(id, organizacion);
  }

  crear(
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.crear(organizacion, datos, usuario, contexto);
  }

  actualizar(
    id: string,
    organizacion: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.actualizar(
      id,
      organizacion,
      datos,
      usuario,
      contexto,
    );
  }

  cambiarEstado(
    id: string,
    organizacion: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.cambiarEstado(
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
    return this.servicios.eliminar(id, organizacion, usuario, contexto);
  }
}
