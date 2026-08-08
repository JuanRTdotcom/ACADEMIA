import type { RequestEvent } from "@sveltejs/kit";
import { requestBackend } from "$lib/server/backend";

/**
 * ¿El host actual corresponde a una organización registrada y activa? El backend
 * resuelve el tenant desde X-Forwarded-Host (mismo criterio que el login) y responde
 * 404 si no existe. No se usa cache: cada carga SSR valida el estado actual. Si la
 * API no puede confirmarlo, el error se propaga y la página no continúa sin validar.
 */
export interface TenantPublico {
  slug: string;
  nombre: string;
  region: {
    idioma_por_defecto: "es" | "en";
  };
  marca: {
    color_primario: string | null;
    escudo_version: string | null;
    escudo_oscuro_version: string | null;
    escudo_misma_imagen: boolean;
    imagotipo_version: string | null;
    imagotipo_oscuro_version: string | null;
    imagotipo_misma_imagen: boolean;
    login_escudo_version: string | null;
    login_escudo_oscuro_version: string | null;
    login_escudo_misma_imagen: boolean;
    portadas: Array<{ id: string; version: string; texto_alternativo: string }>;
  };
  interfaz: {
    cabecera_claro: string | null;
    cabecera_oscuro: string | null;
    esquinero_claro: string | null;
    esquinero_oscuro: string | null;
    menu_claro: string | null;
    menu_oscuro: string | null;
    mostrar_escudo_menu: boolean;
    mostrar_nombre_empresa_menu: boolean;
    ocultar_esquinero_expandido: boolean;
    esquinero_fondo_activo: boolean;
    cabecera_ocultar_borde: boolean;
    menu_ocultar_borde: boolean;
    tamano_escudo_menu: number;
  };
  login: {
    usar_filtro_color: boolean;
    mostrar_etiqueta: boolean;
    mostrar_destacados: boolean;
    mostrar_comunidad: boolean;
    etiqueta: string | null;
    titulo: string | null;
    subtitulo: string | null;
    destacado_1: string | null;
    destacado_2: string | null;
    destacado_3: string | null;
    destacado_icono_1: string;
    destacado_icono_2: string;
    destacado_icono_3: string;
    texto_comunidad: string | null;
  };
}

export async function tenantRegistrado(
  event: Pick<RequestEvent, "fetch" | "request" | "getClientAddress">,
): Promise<TenantPublico | null> {
  const response = await requestBackend(event, "/tenants/current");
  if (response.ok) return (await response.json()) as TenantPublico;
  if (response.status === 404) return null;

  // Un 5xx, rate limit u otro fallo no demuestra que el tenant sea válido.
  // Se lanza para que SvelteKit responda con su error genérico, sin fail-open.
  throw new Error(
    `No se pudo validar la organización (API ${response.status}).`,
  );
}
