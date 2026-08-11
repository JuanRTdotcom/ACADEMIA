import { fail, type RequestEvent } from "@sveltejs/kit";
import { companyMessage, companyRequest, formText } from "./companies";

const PRICE = /^$|^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

export function servicePayload(form: FormData) {
  return {
    nombre: formText(form, "nombre").replace(/\s+/g, " "),
    descripcion: formText(form, "descripcion").replace(/\s+/g, " "),
    precio: formText(form, "precio"),
  };
}

export function validService(data: ReturnType<typeof servicePayload>) {
  return (
    data.nombre.length >= 2 &&
    data.nombre.length <= 120 &&
    data.descripcion.length <= 500 &&
    PRICE.test(data.precio)
  );
}

export async function mutateService(
  event: RequestEvent,
  route: string,
  method: string,
  body?: object,
) {
  try {
    const response = await companyRequest(event, route, {
      method,
      ...(body
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    if (!response.ok) {
      return fail(response.status, {
        serviceMessage: await companyMessage(response, "services.saveError"),
      });
    }
    return { serviceMessage: "ok" };
  } catch {
    return fail(503, { serviceMessage: "services.serviceUnavailable" });
  }
}
