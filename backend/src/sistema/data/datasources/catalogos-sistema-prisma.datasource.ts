import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../comun/prisma.service";

@Injectable()
export class FuenteDatosCatalogosSistemaPrisma {
  constructor(private prisma: PrismaService) {}

  /** Catálogos globales: no dependen del tenant ni contienen preferencias. */
  async obtenerOpcionesApariencia() {
    const [paises, zonas_horarias] = await Promise.all([
      this.prisma.admin_level_0.findMany({
        where: { estado: 1 },
        orderBy: { codigo_iso2: "asc" },
        select: {
          id_admin_level_0: true,
          codigo_iso2: true,
          nombre_es: true,
          nombre_en: true,
        },
      }),
      // El desfase UTC se calcula con CURRENT_TIMESTAMP de PostgreSQL para que
      // respete automáticamente el horario de verano vigente de cada zona.
      this.prisma.$queryRaw<
        {
          id_zonas_horarias: string;
          nombre_iana: string;
          desfase_utc: string;
        }[]
      >`
        WITH zonas_activas AS (
          SELECT
            id_zonas_horarias,
            nombre_iana,
            EXTRACT(
              EPOCH FROM (
                (CURRENT_TIMESTAMP AT TIME ZONE nombre_iana)
                - (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
              )
            )::integer AS desfase_segundos
          FROM system.zonas_horarias
          WHERE estado = 1
        )
        SELECT
          id_zonas_horarias,
          nombre_iana,
          'UTC'
          || CASE WHEN desfase_segundos >= 0 THEN '+' ELSE '-' END
          || lpad((abs(desfase_segundos) / 3600)::text, 2, '0')
          || ':'
          || lpad(((abs(desfase_segundos) % 3600) / 60)::text, 2, '0')
          AS desfase_utc
        FROM zonas_activas
        ORDER BY nombre_iana ASC
      `,
    ]);

    return { paises, zonas_horarias };
  }
}
