<script lang="ts">
  import { page } from "$app/stores";
  import { i18n } from "$lib";

  // Mismo diseño que la página 404 (src/error.html), pero para errores capturados por
  // el boundary de la app (ej. 500 cuando el backend está caído). El status manda:
  // 404 tenant → mensaje de organización; ≥500 → servicio no disponible; resto → genérico.
  const status = $derived($page.status);
  const clave = $derived(
    $page.error?.message === "tenant.notFound"
      ? "tenantNotFound"
      : status >= 500
        ? "serverDown"
        : "generic",
  );
</script>

<svelte:head><title>{status} · Sumaq System</title></svelte:head>

<div class="min-h-dvh flex flex-col items-center justify-center text-center gap-4 bg-canvas px-6 pb-10">
  <img class="block h-[84px] w-auto mb-2" src="/logo-mark.png" alt="Sumaq System" />
  <p class="m-0 text-[clamp(64px,12vw,120px)] font-bold leading-none tracking-[-0.03em] text-ink">
    {status}
  </p>
  <h1 class="m-0 text-[clamp(26px,4vw,38px)] leading-[1.12] tracking-[-0.02em]">
    {i18n.t(`error.${clave}.title`)}
  </h1>
  <p class="m-0 max-w-[460px] text-[16px] leading-relaxed text-steel">
    {i18n.t(`error.${clave}.body`)}
  </p>
</div>
