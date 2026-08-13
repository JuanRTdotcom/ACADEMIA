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
  const [response, catalogos, ventas] = await Promise.all([
    companyRequest(
      event,
      `/billing/electronic-documents${query.size ? `?${query}` : ""}`,
    ),
    operationCatalogs(event),
    companyRequest(event, "/operations/sales"),
  ]);
  if (!response.ok)
    error(
      response.status,
      await companyMessage(response, "operations.loadError"),
    );
  return {
    ...(await response.json()),
    catalogos,
    ventas: ventas.ok ? (await ventas.json()).ventas : [],
    usuario,
    q,
  };
};
export const actions: Actions = {
  series: async (event) => {
    const f = await event.request.formData(),
      type = formText(f, "fid_parametros_tipo"),
      series = formText(f, "serie");
    if (!UUID.test(type) || !/^[A-Z0-9]{4}$/i.test(series))
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/billing/electronic-documents/series", {
      fid_parametros_tipo: type,
      serie: series,
    });
  },
  document: async (event) => {
    const f = await event.request.formData(),
      sale = formText(f, "fid_ventas"),
      series = formText(f, "fid_series_comprobante"),
      type = formText(f, "fid_parametros_tipo_documento_cliente"),
      number = formText(f, "cliente_numero_documento"),
      name = formText(f, "cliente_nombre");
    if (
      !UUID.test(sale) ||
      !UUID.test(series) ||
      !UUID.test(type) ||
      !number ||
      name.length < 2
    )
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/billing/electronic-documents", {
      fid_ventas: sale,
      fid_series_comprobante: series,
      fid_parametros_tipo_documento_cliente: type,
      cliente_numero_documento: number,
      cliente_nombre: name,
      cliente_direccion: formText(f, "cliente_direccion"),
    });
  },
};
