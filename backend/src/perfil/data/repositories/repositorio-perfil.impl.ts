import { Injectable } from "@nestjs/common";
import { RepositorioPerfil } from "../../domain/repositories/repositorio-perfil";
import { FuenteDatosPerfilPrisma } from "../datasources/perfil-prisma.datasource";
import { FuenteDatosNacionalidadesPrisma } from "../datasources/nacionalidades-prisma.datasource";
import { FuenteDatosSegurosPrisma } from "../datasources/seguros-prisma.datasource";
import { FuenteDatosHobbiesPrisma } from "../datasources/hobbies-prisma.datasource";
import { FuenteDatosDocumentosPrisma } from "../datasources/documentos-prisma.datasource";
import { FuenteDatosTelefonosPrisma } from "../datasources/telefonos-prisma.datasource";
import { FuenteDatosEstudiosPrisma } from "../datasources/estudios-prisma.datasource";

@Injectable()
export class RepositorioPerfilDatos extends RepositorioPerfil {
  constructor(
    private readonly fuenteDatos: FuenteDatosPerfilPrisma,
    private readonly nacionalidades: FuenteDatosNacionalidadesPrisma,
    private readonly seguros: FuenteDatosSegurosPrisma,
    private readonly hobbies: FuenteDatosHobbiesPrisma,
    private readonly documentos: FuenteDatosDocumentosPrisma,
    private readonly telefonos: FuenteDatosTelefonosPrisma,
    private readonly estudios: FuenteDatosEstudiosPrisma,
  ) {
    super();
  }

  listarEstudios(
    ...argumentos: Parameters<RepositorioPerfil["listarEstudios"]>
  ) {
    return this.estudios.listar(...argumentos);
  }
  agregarEstudioRealizado(
    ...argumentos: Parameters<RepositorioPerfil["agregarEstudioRealizado"]>
  ) {
    return this.estudios.agregarRealizado(...argumentos);
  }
  modificarEstudioRealizado(
    ...argumentos: Parameters<RepositorioPerfil["modificarEstudioRealizado"]>
  ) {
    return this.estudios.modificarRealizado(...argumentos);
  }
  eliminarEstudioRealizado(
    ...argumentos: Parameters<RepositorioPerfil["eliminarEstudioRealizado"]>
  ) {
    return this.estudios.eliminarRealizado(...argumentos);
  }
  agregarEstudioComplementario(
    ...argumentos: Parameters<RepositorioPerfil["agregarEstudioComplementario"]>
  ) {
    return this.estudios.agregarComplementario(...argumentos);
  }
  modificarEstudioComplementario(
    ...argumentos: Parameters<
      RepositorioPerfil["modificarEstudioComplementario"]
    >
  ) {
    return this.estudios.modificarComplementario(...argumentos);
  }
  eliminarEstudioComplementario(
    ...argumentos: Parameters<
      RepositorioPerfil["eliminarEstudioComplementario"]
    >
  ) {
    return this.estudios.eliminarComplementario(...argumentos);
  }

  listarDocumentos(
    ...argumentos: Parameters<RepositorioPerfil["listarDocumentos"]>
  ) {
    return this.documentos.listar(...argumentos);
  }

  agregarDocumento(
    ...argumentos: Parameters<RepositorioPerfil["agregarDocumento"]>
  ) {
    return this.documentos.agregar(...argumentos);
  }

  modificarDocumento(
    ...argumentos: Parameters<RepositorioPerfil["modificarDocumento"]>
  ) {
    return this.documentos.modificar(...argumentos);
  }

  eliminarDocumento(
    ...argumentos: Parameters<RepositorioPerfil["eliminarDocumento"]>
  ) {
    return this.documentos.eliminar(...argumentos);
  }

  listarTelefonos(
    ...argumentos: Parameters<RepositorioPerfil["listarTelefonos"]>
  ) {
    return this.telefonos.listar(...argumentos);
  }

  agregarTelefono(
    ...argumentos: Parameters<RepositorioPerfil["agregarTelefono"]>
  ) {
    return this.telefonos.agregar(...argumentos);
  }

  modificarTelefono(
    ...argumentos: Parameters<RepositorioPerfil["modificarTelefono"]>
  ) {
    return this.telefonos.modificar(...argumentos);
  }

  eliminarTelefono(
    ...argumentos: Parameters<RepositorioPerfil["eliminarTelefono"]>
  ) {
    return this.telefonos.eliminar(...argumentos);
  }

  listarHobbies(...argumentos: Parameters<RepositorioPerfil["listarHobbies"]>) {
    return this.hobbies.listar(...argumentos);
  }

  agregarHobby(...argumentos: Parameters<RepositorioPerfil["agregarHobby"]>) {
    return this.hobbies.agregar(...argumentos);
  }

  modificarHobby(
    ...argumentos: Parameters<RepositorioPerfil["modificarHobby"]>
  ) {
    return this.hobbies.modificar(...argumentos);
  }

