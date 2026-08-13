import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  ArchivoMascota,
  DatosMascota,
  EliminacionMascota,
  FiltrosMascotas,
} from "../entities/mascota";
import { RepositorioMascotas } from "../repositories/repositorio-mascotas";

@Injectable()
export class CasoUsoGestionarMascotas {
  constructor(private mascotas: RepositorioMascotas) {}
  listar(organizacion: string, filtros: FiltrosMascotas, idioma: string) {
    return this.mascotas.listar(organizacion, filtros, idioma);
  }
  opciones(idioma: string) {
    return this.mascotas.opciones(idioma);
  }
  buscarPropietarios(organizacion: string, q: string) {
    return this.mascotas.buscarPropietarios(organizacion, q);
  }
  obtener(id: string, organizacion: string) {
    return this.mascotas.obtener(id, organizacion);
  }
  obtenerFoto(id: string, version: string, organizacion: string) {
    return this.mascotas.obtenerFoto(id, version, organizacion);
  }
  crear(
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.mascotas.crear(organizacion, datos, foto, usuario, contexto);
  }
  actualizar(
    id: string,
    organizacion: string,
    datos: DatosMascota,
    foto: ArchivoMascota | null,
    eliminarFoto: boolean,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.mascotas.actualizar(
      id,
      organizacion,
      datos,
      foto,
      eliminarFoto,
      usuario,
      contexto,
    );
  }
  eliminar(
    id: string,
    organizacion: string,
    datos: EliminacionMascota,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.mascotas.eliminar(id, organizacion, datos, usuario, contexto);
  }
}
