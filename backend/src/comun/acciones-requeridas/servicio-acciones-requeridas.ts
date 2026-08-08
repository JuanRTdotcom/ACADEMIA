import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../../prisma/generated/client/client";
import type { ResumenAccionesRequeridas } from "../domain/entities/resumen-acciones-requeridas";
import { ServicioRelojBaseDatos } from "../reloj-base-datos/servicio-reloj-base-datos";
import {
  ACCIONES_REQUERIDAS,
  type CodigoAccionRequerida,
} from "./acciones-requeridas";

@Injectable()
export class ServicioAccionesRequeridas {
  constructor(private readonly reloj: ServicioRelojBaseDatos) {}

  private async obtenerMaestro(
    tx: Prisma.TransactionClient,
    codigo: CodigoAccionRequerida,
  ) {
    let maestro = await tx.acciones_requeridas_maestro.findUnique({
      where: { codigo },
      select: {
        id_acciones_requeridas_maestro: true,
        seccion: true,
        estado: true,
      },
    });
    if (!maestro && codigo === ACCIONES_REQUERIDAS.PERFIL_CAMBIAR_CONTRASENIA.codigo) {
      maestro = await tx.acciones_requeridas_maestro.create({
        data: {
          codigo: ACCIONES_REQUERIDAS.PERFIL_CAMBIAR_CONTRASENIA.codigo,
          seccion: "authentication",
          nombre: "Cambiar contraseña",
          descripcion: "Por seguridad debes cambiar la contraseña asignada por el administrador.",
          prioridad: 1,
          icono: "key-round",
          estado: 1,
        },
        select: {
          id_acciones_requeridas_maestro: true,
          seccion: true,
          estado: true,
        },
      });
    }
    if (!maestro || maestro.estado !== 1) {
      throw new Error(`Maestro de acción requerido inválido: ${codigo}`);
    }
    return maestro;
  }

  async crearCambioContraseniaRequerido(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<void> {
    const definicion = ACCIONES_REQUERIDAS.PERFIL_CAMBIAR_CONTRASENIA;
    const maestro = await this.obtenerMaestro(tx, definicion.codigo);
    const clave = {
      fid_usuarios: id_usuarios,
      fid_acciones_requeridas_maestro: maestro.id_acciones_requeridas_maestro,
      clave_recurso: "perfil.authentication",
    };
    await tx.acciones_requeridas.upsert({
      where: {
        fid_usuarios_fid_acciones_requeridas_maestro_clave_recurso: clave,
      },
      create: {
        fid_organizaciones,
        fid_usuarios: id_usuarios,
        fid_acciones_requeridas_maestro: maestro.id_acciones_requeridas_maestro,
        clave_recurso: "perfil.authentication",
        estado: 1,
        resuelta_en: null,
        created_by: id_usuarios,
        updated_by: id_usuarios,
      },
      update: {
        fid_organizaciones,
        estado: 1,
        resuelta_en: null,
        updated_by: id_usuarios,
      },
    });
  }

  async resolverCambioContraseniaRequerido(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<void> {
    const definicion = ACCIONES_REQUERIDAS.PERFIL_CAMBIAR_CONTRASENIA;
    const maestro = await tx.acciones_requeridas_maestro.findUnique({
      where: { codigo: definicion.codigo },
      select: { id_acciones_requeridas_maestro: true },
    });
    if (!maestro) return;
    const ahora = await this.reloj.ahora(tx);
    await tx.acciones_requeridas.updateMany({
      where: {
        fid_usuarios: id_usuarios,
        fid_organizaciones,
        fid_acciones_requeridas_maestro: maestro.id_acciones_requeridas_maestro,
        clave_recurso: "perfil.authentication",
        estado: 1,
      },
      data: {
        estado: 0,
        resuelta_en: ahora,
        updated_by: id_usuarios,
      },
    });
  }

  /**
   * Una sola acción representa los correos activos que aún no fueron verificados.
   */
  async reconciliarCorreosSinVerificar(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
    id_personas: string,
    crearSiNoExiste = false,
  ): Promise<void> {
    const definicion = ACCIONES_REQUERIDAS.PERFIL_CORREOS_SIN_VERIFICAR;
    const maestro = await this.obtenerMaestro(tx, definicion.codigo);
    const clave = {
      fid_usuarios: id_usuarios,
      fid_acciones_requeridas_maestro: maestro.id_acciones_requeridas_maestro,
      clave_recurso: "perfil.emails",
    };
    const existente = await tx.acciones_requeridas.findUnique({
      where: {
        fid_usuarios_fid_acciones_requeridas_maestro_clave_recurso: clave,
      },
      select: { id_acciones_requeridas: true },
    });
    if (!existente && !crearSiNoExiste) return;

    const correosSinVerificar = await tx.personas_correos.count({
      where: {
        fid_personas: id_personas,
        fid_organizaciones,
        estado: 1,
        verificado_en: null,
      },
    });
    const pendiente = correosSinVerificar > 0;
    const ahora = await this.reloj.ahora(tx);

    await tx.acciones_requeridas.upsert({
      where: {
        fid_usuarios_fid_acciones_requeridas_maestro_clave_recurso: clave,
      },
      create: {
        fid_organizaciones,
        fid_usuarios: id_usuarios,
        fid_acciones_requeridas_maestro: maestro.id_acciones_requeridas_maestro,
        clave_recurso: "perfil.emails",
        metadatos: { correos_sin_verificar: correosSinVerificar },
        estado: pendiente ? 1 : 0,
        resuelta_en: pendiente ? null : ahora,
        created_by: id_usuarios,
        updated_by: id_usuarios,
      },
      update: {
        fid_organizaciones,
        metadatos: { correos_sin_verificar: correosSinVerificar },
        estado: pendiente ? 1 : 0,
        resuelta_en: pendiente ? null : ahora,
        updated_by: id_usuarios,
      },
    });
  }

  async resumir(
    tx: Prisma.TransactionClient,
    id_usuarios: string,
    fid_organizaciones: string,
  ): Promise<ResumenAccionesRequeridas> {
    const acciones = await tx.acciones_requeridas.findMany({
      where: {
        fid_usuarios: id_usuarios,
        fid_organizaciones,
        estado: 1,
        accion_maestro: { estado: 1 },
      },
      select: { accion_maestro: { select: { seccion: true } } },
    });
    const por_seccion: Record<string, number> = {};
    for (const accion of acciones) {
      const seccion = accion.accion_maestro.seccion;
      por_seccion[seccion] = (por_seccion[seccion] ?? 0) + 1;
    }
    return { total: acciones.length, por_seccion };
  }
}
