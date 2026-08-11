import { BadRequestException, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "node:path";
import { ControladorPerfil } from "./presentation/controllers/perfil.controller";
import { FuenteDatosPerfilPrisma } from "./data/datasources/perfil-prisma.datasource";
import { RepositorioPerfil } from "./domain/repositories/repositorio-perfil";
import { CasoUsoActualizarApariencia } from "./domain/usecases/actualizar-apariencia";
import { RepositorioPerfilDatos } from "./data/repositories/repositorio-perfil.impl";
import { CasoUsoListarActividad } from "./domain/usecases/listar-actividad";
import { CasoUsoObtenerDatosPersonales } from "./domain/usecases/obtener-datos-personales";
import { CasoUsoActualizarDatosPersonales } from "./domain/usecases/actualizar-datos-personales";
import { AlmacenAvatarR2 } from "./data/datasources/avatar/avatar-r2.datasource";
import { CasoUsoObtenerAvatar } from "./domain/usecases/obtener-avatar";
import { CasoUsoActualizarAvatar } from "./domain/usecases/actualizar-avatar";
import { CasoUsoEliminarAvatar } from "./domain/usecases/eliminar-avatar";
import { InterceptorErroresAvatar } from "./presentation/interceptors/interceptor-errores-avatar";
import { CasoUsoCambiarContrasenia } from "./domain/usecases/cambiar-contrasenia";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { CasoUsoAgregarCorreo } from "./domain/usecases/agregar-correo";
import { CasoUsoSeleccionarCorreoUso } from "./domain/usecases/seleccionar-correo-uso";
import { CasoUsoActualizarVerificacionCorreo } from "./domain/usecases/actualizar-verificacion-correo";
import { CasoUsoModificarCorreo } from "./domain/usecases/modificar-correo";
import { CasoUsoEliminarCorreo } from "./domain/usecases/eliminar-correo";
import { FuenteDatosCatalogoTerritorialPrisma } from "./data/datasources/catalogo-territorial-prisma.datasource";
import { CasoUsoListarSesiones } from "./domain/usecases/listar-sesiones";
import { CasoUsoCerrarOtraSesion } from "./domain/usecases/cerrar-otra-sesion";
import { CasoUsoCerrarOtrasSesiones } from "./domain/usecases/cerrar-otras-sesiones";
import { CasoUsoActualizarSegundoFactor } from "./domain/usecases/actualizar-segundo-factor";
import { FuenteDatosNacionalidadesPrisma } from "./data/datasources/nacionalidades-prisma.datasource";
import { CasoUsoListarNacionalidades } from "./domain/usecases/listar-nacionalidades";
import { CasoUsoAgregarNacionalidad } from "./domain/usecases/agregar-nacionalidad";
import { CasoUsoEliminarNacionalidad } from "./domain/usecases/eliminar-nacionalidad";
import { FuenteDatosSegurosPrisma } from "./data/datasources/seguros-prisma.datasource";
import { CasoUsoListarSeguros } from "./domain/usecases/listar-seguros";
import { CasoUsoAgregarSeguro } from "./domain/usecases/agregar-seguro";
import { CasoUsoModificarSeguro } from "./domain/usecases/modificar-seguro";
import { CasoUsoEliminarSeguro } from "./domain/usecases/eliminar-seguro";
import { FuenteDatosHobbiesPrisma } from "./data/datasources/hobbies-prisma.datasource";
import { CasoUsoListarHobbies } from "./domain/usecases/listar-hobbies";
import { CasoUsoAgregarHobby } from "./domain/usecases/agregar-hobby";
import { CasoUsoEliminarHobby } from "./domain/usecases/eliminar-hobby";
import { CasoUsoModificarHobby } from "./domain/usecases/modificar-hobby";
import { FuenteDatosDocumentosPrisma } from "./data/datasources/documentos-prisma.datasource";
import { FuenteDatosTelefonosPrisma } from "./data/datasources/telefonos-prisma.datasource";
import { CasoUsoListarDocumentos } from "./domain/usecases/listar-documentos";
import { CasoUsoAgregarDocumento } from "./domain/usecases/agregar-documento";
import { CasoUsoModificarDocumento } from "./domain/usecases/modificar-documento";
import { CasoUsoEliminarDocumento } from "./domain/usecases/eliminar-documento";
import { CasoUsoListarTelefonos } from "./domain/usecases/listar-telefonos";
import { CasoUsoAgregarTelefono } from "./domain/usecases/agregar-telefono";
import { CasoUsoModificarTelefono } from "./domain/usecases/modificar-telefono";
import { CasoUsoEliminarTelefono } from "./domain/usecases/eliminar-telefono";
import { FuenteDatosEstudiosPrisma } from "./data/datasources/estudios-prisma.datasource";
import { CasoUsoListarEstudios } from "./domain/usecases/listar-estudios";
import { CasoUsoAgregarEstudioRealizado } from "./domain/usecases/agregar-estudio-realizado";
import { CasoUsoModificarEstudioRealizado } from "./domain/usecases/modificar-estudio-realizado";
import { CasoUsoEliminarEstudioRealizado } from "./domain/usecases/eliminar-estudio-realizado";
import { CasoUsoAgregarEstudioComplementario } from "./domain/usecases/agregar-estudio-complementario";
import { CasoUsoModificarEstudioComplementario } from "./domain/usecases/modificar-estudio-complementario";
import { CasoUsoEliminarEstudioComplementario } from "./domain/usecases/eliminar-estudio-complementario";
import { ModuloAlmacenamiento } from "../storage/storage.module";

@Module({
  imports: [
    ModuloAutenticacion,
    ModuloAlmacenamiento,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          files: 1,
          fields: 0,
          fieldNameSize: 32,
          headerPairs: 32,
          fileSize: configuracion.getOrThrow<number>("AVATAR_MAX_BYTES"),
        },
        fileFilter: (
          _peticion: Express.Request,
          archivo: Express.Multer.File,
          terminar: (error: Error | null, aceptar: boolean) => void,
        ) => {
          const extension = extname(archivo.originalname).toLowerCase();
          const permitido =
            ["image/jpeg", "image/png"].includes(archivo.mimetype) &&
            [".jpg", ".jpeg", ".png"].includes(extension);
          terminar(
            permitido
              ? null
              : new BadRequestException("profile.avatar.invalidFile"),
            permitido,
          );
        },
      }),
    }),
  ],
  controllers: [ControladorPerfil],
  providers: [
    FuenteDatosPerfilPrisma,
    FuenteDatosCatalogoTerritorialPrisma,
    FuenteDatosNacionalidadesPrisma,
    FuenteDatosSegurosPrisma,
    FuenteDatosHobbiesPrisma,
    FuenteDatosDocumentosPrisma,
    FuenteDatosTelefonosPrisma,
    FuenteDatosEstudiosPrisma,
    AlmacenAvatarR2,
    RepositorioPerfilDatos,
    { provide: RepositorioPerfil, useExisting: RepositorioPerfilDatos },
    CasoUsoActualizarApariencia,
    CasoUsoListarActividad,
    CasoUsoObtenerDatosPersonales,
    CasoUsoActualizarDatosPersonales,
    CasoUsoObtenerAvatar,
    CasoUsoActualizarAvatar,
    CasoUsoEliminarAvatar,
    CasoUsoCambiarContrasenia,
    CasoUsoAgregarCorreo,
    CasoUsoModificarCorreo,
    CasoUsoEliminarCorreo,
    CasoUsoSeleccionarCorreoUso,
    CasoUsoActualizarVerificacionCorreo,
    CasoUsoListarSesiones,
    CasoUsoCerrarOtraSesion,
    CasoUsoCerrarOtrasSesiones,
    CasoUsoActualizarSegundoFactor,
    CasoUsoListarNacionalidades,
    CasoUsoAgregarNacionalidad,
    CasoUsoEliminarNacionalidad,
    CasoUsoListarSeguros,
    CasoUsoAgregarSeguro,
    CasoUsoModificarSeguro,
    CasoUsoEliminarSeguro,
    CasoUsoListarHobbies,
    CasoUsoAgregarHobby,
    CasoUsoModificarHobby,
    CasoUsoEliminarHobby,
    CasoUsoListarDocumentos,
    CasoUsoAgregarDocumento,
    CasoUsoModificarDocumento,
    CasoUsoEliminarDocumento,
    CasoUsoListarTelefonos,
    CasoUsoAgregarTelefono,
    CasoUsoModificarTelefono,
    CasoUsoEliminarTelefono,
    CasoUsoListarEstudios,
    CasoUsoAgregarEstudioRealizado,
    CasoUsoModificarEstudioRealizado,
    CasoUsoEliminarEstudioRealizado,
    CasoUsoAgregarEstudioComplementario,
    CasoUsoModificarEstudioComplementario,
    CasoUsoEliminarEstudioComplementario,
    InterceptorErroresAvatar,
  ],
})
export class ModuloPerfil {}
