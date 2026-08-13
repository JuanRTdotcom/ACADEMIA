import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  companyMessage,
  companyRequest,
  formText,
  UUID,
} from "$lib/server/companies";
import {
  operationCatalogs,
  operationMutation,
} from "$lib/server/operation-actions";
export const load: PageServerLoad = async (event) => {
  const { usuario } = await event.parent();
  const query = new URLSearchParams(),
    p = event.url.searchParams.get("p"),
    q = event.url.searchParams.get("q")?.trim() ?? "";
  if (p) query.set("p", p);
  if (q) query.set("q", q);
  const [response, catalogos] = await Promise.all([
    companyRequest(event, `/operations/sales${query.size ? `?${query}` : ""}`),
    operationCatalogs(event),
  ]);
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "operations.loadError"),
    );
  return { ...(await response.json()), catalogos, usuario, q };
};
export const actions: Actions = {
  sale: async (event) => {
    const f = await event.request.formData(),
      selection = formText(f, "item").split(":"),
      kind = selection[0],
      item = selection[1] ?? "",
      quantity = formText(f, "cantidad"),
      price = formText(f, "precio");
    if (
      !UUID.test(item) ||
      !["product", "service"].includes(kind) ||
      !quantity ||
      !price
    )
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/operations/sales", {
      fid_propietarios: formText(f, "fid_propietarios") || undefined,
      fid_mascotas: formText(f, "fid_mascotas") || undefined,
      observaciones: formText(f, "observaciones"),
      lineas: [
        {
          fid_productos: kind === "product" ? item : undefined,
          fid_lotes_productos: formText(f, "fid_lotes_productos") || undefined,
          fid_servicios_veterinaria: kind === "service" ? item : undefined,
          cantidad: quantity,
          precio_unitario: price,
          descuento: "0",
        },
      ],
    });
  },
  payment: async (event) => {
    const f = await event.request.formData(),
      sale = formText(f, "fid_ventas"),
      method = formText(f, "fid_parametros_metodo"),
      amount = formText(f, "monto");
    if (!UUID.test(sale) || !UUID.test(method) || !amount)
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/operations/sales/payments", {
      fid_ventas: sale,
      fid_parametros_metodo: method,
      monto: amount,
      referencia: formText(f, "referencia"),
    });
  },
};
