import { BadRequestException, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { extname } from "node:path";
import { ModuloAlmacenamiento } from "../storage/storage.module";
import { AlmacenFotoMascotaR2 } from "./data/datasources/foto-mascota-r2.datasource";
import { FuenteDatosMascotasPrisma } from "./data/datasources/mascotas-prisma.datasource";
import { RepositorioMascotasDatos } from "./data/repositories/repositorio-mascotas.impl";
import { RepositorioMascotas } from "./domain/repositories/repositorio-mascotas";
import { CasoUsoGestionarMascotas } from "./domain/usecases/gestionar-mascotas";
import { ControladorMascotas } from "./presentation/controllers/mascotas.controller";
import { InterceptorErroresFotoMascota } from "./presentation/interceptors/interceptor-errores-foto-mascota";

@Module({
  imports: [
    ModuloAlmacenamiento,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          files: 1,
          fields: 20,
          fieldNameSize: 64,
          headerPairs: 32,
          fileSize: config.getOrThrow<number>("AVATAR_MAX_BYTES"),
        },
        fileFilter: (
          _req: Express.Request,
          file: Express.Multer.File,
          done: (error: Error | null, accept: boolean) => void,
        ) => {
          const valid =
            ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
              file.mimetype,
            ) &&
            [".jpg", ".jpeg", ".png", ".webp"].includes(
              extname(file.originalname).toLowerCase(),
            );
          done(
            valid ? null : new BadRequestException("pets.invalidPhoto"),
            valid,
          );
        },
      }),
    }),
  ],
  controllers: [ControladorMascotas],
  providers: [
    AlmacenFotoMascotaR2,
    FuenteDatosMascotasPrisma,
    RepositorioMascotasDatos,
    { provide: RepositorioMascotas, useExisting: RepositorioMascotasDatos },
    CasoUsoGestionarMascotas,
    InterceptorErroresFotoMascota,
  ],
})
export class ModuloMascotas {}
