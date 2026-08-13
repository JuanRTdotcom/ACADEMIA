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
  let productOpen = $state(false),
    batchOpen = $state(false),
    movementOpen = $state(false),
    processing = $state(false);
  let productForm: HTMLFormElement,
    batchForm: HTMLFormElement,
    movementForm: HTMLFormElement;
  let resolveSubmit: (() => void) | null = null,
    rejectSubmit: ((error: Error) => void) | null = null;
  const types = $derived(
    data.catalogos?.parametros.filter(
      (p: { codigo_grupo: string }) => p.codigo_grupo === "tipos_producto",
    ) ?? [],
  );
  const movements = $derived(
    data.catalogos?.parametros.filter(
      (p: { codigo_grupo: string }) =>
        p.codigo_grupo === "tipos_movimiento_inventario",
    ) ?? [],
  );
  const canCreate = $derived(
    tienePermiso(data.usuario.permisos, "operations.inventory.create"),
  );
  const canUpdate = $derived(
    tienePermiso(data.usuario.permisos, "operations.inventory.update"),
  );
  const batchProducts = $derived(
    (data.catalogos?.productos ?? []).filter(
      (product: { controla_lotes: boolean }) => product.controla_lotes,
    ),
  );
  const money = (v: string) =>
    new Intl.NumberFormat(i18n.locale, {
      style: "currency",
      currency: "PEN",
    }).format(Number(v));
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
        const message =
          result.type === "failure" &&
          typeof result.data?.operationMessage === "string"
            ? result.data.operationMessage
            : "operations.saveError";
        toast.error(i18n.t("notifications.type.error"), {
          description: i18n.t(message),
        });
        rejectSubmit?.(new Error(message));
      }
      processing = false;
      resolveSubmit = null;
      rejectSubmit = null;
    };
  };
  function confirm(form: HTMLFormElement) {
    if (!form.reportValidity()) return Promise.reject(new Error("invalid"));
    return new Promise<void>((resolve, reject) => {
      resolveSubmit = resolve;
      rejectSubmit = reject;
      form.requestSubmit();
    });
  }
</script>

<Breadcrumb
  items={[
    { label: i18n.t("nav.dashboard"), href: "/dashboard" },
    { label: i18n.t("nav.inventory") },
  ]}
