<script lang="ts">
  import { navigating, page } from '$app/state';
  import { i18n } from '$lib';
  const loading = $derived(Boolean(navigating.to?.url.pathname === page.url.pathname && navigating.to.url.search !== page.url.search));
</script>

{#if loading}
  <div class="absolute inset-0 z-20 grid place-items-center bg-transparent backdrop-blur-[2px]" role="status" aria-live="polite">
    <div class="flex items-center gap-2.5 rounded-full border border-hairline bg-canvas px-4 py-2.5 text-sm font-semibold text-ink shadow-card"><span class="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true"></span>{i18n.t('tables.loading')}</div>
  </div>
{/if}
