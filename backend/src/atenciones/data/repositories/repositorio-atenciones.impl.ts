import { Injectable } from "@nestjs/common";
import { FuenteDatosAtencionesPrisma } from "../datasources/atenciones-prisma.datasource";
import { RepositorioAtenciones } from "../../domain/repositories/repositorio-atenciones";

@Injectable()
export class RepositorioAtencionesDatos extends RepositorioAtenciones {
  constructor(private fuente: FuenteDatosAtencionesPrisma) {
    super();
  }
  listarHoy(...args: Parameters<RepositorioAtenciones["listarHoy"]>) {
    return this.fuente.listarHoy(...args);
  }
  opciones(...args: Parameters<RepositorioAtenciones["opciones"]>) {
    return this.fuente.opciones(...args);
  }
  buscarPropietarios(
    ...args: Parameters<RepositorioAtenciones["buscarPropietarios"]>
  ) {
    return this.fuente.buscarPropietarios(...args);
  }
  mascotasPropietario(
    ...args: Parameters<RepositorioAtenciones["mascotasPropietario"]>
  ) {
    return this.fuente.mascotasPropietario(...args);
  }
  ultimoRegistroMascota(
    ...args: Parameters<RepositorioAtenciones["ultimoRegistroMascota"]>
  ) {
    return this.fuente.ultimoRegistroMascota(...args);
  }
  obtener(...args: Parameters<RepositorioAtenciones["obtener"]>) {
    return this.fuente.obtener(...args);
  }
  crear(...args: Parameters<RepositorioAtenciones["crear"]>) {
    return this.fuente.crear(...args);
  }
  agregarRegistro(
    ...args: Parameters<RepositorioAtenciones["agregarRegistro"]>
  ) {
    return this.fuente.agregarRegistro(...args);
  }
  cambiarEstado(...args: Parameters<RepositorioAtenciones["cambiarEstado"]>) {
    return this.fuente.cambiarEstado(...args);
  }
  obtenerAdjunto(...args: Parameters<RepositorioAtenciones["obtenerAdjunto"]>) {
    return this.fuente.obtenerAdjunto(...args);
  }
  eliminarRegistro(
    ...args: Parameters<RepositorioAtenciones["eliminarRegistro"]>
  ) {
    return this.fuente.eliminarRegistro(...args);
  }
  eliminar(...args: Parameters<RepositorioAtenciones["eliminar"]>) {
    return this.fuente.eliminar(...args);
  }
}
