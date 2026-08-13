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
  let seriesOpen = $state(false),
    documentOpen = $state(false),
    processing = $state(false),
    seriesForm: HTMLFormElement,
    documentForm: HTMLFormElement,
    resolveSubmit: (() => void) | null = null,
    rejectSubmit: ((e: Error) => void) | null = null;
  const documentTypes = $derived(
      data.catalogos?.parametros.filter(
        (p: { codigo_grupo: string }) =>
          p.codigo_grupo === "tipos_comprobante_electronico",
      ) ?? [],
    ),
    identityTypes = $derived(
      data.catalogos?.parametros.filter(
        (p: { codigo_grupo: string }) => p.codigo_grupo === "tipos_documento",
      ) ?? [],
    );
  const canCreate = $derived(
    tienePermiso(data.usuario.permisos, "operations.billing.create"),
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
    { label: i18n.t("nav.electronicBilling") },
  ]}
/>
<section class="space-y-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-[28px] font-semibold text-ink">
        {i18n.t("nav.electronicBilling")}
      </h1>
      <p class="mt-1.5 text-steel">{i18n.t("operations.billingHelp")}</p>
    </div>
    {#if canCreate}<div class="flex gap-2">
        <Button variant="secondary" onclick={() => (seriesOpen = true)}
          ><Icon name="list-plus" size={17} />{i18n.t(
            "operations.newSeries",
          )}</Button
        ><Button onclick={() => (documentOpen = true)}
          ><Icon name="receipt-text" size={17} />{i18n.t(
            "operations.newDocument",
          )}</Button
        >
      </div>{/if}
  </div>
  <Card
    ><div class="flex gap-3 rounded-lg border border-info/30 bg-info/5 p-4">
      <Icon name="info" size={19} class="mt-0.5 shrink-0 text-info" />
      <p class="text-sm text-steel">{i18n.t("operations.billingFoundation")}</p>
    </div></Card
  ><CatalogSearch value={data.q} route="/operations/billing" />
  <div class="relative">
    <CatalogLoadingOverlay /><Card padding="none" class="overflow-hidden"
      ><div class="overflow-x-auto">
        <table class="w-full min-w-[820px] table-auto text-left">
          <thead
            class="border-b border-hairline bg-surface/70 text-xs font-bold uppercase tracking-wide text-ink"
            ><tr
              ><th class="px-5 py-3">{i18n.t("operations.document")}</th><th
                class="px-4 py-3">{i18n.t("operations.customer")}</th
              ><th class="px-4 py-3">{i18n.t("operations.identityNumber")}</th
              ><th class="px-4 py-3">{i18n.t("operations.issueDate")}</th><th
                class="px-4 py-3 text-right">{i18n.t("operations.total")}</th
              ><th class="px-5 py-3">{i18n.t("operations.status")}</th></tr
            ></thead
          ><tbody class="divide-y divide-hairline text-sm text-steel"
            >{#each data.comprobantes as document}<tr
                ><td class="whitespace-nowrap px-5 py-3 text-ink"
                  >{document.tipo.etiqueta} · {document.serie}-{document.correlativo}</td
                ><td class="px-4 py-3">{document.cliente_nombre}</td><td
                  class="px-4 py-3">{document.cliente_numero_documento}</td
                ><td class="whitespace-nowrap px-4 py-3"
                  >{new Intl.DateTimeFormat(i18n.locale, {
                    dateStyle: "medium",
                  }).format(new Date(document.fecha_emision))}</td
                ><td class="whitespace-nowrap px-4 py-3 text-right text-ink"
                  >{money(document.total)}</td
                ><td class="px-5 py-3"
                  ><Badge variant="outline-sky"
                    >{document.estado_comprobante.etiqueta}</Badge
                  ></td
                ></tr
              >{/each}</tbody
          >
        </table>
      </div>
      {#if !data.comprobantes.length}<div
          class="grid place-items-center py-12 text-center"
        >
          <Icon name="receipt-text" size={32} class="text-stone" />
          <p class="mt-3 text-sm text-steel">
            {i18n.t("operations.billingEmpty")}
          </p>
        </div>{/if}</Card
    >
  </div>
  <CatalogPagination
    route="/operations/billing"
    search={data.q}
    current={data.comprobantes.length}
    total={data.total}
    previous={data.paginacion.anterior}
    next={data.paginacion.siguiente}
  />
</section>
<ConfirmationDialog
  bind:open={seriesOpen}
  variant="info"
  icon="list-plus"
  title={i18n.t("operations.newSeries")}
  description={i18n.t("operations.seriesHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(seriesForm)}
  ><form
    bind:this={seriesForm}
    method="POST"
    action="?/series"
    use:enhance={submit}
    class="grid gap-4 text-left"
  >
    <Select
      name="fid_parametros_tipo"
      label={i18n.t("operations.documentType")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each documentTypes as item}<option value={item.id_parametros}
          >{item.etiqueta}</option
        >{/each}</Select
    ><Input
      name="serie"
      label={i18n.t("operations.series")}
      minlength="4"
      maxlength="4"
      pattern="[A-Za-z0-9]{4}"
      required
    />
  </form></ConfirmationDialog
>
<ConfirmationDialog
  bind:open={documentOpen}
  size="wide"
  variant="info"
  icon="receipt-text"
  title={i18n.t("operations.newDocument")}
  description={i18n.t("operations.documentHelp")}
  confirmLabel={i18n.t("operations.save")}
  cancelLabel={i18n.t("attentions.cancel")}
  confirmDisabled={processing}
  onConfirm={() => confirm(documentForm)}
  ><form
    bind:this={documentForm}
    method="POST"
    action="?/document"
    use:enhance={submit}
    class="grid gap-4 text-left sm:grid-cols-2"
  >
    <Select name="fid_ventas" label={i18n.t("nav.sales")} required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each data.ventas as sale}<option value={sale.id_ventas}
          >#{sale.numero} · {money(sale.total)}</option
        >{/each}</Select
    ><Select
      name="fid_series_comprobante"
      label={i18n.t("operations.series")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each data.catalogos?.series ?? [] as item}<option
          value={item.id_series_comprobante}
          >{item.serie} · {item.tipo.etiqueta}</option
        >{/each}</Select
    ><Select
      name="fid_parametros_tipo_documento_cliente"
      label={i18n.t("operations.identityType")}
      required
      ><option value="">{i18n.t("forms.select")}</option
      >{#each identityTypes as item}<option value={item.id_parametros}
          >{item.etiqueta}</option
        >{/each}</Select
    ><Input
      name="cliente_numero_documento"
      label={i18n.t("operations.identityNumber")}
      maxlength="20"
      required
    /><Input
      name="cliente_nombre"
      label={i18n.t("operations.customerName")}
      minlength="2"
      maxlength="200"
      required
    /><Input
      name="cliente_direccion"
      label={i18n.t("operations.customerAddress")}
      maxlength="250"
    />
  </form></ConfirmationDialog
>
