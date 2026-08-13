<script lang="ts">
  import { enhance } from "$app/forms";
  import type { SubmitFunction } from "@sveltejs/kit";
  import { toast } from "svelte-sonner";
  import type { PageProps } from "./$types";
  import {
    Badge,
    Breadcrumb,
    Button,
    Card,
    ConfirmationDialog,
    Icon,
    Input,
    Select,
    i18n,
    tienePermiso,
  } from "$lib";
  import CatalogSearch from "$lib/components/CatalogSearch.svelte";
  import CatalogLoadingOverlay from "$lib/components/CatalogLoadingOverlay.svelte";
  import CatalogPagination from "$lib/components/CatalogPagination.svelte";
  let { data }: PageProps = $props();
  let saleOpen = $state(false),
    paymentOpen = $state(false),
    processing = $state(false);
  let selectedSale = $state("");
  let saleForm: HTMLFormElement, paymentForm: HTMLFormElement;
  let resolveSubmit: (() => void) | null = null,
    rejectSubmit: ((e: Error) => void) | null = null;
  const payableSales = $derived(
    data.ventas.filter((sale: { saldo: string }) => Number(sale.saldo) > 0),
  );
  const methods = $derived(
    data.catalogos?.parametros.filter(
      (p: { codigo_grupo: string }) => p.codigo_grupo === "metodos_pago",
    ) ?? [],
  );
  const canCreate = $derived(
    tienePermiso(data.usuario.permisos, "operations.sales.create"),
  );
  const canPay = $derived(
    tienePermiso(data.usuario.permisos, "operations.sales.update"),
  );
  const money = (v: string) =>
    new Intl.NumberFormat(i18n.locale, {
      style: "currency",
      currency: "PEN",
    }).format(Number(v));
  const lineNames = (items: Array<{ descripcion: string }>) =>
    items.map((item) => item.descripcion).join(", ");
  const submit: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === "success") {
        await update({ invalidateAll: true });
        toast.success(i18n.t("notifications.type.success"), {
          description: i18n.t("operations.saved"),
        });
        resolveSubmit?.();
      } else {
        const m =
          result.type === "failure" &&
          typeof result.data?.operationMessage === "string"
            ? result.data.operationMessage
            : "operations.saveError";
        toast.error(i18n.t("notifications.type.error"), {
          description: i18n.t(m),
        });
        rejectSubmit?.(new Error(m));
      }
      processing = false;
      resolveSubmit = null;
      rejectSubmit = null;
    };
  };
  function confirm(form: HTMLFormElement) {
    if (!form.reportValidity()) return Promise.reject(new Error("invalid"));
    return new Promise<void>((r, j) => {
      resolveSubmit = r;
      rejectSubmit = j;
      form.requestSubmit();
    });
  }
</script>

<Breadcrumb
  items={[
    { label: i18n.t("nav.dashboard"), href: "/dashboard" },
    { label: i18n.t("nav.sales") },
  ]}
