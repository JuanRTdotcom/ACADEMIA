import { Injectable, NotFoundException } from "@nestjs/common"; // NestJS: provider y error 404
import { ConfigService } from "@nestjs/config"; // NestJS: lee variables de entorno / config
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import { PrismaService } from "../../../comun/prisma.service"; // ORM: cliente de base de datos
import { resolverSubdomain } from "../../../comun/inquilinos/resolver-host";
import type { InquilinoPublico } from "../../domain/entities/inquilino";
import { CasoUsoLeerObjeto } from "../../../storage/domain/usecases/read-object";

const versionDesde = (clave: string | null | undefined) =>
  clave?.split("/").at(-1) ?? null;
const colorValido = (valor: string | null | undefined) =>
  valor && /^#[0-9A-Fa-f]{6}$/.test(valor) ? valor : null;

@Injectable()
export class FuenteDatosInquilinosPrisma {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private leerObjeto: CasoUsoLeerObjeto,
  ) {}

  /** Slug del tenant a partir del host reenviado por el proxy (o el Host directo). */
  private resolverSlug(peticion: ContextoSolicitud): string | undefined {
    const reenviado = peticion.host_reenviado ?? peticion.host ?? "";
    const base = this.config.getOrThrow<string>("APP_BASE_DOMAIN");
    return resolverSubdomain(reenviado, base);
  }

  /**
   * Resuelve y valida el tenant del host. Existencia de organización NO es secreta
   * (estándar SaaS multi-tenant): un subdomain sin organización activa devuelve 404.
   * La enumeración de USUARIOS sigue protegida por el 401 uniforme del login.
   */
  async actual(peticion: ContextoSolicitud): Promise<InquilinoPublico> {
    const slug = this.resolverSlug(peticion);
    if (!slug) throw new NotFoundException("tenant.notFound");

    const organizacion = await this.prisma.organizaciones.findFirst({
      where: { slug, estado: 1, eliminado_en: null },
      select: {
        id_organizaciones: true,
        estado: true,
        slug: true,
        nombre: true,
        perfil: { include: { idioma: { select: { codigo: true } } } },
        sedes: {
          where: { es_principal: true, estado: 1, eliminado_en: null },
          take: 1,
          select: {
            idioma: { select: { codigo: true } },
            color_primario: true,
            escudo_url: true,
            escudo_oscuro_url: true,
            escudo_misma_imagen: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            imagotipo_misma_imagen: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
            login_escudo_misma_imagen: true,
            ui_cabecera_claro: true,
            ui_cabecera_oscuro: true,
            ui_esquinero_claro: true,
            ui_esquinero_oscuro: true,
            ui_menu_claro: true,
            ui_menu_oscuro: true,
            ui_mostrar_escudo_menu: true,
            ui_mostrar_nombre_empresa_menu: true,
            ui_ocultar_esquinero_expandido: true,
            ui_esquinero_fondo_activo: true,
            ui_cabecera_ocultar_borde: true,
            ui_menu_ocultar_borde: true,
            ui_tamano_escudo_menu: true,
            login_usar_filtro_color: true,
            login_mostrar_etiqueta: true,
            login_mostrar_destacados: true,
            login_mostrar_comunidad: true,
            login_etiqueta: true,
            login_titulo: true,
            login_subtitulo: true,
            login_destacado_1: true,
            login_destacado_2: true,
            login_destacado_3: true,
            login_destacado_icono_1: true,
            login_destacado_icono_2: true,
            login_destacado_icono_3: true,
            login_texto_comunidad: true,
            imagenes_login: {
              where: { estado: 1 },
              orderBy: [{ orden: "asc" }, { created_at: "asc" }],
              select: {
                id_imagenes_login_sede: true,
                clave_objeto: true,
                texto_alternativo: true,
              },
            },
          },
        },
        imagenes_login: {
          where: { estado: 1 },
          orderBy: [{ orden: "asc" }, { created_at: "asc" }],
          select: {
            id_imagenes_login_organizacion: true,
            clave_objeto: true,
            texto_alternativo: true,
          },
        },
      },
    });
    if (!organizacion || organizacion.estado !== 1) {
      throw new NotFoundException("tenant.notFound");
    }

    const sedePrincipal = organizacion.sedes[0] ?? null;
    const p =
      sedePrincipal ??
      (organizacion.perfil?.estado === 1 ? organizacion.perfil : null);
    const portadas = sedePrincipal
      ? sedePrincipal.imagenes_login.map((imagen) => ({
          id: imagen.id_imagenes_login_sede,
          version: versionDesde(imagen.clave_objeto)!,
          texto_alternativo: imagen.texto_alternativo ?? "",
        }))
      : organizacion.imagenes_login.map((imagen) => ({
          id: imagen.id_imagenes_login_organizacion,
          version: versionDesde(imagen.clave_objeto)!,
          texto_alternativo: imagen.texto_alternativo ?? "",
        }));
    return {
      slug: organizacion.slug,
      nombre: organizacion.nombre,
      // Configuración pública necesaria para que el primer HTML del tenant ya
      // salga en su idioma, antes de que exista una sesión o preferencia personal.
      region: {
        idioma_por_defecto: p?.idioma.codigo === "en" ? "en" : "es",
      },
      marca: {
        color_primario: colorValido(p?.color_primario),
        escudo_version: versionDesde(p?.escudo_url),
        escudo_oscuro_version: versionDesde(p?.escudo_oscuro_url),
        escudo_misma_imagen: p?.escudo_misma_imagen ?? true,
        imagotipo_version: versionDesde(p?.imagotipo_url),
        imagotipo_oscuro_version: versionDesde(p?.imagotipo_oscuro_url),
        imagotipo_misma_imagen: p?.imagotipo_misma_imagen ?? true,
        login_escudo_version: versionDesde(p?.login_escudo_url),
        login_escudo_oscuro_version: versionDesde(p?.login_escudo_oscuro_url),
        login_escudo_misma_imagen: p?.login_escudo_misma_imagen ?? true,
        portadas,
      },
      interfaz: {
        cabecera_claro: colorValido(p?.ui_cabecera_claro),
        cabecera_oscuro: colorValido(p?.ui_cabecera_oscuro),
        esquinero_claro: colorValido(p?.ui_esquinero_claro),
        esquinero_oscuro: colorValido(p?.ui_esquinero_oscuro),
        menu_claro: colorValido(p?.ui_menu_claro),
        menu_oscuro: colorValido(p?.ui_menu_oscuro),
        mostrar_escudo_menu:
          (p?.ui_mostrar_escudo_menu ?? false) &&
          Boolean(p?.escudo_url || p?.escudo_oscuro_url),
        mostrar_nombre_empresa_menu: p?.ui_mostrar_nombre_empresa_menu ?? true,
        ocultar_esquinero_expandido:
          (p?.ui_ocultar_esquinero_expandido ?? false) &&
          (p?.ui_mostrar_escudo_menu ?? false) &&
          Boolean(p?.escudo_url || p?.escudo_oscuro_url),
        esquinero_fondo_activo: p?.ui_esquinero_fondo_activo ?? false,
        cabecera_ocultar_borde: p?.ui_cabecera_ocultar_borde ?? false,
        menu_ocultar_borde: p?.ui_menu_ocultar_borde ?? false,
        tamano_escudo_menu: p?.ui_tamano_escudo_menu ?? 100,
      },
      login: {
        usar_filtro_color: p?.login_usar_filtro_color ?? true,
        mostrar_etiqueta: p?.login_mostrar_etiqueta ?? true,
        mostrar_destacados: p?.login_mostrar_destacados ?? true,
        mostrar_comunidad: p?.login_mostrar_comunidad ?? true,
        etiqueta: p?.login_etiqueta ?? null,
        titulo: p?.login_titulo ?? null,
        subtitulo: p?.login_subtitulo ?? null,
        destacado_1: p?.login_destacado_1 ?? null,
        destacado_2: p?.login_destacado_2 ?? null,
        destacado_3: p?.login_destacado_3 ?? null,
        destacado_icono_1: p?.login_destacado_icono_1 ?? "book",
        destacado_icono_2: p?.login_destacado_icono_2 ?? "users",
        destacado_icono_3: p?.login_destacado_icono_3 ?? "award",
        texto_comunidad: p?.login_texto_comunidad ?? null,
      },
    };
  }

  async leerMedio(
    peticion: ContextoSolicitud,
    tipo:
      | "escudo"
      | "escudo_oscuro"
      | "imagotipo"
      | "imagotipo_oscuro"
      | "portada"
      | "login_escudo"
      | "login_escudo_oscuro",
    version: string,
  ): Promise<{
    contenido: Buffer;
    tipo_mime: "image/png" | "image/jpeg" | "image/webp";
  }> {
    const slug = this.resolverSlug(peticion);
    if (!slug) throw new NotFoundException("tenant.notFound");
    const organizacion = await this.prisma.organizaciones.findFirst({
      where: { slug, estado: 1, eliminado_en: null },
      select: {
        estado: true,
        perfil: {
          select: {
            estado: true,
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
          },
        },
        sedes: {
          where: { es_principal: true, estado: 1, eliminado_en: null },
          take: 1,
          select: {
            escudo_url: true,
            escudo_oscuro_url: true,
            imagotipo_url: true,
            imagotipo_oscuro_url: true,
            login_escudo_url: true,
            login_escudo_oscuro_url: true,
            imagenes_login: {
              where: { estado: 1 },
              select: { clave_objeto: true },
            },
          },
        },
        imagenes_login: {
          where: { estado: 1 },
          select: { clave_objeto: true },
        },
      },
    });
    if (!organizacion || organizacion.estado !== 1)
      throw new NotFoundException("tenant.notFound");
    let clave: string | null = null;
    const sedePrincipal = organizacion.sedes[0] ?? null;
    if (tipo === "portada") {
      clave =
        (sedePrincipal?.imagenes_login ?? organizacion.imagenes_login).find(
          (imagen) => versionDesde(imagen.clave_objeto) === version,
        )?.clave_objeto ?? null;
    } else if (sedePrincipal || organizacion.perfil?.estado === 1) {
      const marca = sedePrincipal ?? organizacion.perfil!;
      clave =
        tipo === "escudo"
          ? marca.escudo_url
          : tipo === "escudo_oscuro"
            ? marca.escudo_oscuro_url
            : tipo === "imagotipo"
              ? marca.imagotipo_url
              : tipo === "imagotipo_oscuro"
                ? marca.imagotipo_oscuro_url
                : tipo === "login_escudo"
                  ? marca.login_escudo_url
                  : marca.login_escudo_oscuro_url;
    }
    if (!clave || versionDesde(clave) !== version)
      throw new NotFoundException("companies.media.notFound");
    const objeto = await this.leerObjeto.ejecutar(clave);
    const tipoMime = clave.endsWith(".png")
      ? "image/png"
      : clave.endsWith(".jpg") || clave.endsWith(".jpeg")
        ? "image/jpeg"
        : clave.endsWith(".webp")
          ? "image/webp"
          : null;
    if (!objeto || !tipoMime || objeto.tipoContenido !== tipoMime)
      throw new NotFoundException("companies.media.notFound");
    return {
      contenido: Buffer.from(objeto.contenido),
      tipo_mime: tipoMime,
    };
  }
}
