import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  formText,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

interface Communications {
  soporte_correo: string;
  soporte_telefono: string;
  soporte_whatsapp: string;
}
const EMAIL = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^$|^[+0-9()\-\s]+$/;

export const load: PageServerLoad = async (event) => {
  await event.parent();
  return {
    section: await loadCompanySection<Communications>(event, "communications"),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const body: Communications = {
      soporte_correo: formText(form, "soporte_correo").toLowerCase(),
      soporte_telefono: formText(form, "soporte_telefono"),
      soporte_whatsapp: formText(form, "soporte_whatsapp"),
    };
    if (
      body.soporte_correo.length > 120 ||
      !EMAIL.test(body.soporte_correo) ||
      body.soporte_telefono.length > 30 ||
      !PHONE.test(body.soporte_telefono) ||
      body.soporte_whatsapp.length > 30 ||
      !PHONE.test(body.soporte_whatsapp)
    ) {
      return fail(400, {
        companyMessage: "companies.invalidData",
      });
    }
    return saveCompanySection(event, "communications", { ...body });
  },
};
