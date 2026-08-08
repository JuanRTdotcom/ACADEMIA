import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  formText,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

interface DigitalPresence {
  sitio_web: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  x_url: string;
}

const URL = /^$|^https?:\/\/[^\s]+$/;
const fields: Array<keyof DigitalPresence> = [
  "sitio_web",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "x_url",
];

export const load: PageServerLoad = async (event) => {
  await event.parent();
  return {
    section: await loadCompanySection<DigitalPresence>(
      event,
      "digital-presence",
    ),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const body = Object.fromEntries(
      fields.map((field) => [field, formText(form, field)]),
    ) as unknown as DigitalPresence;
    if (
      fields.some(
        (field) =>
          body[field].length > (field === "sitio_web" ? 150 : 200) ||
          !URL.test(body[field]),
      )
    ) {
      return fail(400, { companyMessage: "companies.invalidData" });
    }
    return saveCompanySection(event, "digital-presence", { ...body });
  },
};
