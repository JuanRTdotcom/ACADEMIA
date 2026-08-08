import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service";
import { AlmacenAvatarR2 } from "../../../perfil/data/datasources/avatar/avatar-r2.datasource";
import { ServicioEventosSesion } from "../../../comun/eventos-sesion/servicio-eventos-sesion";
import { ServicioAccionesRequeridas } from "../../../comun/acciones-requeridas/servicio-acciones-requeridas";
import type { AvatarPerfil } from "../../../perfil/domain/entities/avatar-perfil";
import type { DatosUsuario, OpcionesUsuario, UsuarioListado } from "../../domain/entities/usuario";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosUsuariosPrisma {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: ServicioAuditoria,
    private readonly avatares: AlmacenAvatarR2,
    private readonly eventosSesion: ServicioEventosSesion,
    private readonly accionesRequeridas: ServicioAccionesRequeridas,
  ) {}

  private async validarActor(tx: Tx, idActor: string): Promise<void> {
    const actor = await tx.usuarios.findFirst({
      where: { id_usuarios: idActor, estado: 1, estado_cuenta: "activo", eliminado_en: null, organizacion: { estado: 1, eliminado_en: null } },
      select: { id_usuarios: true },
    });
    if (!actor) throw new NotFoundException("users.unavailable");
  }

  /** La empresa pertenece al usuario; los roles son globales del sistema. */
  private async validarEmpresaYRoles(tx: Tx, empresa: string, roles: string[]): Promise<void> {
    const organizacion = await tx.organizaciones.findFirst({ where: { id_organizaciones: empresa, estado: 1, eliminado_en: null }, select: { id_organizaciones: true } });
    if (!organizacion) throw new BadRequestException("users.companyUnavailable");
    if (roles.length === 0) throw new BadRequestException("users.rolesRequired");
    const encontrados = await tx.roles.findMany({ where: { id_roles: { in: roles }, estado: 1, eliminado_en: null }, select: { id_roles: true } });
    if (encontrados.length !== roles.length) throw new BadRequestException("users.invalidRoles");
  }

  private conflicto(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const modelo = typeof error.meta?.modelName === "string" ? error.meta.modelName : "";
      if (modelo === "usuarios") throw new ConflictException("users.duplicateUsername");
      if (modelo === "personas_correos") throw new ConflictException("users.duplicateEmail");
      throw new ConflictException("users.duplicate");
    }
    throw error;
  }

  async listar(busqueda: string): Promise<{ usuarios: UsuarioListado[]; total: number }> {
    const term = busqueda.trim();
    const where: Prisma.usuariosWhereInput = {
      eliminado_en: null,
      ...(term ? { OR: [
        { usuario: { contains: term, mode: "insensitive" } },
        { persona: { nombres: { contains: term, mode: "insensitive" } } },
        { persona: { apellido_paterno: { contains: term, mode: "insensitive" } } },
        { persona: { apellido_materno: { contains: term, mode: "insensitive" } } },
        { organizacion: { nombre: { contains: term, mode: "insensitive" } } },
        { usuarios_roles: { some: { estado: 1, rol: { estado: 1, eliminado_en: null, OR: [{ nombre: { contains: term, mode: "insensitive" } }, { codigo: { contains: term, mode: "insensitive" } }] } } } },
      ] } : {}),
    };
    const usuarios = await this.prisma.usuarios.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id_usuarios: "desc" }],
      select: {
        id_usuarios: true, fid_organizaciones: true, usuario: true, estado: true, estado_cuenta: true, created_at: true,
        persona: { select: { nombres: true, apellido_paterno: true, apellido_materno: true, foto_url: true, correos: { where: { estado: 1 }, orderBy: { created_at: "asc" }, take: 1, select: { correo: true } } } },
        organizacion: { select: { nombre: true, slug: true } },
        usuarios_roles: { where: { estado: 1, rol: { estado: 1, eliminado_en: null } }, select: { rol: { select: { id_roles: true, nombre: true, codigo: true, icono: true } } } },
      },
    });
    return {
      usuarios: usuarios.map((item) => ({
        id_usuarios: item.id_usuarios, fid_organizaciones: item.fid_organizaciones, usuario: item.usuario,
        nombres: item.persona.nombres, apellido_paterno: item.persona.apellido_paterno, apellido_materno: item.persona.apellido_materno,
        correo: item.persona.correos[0]?.correo ?? null, foto_version: item.persona.foto_url?.split("/").at(-1) ?? null, estado: item.estado, estado_cuenta: item.estado_cuenta, created_at: item.created_at,
        empresa: item.organizacion, roles: item.usuarios_roles.map(({ rol }) => rol),
      })), total: usuarios.length,
    };
  }

  async obtener(id: string, idActor: string): Promise<UsuarioListado> {
    await this.validarActor(this.prisma, idActor);
    const item = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id },
      select: {
        id_usuarios: true, fid_organizaciones: true, usuario: true, estado: true, estado_cuenta: true, created_at: true, eliminado_en: true,
        persona: { select: { nombres: true, apellido_paterno: true, apellido_materno: true, foto_url: true, correos: { where: { estado: 1, usos: { some: { tipo: "principal", estado: 1 } } }, take: 1, select: { correo: true } } } },
        organizacion: { select: { nombre: true, slug: true, estado: true, eliminado_en: true } },
        usuarios_roles: { where: { estado: 1, rol: { estado: 1, eliminado_en: null } }, select: { rol: { select: { id_roles: true, nombre: true, codigo: true, icono: true } } } },
      },
    });
    if (!item || item.eliminado_en) throw new NotFoundException("users.notFound");
    if (item.estado !== 1 || item.estado_cuenta !== "activo") throw new BadRequestException("users.inactiveCannotEdit");
    if (item.organizacion.estado !== 1 || item.organizacion.eliminado_en) throw new BadRequestException("users.companyUnavailable");
    return {
      id_usuarios: item.id_usuarios, fid_organizaciones: item.fid_organizaciones, usuario: item.usuario,
      nombres: item.persona.nombres, apellido_paterno: item.persona.apellido_paterno, apellido_materno: item.persona.apellido_materno,
      correo: item.persona.correos[0]?.correo ?? null, foto_version: item.persona.foto_url?.split("/").at(-1) ?? null,
      estado: item.estado, estado_cuenta: item.estado_cuenta, created_at: item.created_at,
      empresa: { nombre: item.organizacion.nombre, slug: item.organizacion.slug },
      roles: item.usuarios_roles.map(({ rol }) => rol),
    };
  }

  /** Avatar privado: el backend lee la clave R2; nunca expone credenciales ni bucket. */
  async obtenerAvatar(id: string, idActor: string): Promise<AvatarPerfil> {
    const actor = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: idActor, estado: 1, estado_cuenta: "activo", eliminado_en: null },
      select: {
        fid_organizaciones: true,
        usuarios_roles: {
          where: { estado: 1, rol: { estado: 1, eliminado_en: null } },
          select: { rol: { select: { codigo: true } } }
        }
      }
    });
    if (!actor) throw new NotFoundException("users.unavailable");
    const esSuperadmin = actor.usuarios_roles.some(({ rol }) => rol.codigo === "SUPERADMIN");

    const usuario = await this.prisma.usuarios.findFirst({
      where: { id_usuarios: id, eliminado_en: null, persona: { estado: 1 } },
      select: {
        fid_organizaciones: true,
        persona: { select: { foto_url: true } }
      },
    });
    if (!usuario) throw new NotFoundException("profile.avatar.notFound");

    // Si no es superadmin, exigir que pertenezca a la misma organización
    if (!esSuperadmin && usuario.fid_organizaciones !== actor.fid_organizaciones) {
      throw new NotFoundException("profile.avatar.notFound");
    }

    if (!usuario.persona.foto_url) throw new NotFoundException("profile.avatar.notFound");
    return this.avatares.leer(usuario.persona.foto_url);
  }

  async opciones(): Promise<OpcionesUsuario> {
    const [empresas, roles] = await Promise.all([
      this.prisma.organizaciones.findMany({
        where: { estado: 1, eliminado_en: null },
        orderBy: { nombre: "asc" },
        select: {
          id_organizaciones: true,
          nombre: true,
          slug: true,
        },
      }),
      this.prisma.roles.findMany({ where: { estado: 1, eliminado_en: null }, orderBy: [{ nombre: "asc" }], select: { id_roles: true, nombre: true, codigo: true, icono: true } }),
    ]);
    return {
      empresas: empresas.map(({ id_organizaciones, nombre, slug }) => ({
        id_organizaciones,
        nombre,
        slug,
      })),
      roles,
    };
  }

  async crear(datos: DatosUsuario, idActor: string, contexto: ContextoSolicitud): Promise<void> {
    const hash = await argon2.hash(datos.contrasenia_temporal, { type: argon2.argon2id });
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarActor(tx, idActor);
        await this.validarEmpresaYRoles(tx, datos.fid_organizaciones, datos.fid_roles);
        const existente = await tx.usuarios.findFirst({ where: { fid_organizaciones: datos.fid_organizaciones, usuario: datos.usuario, eliminado_en: null }, select: { id_usuarios: true } });
        if (existente) throw new ConflictException("users.duplicateUsername");
        const correoUsado = await tx.personas_correos.findFirst({ where: { fid_organizaciones: datos.fid_organizaciones, correo: { equals: datos.correo, mode: "insensitive" }, estado: 1 }, select: { id_personas_correos: true } });
        if (correoUsado) throw new ConflictException("users.duplicateEmail");
        const persona = await tx.personas.create({ data: { fid_organizaciones: datos.fid_organizaciones, nombres: datos.nombres, apellido_paterno: datos.apellido_paterno, apellido_materno: datos.apellido_materno || null, created_by: idActor, updated_by: idActor }, select: { id_personas: true } });
        const usuario = await tx.usuarios.create({ data: { fid_personas: persona.id_personas, fid_organizaciones: datos.fid_organizaciones, usuario: datos.usuario, created_by: idActor, updated_by: idActor }, select: { id_usuarios: true } });
        const perfilOrg = await tx.perfil_organizacion.findFirst({ where: { fid_organizaciones: datos.fid_organizaciones }, select: { fid_admin_level_0: true } });
        const zonaHorariaDefecto = await tx.zonas_horarias.findFirst({ where: { nombre_iana: "America/Lima", estado: 1 }, select: { id_zonas_horarias: true } });
        await tx.preferencias_usuario.create({ data: { fid_usuarios: usuario.id_usuarios, fid_admin_level_0: perfilOrg?.fid_admin_level_0 ?? null, fid_zonas_horarias: zonaHorariaDefecto?.id_zonas_horarias ?? null, idioma: "es", tema: "system", created_by: idActor, updated_by: idActor } });
        const correo = await tx.personas_correos.create({ data: { fid_personas: persona.id_personas, fid_organizaciones: datos.fid_organizaciones, correo: datos.correo, verificado_en: new Date(), created_by: idActor, updated_by: idActor }, select: { id_personas_correos: true } });
        await tx.personas_correos_usos.create({ data: { fid_personas: persona.id_personas, fid_personas_correos: correo.id_personas_correos, tipo: "principal", created_by: idActor, updated_by: idActor } });
        await tx.credenciales.create({ data: { fid_usuarios: usuario.id_usuarios, tipo: "contrasenia", hash_contrasenia: hash, created_by: idActor, updated_by: idActor } });
        await tx.usuarios_roles.createMany({ data: datos.fid_roles.map((fid_roles) => ({ fid_usuarios: usuario.id_usuarios, fid_roles, created_by: idActor, updated_by: idActor })) });
        await this.accionesRequeridas.crearCambioContraseniaRequerido(tx, usuario.id_usuarios, datos.fid_organizaciones);
        await this.auditoria.registrar({ accion: "usuarios.creado", entidad: "usuarios", id_entidad: usuario.id_usuarios, fid_organizaciones: datos.fid_organizaciones, fid_usuarios: idActor, peticion: contexto, metadatos: { usuario: datos.usuario, roles: datos.fid_roles, correo: datos.correo } }, tx);
      });
    } catch (error) { this.conflicto(error); }
  }

  private async revocarSesiones(tx: Tx, idUsuario: string, idActor: string): Promise<void> {
    await tx.$executeRaw`UPDATE seguridad.sesiones AS s SET revocada_en = CURRENT_TIMESTAMP, updated_by = ${idActor} WHERE s.fid_dispositivos IN (SELECT id_dispositivos FROM seguridad.dispositivos WHERE fid_usuarios = ${idUsuario}::uuid) AND s.estado = 1 AND s.revocada_en IS NULL`;
    this.eventosSesion.emitir({ fid_usuarios: idUsuario, tipo: "session_revoked" });
  }

  async actualizar(id: string, datos: Omit<DatosUsuario, "contrasenia_temporal">, idActor: string, contexto: ContextoSolicitud): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.validarActor(tx, idActor);
        await tx.$queryRaw`SELECT id_usuarios FROM seguridad.usuarios WHERE id_usuarios = ${id}::uuid FOR UPDATE`;
        const actual = await tx.usuarios.findFirst({ where: { id_usuarios: id }, select: { id_usuarios: true, fid_personas: true, fid_organizaciones: true, usuario: true, estado: true, estado_cuenta: true, eliminado_en: true } });
        if (!actual) throw new NotFoundException("users.notFound");
        if (actual.eliminado_en) throw new ConflictException("users.alreadyDeleted");
        if (actual.estado !== 1 || actual.estado_cuenta !== "activo") throw new BadRequestException("users.inactiveCannotEdit");
        // Cambiar de empresa una persona ya creada arrastraría perfiles, correos y
        // referencias. Se crea en la empresa correcta; la migración será un caso
        // administrativo explícito, no una edición silenciosa.
        if (actual.fid_organizaciones !== datos.fid_organizaciones) {
          throw new BadRequestException("users.companyImmutable");
        }
        await this.validarEmpresaYRoles(tx, datos.fid_organizaciones, datos.fid_roles);
        const duplicado = await tx.usuarios.findFirst({ where: { id_usuarios: { not: id }, fid_organizaciones: datos.fid_organizaciones, usuario: datos.usuario, eliminado_en: null }, select: { id_usuarios: true } });
        if (duplicado) throw new ConflictException("users.duplicateUsername");
        const principal = await tx.personas_correos_usos.findUnique({ where: { fid_personas_tipo: { fid_personas: actual.fid_personas, tipo: "principal" } }, select: { id_personas_correos_usos: true, fid_personas_correos: true } });
        const correoUsado = await tx.personas_correos.findFirst({ where: { fid_organizaciones: datos.fid_organizaciones, correo: { equals: datos.correo, mode: "insensitive" }, estado: 1, ...(principal ? { id_personas_correos: { not: principal.fid_personas_correos } } : {}) }, select: { id_personas_correos: true } });
        if (correoUsado) throw new ConflictException("users.duplicateEmail");
        await tx.personas.update({ where: { id_personas: actual.fid_personas }, data: { fid_organizaciones: datos.fid_organizaciones, nombres: datos.nombres, apellido_paterno: datos.apellido_paterno, apellido_materno: datos.apellido_materno || null, updated_by: idActor } });
        await tx.usuarios.update({ where: { id_usuarios: id }, data: { fid_organizaciones: datos.fid_organizaciones, usuario: datos.usuario, updated_by: idActor } });
        if (principal) {
          // Si el uso principal existía pero estaba inactivo, la edición lo
          // recupera de forma coherente dentro de la misma transacción.
          await tx.personas_correos.update({ where: { id_personas_correos: principal.fid_personas_correos }, data: { fid_organizaciones: datos.fid_organizaciones, correo: datos.correo, estado: 1, updated_by: idActor } });
          await tx.personas_correos_usos.update({ where: { id_personas_correos_usos: principal.id_personas_correos_usos }, data: { estado: 1, updated_by: idActor } });
        }
        else {
          const correo = await tx.personas_correos.create({ data: { fid_personas: actual.fid_personas, fid_organizaciones: datos.fid_organizaciones, correo: datos.correo, created_by: idActor, updated_by: idActor } });
          await tx.personas_correos_usos.create({ data: { fid_personas: actual.fid_personas, fid_personas_correos: correo.id_personas_correos, tipo: "principal", created_by: idActor, updated_by: idActor } });
        }
        await tx.usuarios_roles.updateMany({ where: { fid_usuarios: id, estado: 1 }, data: { estado: 0, updated_by: idActor } });
        for (const rol of datos.fid_roles) await tx.usuarios_roles.upsert({ where: { fid_usuarios_fid_roles: { fid_usuarios: id, fid_roles: rol } }, update: { estado: 1, updated_by: idActor }, create: { fid_usuarios: id, fid_roles: rol, created_by: idActor, updated_by: idActor } });
        await this.revocarSesiones(tx, id, idActor);
        await this.auditoria.registrar({ accion: "usuarios.modificado", entidad: "usuarios", id_entidad: id, fid_organizaciones: datos.fid_organizaciones, fid_usuarios: idActor, peticion: contexto, metadatos: { usuario: datos.usuario, roles: datos.fid_roles } }, tx);
      });
    } catch (error) { this.conflicto(error); }
  }

  async cambiarEstado(id: string, activo: boolean, idActor: string, contexto: ContextoSolicitud): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, idActor);
      await tx.$queryRaw`SELECT id_usuarios FROM seguridad.usuarios WHERE id_usuarios = ${id}::uuid FOR UPDATE`;
      const usuario = await tx.usuarios.findFirst({ where: { id_usuarios: id }, select: { fid_organizaciones: true, usuario: true, estado: true, eliminado_en: true } });
      if (!usuario) throw new NotFoundException("users.notFound");
      if (usuario.eliminado_en) throw new ConflictException("users.alreadyDeleted");
      const estado = activo ? 1 : 0;
      if (usuario.estado === estado) throw new BadRequestException("users.noChanges");
      await tx.usuarios.update({ where: { id_usuarios: id }, data: { estado, updated_by: idActor } });
      await this.revocarSesiones(tx, id, idActor);
      await this.auditoria.registrar({ accion: activo ? "usuarios.activado" : "usuarios.desactivado", entidad: "usuarios", id_entidad: id, fid_organizaciones: usuario.fid_organizaciones, fid_usuarios: idActor, peticion: contexto, metadatos: { usuario: usuario.usuario } }, tx);
    });
  }

  async reiniciarContrasenia(id: string, contraseniaNueva: string, idActor: string, contexto: ContextoSolicitud): Promise<void> {
    const hash = await argon2.hash(contraseniaNueva, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, idActor);
      await tx.$queryRaw`SELECT id_usuarios FROM seguridad.usuarios WHERE id_usuarios = ${id}::uuid FOR UPDATE`;
      const usuario = await tx.usuarios.findFirst({ where: { id_usuarios: id }, select: { fid_organizaciones: true, usuario: true, estado: true, estado_cuenta: true, eliminado_en: true } });
      if (!usuario) throw new NotFoundException("users.notFound");
      if (usuario.eliminado_en) throw new ConflictException("users.alreadyDeleted");
      if (usuario.estado !== 1 || usuario.estado_cuenta !== "activo") throw new BadRequestException("users.inactiveCannotEdit");

      await tx.credenciales.updateMany({
        where: { fid_usuarios: id, tipo: "contrasenia", estado: 1 },
        data: { hash_contrasenia: hash, created_by: idActor, updated_by: idActor },
      });

      await this.revocarSesiones(tx, id, idActor);
      await this.accionesRequeridas.crearCambioContraseniaRequerido(tx, id, usuario.fid_organizaciones);
      await this.auditoria.registrar({ accion: "usuarios.contrasenia.reiniciada", entidad: "usuarios", id_entidad: id, fid_organizaciones: usuario.fid_organizaciones, fid_usuarios: idActor, peticion: contexto, metadatos: { usuario: usuario.usuario } }, tx);
    });
  }

  async eliminar(id: string, idActor: string, contexto: ContextoSolicitud): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, idActor);
      await tx.$queryRaw`SELECT id_usuarios FROM seguridad.usuarios WHERE id_usuarios = ${id}::uuid FOR UPDATE`;
      const usuario = await tx.usuarios.findFirst({ where: { id_usuarios: id }, select: { fid_personas: true, fid_organizaciones: true, usuario: true, eliminado_en: true } });
      if (!usuario) throw new NotFoundException("users.notFound");
      if (usuario.eliminado_en) throw new ConflictException("users.alreadyDeleted");
      await tx.$executeRaw`UPDATE seguridad.usuarios SET estado = 0, eliminado_en = CURRENT_TIMESTAMP, eliminado_por = ${idActor}::uuid, updated_at = CURRENT_TIMESTAMP, updated_by = ${idActor} WHERE id_usuarios = ${id}::uuid`;
      await tx.personas_correos.updateMany({ where: { fid_personas: usuario.fid_personas, estado: 1 }, data: { estado: 0, updated_by: idActor } });
      await tx.usuarios_roles.updateMany({ where: { fid_usuarios: id, estado: 1 }, data: { estado: 0, updated_by: idActor } });
      await this.revocarSesiones(tx, id, idActor);
      await this.auditoria.registrar({ accion: "usuarios.eliminado", entidad: "usuarios", id_entidad: id, fid_organizaciones: usuario.fid_organizaciones, fid_usuarios: idActor, peticion: contexto, metadatos: { usuario: usuario.usuario } }, tx);
    });
  }

  async listarDeEmpresa(empresaId: string, busqueda: string): Promise<{ usuarios: UsuarioListado[]; total: number }> {
    const term = busqueda.trim();
    const where: Prisma.usuariosWhereInput = {
      eliminado_en: null,
      fid_organizaciones: empresaId,
      ...(term ? { OR: [
        { usuario: { contains: term, mode: "insensitive" } },
        { persona: { nombres: { contains: term, mode: "insensitive" } } },
        { persona: { apellido_paterno: { contains: term, mode: "insensitive" } } },
        { persona: { apellido_materno: { contains: term, mode: "insensitive" } } },
        { usuarios_roles: { some: { estado: 1, rol: { estado: 1, eliminado_en: null, OR: [{ nombre: { contains: term, mode: "insensitive" } }, { codigo: { contains: term, mode: "insensitive" } }] } } } },
      ] } : {}),
    };
    const usuarios = await this.prisma.usuarios.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id_usuarios: "desc" }],
      select: {
        id_usuarios: true, fid_organizaciones: true, usuario: true, estado: true, estado_cuenta: true, created_at: true,
        persona: { select: { nombres: true, apellido_paterno: true, apellido_materno: true, foto_url: true, correos: { where: { estado: 1 }, orderBy: { created_at: "asc" }, take: 1, select: { correo: true } } } },
        organizacion: { select: { nombre: true, slug: true } },
        usuarios_roles: { where: { estado: 1, rol: { estado: 1, eliminado_en: null } }, select: { rol: { select: { id_roles: true, nombre: true, codigo: true, icono: true } } } },
      },
    });
    return {
      usuarios: usuarios.map((item) => ({
        id_usuarios: item.id_usuarios, fid_organizaciones: item.fid_organizaciones, usuario: item.usuario,
        nombres: item.persona.nombres, apellido_paterno: item.persona.apellido_paterno, apellido_materno: item.persona.apellido_materno,
        correo: item.persona.correos[0]?.correo ?? null, foto_version: item.persona.foto_url?.split("/").at(-1) ?? null, estado: item.estado, estado_cuenta: item.estado_cuenta, created_at: item.created_at,
        empresa: item.organizacion, roles: item.usuarios_roles.map(({ rol }) => rol),
      })), total: usuarios.length,
    };
  }

  async opcionesDeEmpresa(): Promise<OpcionesUsuario> {
    const roles = await this.prisma.roles.findMany({
      where: { estado: 1, eliminado_en: null, NOT: { codigo: "SUPERADMIN" } },
      orderBy: [{ nombre: "asc" }],
      select: { id_roles: true, nombre: true, codigo: true, icono: true },
    });
    return {
      empresas: [],
      roles,
    };
  }
}
