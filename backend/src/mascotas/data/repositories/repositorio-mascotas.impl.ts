import { Injectable } from "@nestjs/common";
import { RepositorioMascotas } from "../../domain/repositories/repositorio-mascotas";
import { FuenteDatosMascotasPrisma } from "../datasources/mascotas-prisma.datasource";

@Injectable()
export class RepositorioMascotasDatos extends RepositorioMascotas {
  constructor(private fuente: FuenteDatosMascotasPrisma) {
    super();
  }
  listar(...args: Parameters<RepositorioMascotas["listar"]>) {
    return this.fuente.listar(...args);
  }
  opciones(...args: Parameters<RepositorioMascotas["opciones"]>) {
    return this.fuente.opciones(...args);
  }
  buscarPropietarios(
    ...args: Parameters<RepositorioMascotas["buscarPropietarios"]>
  ) {
    return this.fuente.buscarPropietarios(...args);
  }
  obtener(...args: Parameters<RepositorioMascotas["obtener"]>) {
    return this.fuente.obtener(...args);
  }
  obtenerFoto(...args: Parameters<RepositorioMascotas["obtenerFoto"]>) {
    return this.fuente.obtenerFoto(...args);
  }
  crear(...args: Parameters<RepositorioMascotas["crear"]>) {
    return this.fuente.crear(...args);
  }
  actualizar(...args: Parameters<RepositorioMascotas["actualizar"]>) {
    return this.fuente.actualizar(...args);
  }
  eliminar(...args: Parameters<RepositorioMascotas["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