/>
<section class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-[28px] font-semibold text-ink">{i18n.t("nav.sales")}</h1>
      <p class="mt-1.5 text-steel">{i18n.t("operations.salesHelp")}</p>
    </div>
    <div class="flex gap-2">
      {#if canPay}<Button
          variant="secondary"
          onclick={() => {
            selectedSale = "";
            paymentOpen = true;
          }}
          ><Icon name="hand-coins" size={17} />{i18n.t(
            "operations.registerPayment",
          )}</Button
        >{/if}{#if canCreate}<Button onclick={() => (saleOpen = true)}
          ><Icon name="plus" size={17} />{i18n.t("operations.newSale")}</Button
        >{/if}
    </div>
  </div>
  <CatalogSearch value={data.q} route="/operations/sales" />
  <div class="relative">
    <CatalogLoadingOverlay /><Card padding="none" class="overflow-hidden"
      ><div class="overflow-x-auto">
        <table class="w-full min-w-[900px] table-auto text-left">
          <thead
            class="border-b border-hairline bg-surface/70 text-xs font-bold uppercase tracking-wide text-ink"
            ><tr
              >{#if canPay}<th class="w-14 px-4 py-3"
                  >{i18n.t("tables.actions")}</th
                >{/if}<th class="px-4 py-3"
                >{i18n.t("operations.saleNumber")}</th
              ><th class="px-4 py-3">{i18n.t("operations.customer")}</th><th
                class="px-4 py-3">{i18n.t("pets.title")}</th
              ><th class="px-4 py-3">{i18n.t("operations.detail")}</th><th
                class="px-4 py-3 text-right">{i18n.t("operations.total")}</th
              ><th class="px-4 py-3 text-right"
                >{i18n.t("operations.balance")}</th
              ><th class="px-5 py-3">{i18n.t("operations.status")}</th></tr
            ></thead
          ><tbody class="divide-y divide-hairline text-sm text-steel"
            >{#each data.ventas as sale}<tr
                >{#if canPay}<td class="px-4 py-3"
                    >{#if Number(sale.saldo) > 0}<Button
                        variant="ghost"
                        size="sm"
                        class="px-2"
                        title={i18n.t("operations.registerPayment")}
                        onclick={() => {
                          selectedSale = sale.id_ventas;
                          paymentOpen = true;
                        }}
                        ><Icon name="hand-coins" size={17} /></Button
                      >{/if}</td
                  >{/if}<td class="whitespace-nowrap px-4 py-3"
                  ><span class="text-ink">#{sale.numero}</span>
                  <p class="mt-0.5 text-xs text-stone">
                    {new Intl.DateTimeFormat(i18n.locale, {
                      dateStyle: "medium",
                    }).format(new Date(sale.created_at))}
                  </p></td
                ><td class="px-4 py-3"
                  >{sale.propietario?.nombre_completo ??
                    i18n.t("pets.noOwner")}</td
                ><td class="px-4 py-3">{sale.mascota?.nombre ?? ""}</td><td
                  class="max-w-[280px] truncate px-4 py-3"
                  title={lineNames(sale.detalles)}
                  >{lineNames(sale.detalles)}</td
                ><td class="whitespace-nowrap px-4 py-3 text-right text-ink"
                  >{money(sale.total)}</td
                ><td class="whitespace-nowrap px-4 py-3 text-right"
                  >{money(sale.saldo)}</td
                ><td class="px-5 py-3"
                  ><Badge variant="outline-sky"
                    >{sale.estado_venta.etiqueta}</Badge
                  ></td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div>
      {#if !data.ventas.length}<div
          class="grid place-items-center py-12 text-center"
        >
          <Icon name="shopping-cart" size={32} class="text-stone" />
          <p class="mt-3 text-sm text-steel">
            {i18n.t("operations.salesEmpty")}
          </p>
        </div>{/if}</Card
    >
  </div>
  <CatalogPagination
    route="/operations/sales"
    search={data.q}
    current={data.ventas.length}
    total={data.total}
    previous={data.paginacion.anterior}
    next={data.paginacion.siguiente}
  />
</section>
<ConfirmationDialog
  bind:open={saleOpen}
  size="wide"
  variant="info"
  icon="shopping-cart"
  title={i18n.t("operations.newSale")}
  description={i18n.t("operations.saleFormHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(saleForm)}
  ><form
    bind:this={saleForm}
    method="POST"
    action="?/sale"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select name="fid_propietarios" label={i18n.t("owners.title")}
      ><option value="">{i18n.t("pets.noOwner")}</option
      >{#each data.catalogos?.propietarios ?? [] as owner}<option
          value={owner.id_propietarios}>{owner.nombre_completo}</option
        >{/each}</Select
    ><Select name="fid_mascotas" label={i18n.t("pets.title")}
      ><option value="">—</option
      >{#each data.catalogos?.mascotas ?? [] as pet}<option
          value={pet.id_mascotas}>{pet.nombre}</option
        >{/each}</Select
    ><Select name="item" label={i18n.t("operations.productOrService")} required
      ><option value="">{i18n.t("forms.select")}</option><optgroup
        label={i18n.t("nav.inventory")}
        >{#each data.catalogos?.productos ?? [] as item}<option
            value={`product:${item.id_productos}`}>{item.nombre}</option
          >{/each}</optgroup
      ><optgroup label={i18n.t("services.title")}
        >{#each data.catalogos?.servicios ?? [] as item}<option
            value={`service:${item.id_servicios_veterinaria}`}
            >{item.nombre}</option
          >{/each}</optgroup
      ></Select
    ><Select name="fid_lotes_productos" label={i18n.t("operations.batch")}
      ><option value="">—</option
      >{#each data.catalogos?.productos ?? [] as product}{#each product.lotes as batch}<option
            value={batch.id_lotes_productos}
            >{product.nombre} · {batch.numero_lote}</option
          >{/each}{/each}</Select
    ><Input
      name="cantidad"
      label={i18n.t("operations.quantity")}
      type="number"
      min="0.001"
      step="0.001"
      value="1"
      required
    /><Input
      name="precio"
      label={i18n.t("operations.unitPrice")}
      type="number"
      min="0"
      step="0.01"
      required
    /><label class="sm:col-span-2"
      ><span class="mb-1.5 block text-sm font-medium text-charcoal"
        >{i18n.t("operations.observations")}</span
      ><textarea
        name="observaciones"
        rows="3"
        maxlength="500"
        class="w-full rounded-md border border-hairline-strong bg-canvas px-3.5 py-3 text-sm text-ink"
      ></textarea></label
    >
  </form></ConfirmationDialog
>
<ConfirmationDialog
  bind:open={paymentOpen}
  size="wide"
  variant="info"
  icon="hand-coins"
  title={i18n.t("operations.registerPayment")}
  description={i18n.t("operations.paymentHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(paymentForm)}
  ><form
    bind:this={paymentForm}
    method="POST"
    action="?/payment"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select bind:value={selectedSale} name="fid_ventas" label={i18n.t("nav.sales")} required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each payableSales as sale}<option value={sale.id_ventas}
          >#{sale.numero} · {money(sale.saldo)}</option
        >{/each}</Select
    ><Select
      name="fid_parametros_metodo"
      label={i18n.t("operations.paymentMethod")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each methods as method}<option value={method.id_parametros}
          >{method.etiqueta}</option
        >{/each}</Select
    ><Input
      name="monto"
      label={i18n.t("operations.amount")}
      type="number"
      min="0.01"
      step="0.01"
      required
    /><Input
      name="referencia"
      label={i18n.t("operations.reference")}
      maxlength="120"
    />
  </form></ConfirmationDialog
>
