import { Module } from "@nestjs/common";
import { FuenteDatosRolesPrisma } from "./data/datasources/roles-prisma.datasource";
import { RepositorioRolesDatos } from "./data/repositories/repositorio-roles.impl";
import { RepositorioRoles } from "./domain/repositories/repositorio-roles";
import { CasoUsoGestionarRoles } from "./domain/usecases/gestionar-roles";
import { ControladorRoles } from "./presentation/controllers/roles.controller";

@Module({
  controllers: [ControladorRoles],
  providers: [
    FuenteDatosRolesPrisma,
    RepositorioRolesDatos,
    { provide: RepositorioRoles, useExisting: RepositorioRolesDatos },
    CasoUsoGestionarRoles,
  ],
})
export class ModuloRoles {}
