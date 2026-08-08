import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "../../../../prisma/generated/client/client";
import { PrismaService } from "../../../comun/prisma.service";
import { permisosDeRoles } from "../../domain/entities/permisos";
import type { ContextoUsuario } from "../../domain/entities/tipos";

/** Selección única compartida por login, refresh y validación de cada petición. */
const SELECCION_USUARIO = {
  id_usuarios: true,
  fid_organizaciones: true,
  usuario: true,
  estado: true,
  estado_cuenta: true,
  persona: {
    select: {
      nombres: true,
      apellido_paterno: true,
      apellido_materno: true,
      foto_url: true,
      correos: {
        where: { estado: 1 },
        orderBy: { created_at: "asc" },
        select: {
          id_personas_correos: true,
          correo: true,
          verificado_en: true,
          usos: {
            where: { estado: 1 },
            orderBy: { tipo: "asc" },
            select: { tipo: true },
          },
        },
      },
    },
  },
  organizacion: {
    select: {
      slug: true,
      nombre: true,
      estado: true,
      eliminado_en: true,
      suscripcion_inicia_en: true,
      suscripcion_expira_en: true,
      perfil: { select: { fid_admin_level_0: true, zona_horaria_por_defecto: true } },
      plan: {
        select: {
          codigo: true,
          nombre: true,
          planes_modulos: {
            where: { estado: 1, modulo: { estado: 1 } },
            select: { 
              fid_modulos: true,
              modulo: { select: { codigo: true } }
            }
          }
        }
      }
    },
  },
  preferencias_usuario: {
    select: {
      tema: true,
      idioma: true,
      menu_colapsado: true,
      fid_admin_level_0: true,
      fid_zonas_horarias: true,
      zona_horaria: {
        select: {
          nombre_iana: true,
        },
      },
      estado: true,
    },
  },
  usuario_mfa: {
    where: { tipo: "totp", estado: 1 },
    select: { habilitado: true },
    take: 1,
  },
  acciones_requeridas: {
    where: { estado: 1, accion_maestro: { estado: 1 } },
    select: {
      accion_maestro: { select: { seccion: true } },
    },
  },
  usuarios_roles: {
    where: { estado: 1, rol: { estado: 1 } },
    select: {
      rol: {
        select: {
          codigo: true,
          nombre: true,
          roles_permisos: {
            where: { estado: 1, permiso: { estado: 1 } },
            select: {
              permiso: {
                select: {
                  codigo: true,
                  fid_modulos: true
                }
              }
            },
          },
        },
      },
    },
  },
} satisfies Prisma.usuariosSelect;

type UsuarioSeleccionado = Prisma.usuariosGetPayload<{
  select: typeof SELECCION_USUARIO;
}>;

type ClientePrisma = PrismaService | Prisma.TransactionClient;

function permisosDeRolesConModulos(
  usuarios_roles: {
    rol: {
      roles_permisos: {
        permiso: { codigo: string; fid_modulos: string };
      }[];
    };
  }[],
): { codigo: string; fid_modulos: string }[] {
  const map = new Map<string, { codigo: string; fid_modulos: string }>();
  for (const usuarioRol of usuarios_roles) {
    for (const rolPermiso of usuarioRol.rol.roles_permisos) {
      map.set(rolPermiso.permiso.codigo, rolPermiso.permiso);
    }
  }
  return [...map.values()];
}

function filtrarPermisosPorPlan(
  permisos: { codigo: string; fid_modulos: string }[],
  modulosPlanIds: string[],
  esSuperadmin: boolean,
): string[] {
  if (esSuperadmin) return permisos.map((p) => p.codigo);
  return permisos
    .filter((p) => modulosPlanIds.includes(p.fid_modulos))
    .map((p) => p.codigo);
}