/>
<section class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-ink">
        {i18n.t("nav.inventory")}
      </h1>
      <p class="mt-1.5 text-steel">{i18n.t("operations.inventoryHelp")}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      {#if canUpdate}<Button
          variant="secondary"
          onclick={() => (movementOpen = true)}
          ><Icon name="arrow-left-right" size={17} />{i18n.t(
            "operations.newMovement",
          )}</Button
        >{/if}{#if canCreate}<Button
          variant="secondary"
          onclick={() => (batchOpen = true)}
          ><Icon name="boxes" size={17} />{i18n.t(
            "operations.newBatch",
          )}</Button
        ><Button onclick={() => (productOpen = true)}
          ><Icon name="plus" size={17} />{i18n.t(
            "operations.newProduct",
          )}</Button
        >{/if}
    </div>
  </div>
  <CatalogSearch value={data.q} route="/operations/inventory" />
  <div class="relative">
    <CatalogLoadingOverlay /><Card padding="none" class="overflow-hidden"
      ><div class="overflow-x-auto">
        <table class="w-full min-w-[760px] table-auto text-left">
          <thead
            class="border-b border-hairline bg-surface/70 text-xs font-bold uppercase tracking-wide text-ink"
            ><tr
              ><th class="px-5 py-3">{i18n.t("operations.product")}</th><th
                class="px-4 py-3">{i18n.t("operations.category")}</th
              ><th class="px-4 py-3">{i18n.t("operations.stock")}</th><th
                class="px-4 py-3">{i18n.t("operations.price")}</th
              ><th class="px-5 py-3">{i18n.t("operations.status")}</th></tr
            ></thead
          ><tbody class="divide-y divide-hairline text-steel"
            >{#each data.productos as product}<tr
                ><td class="px-5 py-3 text-sm"
                  ><span class="text-ink">{product.nombre}</span>
                  <p class="mt-0.5 text-xs text-stone">
                    {product.tipo.etiqueta}
                  </p></td
                ><td class="px-4 py-3 text-sm"
                  >{product.categoria?.nombre ?? ""}</td
                ><td class="px-4 py-3 text-sm"
                  ><span class="text-ink">{product.stock}</span
                  >{#if product.lotes.length}<p
                      class="mt-0.5 text-xs text-stone"
                    >
                      {product.lotes.length} lotes
                    </p>{/if}</td
                ><td class="px-4 py-3 text-sm">{money(product.precio_venta)}</td
                ><td class="px-5 py-3"
                  ><Badge
                    variant={product.estado === 1 ? "tag-green" : "neutral"}
                    >{product.estado === 1
                      ? i18n.t("common.active")
                      : i18n.t("common.inactive")}</Badge
                  ></td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div>
      {#if !data.productos.length}<div
          class="grid place-items-center py-14 text-center"
        >
          <Icon name="package-search" size={32} class="text-stone" />
          <p class="mt-3 text-sm text-steel">
            {i18n.t("operations.inventoryEmpty")}
          </p>
        </div>{/if}</Card
    >
  </div>
  <CatalogPagination
    route="/operations/inventory"
    search={data.q}
    current={data.productos.length}
    total={data.total}
    previous={data.paginacion.anterior}
    next={data.paginacion.siguiente}
  />
</section>

<ConfirmationDialog
  bind:open={productOpen}
  size="wide"
  variant="info"
  icon="package-plus"
  title={i18n.t("operations.newProduct")}
  description={i18n.t("operations.productFormHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(productForm)}
>
  <form
    bind:this={productForm}
    method="POST"
    action="?/product"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select
      name="fid_parametros_tipo"
      label={i18n.t("operations.type")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each types as type}<option value={type.id_parametros}
          >{type.etiqueta}</option
        >{/each}</Select
    ><Input
      name="nombre"
      label={i18n.t("operations.product")}
      required
      minlength="2"
      maxlength="160"
    /><Input name="sku" label="SKU" maxlength="80" /><Input
      name="codigo_barras"
      label={i18n.t("operations.barcode")}
      maxlength="80"
    /><Input
      name="precio_venta"
      label={i18n.t("operations.price")}
      type="number"
      min="0"
      step="0.01"
      required
    /><Input
      name="costo_referencia"
      label={i18n.t("operations.cost")}
      type="number"
      min="0"
      step="0.01"
    /><Input
      name="stock_minimo"
      label={i18n.t("operations.minimumStock")}
      type="number"
      min="0"
      step="0.001"
      value="0"
    /><label class="flex items-center gap-2 self-end pb-3 text-sm text-ink"
      ><input
        type="checkbox"
        name="controla_lotes"
        class="size-4 accent-primary"
      />{i18n.t("operations.controlsBatches")}</label
    ><label class="sm:col-span-2"
      ><span class="mb-1.5 block text-sm font-medium text-charcoal"
        >{i18n.t("operations.description")}</span
      ><textarea
        name="descripcion"
        maxlength="500"
        rows="3"
        class="w-full rounded-md border border-hairline-strong bg-canvas px-3.5 py-3 text-sm text-ink outline-none focus:border-primary"
      ></textarea></label
    >
  </form>
</ConfirmationDialog>
<ConfirmationDialog
  bind:open={batchOpen}
  size="wide"
  variant="info"
  icon="boxes"
  title={i18n.t("operations.newBatch")}
  description={i18n.t("operations.batchHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(batchForm)}
>
  <form
    bind:this={batchForm}
    method="POST"
    action="?/batch"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select name="fid_productos" label={i18n.t("operations.product")} required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each batchProducts as product}<option value={product.id_productos}
          >{product.nombre}</option
        >{/each}</Select
    ><Input
      name="numero_lote"
      label={i18n.t("operations.batchNumber")}
      maxlength="100"
      required
    /><Input
      name="cantidad_inicial"
      label={i18n.t("operations.initialQuantity")}
      type="number"
      min="0.001"
      step="0.001"
      required
    /><Input
      name="fecha_vencimiento"
      label={i18n.t("operations.expirationDate")}
      type="date"
    /><Input
      name="costo_unitario"
      label={i18n.t("operations.unitCost")}
      type="number"
      min="0"
      step="0.0001"
    />
  </form>
</ConfirmationDialog>
<ConfirmationDialog
  bind:open={movementOpen}
  size="wide"
  variant="info"
  icon="arrow-left-right"
  title={i18n.t("operations.newMovement")}
  description={i18n.t("operations.movementHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(movementForm)}
>
  <form
    bind:this={movementForm}
    method="POST"
    action="?/movement"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select name="fid_productos" label={i18n.t("operations.product")} required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each data.catalogos?.productos ?? [] as product}<option value={product.id_productos}
          >{product.nombre}</option
        >{/each}</Select
    ><Select name="fid_lotes_productos" label={i18n.t("operations.batch")}
      ><option value="">—</option
      >{#each data.catalogos?.productos ?? [] as product}{#each product.lotes as batch}<option
            value={batch.id_lotes_productos}
            >{product.nombre} · {batch.numero_lote}</option
          >{/each}{/each}</Select
    ><Select
      name="fid_parametros_tipo"
      label={i18n.t("operations.movementType")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each movements as item}<option value={item.id_parametros}
          >{item.etiqueta}</option
        >{/each}</Select
    ><Input
      name="cantidad"
      label={i18n.t("operations.quantitySigned")}
      type="number"
      step="0.001"
      required
    /><Input
      name="costo_unitario"
      label={i18n.t("operations.unitCost")}
      type="number"
      min="0"
      step="0.0001"
    /><label class="sm:col-span-2"
      ><span class="mb-1.5 block text-sm font-medium text-charcoal"
        >{i18n.t("operations.observations")}</span
      ><textarea
        name="observaciones"
        maxlength="500"
        rows="3"
        class="w-full rounded-md border border-hairline-strong bg-canvas px-3.5 py-3 text-sm text-ink outline-none focus:border-primary"
      ></textarea></label
    >
  </form>
</ConfirmationDialog>
