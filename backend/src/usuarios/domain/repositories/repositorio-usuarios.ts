import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { DatosUsuario, FiltrosUsuariosEmpresa, OpcionesUsuario, UsuarioListado } from "../entities/usuario";
import type { AvatarPerfil } from "../../../perfil/domain/entities/avatar-perfil";

export abstract class RepositorioUsuarios {
  abstract listar(busqueda: string): Promise<{ usuarios: UsuarioListado[]; total: number }>;
  abstract listarDeEmpresa(empresaId: string, filtros: FiltrosUsuariosEmpresa): Promise<{ usuarios: UsuarioListado[]; total: number; paginacion: { anterior: string | null; siguiente: string | null } }>;
  abstract obtener(id: string, actor: string): Promise<UsuarioListado>;
  abstract opciones(): Promise<OpcionesUsuario>;
  abstract opcionesDeEmpresa(empresaId: string): Promise<OpcionesUsuario>;
  abstract obtenerAvatar(id: string, actor: string): Promise<AvatarPerfil>;
  abstract crear(datos: DatosUsuario, idActor: string, contexto: ContextoSolicitud): Promise<void>;
  abstract actualizar(id: string, datos: Omit<DatosUsuario, "contrasenia_temporal">, idActor: string, contexto: ContextoSolicitud): Promise<void>;
  abstract cambiarEstado(id: string, activo: boolean, idActor: string, contexto: ContextoSolicitud): Promise<void>;
  abstract reiniciarContrasenia(id: string, contraseniaNueva: string, idActor: string, contexto: ContextoSolicitud): Promise<void>;
  abstract eliminar(id: string, idActor: string, contexto: ContextoSolicitud): Promise<void>;
}
