import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosUsuario } from "../entities/usuario";
import { RepositorioUsuarios } from "../repositories/repositorio-usuarios";

@Injectable()
export class CasoUsoGestionarUsuarios {
  constructor(private readonly usuarios: RepositorioUsuarios) {}
  listar(busqueda: string) { return this.usuarios.listar(busqueda); }
  listarDeEmpresa(empresaId: string, busqueda: string) { return this.usuarios.listarDeEmpresa(empresaId, busqueda); }
  obtener(id: string, actor: string) { return this.usuarios.obtener(id, actor); }
  opciones() { return this.usuarios.opciones(); }
  opcionesDeEmpresa() { return this.usuarios.opcionesDeEmpresa(); }
  obtenerAvatar(id: string, actor: string) { return this.usuarios.obtenerAvatar(id, actor); }
  crear(datos: DatosUsuario, actor: string, contexto: ContextoSolicitud) { return this.usuarios.crear(datos, actor, contexto); }
  actualizar(id: string, datos: Omit<DatosUsuario, "contrasenia_temporal">, actor: string, contexto: ContextoSolicitud) { return this.usuarios.actualizar(id, datos, actor, contexto); }
  cambiarEstado(id: string, activo: boolean, actor: string, contexto: ContextoSolicitud) { return this.usuarios.cambiarEstado(id, activo, actor, contexto); }
  reiniciarContrasenia(id: string, contraseniaNueva: string, actor: string, contexto: ContextoSolicitud) { return this.usuarios.reiniciarContrasenia(id, contraseniaNueva, actor, contexto); }
  eliminar(id: string, actor: string, contexto: ContextoSolicitud) { return this.usuarios.eliminar(id, actor, contexto); }
}
