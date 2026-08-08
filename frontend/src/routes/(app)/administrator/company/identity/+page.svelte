<script lang="ts">
  import type { PageProps } from "./$types";
  import { onDestroy, untrack } from "svelte";
  import {
    CompanyBrandMediaGroup,
    CompanySectionCard,
    Icon,
    Switch,
    i18n,
  } from "$lib";
  import { companyAppearancePreview } from "$lib/stores/company-appearance-preview.svelte";
  import { DEFAULT_BRAND_PRIMARY } from "$lib/color-contrast";

  type ColorKey =
    | "ui_cabecera_claro"
    | "ui_cabecera_oscuro"
    | "ui_esquinero_claro"
    | "ui_esquinero_oscuro"
    | "ui_menu_claro"
    | "ui_menu_oscuro";
  type Palette = Record<ColorKey, string>;

  let { data }: PageProps = $props();
  let values = $state(untrack(() => ({ ...data.section })));
  let baseline = $state(untrack(() => JSON.stringify(data.section)));
  const colorKeys: ColorKey[] = [
    "ui_cabecera_claro",
    "ui_cabecera_oscuro",
    "ui_esquinero_claro",
    "ui_esquinero_oscuro",
    "ui_menu_claro",
    "ui_menu_oscuro",
  ];
  const defaultColors: Palette = {
    ui_cabecera_claro: "#FFFFFF",
    ui_cabecera_oscuro: "#1E1E1D",
    ui_esquinero_claro: "#FFFFFF",
    ui_esquinero_oscuro: "#1E1E1D",
    ui_menu_claro: "#FFFFFF",
    ui_menu_oscuro: "#1E1E1D",
  };
  const defaultPreview: Palette = defaultColors;
  // Las configuraciones antiguas guardaban vacío para significar “usar bg-canvas”.
  // Mostramos sus hexadecimales reales sin marcar el formulario como modificado.
  if (colorKeys.every((key) => !values[key])) {
    Object.assign(values, defaultColors);
    baseline = JSON.stringify(values);
  }
  if (!values.color_primario) {
    values.color_primario = DEFAULT_BRAND_PRIMARY;
    baseline = JSON.stringify(values);
  }
  const templates: Array<{
    key: string;
    primary: string;
    colors: Palette;
    preview?: Palette;
    resetShield?: boolean;
  }> = [
    {
      key: "default",
      primary: DEFAULT_BRAND_PRIMARY,
      colors: defaultColors,
      resetShield: true,
      preview: defaultPreview,
    },
    {
      key: "ocean",
      primary: "#2563EB",
      colors: {
        ui_cabecera_claro: "#EFF6FF",
        ui_cabecera_oscuro: "#172033",
        ui_esquinero_claro: "#1D4ED8",
        ui_esquinero_oscuro: "#0B1F4B",
        ui_menu_claro: "#1D4ED8",
        ui_menu_oscuro: "#0B1F4B",
      },
    },
    {
      key: "forest",
      primary: "#16A34A",
      colors: {
        ui_cabecera_claro: "#F0FDF4",
        ui_cabecera_oscuro: "#16231B",
        ui_esquinero_claro: "#166534",
        ui_esquinero_oscuro: "#0F2D20",
        ui_menu_claro: "#166534",
        ui_menu_oscuro: "#0F2D20",
      },
    },
    {
      key: "terracotta",
      primary: "#C2410C",
      colors: {
        ui_cabecera_claro: "#FFF7ED",
        ui_cabecera_oscuro: "#2A1710",
        ui_esquinero_claro: "#9A3412",
        ui_esquinero_oscuro: "#3B160C",
        ui_menu_claro: "#9A3412",
        ui_menu_oscuro: "#3B160C",
      },
    },
    {
      key: "navyCanvas",
      primary: "#2563EB",
      colors: {
        ui_cabecera_claro: "#1E3A8A",
        ui_cabecera_oscuro: "#172554",
        ui_esquinero_claro: "#1E3A8A",
        ui_esquinero_oscuro: "#172554",
        ui_menu_claro: "",
        ui_menu_oscuro: "",
      },
    },
    {
      key: "pineCanvas",
      primary: "#16A34A",
      colors: {
        ui_cabecera_claro: "#14532D",
        ui_cabecera_oscuro: "#052E16",
        ui_esquinero_claro: "#14532D",
        ui_esquinero_oscuro: "#052E16",
        ui_menu_claro: "",
        ui_menu_oscuro: "",
      },
    },
    {
      key: "wineCanvas",
      primary: "#E11D48",
      colors: {
        ui_cabecera_claro: "#881337",
        ui_cabecera_oscuro: "#4C0519",
        ui_esquinero_claro: "#881337",
        ui_esquinero_oscuro: "#4C0519",
        ui_menu_claro: "",
        ui_menu_oscuro: "",
      },
    },
    {
      key: "graphite",
      primary: "#27272A",
      colors: {
        ui_cabecera_claro: "#18181B",
        ui_cabecera_oscuro: "#09090B",
        ui_esquinero_claro: "#18181B",
        ui_esquinero_oscuro: "#09090B",
        ui_menu_claro: "#18181B",
        ui_menu_oscuro: "#09090B",
      },
    },
    {
      key: "plum",
      primary: "#9333EA",
      colors: {
        ui_cabecera_claro: "#6B21A8",
        ui_cabecera_oscuro: "#2E1065",
        ui_esquinero_claro: "#6B21A8",
        ui_esquinero_oscuro: "#2E1065",
        ui_menu_claro: "#6B21A8",
        ui_menu_oscuro: "#2E1065",
      },
    },
    {
      key: "cobaltCorner",
      primary: "#2563EB",
      colors: {
        ui_cabecera_claro: "",
        ui_cabecera_oscuro: "",
        ui_esquinero_claro: "",
        ui_esquinero_oscuro: "",
        ui_menu_claro: "#1D4ED8",
        ui_menu_oscuro: "#0B1F4B",
      },
    },
    {
      key: "emeraldCorner",
      primary: "#059669",
      colors: {
        ui_cabecera_claro: "",
        ui_cabecera_oscuro: "",
        ui_esquinero_claro: "",
        ui_esquinero_oscuro: "",
        ui_menu_claro: "#047857",
        ui_menu_oscuro: "#0F2D20",
      },
    },
    {
      key: "rubyCorner",
      primary: "#E11D48",
      colors: {
        ui_cabecera_claro: "",
        ui_cabecera_oscuro: "",
        ui_esquinero_claro: "",
        ui_esquinero_oscuro: "",
        ui_menu_claro: "#BE123C",
        ui_menu_oscuro: "#4C0519",
      },
    },
  ];
  const hasShield = $derived(
    Boolean(
      data.branding.escudo_version || data.branding.escudo_oscuro_version,
    ),
  );
  const valid = $derived(
    /^#[0-9A-Fa-f]{6}$/.test(values.color_primario) &&
      colorKeys.every(
        (key) => !values[key] || /^#[0-9A-Fa-f]{6}$/.test(values[key]),
      ) &&
      (!values.ui_mostrar_escudo_menu || hasShield) &&
      (!values.ui_ocultar_esquinero_expandido ||
        (hasShield && values.ui_mostrar_escudo_menu)) &&
      Number.isInteger(values.ui_tamano_escudo_menu) &&
      values.ui_tamano_escudo_menu >= 50 &&
      values.ui_tamano_escudo_menu <= 200,
  );
  const dirty = $derived(JSON.stringify(values) !== baseline);

  function previewAppearance() {
    if (typeof window === "undefined") return;
    companyAppearancePreview.show({
      color_primario: values.color_primario || null,
      cabecera_claro: values.ui_cabecera_claro || null,
      cabecera_oscuro: values.ui_cabecera_oscuro || null,
      esquinero_claro: values.ui_esquinero_claro || null,
      esquinero_oscuro: values.ui_esquinero_oscuro || null,
      menu_claro: values.ui_menu_claro || null,
      menu_oscuro: values.ui_menu_oscuro || null,
      mostrar_escudo_menu: values.ui_mostrar_escudo_menu,
      mostrar_nombre_empresa_menu: values.ui_mostrar_nombre_empresa_menu,
      ocultar_esquinero_expandido: values.ui_ocultar_esquinero_expandido,
      esquinero_fondo_activo: values.ui_esquinero_fondo_activo,
      cabecera_ocultar_borde: values.ui_cabecera_ocultar_borde,
      menu_ocultar_borde: values.ui_menu_ocultar_borde,
      tamano_escudo_menu: values.ui_tamano_escudo_menu,
    });
  }
  function saved() {
    baseline = JSON.stringify(values);
    companyAppearancePreview.clear();
  }
  function applyTemplate(template: (typeof templates)[number]) {
    Object.assign(values, template.colors);
    values.color_primario = template.primary;
    values.ui_esquinero_fondo_activo =
      template.key !== "default" &&
      Boolean(
        template.colors.ui_esquinero_claro ||
          template.colors.ui_esquinero_oscuro,
      );
    if (template.resetShield) values.ui_mostrar_escudo_menu = false;
    if (template.resetShield) values.ui_ocultar_esquinero_expandido = false;
    if (template.key === "default") values.ui_cabecera_ocultar_borde = false;
    if (template.key === "default") values.ui_menu_ocultar_borde = false;
    if (template.key === "default") values.ui_tamano_escudo_menu = 100;
    previewAppearance();
  }
  function setColor(key: ColorKey, value: string) {
    values[key] = value.toUpperCase();
    previewAppearance();
  }
  function setPrimaryColor(value: string) {
    values.color_primario = value.toUpperCase();
    previewAppearance();
  }
  function updateShieldVisibility() {
    if (!values.ui_mostrar_escudo_menu)
      values.ui_ocultar_esquinero_expandido = false;
    previewAppearance();
  }
  function setShieldSize(value: string) {
    values.ui_tamano_escudo_menu = Number(value);
    previewAppearance();
  }
  function updateCornerBackground() {
    if (values.ui_esquinero_fondo_activo) {
      if (
        !values.ui_esquinero_claro ||
        values.ui_esquinero_claro === defaultColors.ui_esquinero_claro
      ) {
        values.ui_esquinero_claro =
          values.color_primario || DEFAULT_BRAND_PRIMARY;
      }
      if (
        !values.ui_esquinero_oscuro ||
        values.ui_esquinero_oscuro === defaultColors.ui_esquinero_oscuro
      ) {
        values.ui_esquinero_oscuro =
          values.color_primario || DEFAULT_BRAND_PRIMARY;
      }
    }
    previewAppearance();
  }
  function templateUsesCornerBackground(template: (typeof templates)[number]) {
    return (
      template.key !== "default" &&
      Boolean(
        template.colors.ui_esquinero_claro ||
          template.colors.ui_esquinero_oscuro,
      )
    );
  }
  function isTemplateActive(template: (typeof templates)[number]) {
    return (
      values.color_primario === template.primary &&
      values.ui_esquinero_fondo_activo ===
        templateUsesCornerBackground(template) &&
      colorKeys.every((key) => values[key] === template.colors[key]) &&
      (!template.resetShield || !values.ui_mostrar_escudo_menu)
    );
  }
  function templatePreviewColor(
    template: (typeof templates)[number],
    key: ColorKey,
  ) {
    return (
      template.colors[key] || template.preview?.[key] || defaultPreview[key]
    );
  }
  onDestroy(() => companyAppearancePreview.clear());
