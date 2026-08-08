import { BadRequestException, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "node:path";
import { ControladorEmpresas } from "./presentation/controllers/empresas.controller";
import { ControladorEmpresaActual } from "./presentation/controllers/empresa-actual.controller";
import { FuenteDatosEmpresasPrisma } from "./data/datasources/empresas-prisma.datasource";
import { RepositorioEmpresas } from "./domain/repositories/repositorio-empresas";
import { CasoUsoListarEmpresas } from "./domain/usecases/listar-empresas";
import { CasoUsoCrearEmpresa } from "./domain/usecases/crear-empresa";
import { CasoUsoActualizarEmpresa } from "./domain/usecases/actualizar-empresa";
import { CasoUsoCambiarEstadoEmpresa } from "./domain/usecases/cambiar-estado-empresa";
import { RepositorioEmpresasDatos } from "./data/repositories/repositorio-empresas.impl";
import { ModuloAlmacenamiento } from "../storage/storage.module";
import { AlmacenMediosEmpresaR2 } from "./data/datasources/company-media-r2.datasource";
import { InterceptorErroresMediosEmpresa } from "./presentation/interceptors/interceptor-errores-medios-empresa";
import { CasoUsoGestionarEmpresaActual } from "./domain/usecases/gestionar-empresa-actual";
import { CasoUsoEliminarEmpresa } from "./domain/usecases/eliminar-empresa";
import { CasoUsoGestionarMarcaEmpresa } from "./domain/usecases/gestionar-marca-empresa";
import { CasoUsoRenovarSuscripcion } from "./domain/usecases/renovar-suscripcion";
import { CasoUsoListarRenovaciones } from "./domain/usecases/listar-renovaciones";

@Module({
  imports: [
    ModuloAlmacenamiento,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          files: 1,
          fields: 1,
          fieldNameSize: 64,
          headerPairs: 32,
          fileSize: configuracion.getOrThrow<number>("COMPANY_MEDIA_MAX_BYTES"),
        },
        fileFilter: (
          peticion: Express.Request,
          archivo: Express.Multer.File,
          terminar: (error: Error | null, aceptar: boolean) => void,
        ) => {
          const extension = extname(archivo.originalname).toLowerCase();
          const tipo = (peticion as { params?: Record<string, string> }).params
            ?.type;
          const esMarca = [
            "escudo",
            "escudo_oscuro",
            "imagotipo",
            "imagotipo_oscuro",
            "login_escudo",
            "login_escudo_oscuro",
          ].includes(tipo ?? "");
          const permitido = esMarca
            ? archivo.mimetype === "image/png" && extension === ".png"
            : tipo === "portada" &&
              archivo.mimetype === "image/jpeg" &&
              [".jpg", ".jpeg"].includes(extension);
          const mensaje = (tipo?.startsWith("escudo") || tipo?.startsWith("login_escudo"))
            ? "companies.media.invalidShieldFile"
            : tipo?.startsWith("imagotipo")
              ? "companies.media.invalidLogotypeFile"
              : "companies.media.invalidFile";
          terminar(
            permitido ? null : new BadRequestException(mensaje),
            permitido,
          );
        },
      }),
    }),
  ],
  controllers: [ControladorEmpresas, ControladorEmpresaActual],
  providers: [
    FuenteDatosEmpresasPrisma,
    RepositorioEmpresasDatos,
    { provide: RepositorioEmpresas, useExisting: RepositorioEmpresasDatos },
    CasoUsoListarEmpresas,
    CasoUsoCrearEmpresa,
    CasoUsoActualizarEmpresa,
    CasoUsoCambiarEstadoEmpresa,
    AlmacenMediosEmpresaR2,
    CasoUsoGestionarEmpresaActual,
    CasoUsoEliminarEmpresa,
    CasoUsoGestionarMarcaEmpresa,
    CasoUsoRenovarSuscripcion,
    CasoUsoListarRenovaciones,
    InterceptorErroresMediosEmpresa,
  ],
})
export class ModuloEmpresas {}
