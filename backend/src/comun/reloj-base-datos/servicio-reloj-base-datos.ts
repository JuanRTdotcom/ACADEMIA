import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../prisma/generated/client/client";
import { PrismaService } from "../prisma.service";

type ClienteTemporal = Prisma.TransactionClient | PrismaService;

export interface VentanaTemporal {
  ahora: Date;
  expira_acceso: Date;
  expira_refresco: Date;
}

export interface VentanaSesion extends VentanaTemporal {
  expira_inactividad: Date;
  expira_absoluta: Date;
}

/** PostgreSQL es la única autoridad temporal para datos y tokens. */
@Injectable()
export class ServicioRelojBaseDatos {
  constructor(private prisma: PrismaService) {}

  async ahora(cliente: ClienteTemporal = this.prisma): Promise<Date> {
    const [resultado] = await cliente.$queryRaw<{ ahora: Date }[]>`
      SELECT CURRENT_TIMESTAMP AS ahora
    `;
    if (!resultado) throw new Error("PostgreSQL no devolvió su tiempo actual");
    return resultado.ahora;
  }

  async ventanaTokens(
    minutosAcceso: number,
    horasRefresco: number,
    cliente: ClienteTemporal = this.prisma,
  ): Promise<VentanaTemporal> {
    const [ventana] = await cliente.$queryRaw<VentanaTemporal[]>`
      SELECT
        CURRENT_TIMESTAMP AS ahora,
        CURRENT_TIMESTAMP + (${minutosAcceso} * INTERVAL '1 minute') AS expira_acceso,
        CURRENT_TIMESTAMP + (${horasRefresco} * INTERVAL '1 hour') AS expira_refresco
    `;
    if (!ventana) throw new Error("PostgreSQL no devolvió su tiempo actual");
    return ventana;
  }

  /** Ventanas iniciales de una sesión. Todas nacen del mismo CURRENT_TIMESTAMP. */
  async ventanaSesionInicial(
    minutosAcceso: number,
    horasRefresco: number,
    minutosInactividad: number,
    diasAbsolutos: number,
    cliente: ClienteTemporal = this.prisma,
  ): Promise<VentanaSesion> {
    const [ventana] = await cliente.$queryRaw<VentanaSesion[]>`
      SELECT
        CURRENT_TIMESTAMP AS ahora,
        CURRENT_TIMESTAMP + (${minutosAcceso} * INTERVAL '1 minute') AS expira_acceso,
        LEAST(
          CURRENT_TIMESTAMP + (${horasRefresco} * INTERVAL '1 hour'),
          CURRENT_TIMESTAMP + (${diasAbsolutos} * INTERVAL '1 day')
        ) AS expira_refresco,
        LEAST(
          CURRENT_TIMESTAMP + (${minutosInactividad} * INTERVAL '1 minute'),
          CURRENT_TIMESTAMP + (${diasAbsolutos} * INTERVAL '1 day')
        ) AS expira_inactividad,
        CURRENT_TIMESTAMP + (${diasAbsolutos} * INTERVAL '1 day') AS expira_absoluta
    `;
    if (!ventana)
      throw new Error("PostgreSQL no devolvió la ventana de sesión");
    return ventana;
  }

  /** Rotación: conserva el límite absoluto de la familia original. */
  async ventanaSesionRotada(
    minutosAcceso: number,
    horasRefresco: number,
    minutosInactividad: number,
    expiraAbsoluta: Date,
    cliente: ClienteTemporal = this.prisma,
  ): Promise<VentanaSesion> {
    const [ventana] = await cliente.$queryRaw<VentanaSesion[]>`
      SELECT
        CURRENT_TIMESTAMP AS ahora,
        LEAST(
          CURRENT_TIMESTAMP + (${minutosAcceso} * INTERVAL '1 minute'),
          ${expiraAbsoluta}::timestamptz
        ) AS expira_acceso,
        LEAST(
          CURRENT_TIMESTAMP + (${horasRefresco} * INTERVAL '1 hour'),
          ${expiraAbsoluta}::timestamptz
        ) AS expira_refresco,
        LEAST(
          CURRENT_TIMESTAMP + (${minutosInactividad} * INTERVAL '1 minute'),
          ${expiraAbsoluta}::timestamptz
        ) AS expira_inactividad,
        ${expiraAbsoluta}::timestamptz AS expira_absoluta
    `;
    if (!ventana)
      throw new Error("PostgreSQL no devolvió la ventana de rotación");
    return ventana;
  }

  async tokenExpirado(
    exp: number,
    cliente: ClienteTemporal = this.prisma,
  ): Promise<boolean> {
    const [resultado] = await cliente.$queryRaw<{ expirado: boolean }[]>`
      SELECT ${exp} <= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::bigint AS expirado
    `;
    return resultado?.expirado ?? true;
  }
}
