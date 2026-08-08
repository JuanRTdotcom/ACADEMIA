import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * Única instancia de Prisma para toda la aplicación. Al ser global, los demás
 * módulos pueden inyectar PrismaService sin volver a declararlo ni crear pools
 * de conexiones independientes.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class ModuloPrisma {}
