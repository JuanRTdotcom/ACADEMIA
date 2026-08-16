<script lang="ts">
  import { page } from "$app/state";
  import Icon from "../Icon.svelte";
  import Logo from "../Logo.svelte";
  import { navGroups } from "$lib/config/nav";
  import { i18n } from "$lib/i18n/index.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import {
    DEFAULT_BRAND_PRIMARY,
    normalizeHexColor,
    prefersLightText,
  } from "$lib/color-contrast";
  import { tienePermiso } from "$lib/permissions-client";

  interface Props {
    collapsed?: boolean;
    mobileOpen?: boolean;
    tenantName?: string;
    cornerLightColor?: string | null;
    cornerDarkColor?: string | null;
    menuLightColor?: string | null;
    menuDarkColor?: string | null;
    showShieldInMenu?: boolean;
    showCompanyNameInMenu?: boolean;
    hideExpandedCorner?: boolean;
    cornerBackgroundEnabled?: boolean;
    hideRightBorder?: boolean;
    shieldSizePercent?: number;
    primaryColor?: string | null;
    shieldVersion?: string | null;
    darkShieldVersion?: string | null;
    imagotypeVersion?: string | null;
    darkImagotypeVersion?: string | null;
    mediaBase?: string;
    onClose?: () => void;
  }
  let {
    collapsed = false,
    mobileOpen = false,
    tenantName = "Sumaq System",
    cornerLightColor = null,
    cornerDarkColor = null,
    menuLightColor = null,
    menuDarkColor = null,
    showShieldInMenu = false,
    showCompanyNameInMenu = true,
    hideExpandedCorner = false,
    cornerBackgroundEnabled = false,
    hideRightBorder = false,
    shieldSizePercent = 100,
    primaryColor = null,
    shieldVersion = null,
    darkShieldVersion = null,
    imagotypeVersion = null,
    darkImagotypeVersion = null,
    mediaBase = '/media/tenant',
    onClose,
  }: Props = $props();

  const activePath = $derived(page.url.pathname);
  const userPermissions = $derived<string[]>(page.data?.usuario?.permisos ?? []);
  const visibleGroups = $derived.by(() => {
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            !item.permissions ||
            item.permissions.length === 0 ||
            tienePermiso(userPermissions, ...item.permissions),
        ),
      }))
      .filter((group) => group.items.length > 0);
  });
  const cornerColor = $derived(
    cornerBackgroundEnabled
      ? (normalizeHexColor(
          theme.current === "dark" ? cornerDarkColor : cornerLightColor,
        ) ??
          normalizeHexColor(primaryColor) ??
          DEFAULT_BRAND_PRIMARY)
      : undefined,
  );
  const sidebarColor = $derived.by(() => {
    const configured = normalizeHexColor(
      theme.current === "dark" ? menuDarkColor : menuLightColor,
    );
    const defaultCanvas = theme.current === "dark" ? "#1E1E1D" : "#FFFFFF";
    // Predeterminado muestra sus hexadecimales en el formulario, pero conserva
    // la semántica original del canvas y sus estados activos primary-soft.
    return configured?.toUpperCase() === defaultCanvas ? undefined : configured;
  });
  const lightCornerText = $derived(prefersLightText(cornerColor));
  const lightNavigationText = $derived(prefersLightText(sidebarColor));
  const brandBlockColor = $derived(
    cornerBackgroundEnabled ? cornerColor : sidebarColor,
  );
  const lightBrandBlockText = $derived(
    cornerBackgroundEnabled ? lightCornerText : lightNavigationText,
  );
  // El drawer móvil siempre está expandido, aunque la preferencia de escritorio
  // indique que el sidebar debe permanecer colapsado.
  const compactBrand = $derived(collapsed && !mobileOpen);
  const activeShieldVersion = $derived(
    theme.current === "dark"
      ? (darkShieldVersion ?? shieldVersion)
      : (shieldVersion ?? darkShieldVersion),
  );
  const activeImagotypeVersion = $derived(
    theme.current === "dark"
      ? (darkImagotypeVersion ?? imagotypeVersion)
      : (imagotypeVersion ?? darkImagotypeVersion),
  );
  const activeShieldType = $derived(
    theme.current === "dark" && darkShieldVersion
      ? "escudo_oscuro"
      : !shieldVersion && darkShieldVersion
        ? "escudo_oscuro"
        : "escudo",
  );
  const activeImagotypeType = $derived(
    theme.current === "dark" && darkImagotypeVersion
      ? "imagotipo_oscuro"
      : !imagotypeVersion && darkImagotypeVersion
        ? "imagotipo_oscuro"
        : "imagotipo",
  );
  const fullImagotype = $derived(
    !compactBrand && Boolean(activeImagotypeVersion),
  );
  const shieldSize = $derived(
    Math.round(72 * Math.min(200, Math.max(50, shieldSizePercent)) / 100),
  );

  function itemCls(active: boolean) {
    const colorClasses = !sidebarColor
      ? active
        ? "bg-primary-soft text-primary"
        : "text-slate hover:bg-surface hover:text-ink"
      : lightNavigationText
        ? active
          ? "bg-white/20 text-white"
          : "text-white/85 hover:bg-white/15 hover:text-white"
        : active
          ? "bg-black/10 text-slate-950"
          : "text-slate-950/80 hover:bg-black/10 hover:text-slate-950";
    return [
      "flex items-center gap-3 px-2.5 py-[9px] rounded-md text-sm font-medium transition-colors duration-150",
      collapsed && "justify-center",
      colorClasses,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function badgeCls(active: boolean) {
    if (!sidebarColor)
      return active ? "bg-primary text-on-primary" : "bg-surface text-steel";
    if (lightNavigationText) {
      return active
        ? "bg-white text-slate-950"
        : "border border-white/30 bg-white/10 text-white";
    }
    return active
      ? "bg-slate-950 text-white"
      : "border border-black/20 bg-black/5 text-slate-950";
  }

  // Una opción también permanece activa en todas sus rutas hijas.
  const isActive = (href: string) =>
    activePath === href || activePath.startsWith(`${href}/`);
</script>

<!-- Mobile scrim -->
<div
  class="fixed inset-0 z-[39] bg-black/45 transition-opacity duration-150 lg:hidden {mobileOpen
    ? 'opacity-100 pointer-events-auto'
    : 'opacity-0 pointer-events-none'}"
  onclick={onClose}
  onkeydown={(e) => e.key === "Escape" && onClose?.()}
  role="button"
  tabindex="-1"
  aria-label={i18n.t("accessibility.closeMenu")}
></div>

<aside
  class="flex flex-col h-dvh bg-canvas {hideRightBorder ? 'border-r-0' : 'border-r border-hairline'} shrink-0 z-40 transition-all duration-150
	lg:sticky lg:top-0 {collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]'}
	max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:w-[264px] max-lg:shadow-elevated
	{mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}"
  aria-label={i18n.t("accessibility.mainNavigation")}
>
  {#if compactBrand || !hideExpandedCorner}
    <div
      class="flex h-16 items-center overflow-hidden border-b {cornerBackgroundEnabled
        ? 'border-transparent'
        : 'border-hairline'} {compactBrand
        ? 'justify-center px-0'
        : fullImagotype
          ? 'p-0'
          : 'px-4'}"
      style:background-color={cornerColor}
    >
      <a
        href="/dashboard"
        class="flex h-full min-w-0 items-center {compactBrand
          ? 'justify-center'
          : 'w-full'}"
        aria-label={i18n.t("accessibility.home")}
      >
        {#if compactBrand && activeShieldVersion}
          <img
            src={`${mediaBase}/${activeShieldType}/${activeShieldVersion}`}
            alt={tenantName}
            class="size-11 object-contain"
            width="44"
            height="44"
            loading="eager"
            decoding="async"
          />
        {:else if !compactBrand && activeImagotypeVersion}
          <img
            src={`${mediaBase}/${activeImagotypeType}/${activeImagotypeVersion}`}
            alt={tenantName}
            class="h-full w-full object-contain object-center p-1"
            width="640"
            height="200"
            loading="eager"
            decoding="async"
          />
        {:else}
          <Logo
            showText={!compactBrand}
            tone={lightCornerText ? "on-dark" : "default"}
          />
        {/if}
      </a>
    </div>
  {/if}

  <nav
    class="flex-1 overflow-y-auto p-3 flex flex-col gap-4"
    style:background-color={sidebarColor}
  >
    {#if showShieldInMenu && activeShieldVersion && !compactBrand}
      <div
        class="flex flex-col {cornerBackgroundEnabled
          ? '-mx-3 -mt-3 px-5 pt-4'
          : 'px-2'}"
        style:background-color={cornerBackgroundEnabled
          ? cornerColor
          : undefined}
      >
        <div
          class="flex min-w-0 flex-col items-center gap-2.5 px-3 text-center"
        >
          <img
            src={`${mediaBase}/${activeShieldType}/${activeShieldVersion}`}
            alt={tenantName}
            class="object-contain"
            style:width={`${shieldSize}px`}
            style:height={`${shieldSize}px`}
            width={shieldSize}
            height={shieldSize}
            loading="eager"
            decoding="async"
          />
          {#if showCompanyNameInMenu}
            <p
              class="w-full truncate text-sm font-bold leading-5 {brandBlockColor
                ? lightBrandBlockText
                  ? 'text-white'
                  : 'text-slate-950'
                : 'text-ink'}"
              title={tenantName}
            >
              {tenantName}
            </p>
          {/if}
        </div>
        <div
          role="separator"
          class="mb-3 mt-5 h-px w-full {cornerBackgroundEnabled
            ? 'bg-transparent'
            : sidebarColor
              ? lightNavigationText
                ? 'bg-white/20'
                : 'bg-black/15'
              : 'bg-hairline'}"
        ></div>
      </div>
    {/if}
    {#each visibleGroups as group (group.title)}
      <div>
        {#if !collapsed}
          <p
            class="text-[11px] font-semibold tracking-[0.06em] uppercase px-2.5 mb-1.5 {sidebarColor
              ? lightNavigationText
                ? 'text-white/65'
                : 'text-slate-950/60'
              : 'text-stone'}"
          >
            {i18n.t(group.title)}
          </p>
        {/if}
        <ul class="list-none p-0 flex flex-col gap-0.5">
          {#each group.items as item (item.label)}
            {@const active = isActive(item.href)}
            <li>
              <a
                href={item.href}
                class={itemCls(active)}
                title={collapsed ? i18n.t(item.label) : undefined}
                onclick={() => onClose?.()}
              >
                <span class="flex shrink-0"
                  ><Icon name={item.icon} size={20} /></span
                >
                {#if !collapsed}
                  <span class="flex-1 truncate">{i18n.t(item.label)}</span>
                  {#if item.badge}
                    <span
                      class="text-[11px] font-semibold px-[7px] py-px rounded-full {badgeCls(
                        active,
                      )}"
                    >
                      {item.badge}
                    </span>
                  {/if}
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </nav>
</aside>
