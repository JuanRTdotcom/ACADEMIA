import { Module } from "@nestjs/common";
import { FuenteDatosAlmacenamientoR2 } from "./data/datasources/r2-storage.datasource";
import { RepositorioAlmacenamientoDatos } from "./data/repositories/storage.repository.impl";
import { RepositorioAlmacenamiento } from "./domain/repositories/storage.repository";
import { CasoUsoCrearCargaFirmada } from "./domain/usecases/create-signed-upload";
import { CasoUsoCrearDescargaFirmada } from "./domain/usecases/create-signed-download";
import { CasoUsoInspeccionarObjeto } from "./domain/usecases/inspect-object";
import { CasoUsoEliminarObjeto } from "./domain/usecases/delete-object";
import { CasoUsoGuardarObjeto } from "./domain/usecases/save-object";
import { CasoUsoLeerObjeto } from "./domain/usecases/read-object";

const CASOS_USO = [
  CasoUsoCrearCargaFirmada,
  CasoUsoCrearDescargaFirmada,
  CasoUsoInspeccionarObjeto,
  CasoUsoEliminarObjeto,
  CasoUsoGuardarObjeto,
  CasoUsoLeerObjeto,
];

/**
 * Capa transversal de objetos privados. No publica rutas genéricas: los módulos
 * consumidores validan sesión, tenant, permisos y política de cada archivo.
 */
@Module({
  providers: [
    FuenteDatosAlmacenamientoR2,
    RepositorioAlmacenamientoDatos,
    {
      provide: RepositorioAlmacenamiento,
      useExisting: RepositorioAlmacenamientoDatos,
    },
    ...CASOS_USO,
  ],
  exports: [...CASOS_USO],
})
export class ModuloAlmacenamiento {}
