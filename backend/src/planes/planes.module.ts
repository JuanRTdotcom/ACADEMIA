import { Module } from "@nestjs/common";
import { FuenteDatosPlanesPrisma } from "./data/datasources/planes-prisma.datasource";
import { ControladorPlanes } from "./presentation/controllers/planes.controller";

@Module({
  controllers: [ControladorPlanes],
  providers: [FuenteDatosPlanesPrisma],
  exports: [FuenteDatosPlanesPrisma],
})
export class PlanesModule {}
