<script lang="ts">
  import type { PageProps } from "./$types";
  import { onMount, untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { superForm } from "sveltekit-superforms";
  import { valibot } from "sveltekit-superforms/adapters";
  import { slide } from "svelte/transition";
  import { loginSchema } from "$lib/schemas/login";
  import { broadcastAuth, subscribeAuth } from "$lib/auth-channel";
  import {
    Button,
    Input,
    Logo,
    Icon,
    ThemeToggle,
    LanguageSwitcher,
    Badge,
    i18n,
    theme,
  } from "$lib";

  let { data }: PageProps = $props();
  const tenant = $derived(data.tenant);
  const branding = $derived(tenant.login);
  const covers = $derived(tenant.marca.portadas);
  const shieldVersion = $derived(
    theme.current === 'dark'
      ? tenant.marca.login_escudo_oscuro_version
      : tenant.marca.login_escudo_version
  );
  const shieldType = $derived(
    theme.current === 'dark'
      ? 'login_escudo_oscuro'
      : 'login_escudo'
  );
  let activeCover = $state(0);

  const formularioInicial = untrack(() => data.form);
  const { form, errors, message, enhance, submitting } = superForm(formularioInicial, {
    validators: valibot(loginSchema),
    // Al iniciar sesión con éxito (el server responde redirect), avisa a otras pestañas.
    onResult: ({ result }) => {
      if (result.type === "redirect") broadcastAuth("login");
    },
  });

  // Si otra pestaña inicia sesión, esta (parada en el login) va también al dashboard.
  onMount(() => {
    const unsubscribe = subscribeAuth((event) => {
      if (event === "login") goto("/dashboard", { invalidateAll: true });
    });
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = covers.length > 1 && !reducedMotion
      ? window.setInterval(() => (activeCover = (activeCover + 1) % covers.length), 6500)
      : undefined;
    return () => { unsubscribe(); if (timer) window.clearInterval(timer); };
  });

  const highlights = $derived([
    { icon: branding.destacado_icono_1, value: branding.destacado_1 },
    { icon: branding.destacado_icono_2, value: branding.destacado_2 },
    { icon: branding.destacado_icono_3, value: branding.destacado_3 },
  ].filter((highlight) => highlight.value?.trim()));

  const dots = [
    { c: "var(--accent-pink)", t: "14%", l: "12%" },
    { c: "var(--accent-sky)", t: "24%", l: "82%" },
    { c: "var(--accent-teal)", t: "70%", l: "18%" },
    { c: "var(--accent-orange)", t: "82%", l: "74%" },
    { c: "var(--accent-green)", t: "44%", l: "90%" },
    { c: "var(--accent-purple)", t: "58%", l: "6%" },
  ];
</script>

<svelte:head><title>{i18n.t("login.signIn")} · Sumaq System</title></svelte:head
>

<div
  class="min-h-dvh grid grid-cols-[1.05fr_1fr] max-[899px]:grid-cols-1 bg-canvas"
>
  <!-- Brand / hero panel -->
  <aside
    class="relative overflow-hidden grid grid-rows-[auto_1fr_auto] gap-8 px-[clamp(28px,4vw,56px)] py-[clamp(24px,3vw,40px)] text-on-dark max-[899px]:hidden"
  >
    <div class="absolute inset-0" aria-hidden="true">
      {#if covers.length}
        {#each covers as cover, index (cover.id)}
          <img src={`/media/tenant/portada/${cover.version}`} alt="" class="absolute inset-0 size-full object-cover transition-opacity duration-700 motion-reduce:transition-none {index === activeCover ? 'opacity-100' : 'opacity-0'}" loading={index === 0 ? 'eager' : 'lazy'} fetchpriority={index === 0 ? 'high' : 'auto'} />
        {/each}
      {:else}
        <img src="/login.webp" alt="" class="absolute inset-0 size-full object-cover" />
      {/if}
      {#if branding.usar_filtro_color}<div class="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_82%,transparent),color-mix(in_srgb,var(--brand-navy-deep)_90%,transparent))]"></div>{/if}
    </div>
    <div class="absolute inset-0" aria-hidden="true">
      {#each dots as d (d.l + d.t)}
        <span
          class="absolute size-3.5 rounded-full opacity-90"
          style="background:{d.c};top:{d.t};left:{d.l};box-shadow:0 0 0 6px color-mix(in srgb, {d.c} 22%, transparent)"
        ></span>
      {/each}
    </div>

    <div class="relative z-10 -ml-[clamp(28px,4vw,56px)] flex h-16 w-[clamp(230px,22vw,290px)] items-center justify-center rounded-r-full border border-l-0 border-white/10 bg-[#08111f]/80 px-5 shadow-[0_12px_30px_rgba(0,0,0,0.2)] backdrop-blur-md">
      <Logo size={38} tone="on-dark" />
    </div>

    <div class="relative z-10 self-center max-w-[440px]">
      {#if branding.mostrar_etiqueta && branding.etiqueta?.trim()}<div class="mb-5"><Badge variant="eyebrow">{branding.etiqueta.trim()}</Badge></div>{/if}
      {#if branding.titulo?.trim()}<h1
        class="text-white text-[clamp(34px,4vw,52px)] leading-[1.08] tracking-[-0.03em] whitespace-pre-line"
      >{branding.titulo.trim()}</h1>{/if}
      {#if branding.subtitulo?.trim()}<p class="mt-4 text-on-dark-muted text-[17px] leading-relaxed">
        {branding.subtitulo.trim()}
      </p>{/if}

      {#if branding.mostrar_destacados && highlights.length}<ul class="list-none p-0 mt-7 flex flex-col gap-3">
        {#each highlights as h (h.icon)}
          <li class="flex items-center gap-3 text-[15px] text-[#e8ecf5]">
            <span
              class="grid place-items-center size-[34px] rounded-md bg-white/10 text-white shrink-0"
            >
              <Icon name={h.icon} size={18} />
            </span>
            {h.value?.trim()}
          </li>
        {/each}
      </ul>{/if}
    </div>

    {#if branding.mostrar_comunidad && branding.texto_comunidad?.trim()}<div
      class="relative z-10 flex items-center gap-3 text-on-dark-muted text-sm"
    >
      <div
        class="relative h-[25.5px] w-[60.5px] shrink-0"
        style="--student-gradient:linear-gradient(90deg, color-mix(in srgb, var(--primary) 55%, white), var(--primary), var(--primary-pressed))"
        aria-hidden="true"
      >
        <span
          class="absolute left-0 z-10 size-[25.5px] rounded-full border border-white/35"
          style="background-image:var(--student-gradient); background-size:60.5px 100%; background-position:0 0"
        ></span>
        <span
          class="absolute left-[17.5px] z-20 size-[25.5px] rounded-full border border-white/35"
          style="background-image:var(--student-gradient); background-size:60.5px 100%; background-position:-17.5px 0"
        ></span>
        <span
          class="absolute left-[35px] z-30 size-[25.5px] rounded-full border border-white/35"
          style="background-image:var(--student-gradient); background-size:60.5px 100%; background-position:-35px 0"
        ></span>
      </div>
      <span>{branding.texto_comunidad.trim()}</span>
    </div>{/if}
    {#if covers.length > 1}<div class="absolute bottom-8 right-10 z-20 flex gap-2" aria-label={i18n.t('companies.media.covers')}>{#each covers as cover, index (cover.id)}<button type="button" aria-label={`${index + 1}`} aria-current={index === activeCover ? 'true' : undefined} onclick={() => (activeCover = index)} class="size-2 rounded-full transition-colors {index === activeCover ? 'bg-white' : 'bg-white/40'}"></button>{/each}</div>{/if}
  </aside>

  <!-- Form panel -->
  <main class="flex flex-col p-[clamp(24px,3vw,40px)]">
    <div class="flex items-center justify-between">
      <span class="hidden max-[899px]:block"><Logo /></span>
      <span class="ml-auto flex items-center gap-2"
        ><LanguageSwitcher /><ThemeToggle /></span
      >
    </div>

    <div
      class="flex-1 w-full max-w-[400px] mx-auto flex flex-col justify-center gap-6 py-8 max-[899px]:justify-start max-[899px]:pt-10"
    >
      <div class="text-center">
        {#if shieldVersion}<img src={`/media/tenant/${shieldType}/${shieldVersion}`} alt={tenant.nombre} class="mx-auto mb-24 size-40 rounded-md object-contain" fetchpriority="high" />{/if}
        <h2 class="text-[28px]">{i18n.t(data.visitedBefore ? 'login.welcomeBack' : 'login.welcome')}</h2>
        <p class="mt-1.5 text-steel">{i18n.t('login.welcomeSubtitle')}</p>
      </div>

      <!-- novalidate: superforms owns validation, so native browser bubbles are off. -->
      <form class="flex flex-col gap-4" method="POST" novalidate use:enhance>
        {#if $message}
          <div
            class="rounded-md bg-error px-4 py-3 text-sm text-white"
            role="alert"
            transition:slide={{ duration: 160 }}
          >
            {i18n.t($message)}
          </div>
        {/if}
        <Input
          label={i18n.t("login.username")}
          name="usuario"
          type="text"
          icon="user"
          maxlength={12}
          autocomplete="username"
          bind:value={$form.usuario}
          error={$errors.usuario ? i18n.t($errors.usuario[0]) : undefined}
          required
        />
        <div class="flex flex-col gap-1.5">
          <div
            class="flex justify-between items-baseline text-sm font-medium text-charcoal"
          >
            <span>{i18n.t("login.password")}</span>
            <a
              href="/login"
              class="text-link text-[13px] font-medium hover:underline"
            >
              {i18n.t("login.forgot")}
            </a>
          </div>
          <Input
            name="contrasenia"
            type="password"
            icon="lock"
            placeholder=""
            bind:value={$form.contrasenia}
            error={$errors.contrasenia
              ? i18n.t($errors.contrasenia[0])
              : undefined}
            required
          />
        </div>

        <label
          class="flex items-center gap-2 text-sm text-slate cursor-pointer"
        >
          <input type="checkbox" class="size-4 accent-primary" />
          <span>{i18n.t("login.remember")}</span>
        </label>

        <Button type="submit" size="lg" full disabled={$submitting}
          >{i18n.t("login.signIn")}</Button
        >
      </form>

    </div>

    <footer class="text-center text-xs text-stone pt-4">© 2026 Sumaq System</footer>
  </main>
</div>