</script>

{#snippet colorField(label: string, key: ColorKey, icon: "sun" | "moon")}
  <label class="block min-w-0">
    <span
      class="mb-1.5 flex items-center gap-2 text-sm font-medium text-charcoal"
    >
      <Icon name={icon} size={16} />
      {label}
    </span>
    <div
      class="flex h-11 items-center gap-3 rounded-md border border-hairline-strong bg-canvas px-3 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20"
    >
      <input
        type="color"
        value={values[key] || "#64748B"}
        oninput={(event) => setColor(key, event.currentTarget.value)}
        class="size-7 cursor-pointer bg-transparent"
        aria-label={label}
      />
      <input
        name={key}
        value={values[key]}
        oninput={(event) => setColor(key, event.currentTarget.value)}
        class="min-w-0 flex-1 bg-transparent text-sm uppercase text-ink outline-none"
        placeholder={i18n.t("companies.appearance.defaultColor")}
        maxlength="7"
      />
    </div>
  </label>
{/snippet}

<div class="flex flex-col gap-6">
  <CompanySectionCard
    title={i18n.t("companies.appearance.title")}
    subtitle={i18n.t("companies.appearance.description")}
    {valid}
    {dirty}
    protectedCompany={data.protegida}
    invalidateAfterSave
    onSaved={saved}
  >
    <div class="col-span-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {#each templates as template (template.key)}
        <button
          type="button"
          onclick={() => applyTemplate(template)}
          aria-pressed={isTemplateActive(template)}
          class="group relative rounded-lg border bg-canvas p-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary {isTemplateActive(
            template,
          )
            ? 'border-primary ring-2 ring-primary/15'
            : 'border-hairline-strong'}"
        >
          <div class="mb-3 grid grid-cols-2 gap-2" aria-hidden="true">
            {#each ["claro", "oscuro"] as mode}
              <div
                class="grid h-12 grid-cols-[28%_72%] grid-rows-[14px_1fr] overflow-hidden rounded border border-black/10"
              >
                <span
                  class="row-span-1"
                  style:background-color={templatePreviewColor(
                    template,
                    `ui_esquinero_${mode}` as ColorKey,
                  )}
                ></span>
                <span
                  style:background-color={templatePreviewColor(
                    template,
                    `ui_cabecera_${mode}` as ColorKey,
                  )}
                ></span>
                <span
                  class="row-start-2"
                  style:background-color={templatePreviewColor(
                    template,
                    `ui_menu_${mode}` as ColorKey,
                  )}
                ></span>
                <span class="row-start-2 bg-surface"></span>
              </div>
            {/each}
          </div>
          <span
            class="flex items-center justify-between gap-2 text-sm font-semibold {isTemplateActive(
              template,
            )
              ? 'text-primary'
              : 'text-charcoal group-hover:text-primary'}"
          >
            <span class="flex min-w-0 items-center gap-2"
              ><span
                class="size-3 shrink-0 rounded-full border border-black/10"
                style:background-color={template.primary}
              ></span><span class="truncate"
                >{i18n.t(`companies.appearance.preset.${template.key}`)}</span
              ></span
            >
            {#if isTemplateActive(template)}<Icon name="check" size={16} />{/if}
          </span>
        </button>
      {/each}
    </div>

    <div class="col-span-12 grid gap-4 xl:grid-cols-3">
      {#each [{ key: "header", title: "companies.appearance.header", description: "companies.appearance.headerDescription", light: "ui_cabecera_claro", dark: "ui_cabecera_oscuro" }, { key: "corner", title: "companies.appearance.corner", description: "companies.appearance.cornerDescription", light: "ui_esquinero_claro", dark: "ui_esquinero_oscuro" }, { key: "menu", title: "companies.appearance.menu", description: "companies.appearance.menuDescription", light: "ui_menu_claro", dark: "ui_menu_oscuro" }] as surface (surface.key)}
        <section class="rounded-lg border border-hairline bg-surface/50 p-4">
          <h3 class="font-semibold text-ink">{i18n.t(surface.title)}</h3>
          <p class="mt-1 min-h-10 text-xs leading-relaxed text-steel">
            {i18n.t(surface.description)}
          </p>
          <div
            class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
          >
            {@render colorField(
              i18n.t("companies.appearance.light"),
              surface.light as ColorKey,
              "sun",
            )}
            {@render colorField(
              i18n.t("companies.appearance.dark"),
              surface.dark as ColorKey,
              "moon",
            )}
          </div>
          {#if surface.key === "header"}
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.hideHeaderBorder")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t("companies.appearance.hideHeaderBorderHint")}
                </p>
              </div>
              <Switch
                name="ui_cabecera_ocultar_borde"
                bind:checked={values.ui_cabecera_ocultar_borde}
                onchange={previewAppearance}
                label={i18n.t("companies.appearance.hideHeaderBorder")}
              />
            </div>
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.hideMenuBorder")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t("companies.appearance.hideMenuBorderHint")}
                </p>
              </div>
              <Switch
                name="ui_menu_ocultar_borde"
                bind:checked={values.ui_menu_ocultar_borde}
                onchange={previewAppearance}
                label={i18n.t("companies.appearance.hideMenuBorder")}
              />
            </div>
          {/if}
          {#if surface.key === "corner"}
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.cornerBackground")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t("companies.appearance.cornerBackgroundHint")}
                </p>
              </div>
              <Switch
                name="ui_esquinero_fondo_activo"
                bind:checked={values.ui_esquinero_fondo_activo}
                onchange={updateCornerBackground}
                label={i18n.t("companies.appearance.cornerBackground")}
              />
            </div>
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.hideExpandedCorner")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t("companies.appearance.hideExpandedCornerHint")}
                </p>
              </div>
              <Switch
                name="ui_ocultar_esquinero_expandido"
                bind:checked={values.ui_ocultar_esquinero_expandido}
                onchange={previewAppearance}
                disabled={!hasShield || !values.ui_mostrar_escudo_menu}
                label={i18n.t("companies.appearance.hideExpandedCorner")}
              />
            </div>
          {/if}
          {#if surface.key === "menu"}
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.showShield")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t(
                    hasShield
                      ? "companies.appearance.showShieldHint"
                      : "companies.appearance.shieldMissing",
                  )}
                </p>
              </div>
              <Switch
                name="ui_mostrar_escudo_menu"
                bind:checked={values.ui_mostrar_escudo_menu}
                onchange={updateShieldVisibility}
                disabled={!hasShield}
                label={i18n.t("companies.appearance.showShield")}
              />
            </div>
            <div
              class="mt-4 border-t border-hairline pt-4 {!hasShield ||
              !values.ui_mostrar_escudo_menu
                ? 'opacity-50'
                : ''}"
            >
              <div class="mb-3 flex items-center justify-between gap-4">
                <div>
                  <label
                    class="text-sm font-medium text-charcoal"
                    for="shield-menu-size"
                    >{i18n.t("companies.appearance.shieldSize")}</label
                  >
                  <p class="mt-0.5 text-xs text-steel">
                    {i18n.t("companies.appearance.shieldSizeHint")}
                  </p>
                </div>
                <output
                  for="shield-menu-size"
                  class="min-w-14 rounded-md border border-hairline bg-canvas px-2 py-1 text-center text-sm font-semibold text-primary"
                  >{values.ui_tamano_escudo_menu}%</output
                >
              </div>
              <input
                type="hidden"
                name="ui_tamano_escudo_menu"
                value={values.ui_tamano_escudo_menu}
              />
              <input
                id="shield-menu-size"
                type="range"
                min="50"
                max="200"
                step="5"
                value={values.ui_tamano_escudo_menu}
                oninput={(event) => setShieldSize(event.currentTarget.value)}
                disabled={!hasShield || !values.ui_mostrar_escudo_menu}
                class="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                aria-valuetext={`${values.ui_tamano_escudo_menu}%`}
              />
              <div
                class="mt-1.5 flex justify-between text-[11px] text-muted"
                aria-hidden="true"
              >
                <span>50%</span><span>200%</span>
              </div>
            </div>
            <div
              class="mt-4 flex items-center justify-between gap-4 border-t border-hairline pt-4"
            >
              <div>
                <p class="text-sm font-medium text-charcoal">
                  {i18n.t("companies.appearance.showCompanyName")}
                </p>
                <p class="mt-0.5 text-xs text-steel">
                  {i18n.t("companies.appearance.showCompanyNameHint")}
                </p>
              </div>
              <Switch
                name="ui_mostrar_nombre_empresa_menu"
                bind:checked={values.ui_mostrar_nombre_empresa_menu}
                onchange={previewAppearance}
                disabled={!hasShield || !values.ui_mostrar_escudo_menu}
                label={i18n.t("companies.appearance.showCompanyName")}
              />
            </div>
          {/if}
        </section>
      {/each}
    </div>

    <div class="col-span-12 max-w-sm">
      <label
        class="mb-1.5 block text-sm font-medium text-charcoal"
        for="company-color">{i18n.t("companies.field.color")}</label
      >
      <div
        class="flex h-11 items-center gap-3 rounded-md border border-hairline-strong bg-canvas px-3 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20"
      >
        <input
          id="company-color"
          type="color"
          value={values.color_primario || DEFAULT_BRAND_PRIMARY}
          oninput={(event) => setPrimaryColor(event.currentTarget.value)}
          class="size-7 cursor-pointer bg-transparent"
        />
        <input
          name="color_primario"
          value={values.color_primario}
          oninput={(event) => setPrimaryColor(event.currentTarget.value)}
          class="min-w-0 flex-1 bg-transparent text-sm uppercase text-ink outline-none"
          placeholder="#000000"
          maxlength="7"
        />
      </div>
    </div>
  </CompanySectionCard>

  <div class="order-first flex flex-col gap-8">
    <CompanyBrandMediaGroup
      kind="escudo"
      title={i18n.t("companies.media.shield")}
      hint={i18n.t("companies.media.shieldHint")}
      dimensions={i18n.t("companies.media.shieldLimits")}
      lightVersion={data.branding.escudo_version}
      darkVersion={data.branding.escudo_oscuro_version}
      same={data.branding.escudo_misma_imagen}
    />
    <CompanyBrandMediaGroup
      kind="imagotipo"
      title={i18n.t("companies.media.logotype")}
      hint={i18n.t("companies.media.logotypeHint")}
      dimensions={i18n.t("companies.media.logotypeLimits")}
      lightVersion={data.branding.imagotipo_version}
      darkVersion={data.branding.imagotipo_oscuro_version}
      same={data.branding.imagotipo_misma_imagen}
      horizontal
    />
  </div>
</div>
