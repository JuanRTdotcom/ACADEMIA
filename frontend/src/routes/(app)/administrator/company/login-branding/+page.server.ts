import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  formText,
  loadCompanyBranding,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

// Personalización pública del login del tenant autenticado.

interface LoginBranding {
  login_usar_filtro_color: boolean;
  login_mostrar_etiqueta: boolean;
  login_mostrar_destacados: boolean;
  login_mostrar_comunidad: boolean;
  login_etiqueta: string;
  login_titulo: string;
  login_subtitulo: string;
  login_destacado_1: string;
  login_destacado_2: string;
  login_destacado_3: string;
  login_destacado_icono_1: string;
  login_destacado_icono_2: string;
  login_destacado_icono_3: string;
  login_texto_comunidad: string;
}

const BENEFIT_ICONS = new Set([
  "book",
  "book-open",
  "graduation-cap",
  "users",
  "award",
  "badge-check",
  "library",
  "presentation",
  "calendar",
  "clipboard-check",
  "play",
  "sparkles",
]);

export const load: PageServerLoad = async (event) => {
  const parent = await event.parent();
  if (!parent.usuario.sede_activa?.es_principal)
    redirect(303, "/administrator/company/general");
  const [section, branding] = await Promise.all([
    loadCompanySection<LoginBranding>(event, "login-branding"),
    loadCompanyBranding(event),
  ]);
  return { section, branding };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const text = (name: string, max: number) => {
      const value = formText(form, name);
      if (value.length > max) throw new Error(name);
      return value;
    };
    try {
      const toggle = (name: string) => form.get(name) === "true";
      const icon = (name: string) => {
        const value = text(name, 40);
        if (!BENEFIT_ICONS.has(value)) throw new Error(name);
        return value;
      };
      const body: LoginBranding = {
        login_usar_filtro_color: toggle("login_usar_filtro_color"),
        login_mostrar_etiqueta: toggle("login_mostrar_etiqueta"),
        login_mostrar_destacados: toggle("login_mostrar_destacados"),
        login_mostrar_comunidad: toggle("login_mostrar_comunidad"),
        login_etiqueta: text("login_etiqueta", 60),
        login_titulo: text("login_titulo", 120),
        login_subtitulo: text("login_subtitulo", 240),
        login_destacado_1: text("login_destacado_1", 120),
        login_destacado_2: text("login_destacado_2", 120),
        login_destacado_3: text("login_destacado_3", 120),
        login_destacado_icono_1: icon("login_destacado_icono_1"),
        login_destacado_icono_2: icon("login_destacado_icono_2"),
        login_destacado_icono_3: icon("login_destacado_icono_3"),
        login_texto_comunidad: text("login_texto_comunidad", 120),
      };
      return saveCompanySection(
        event,
        "login-branding",
        body as unknown as Record<string, unknown>,
      );
    } catch {
      return fail(400, { companyMessage: "companies.invalidData" });
    }
  },
};