@Injectable()
export class FuenteDatosContextoUsuarioPrisma {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /** Convierte el modelo interno en el contrato seguro que viaja al frontend. */
  private construir(usuario: UsuarioSeleccionado): ContextoUsuario | null {
    if (
      usuario.estado !== 1 ||
      usuario.estado_cuenta !== "activo" ||
      usuario.organizacion.estado !== 1 ||
      usuario.organizacion.eliminado_en !== null
    ) {
      return null;
    }

    const esSuperadmin = usuario.usuarios_roles.some(({ rol }) => rol.codigo === "SUPERADMIN");
    if (!esSuperadmin) {
      if (!usuario.organizacion.suscripcion_expira_en) {
        throw new ForbiddenException("auth.subscriptionExpired");
      }
      const expira = new Date(usuario.organizacion.suscripcion_expira_en);
      if (new Date() > expira) {
        throw new ForbiddenException("auth.subscriptionExpired");
      }
    }

    const preferencias =
      usuario.preferencias_usuario?.estado === 1
        ? usuario.preferencias_usuario
        : null;
    const accionesPorSeccion: Record<string, number> = {};
    for (const accion of usuario.acciones_requeridas) {
      const seccion = accion.accion_maestro.seccion;
      accionesPorSeccion[seccion] = (accionesPorSeccion[seccion] ?? 0) + 1;
    }
    return {
      id_usuarios: usuario.id_usuarios,
      fid_organizaciones: usuario.fid_organizaciones,
      usuario: usuario.usuario,
      correos: usuario.persona.correos.map((correo) => ({
        id_personas_correos: correo.id_personas_correos,
        correo: correo.correo,
        usos: correo.usos.map((uso) => uso.tipo),
        verificado: correo.verificado_en !== null,
      })),
      persona: {
        nombres: usuario.persona.nombres,
        apellido_paterno: usuario.persona.apellido_paterno,
        apellido_materno: usuario.persona.apellido_materno,
      },
      avatar: {
        disponible: Boolean(usuario.persona.foto_url),
        version: usuario.persona.foto_url?.split("/").at(-1) ?? null,
      },
      organizacion: {
        slug: usuario.organizacion.slug,
        nombre: usuario.organizacion.nombre,
        plan: usuario.organizacion.plan ? {
          codigo: usuario.organizacion.plan.codigo,
          nombre: usuario.organizacion.plan.nombre
        } : { codigo: "FULL", nombre: "Plan Completo" }
      },
      roles: usuario.usuarios_roles.map(({ rol }) => ({
        codigo: rol.codigo,
        nombre: rol.nombre,
      })),
      permisos: filtrarPermisosPorPlan(
        permisosDeRolesConModulos(usuario.usuarios_roles),
        usuario.organizacion.plan?.planes_modulos.map((pm) => pm.fid_modulos) ?? [],
        usuario.usuarios_roles.some(({ rol }) => rol.codigo === "SUPERADMIN")
      ),
      preferencias: {
        tema: preferencias?.tema ?? null,
        idioma: preferencias?.idioma ?? "es",
        menu_colapsado: preferencias?.menu_colapsado ?? false,
        fid_admin_level_0: preferencias?.fid_admin_level_0 ?? usuario.organizacion.perfil?.fid_admin_level_0 ?? null,
        fid_zonas_horarias: preferencias?.fid_zonas_horarias ?? null,
        zona_horaria: preferencias?.zona_horaria?.nombre_iana ?? usuario.organizacion.perfil?.zona_horaria_por_defecto ?? "America/Lima",
      },
      seguridad: {
        segundo_factor_habilitado: usuario.usuario_mfa[0]?.habilitado ?? false,
      },
      acciones_requeridas: {
        total: usuario.acciones_requeridas.length,
        por_seccion: accionesPorSeccion,
      },
    };
  }

  async obtenerPorUsuario(
    id_usuarios: string,
    cliente: ClientePrisma = this.prisma,
  ): Promise<ContextoUsuario | null> {
    const usuario = await cliente.usuarios.findUnique({
      where: { id_usuarios },
      select: SELECCION_USUARIO,
    });
    return usuario ? this.construir(usuario) : null;
  }

  /** Una consulta valida sesión, dispositivo, cuenta, tenant y autorización vigente. */
  async obtenerPorSesion(
    id_sesiones: string,
    generacion: number,
  ): Promise<{
    contexto: ContextoUsuario;
    revocada: boolean;
  } | null> {
    const minutosInactividad = Number(
      this.config.getOrThrow("SESSION_IDLE_TTL_MINUTES"),
    );

    return this.prisma.$transaction(async (tx) => {
      // Una petición autenticada cuenta como actividad. El UPDATE valida y renueva
      // en una sola operación usando exclusivamente CURRENT_TIMESTAMP de PostgreSQL.
      const [actividad] = await tx.$queryRaw<{ id_sesiones: string }[]>`
        UPDATE seguridad.sesiones
        SET
          ultimo_uso_en = CURRENT_TIMESTAMP,
          expira_inactividad_en = LEAST(
            CURRENT_TIMESTAMP + (${minutosInactividad} * INTERVAL '1 minute'),
            expira_absoluta_en,
            expira_en
          )
        WHERE id_sesiones = ${id_sesiones}::uuid
          AND generacion = ${generacion}
          AND estado = 1
          AND revocada_en IS NULL
          AND expira_en > CURRENT_TIMESTAMP
          AND expira_inactividad_en > CURRENT_TIMESTAMP
          AND expira_absoluta_en > CURRENT_TIMESTAMP
        RETURNING id_sesiones
      `;
      if (!actividad) return null;

      const sesion = await tx.sesiones.findUnique({
        where: { id_sesiones },
        select: {
          estado: true,
          revocada_en: true,
          dispositivo: {
            select: {
              estado: true,
              usuario: { select: SELECCION_USUARIO },
            },
          },
        },
      });
      if (!sesion || sesion.estado !== 1 || sesion.dispositivo.estado !== 1) {
        return null;
      }
      const contexto = this.construir(sesion.dispositivo.usuario);
      if (!contexto) return null;
      return { contexto, revocada: sesion.revocada_en !== null };
    });
  }
}