  eliminarHobby(...argumentos: Parameters<RepositorioPerfil["eliminarHobby"]>) {
    return this.hobbies.eliminar(...argumentos);
  }

  listarSeguros(...argumentos: Parameters<RepositorioPerfil["listarSeguros"]>) {
    return this.seguros.listar(...argumentos);
  }

  agregarSeguro(...argumentos: Parameters<RepositorioPerfil["agregarSeguro"]>) {
    return this.seguros.agregar(...argumentos);
  }

  modificarSeguro(
    ...argumentos: Parameters<RepositorioPerfil["modificarSeguro"]>
  ) {
    return this.seguros.modificar(...argumentos);
  }

  eliminarSeguro(
    ...argumentos: Parameters<RepositorioPerfil["eliminarSeguro"]>
  ) {
    return this.seguros.eliminar(...argumentos);
  }

  listarNacionalidades(
    ...argumentos: Parameters<RepositorioPerfil["listarNacionalidades"]>
  ) {
    return this.nacionalidades.listar(...argumentos);
  }

  agregarNacionalidad(
    ...argumentos: Parameters<RepositorioPerfil["agregarNacionalidad"]>
  ) {
    return this.nacionalidades.agregar(...argumentos);
  }

  eliminarNacionalidad(
    ...argumentos: Parameters<RepositorioPerfil["eliminarNacionalidad"]>
  ) {
    return this.nacionalidades.eliminar(...argumentos);
  }

  actualizarSegundoFactor(
    ...argumentos: Parameters<RepositorioPerfil["actualizarSegundoFactor"]>
  ) {
    return this.fuenteDatos.actualizarSegundoFactor(...argumentos);
  }

  listarSesiones(
    ...argumentos: Parameters<RepositorioPerfil["listarSesiones"]>
  ) {
    return this.fuenteDatos.listarSesiones(...argumentos);
  }

  cerrarOtraSesion(
    ...argumentos: Parameters<RepositorioPerfil["cerrarOtraSesion"]>
  ) {
    return this.fuenteDatos.cerrarOtraSesion(...argumentos);
  }

  cerrarOtrasSesiones(
    ...argumentos: Parameters<RepositorioPerfil["cerrarOtrasSesiones"]>
  ) {
    return this.fuenteDatos.cerrarOtrasSesiones(...argumentos);
  }

  agregarCorreo(...argumentos: Parameters<RepositorioPerfil["agregarCorreo"]>) {
    return this.fuenteDatos.agregarCorreo(...argumentos);
  }

  modificarCorreo(
    ...argumentos: Parameters<RepositorioPerfil["modificarCorreo"]>
  ) {
    return this.fuenteDatos.modificarCorreo(...argumentos);
  }

  eliminarCorreo(
    ...argumentos: Parameters<RepositorioPerfil["eliminarCorreo"]>
  ) {
    return this.fuenteDatos.eliminarCorreo(...argumentos);
  }

  seleccionarCorreoUso(
    ...argumentos: Parameters<RepositorioPerfil["seleccionarCorreoUso"]>
  ) {
    return this.fuenteDatos.seleccionarCorreoUso(...argumentos);
  }

  actualizarVerificacionCorreo(
    ...argumentos: Parameters<RepositorioPerfil["actualizarVerificacionCorreo"]>
  ) {
    return this.fuenteDatos.actualizarVerificacionCorreo(...argumentos);
  }

  cambiarContrasenia(
    ...argumentos: Parameters<RepositorioPerfil["cambiarContrasenia"]>
  ) {
    return this.fuenteDatos.cambiarContrasenia(...argumentos);
  }

  obtenerAvatar(...argumentos: Parameters<RepositorioPerfil["obtenerAvatar"]>) {
    return this.fuenteDatos.obtenerAvatar(...argumentos);
  }

  actualizarAvatar(
    ...argumentos: Parameters<RepositorioPerfil["actualizarAvatar"]>
  ) {
    return this.fuenteDatos.actualizarAvatar(...argumentos);
  }

  eliminarAvatar(
    ...argumentos: Parameters<RepositorioPerfil["eliminarAvatar"]>
  ) {
    return this.fuenteDatos.eliminarAvatar(...argumentos);
  }

  obtenerDatosPersonales(
    ...argumentos: Parameters<RepositorioPerfil["obtenerDatosPersonales"]>
  ) {
    return this.fuenteDatos.obtenerDatosPersonales(...argumentos);
  }

  actualizarDatosPersonales(
    ...argumentos: Parameters<RepositorioPerfil["actualizarDatosPersonales"]>
  ) {
    return this.fuenteDatos.actualizarDatosPersonales(...argumentos);
  }

  actualizarApariencia(
    ...argumentos: Parameters<RepositorioPerfil["actualizarApariencia"]>
  ) {
    return this.fuenteDatos.actualizarApariencia(...argumentos);
  }

  listarActividad(
    ...argumentos: Parameters<RepositorioPerfil["listarActividad"]>
  ) {
    return this.fuenteDatos.listarActividad(...argumentos);
  }
}
