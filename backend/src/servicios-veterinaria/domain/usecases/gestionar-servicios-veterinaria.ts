import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  DatosServicioVeterinaria,
  FiltrosServiciosVeterinaria,
} from "../entities/servicio-veterinaria";
import { RepositorioServiciosVeterinaria } from "../repositories/repositorio-servicios-veterinaria";

@Injectable()
export class CasoUsoGestionarServiciosVeterinaria {
  constructor(private servicios: RepositorioServiciosVeterinaria) {}

  listar(
    organizacion: string,
    sede: string,
    filtros: FiltrosServiciosVeterinaria,
  ) {
    return this.servicios.listar(organizacion, sede, filtros);
  }

  buscar(organizacion: string, sede: string, consulta: string) {
    return this.servicios.buscar(organizacion, sede, consulta);
  }

  obtener(id: string, organizacion: string, sede: string) {
    return this.servicios.obtener(id, organizacion, sede);
  }

  crear(
    organizacion: string,
    sede: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.crear(organizacion, sede, datos, usuario, contexto);
  }

  actualizar(
    id: string,
    organizacion: string,
    sede: string,
    datos: DatosServicioVeterinaria,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.actualizar(
      id,
      organizacion,
      sede,
      datos,
      usuario,
      contexto,
    );
  }

  cambiarEstado(
    id: string,
    organizacion: string,
    sede: string,
    activo: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.cambiarEstado(
      id,
      organizacion,
      sede,
      activo,
      usuario,
      contexto,
    );
  }

  eliminar(
    id: string,
    organizacion: string,
    sede: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.servicios.eliminar(id, organizacion, sede, usuario, contexto);
  }
}
