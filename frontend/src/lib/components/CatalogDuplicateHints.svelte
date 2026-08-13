<script lang="ts">
  import * as Command from '$lib/components/ui/command/index.js';
  let { query, endpoint, collection, idKey, secondaryKey, disabled = false, onSelect }: { query: string; endpoint: string; collection: string; idKey: string; secondaryKey?: string; disabled?: boolean; onSelect: (item: Record<string, any>) => void } = $props();
  let items = $state<Record<string, any>[]>([]); let loading = $state(false);
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  function highlightedName(value: string) {
    const source = Array.from(value); const normalized: string[] = []; const sourceIndexes: number[] = [];
    source.forEach((character, index) => { for (const normalizedCharacter of Array.from(normalize(character))) { normalized.push(normalizedCharacter); sourceIndexes.push(index); } });
    const searched = normalize(query.trim()); const match = normalized.join('').indexOf(searched);
    if (match < 0 || !searched) return [{ text: value, match: false }];
    const start = sourceIndexes[match] ?? 0; const end = (sourceIndexes[match + searched.length - 1] ?? start) + 1;
    return [{ text: source.slice(0, start).join(''), match: false }, { text: source.slice(start, end).join(''), match: true }, { text: source.slice(end).join(''), match: false }].filter((part) => part.text);
  }
  $effect(() => {
    const value = query.trim(); if (disabled || value.length < 3) { items = []; loading = false; return; }
    const controller = new AbortController(); loading = true;
    const timer = window.setTimeout(async () => { try { const response = await fetch(`${endpoint}?q=${encodeURIComponent(value)}`, { signal: controller.signal }); if (!response.ok) throw new Error('catalog-search'); const result = await response.json() as Record<string, unknown>; items = Array.isArray(result[collection]) ? result[collection] as Record<string, any>[] : []; } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) items = []; } finally { if (!controller.signal.aborted) loading = false; } }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  });
</script>

{#if !loading && items.length}
  <Command.Root shouldFilter={false} onpointerdown={(event) => event.preventDefault()} class="catalog-hints absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 hidden h-auto overflow-hidden rounded-md border border-hairline-strong bg-canvas p-0 shadow-card">
    <Command.List class="max-h-64 p-1">{#each items as item (item[idKey])}<Command.Item value={String(item[idKey])} onSelect={() => onSelect(item)} class="rounded-md px-3 py-2.5 data-selected:bg-primary-soft"><span class="min-w-0 flex-1 truncate text-sm font-normal text-steel">{#each highlightedName(String(item.nombre)) as part}{#if part.match}<mark class="bg-transparent font-semibold text-primary">{part.text}</mark>{:else}{part.text}{/if}{/each}</span></Command.Item>{/each}</Command.List>
  </Command.Root>
{/if}

<style>
  :global(div:has(input:focus) + .catalog-hints) { display: block !important; }
</style>
