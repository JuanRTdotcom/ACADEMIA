import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  UUID,
  companyMessage,
  companyRequest,
  formText,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

// El backend toma fid_organizaciones del usuario autenticado.

interface Contact {
  direccion: string;
  referencia: string;
  fid_admin_level_0: string;
  codigo_admin_level_3: string;
  telefono: string;
  telefono_secundario: string;
  correo_contacto: string;
  correo_contacto_secundario: string;
}
const PHONE = /^$|^[+0-9()\-\s]+$/;
const EMAIL = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL = /^$|^https?:\/\/[^\s]+$/;

export const load: PageServerLoad = async (event) => {
  await event.parent();
  const [section, response] = await Promise.all([
    loadCompanySection<Contact>(event, "contact"),
    companyRequest(event, "/company/current/location-catalogs"),
  ]);
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "companies.loadError"),
    );
  return { section, catalogos: await response.json() };
};
export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const body = {
      direccion: formText(form, "direccion"),
      referencia: formText(form, "referencia"),
      fid_admin_level_0: formText(form, "fid_admin_level_0"),
      codigo_admin_level_3: formText(form, "codigo_admin_level_3"),
      telefono: formText(form, "telefono"),
      telefono_secundario: formText(form, "telefono_secundario"),
      correo_contacto: formText(form, "correo_contacto").toLowerCase(),
      correo_contacto_secundario: formText(
        form,
        "correo_contacto_secundario",
      ).toLowerCase(),
    };
    const locationComplete =
      (!body.fid_admin_level_0 && !body.codigo_admin_level_3) ||
      (UUID.test(body.fid_admin_level_0) &&
        /^[A-Za-z0-9.-]{1,20}$/.test(body.codigo_admin_level_3));
    if (
      body.direccion.length > 200 ||
      body.referencia.length > 200 ||
      !locationComplete ||
      body.telefono.length > 30 ||
      !PHONE.test(body.telefono) ||
      body.telefono_secundario.length > 30 ||
      !PHONE.test(body.telefono_secundario) ||
      body.correo_contacto.length > 120 ||
      !EMAIL.test(body.correo_contacto) ||
      body.correo_contacto_secundario.length > 120 ||
      !EMAIL.test(body.correo_contacto_secundario)
    )
      return fail(400, { companyMessage: "companies.invalidData" });
    return saveCompanySection(event, "contact", body);
  },
};
