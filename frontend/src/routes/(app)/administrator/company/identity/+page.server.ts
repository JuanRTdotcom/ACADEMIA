import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  formText,
  loadCompanyBranding,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

// Marca institucional limitada al tenant de la sesión.
interface Identity extends Record<string, unknown> {
  color_primario: string;
  ui_cabecera_claro: string;
  ui_cabecera_oscuro: string;
  ui_esquinero_claro: string;
  ui_esquinero_oscuro: string;
  ui_menu_claro: string;
  ui_menu_oscuro: string;
  ui_mostrar_escudo_menu: boolean;
  ui_mostrar_nombre_empresa_menu: boolean;
  ui_ocultar_esquinero_expandido: boolean;
  ui_esquinero_fondo_activo: boolean;
  ui_cabecera_ocultar_borde: boolean;
  ui_menu_ocultar_borde: boolean;
  ui_tamano_escudo_menu: number;
}
const COLOR = /^$|^#[0-9A-Fa-f]{6}$/;
export const load: PageServerLoad = async (event) => {
  const parent = await event.parent();
  if (!parent.usuario.sede_activa?.es_principal)
    redirect(303, "/administrator/company/general");
  const [section, branding] = await Promise.all([
    loadCompanySection<Identity>(event, "identity"),
    loadCompanyBranding(event),
  ]);
  return { section, branding };
};
export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const body: Identity = {
      color_primario: formText(form, "color_primario"),
      ui_cabecera_claro: formText(form, "ui_cabecera_claro"),
      ui_cabecera_oscuro: formText(form, "ui_cabecera_oscuro"),
      ui_esquinero_claro: formText(form, "ui_esquinero_claro"),
      ui_esquinero_oscuro: formText(form, "ui_esquinero_oscuro"),
      ui_menu_claro: formText(form, "ui_menu_claro"),
      ui_menu_oscuro: formText(form, "ui_menu_oscuro"),
      ui_mostrar_escudo_menu:
        formText(form, "ui_mostrar_escudo_menu") === "true",
      ui_mostrar_nombre_empresa_menu:
        formText(form, "ui_mostrar_nombre_empresa_menu") === "true",
      ui_ocultar_esquinero_expandido:
        formText(form, "ui_ocultar_esquinero_expandido") === "true",
      ui_esquinero_fondo_activo:
        formText(form, "ui_esquinero_fondo_activo") === "true",
      ui_cabecera_ocultar_borde:
        formText(form, "ui_cabecera_ocultar_borde") === "true",
      ui_menu_ocultar_borde:
        formText(form, "ui_menu_ocultar_borde") === "true",
      ui_tamano_escudo_menu: Number(
        formText(form, "ui_tamano_escudo_menu"),
      ),
    };
    if (
      !Object.entries(body).every(
        ([key, value]) =>
          key === "ui_tamano_escudo_menu"
            ? Number.isInteger(value) && Number(value) >= 50 && Number(value) <= 200
            : typeof value === "boolean" || COLOR.test(String(value)),
      )
    ) {
      return fail(400, { companyMessage: "companies.invalidData" });
    }
    return saveCompanySection(event, "identity", body);
  },
};
