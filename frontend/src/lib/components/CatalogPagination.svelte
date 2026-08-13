<script lang="ts">
  import { goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { Button, Icon, i18n } from '$lib';
  let { route, search = '', current, total, previous = null, next = null, parameters = {} }: { route: string; search?: string; current: number; total: number; previous?: string | null; next?: string | null; parameters?: Record<string, string> } = $props();
  const loading = $derived(Boolean(navigating.to?.url.pathname === page.url.pathname && navigating.to.url.search !== page.url.search));
  function href(position?: string) { const query = new URLSearchParams(); for (const [name, value] of Object.entries(parameters)) if (value) query.set(name, value); if (position) query.set('p', position); if (search) query.set('q', search); return query.size ? `${route}?${query}` : route; }
  function navigate(event: MouseEvent, target: string) { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void goto(target, { replaceState: true, noScroll: true }); }
</script>

{#if total > 0}
  <nav class="flex items-center justify-between gap-4 max-sm:flex-col" aria-label={i18n.t('tables.pagination')}>
    <p class="text-sm text-steel">{i18n.t('tables.summary', { count: current, total })}</p>
    <div class="flex items-center gap-2">
      {#if previous}<Button variant="ghost" size="sm" href={href()} disabled={loading} onclick={(event) => navigate(event, href())}>{i18n.t('tables.first')}</Button>{/if}
      <Button variant="secondary" size="sm" href={previous ? href(previous) : undefined} disabled={!previous || loading} onclick={(event) => previous && navigate(event, href(previous))}><Icon name="chevron-left" size={16} />{i18n.t('tables.previous')}</Button>
      <Button variant="secondary" size="sm" href={next ? href(next) : undefined} disabled={!next || loading} onclick={(event) => next && navigate(event, href(next))}>{i18n.t('tables.next')}<Icon name="chevron-right" size={16} /></Button>
    </div>
  </nav>
{/if}
