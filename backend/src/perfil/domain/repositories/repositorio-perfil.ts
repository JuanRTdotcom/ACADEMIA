import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type { ComandoActualizarApariencia } from "../entities/comando-actualizar-apariencia";
import type { PaginaActividadUsuario } from "../entities/actividad-usuario";
import type {
  ComandoActualizarDatosPersonales,
  DatosPersonalesPerfil,
} from "../entities/datos-personales";
import type {
  ArchivoAvatarEntrada,
  AvatarPerfil,
} from "../entities/avatar-perfil";
import type { ComandoCambiarContrasenia } from "../entities/comando-cambiar-contrasenia";
import type {
  ComandoAgregarCorreo,
  ComandoActualizarVerificacionCorreo,
  ComandoEliminarCorreo,
  ComandoModificarCorreo,
  ComandoSeleccionarCorreoUso,
  ResultadoGestionCorreos,
} from "../entities/correo-persona";
import type { SesionesUsuario } from "../entities/sesion-usuario";
import type { ComandoActualizarSegundoFactor } from "../entities/comando-actualizar-segundo-factor";
import type {
  ComandoAgregarNacionalidad,
  ComandoEliminarNacionalidad,
  NacionalidadesPerfil,
  ResultadoGestionNacionalidades,
} from "../entities/nacionalidad-persona";
import type {
  ComandoAgregarSeguro,
  ComandoEliminarSeguro,
  ComandoModificarSeguro,
  ResultadoGestionSeguros,
  SegurosPerfil,
} from "../entities/seguro-persona";
import type {
  ComandoAgregarHobby,
  ComandoEliminarHobby,
  ComandoModificarHobby,
  HobbiesPerfil,
  ResultadoGestionHobbies,
} from "../entities/hobby-persona";
import type {
  ComandoAgregarDocumento,
  ComandoEliminarDocumento,
  ComandoModificarDocumento,
  DocumentosPerfil,
  ResultadoGestionDocumentos,
} from "../entities/documento-persona";
import type {
  ComandoAgregarTelefono,
  ComandoEliminarTelefono,
  ComandoModificarTelefono,
  ResultadoGestionTelefonos,
  TelefonosPerfil,
} from "../entities/telefono-persona";
import type {
  ComandoGuardarEstudioComplementario,
  ComandoGuardarEstudioRealizado,
  ComandoModificarEstudioComplementario,
  ComandoModificarEstudioRealizado,
  EstudiosPerfil,
  ResultadoEstudios,
} from "../entities/estudio-persona";

export abstract class RepositorioPerfil {
  abstract listarEstudios(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<EstudiosPerfil>;
  abstract agregarEstudioRealizado(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioRealizado,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract modificarEstudioRealizado(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioRealizado,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract eliminarEstudioRealizado(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract agregarEstudioComplementario(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoGuardarEstudioComplementario,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract modificarEstudioComplementario(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarEstudioComplementario,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract eliminarEstudioComplementario(
    idUsuario: string,
    idOrganizacion: string,
    id: string,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoEstudios>;
  abstract listarDocumentos(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<DocumentosPerfil>;
  abstract agregarDocumento(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos>;
  abstract modificarDocumento(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos>;
  abstract eliminarDocumento(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarDocumento,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionDocumentos>;
  abstract listarTelefonos(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<TelefonosPerfil>;
  abstract agregarTelefono(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos>;
  abstract modificarTelefono(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos>;
  abstract eliminarTelefono(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarTelefono,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionTelefonos>;
  abstract listarSeguros(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<SegurosPerfil>;
  abstract agregarSeguro(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros>;
  abstract modificarSeguro(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros>;
  abstract eliminarSeguro(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarSeguro,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionSeguros>;
  abstract listarNacionalidades(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<NacionalidadesPerfil>;
  abstract agregarNacionalidad(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarNacionalidad,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionNacionalidades>;
  abstract eliminarNacionalidad(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarNacionalidad,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionNacionalidades>;
  abstract listarHobbies(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<HobbiesPerfil>;
  abstract agregarHobby(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies>;
  abstract eliminarHobby(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies>;
  abstract modificarHobby(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarHobby,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionHobbies>;
  abstract actualizarSegundoFactor(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarSegundoFactor,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true; habilitado: boolean }>;
  abstract listarSesiones(
    idUsuario: string,
    idOrganizacion: string,
    idSesionActual: string,
  ): Promise<SesionesUsuario>;
  abstract cerrarOtraSesion(
    idUsuario: string,
    idOrganizacion: string,
    idSesionActual: string,
    idSesionObjetivo: string,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true }>;
  abstract agregarCorreo(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoAgregarCorreo,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos>;
  abstract modificarCorreo(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoModificarCorreo,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos>;
  abstract eliminarCorreo(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoEliminarCorreo,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos>;
  abstract seleccionarCorreoUso(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoSeleccionarCorreoUso,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos>;
  abstract actualizarVerificacionCorreo(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarVerificacionCorreo,
    contexto: ContextoSolicitud,
  ): Promise<ResultadoGestionCorreos>;
  abstract cambiarContrasenia(
    idUsuario: string,
    idOrganizacion: string,
    idSesion: string,
    comando: ComandoCambiarContrasenia,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true }>;

  abstract obtenerAvatar(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<AvatarPerfil>;

  abstract actualizarAvatar(
    idUsuario: string,
    idOrganizacion: string,
    archivo: ArchivoAvatarEntrada,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true; avatar: { version: string } }>;

  abstract eliminarAvatar(
    idUsuario: string,
    idOrganizacion: string,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true }>;

  abstract obtenerDatosPersonales(
    idUsuario: string,
    idOrganizacion: string,
  ): Promise<DatosPersonalesPerfil>;

  abstract actualizarDatosPersonales(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarDatosPersonales,
    contexto: ContextoSolicitud,
  ): Promise<{ ok: true; persona: DatosPersonalesPerfil["persona"] }>;

  abstract listarActividad(
    idUsuario: string,
    idOrganizacion: string,
    pagina: number,
    limite: number,
  ): Promise<PaginaActividadUsuario>;

  abstract actualizarApariencia(
    idUsuario: string,
    idOrganizacion: string,
    comando: ComandoActualizarApariencia,
    contexto: ContextoSolicitud,
  ): Promise<{
    ok: true;
    preferencias: {
      fid_admin_level_0: string | null;
      fid_zonas_horarias: string | null;
    };
  }>;
}
