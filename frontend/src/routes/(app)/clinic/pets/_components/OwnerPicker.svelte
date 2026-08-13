<script lang="ts">
	import { Button, Icon, i18n } from '$lib';
	import * as Dialog from '$lib/components/ui/dialog/index.js';

	type Owner = { id_propietarios: string; nombre_completo: string; numero_documento: string; celular: string | null; foto_version?: string | null; tipo_documento: { etiqueta: string } };
	let { owner = $bindable<Owner | null>(null), decided = $bindable(false), error = false }: { owner?: Owner | null; decided?: boolean; error?: boolean } = $props();
	let open = $state(false);
	let query = $state('');
	let results = $state<Owner[]>([]);
	let searching = $state(false);
	let searched = $state(false);
	const ownerIcon = $derived(owner ? 'user-round' : decided ? 'user-x' : 'user-round');
	const ownerIconTone = $derived(owner ? 'bg-primary-soft text-primary' : decided ? 'bg-error/10 text-error' : 'bg-surface text-stone');

	async function search() {
		if (query.trim().length < 2 || searching) return;
		searching = true;
		try {
			const response = await fetch(`/clinic/pets/owners-search?q=${encodeURIComponent(query.trim())}`);
			results = response.ok ? ((await response.json()).propietarios ?? []) : [];
			searched = true;
		} finally { searching = false; }
	}

	function choose(value: Owner) { owner = value; decided = true; open = false; }
	function withoutOwner() { owner = null; decided = true; }
	function ownerSummary(value: Owner) { return [value.tipo_documento.etiqueta, value.numero_documento, value.celular].filter(Boolean).join(' · '); }
</script>

<input type="hidden" name="fid_propietarios" value={owner?.id_propietarios ?? ''} />
<input type="hidden" name="sin_propietario" value={decided && !owner ? 'true' : 'false'} />
<div class="flex min-h-16 items-center justify-between gap-4 rounded-lg border bg-surface/45 px-4 py-3 max-[560px]:items-start {error ? 'border-error' : 'border-hairline'}">
	<div class="flex min-w-0 items-center gap-3">
		<span class="grid size-10 shrink-0 place-items-center rounded-full {ownerIconTone}"><Icon name={ownerIcon} size={20} /></span>
		<div class="min-w-0">
			<strong class="block truncate text-sm text-ink">{owner?.nombre_completo ?? (decided ? i18n.t('pets.noOwner') : i18n.t('pets.ownerPending'))}</strong>
			<p class="mt-0.5 truncate text-xs text-steel">{owner ? ownerSummary(owner) : i18n.t(decided ? 'pets.noOwnerSelected' : 'pets.ownerDecisionHelp')}</p>
		</div>
	</div>
	<div class="flex shrink-0 gap-2 max-[560px]:w-full max-[560px]:flex-col">
		<Button type="button" variant="secondary" class="min-h-9 !border-hairline-strong px-3 max-[560px]:w-full" onclick={withoutOwner}><Icon name="user-round" size={16} />{i18n.t(owner ? 'pets.removeOwner' : 'pets.registerWithoutOwner')}</Button>
		<Button type="button" class="min-h-9 px-3 shadow-soft max-[560px]:w-full" onclick={() => (open = true)}><Icon name="search" size={16} />{i18n.t(owner ? 'pets.changeOwner' : 'pets.chooseOwner')}</Button>
	</div>
</div>
{#if error}<p class="mt-1.5 text-[13px] text-error">{i18n.t('pets.ownerDecisionRequired')}</p>{/if}

<Dialog.Root bind:open>
	<Dialog.Content class="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-0 sm:h-[min(88dvh,760px)] sm:w-[calc(100vw-4rem)] sm:max-w-[1152px]">
		<Dialog.Header class="border-b border-hairline px-5 py-4">
			<Dialog.Title class="text-lg font-semibold text-ink">{i18n.t('pets.ownerSearchTitle')}</Dialog.Title>
			<Dialog.Description class="mt-1 text-sm text-steel">{i18n.t('pets.ownerSearchHelp')}</Dialog.Description>
		</Dialog.Header>
		<div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
			<div class="flex gap-2 max-[520px]:flex-col"><label class="sr-only" for="pet-owner-search">{i18n.t('pets.ownerSearchPlaceholder')}</label><div class="relative flex-1"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel"><Icon name="search" size={17} /></span><input id="pet-owner-search" bind:value={query} minlength="2" maxlength="80" placeholder={i18n.t('pets.ownerSearchPlaceholder')} class="h-11 w-full rounded-md border border-hairline-strong bg-canvas pl-10 pr-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} /></div><Button type="button" loading={searching} onclick={search}>{i18n.t('pets.search')}</Button></div>
			<div class="min-h-[260px] flex-1 overflow-auto rounded-lg border border-hairline">
				{#if results.length}
					<table class="w-full min-w-[560px] border-collapse text-left"><thead class="sticky top-0 bg-surface"><tr class="border-b border-hairline text-xs text-stone"><th class="px-4 py-3">{i18n.t('pets.owner')}</th><th class="px-4 py-3">{i18n.t('owners.documentNumber')}</th><th class="px-4 py-3">{i18n.t('owners.mobile')}</th><th class="px-4 py-3"></th></tr></thead><tbody class="divide-y divide-hairline">{#each results as item (item.id_propietarios)}<tr><td class="px-4 py-3 font-medium text-ink">{item.nombre_completo}</td><td class="px-4 py-3 text-steel">{item.tipo_documento.etiqueta} · {item.numero_documento}</td><td class="px-4 py-3 text-steel">{item.celular ?? '—'}</td><td class="px-4 py-3 text-right"><Button type="button" size="sm" onclick={() => choose(item)}>{i18n.t('pets.selectOwner')}</Button></td></tr>{/each}</tbody></table>
				{:else if searched}<div class="px-5 py-10 text-center text-sm text-steel">{i18n.t('pets.noOwnersFound')}</div>{:else}<div class="px-5 py-10 text-center text-sm text-steel">{i18n.t('pets.ownerSearchHelp')}</div>{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
