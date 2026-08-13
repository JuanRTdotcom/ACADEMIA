import { BadRequestException, Module } from "@nestjs/common";
import { basename } from "node:path";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ModuloAlmacenamiento } from "../storage/storage.module";
import { AlmacenAdjuntosAtencionR2 } from "./data/datasources/adjuntos-atencion-r2.datasource";
import { RepositorioAtencionesDatos } from "./data/repositories/repositorio-atenciones.impl";
import { FuenteDatosAtencionesPrisma } from "./data/datasources/atenciones-prisma.datasource";
import { RepositorioAtenciones } from "./domain/repositories/repositorio-atenciones";
import { CasoUsoGestionarAtenciones } from "./domain/usecases/gestionar-atenciones";
import { ControladorAtenciones } from "./presentation/controllers/atenciones.controller";
import { InterceptorErroresAdjuntosAtencion } from "./presentation/interceptors/interceptor-errores-adjuntos-atencion";
import { formatoAdjuntoAtencion } from "./data/datasources/formatos-adjuntos-atencion";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";

@Module({
  imports: [
    ModuloTokenOpaco,
    ModuloAlmacenamiento,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          files: config.getOrThrow<number>("ATTENTION_ATTACHMENT_MAX_FILES"),
          fields: 12,
          fieldNameSize: 64,
          headerPairs: 32,
          fileSize: config.getOrThrow<number>("ATTENTION_ATTACHMENT_MAX_BYTES"),
        },
        fileFilter: (
          _req: Express.Request,
          file: Express.Multer.File,
          done: (error: Error | null, accept: boolean) => void,
        ) => {
          const valido = Boolean(
            formatoAdjuntoAtencion(file.originalname, file.mimetype),
          );
          done(
            valido
              ? null
              : new BadRequestException({
                  message: "attentions.invalidAttachmentType",
                  args: { file: basename(file.originalname).slice(0, 180) },
                }),
            valido,
          );
        },
      }),
    }),
  ],
  controllers: [ControladorAtenciones],
  providers: [
    AlmacenAdjuntosAtencionR2,
    FuenteDatosAtencionesPrisma,
    RepositorioAtencionesDatos,
    { provide: RepositorioAtenciones, useExisting: RepositorioAtencionesDatos },
    CasoUsoGestionarAtenciones,
    InterceptorErroresAdjuntosAtencion,
  ],
})
export class ModuloAtenciones {}
