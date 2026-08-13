import { Module } from "@nestjs/common";
import { FuenteDatosUsuariosPrisma } from "./data/datasources/usuarios-prisma.datasource";
import { RepositorioUsuariosDatos } from "./data/repositories/repositorio-usuarios.impl";
import { RepositorioUsuarios } from "./domain/repositories/repositorio-usuarios";
import { CasoUsoGestionarUsuarios } from "./domain/usecases/gestionar-usuarios";
import { ControladorUsuarios } from "./presentation/controllers/usuarios.controller";
import { ControladorEmpresaUsuarios } from "./presentation/controllers/empresa-usuarios.controller";
import { ModuloAlmacenamiento } from "../storage/storage.module";
import { AlmacenAvatarR2 } from "../perfil/data/datasources/avatar/avatar-r2.datasource";
import { ModuloTokenOpaco } from "../comun/seguridad/token-opaco.module";

@Module({
  imports: [ModuloAlmacenamiento, ModuloTokenOpaco],
  controllers: [ControladorUsuarios, ControladorEmpresaUsuarios],
  providers: [
    AlmacenAvatarR2,
    FuenteDatosUsuariosPrisma,
    RepositorioUsuariosDatos,
    { provide: RepositorioUsuarios, useExisting: RepositorioUsuariosDatos },
    CasoUsoGestionarUsuarios,
  ],
})
export class ModuloUsuarios {}
