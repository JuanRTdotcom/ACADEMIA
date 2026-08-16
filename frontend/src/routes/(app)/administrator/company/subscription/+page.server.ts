import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { companyMessage, companyRequest } from "$lib/server/companies";

export const load: PageServerLoad = async (event) => {
  const parentData = await event.parent();
  if (!parentData.usuario.sede_activa?.es_principal)
    error(403, "companies.branches.mainOnly");
  const companyId = parentData.empresa.id_organizaciones;
  try {
    const [generalResponse, renewalsResponse] = await Promise.all([
      companyRequest(event, "/company/current/sections/general"),
      companyRequest(event, `/companies/renewals?limit=50&company_id=${encodeURIComponent(companyId)}`)
    ]);

    if (!generalResponse.ok) {
      error(generalResponse.status, await companyMessage(generalResponse, "companies.notFound"));
    }
    if (!renewalsResponse.ok) {
      error(renewalsResponse.status, await companyMessage(renewalsResponse, "subscriptions.loadError"));
    }

    const general = await generalResponse.json();
    const renewals = await renewalsResponse.json();

    return {
      general,
      renewals
    };
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    error(503, "companies.serviceUnavailable");
  }
};
