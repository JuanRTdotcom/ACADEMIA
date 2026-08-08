import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../comun/prisma.service";

@Injectable()
export class FuenteDatosPaisesPrisma {
  constructor(private prisma: PrismaService) {}

  async listar(q?: string) {
    const search = q?.trim();
    return this.prisma.admin_level_0.findMany({
      where: search
        ? {
            OR: [
              { codigo_iso2: { contains: search, mode: "insensitive" } },
              { nombre_es: { contains: search, mode: "insensitive" } },
              { nombre_en: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { nombre_es: "asc" },
      select: {
        id_admin_level_0: true,
        codigo_iso2: true,
        nombre_es: true,
        nombre_en: true,
        estado: true,
      },
    });
  }

  async cambiarEstado(id: string, activo: boolean) {
    return this.prisma.admin_level_0.update({
      where: { id_admin_level_0: id },
      data: { estado: activo ? 1 : 0 },
      select: {
        id_admin_level_0: true,
        codigo_iso2: true,
        nombre_es: true,
        nombre_en: true,
        estado: true,
      },
    });
  }

  async obtener(id: string) {
    return this.prisma.admin_level_0.findUnique({
      where: { id_admin_level_0: id },
      select: {
        id_admin_level_0: true,
        codigo_iso2: true,
        nombre_es: true,
        nombre_en: true,
        estado: true,
      },
    });
  }
}
