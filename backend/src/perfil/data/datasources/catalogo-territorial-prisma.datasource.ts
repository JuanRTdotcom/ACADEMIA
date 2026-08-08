import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../comun/prisma.service";

/**
 * Consulta la jerarquía territorial completa sin conocer nombres locales.
 * Level 2 es opcional: un Level 3 puede depender directamente de Level 1.
 */
@Injectable()
export class FuenteDatosCatalogoTerritorialPrisma {
  constructor(private readonly prisma: PrismaService) {}

  async listarJerarquiaAdministrativa() {
    const [admin_level_0, admin_level_1, admin_level_2, admin_level_3] =
      await Promise.all([
        this.prisma.admin_level_0.findMany({
          where: { estado: 1 },
          orderBy: { nombre_es: "asc" },
          select: {
            id_admin_level_0: true,
            codigo_iso2: true,
            nombre_es: true,
            etiqueta_admin_level_1: true,
            etiqueta_admin_level_2: true,
            etiqueta_admin_level_3: true,
          },
        }),
        this.prisma.admin_level_1.findMany({
          where: { estado: 1, admin_level_0: { estado: 1 } },
          orderBy: { nombre: "asc" },
          select: {
            id_admin_level_1: true,
            fid_admin_level_0: true,
            codigo: true,
            nombre: true,
          },
        }),
        this.prisma.admin_level_2.findMany({
          where: {
            estado: 1,
            admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
          },
          orderBy: { nombre: "asc" },
          select: {
            id_admin_level_2: true,
            fid_admin_level_1: true,
            codigo: true,
            nombre: true,
          },
        }),
        this.prisma.admin_level_3.findMany({
          where: {
            estado: 1,
            admin_level_1: { estado: 1, admin_level_0: { estado: 1 } },
          },
          orderBy: { nombre: "asc" },
          select: {
            fid_admin_level_1: true,
            fid_admin_level_2: true,
            codigo: true,
            nombre: true,
          },
        }),
      ]);

    return {
      admin_level_0: admin_level_0.map(({ nombre_es, ...pais }) => ({
        ...pais,
        nombre: nombre_es,
      })),
      admin_level_1,
      admin_level_2,
      admin_level_3,
    };
  }
}
