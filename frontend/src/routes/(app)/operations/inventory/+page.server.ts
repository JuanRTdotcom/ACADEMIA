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
    companyRequest(
      event,
      `/operations/products${query.size ? `?${query}` : ""}`,
    ),
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
  product: async (event) => {
    const f = await event.request.formData();
    const tipo = formText(f, "fid_parametros_tipo"),
      nombre = formText(f, "nombre"),
      precio = formText(f, "precio_venta");
    if (!UUID.test(tipo) || nombre.length < 2 || !precio)
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/operations/products", {
      fid_parametros_tipo: tipo,
      nombre,
      descripcion: formText(f, "descripcion"),
      sku: formText(f, "sku"),
      codigo_barras: formText(f, "codigo_barras"),
      precio_venta: precio,
      costo_referencia: formText(f, "costo_referencia"),
      stock_minimo: formText(f, "stock_minimo") || "0",
      controla_lotes: f.get("controla_lotes") === "on",
    });
  },
  batch: async (event) => {
    const f = await event.request.formData();
    const product = formText(f, "fid_productos"),
      batch = formText(f, "numero_lote"),
      quantity = formText(f, "cantidad_inicial");
    if (!UUID.test(product) || !batch || !quantity)
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/operations/product-batches", {
      fid_productos: product,
      numero_lote: batch,
      fecha_vencimiento: formText(f, "fecha_vencimiento") || undefined,
      costo_unitario: formText(f, "costo_unitario"),
      cantidad_inicial: quantity,
    });
  },
  movement: async (event) => {
    const f = await event.request.formData();
    const product = formText(f, "fid_productos"),
      tipo = formText(f, "fid_parametros_tipo"),
      cantidad = formText(f, "cantidad");
    if (!UUID.test(product) || !UUID.test(tipo) || !cantidad)
      return fail(400, { operationMessage: "operations.invalidData" });
    return operationMutation(event, "/operations/inventory-movements", {
      fid_productos: product,
      fid_lotes_productos: formText(f, "fid_lotes_productos") || undefined,
      fid_parametros_tipo: tipo,
      cantidad,
      costo_unitario: formText(f, "costo_unitario"),
      observaciones: formText(f, "observaciones"),
    });
  },
};
