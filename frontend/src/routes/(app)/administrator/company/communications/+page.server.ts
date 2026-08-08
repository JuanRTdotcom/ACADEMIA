import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  formText,
  loadCompanySection,
  saveCompanySection,
} from "$lib/server/companies";

interface Schedule {
  dia_semana: number;
  cerrado: boolean;
  hora_apertura: string | null;
  hora_cierre: string | null;
}
interface Communications {
  soporte_correo: string;
  soporte_telefono: string;
  soporte_whatsapp: string;
  horarios: Schedule[];
}
const EMAIL = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^$|^[+0-9()\-\s]+$/;
const TIME = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

export const load: PageServerLoad = async (event) => {
  await event.parent();
  return {
    section: await loadCompanySection<Communications>(event, "communications"),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    let schedules: Schedule[];
    try {
      schedules = JSON.parse(formText(form, "horarios")) as Schedule[];
    } catch {
      return fail(400, { companyMessage: "companies.invalidSchedule" });
    }
    const days = new Set(schedules.map((schedule) => schedule.dia_semana));
    const schedulesValid =
      schedules.length === 7 &&
      days.size === 7 &&
      schedules.every(
        (schedule) =>
          Number.isInteger(schedule.dia_semana) &&
          schedule.dia_semana >= 1 &&
          schedule.dia_semana <= 7 &&
          typeof schedule.cerrado === "boolean" &&
          (schedule.cerrado
            ? schedule.hora_apertura === null && schedule.hora_cierre === null
            : typeof schedule.hora_apertura === "string" &&
              typeof schedule.hora_cierre === "string" &&
              TIME.test(schedule.hora_apertura) &&
              TIME.test(schedule.hora_cierre) &&
              schedule.hora_apertura < schedule.hora_cierre),
      );
    const body: Communications = {
      soporte_correo: formText(form, "soporte_correo").toLowerCase(),
      soporte_telefono: formText(form, "soporte_telefono"),
      soporte_whatsapp: formText(form, "soporte_whatsapp"),
      horarios: schedules,
    };
    if (
      !schedulesValid ||
      body.soporte_correo.length > 120 ||
      !EMAIL.test(body.soporte_correo) ||
      body.soporte_telefono.length > 30 ||
      !PHONE.test(body.soporte_telefono) ||
      body.soporte_whatsapp.length > 30 ||
      !PHONE.test(body.soporte_whatsapp)
    ) {
      return fail(400, {
        companyMessage: schedulesValid
          ? "companies.invalidData"
          : "companies.invalidSchedule",
      });
    }
    return saveCompanySection(event, "communications", { ...body });
  },
};
