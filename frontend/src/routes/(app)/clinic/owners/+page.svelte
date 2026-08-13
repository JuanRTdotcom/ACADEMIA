<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { createColumnHelper, createTable, tableFeatures } from '@tanstack/svelte-table';
	import { Tooltip } from 'bits-ui';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import CatalogSearch from '$lib/components/CatalogSearch.svelte';
	import CatalogLoadingOverlay from '$lib/components/CatalogLoadingOverlay.svelte';
	import CatalogPagination from '$lib/components/CatalogPagination.svelte';

	let { data }: PageProps = $props();
	type Owner = (typeof data.propietarios)[number];
	const featureSet = tableFeatures({});
	const columnHelper = createColumnHelper<typeof featureSet, Owner>();
	const ownersTable = createTable({ features: featureSet, columns: columnHelper.columns([columnHelper.display({ id: 'actions' }), columnHelper.accessor('nombre_completo', { header: 'owner' }), columnHelper.accessor('celular', { header: 'contact' }), columnHelper.accessor('direccion', { header: 'address' }), columnHelper.accessor('mascotas', { header: 'pets' })]), get data() { return data.propietarios; } });
	type DeleteImpact = {
		mascotas: Array<{ id_mascotas: string; nombre: string; foto_version: string | null }>;
		cantidad_mascotas: number;
	};
	let target = $state<Owner | null>(null);
	let deleteOpen = $state(false);
	let processing = $state(false);
	let deleteImpact = $state<DeleteImpact | null>(null);
	let deleteForm: HTMLFormElement;
	let resolveDelete: (() => void) | null = null;
	let rejectDelete: ((error: Error) => void) | null = null;
	const canCreate = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.create'));
	const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.update'));
	const canDelete = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.delete'));
	const canUpdatePets = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
	const canViewPets = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.read'));
	const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('owners.title') }]);
	const ownerLocation = (owner: Owner) =>
		[
			owner.admin_level_3?.nombre,
			owner.admin_level_3?.admin_level_2?.nombre,
			owner.admin_level_3?.admin_level_1?.nombre
		]
			.filter(Boolean)
			.join(', ');

	function requestDelete(): Promise<void> {
		if (!target) return Promise.reject(new Error('invalid-owner'));
		return new Promise((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); });
	}
	function prepareDelete(owner: Owner) {
		target = owner;
		deleteImpact = null;
		deleteOpen = true;
	}
	const remove: SubmitFunction = () => {
		processing = true;
		return async ({ result, update }) => {
			if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('owners.deleted')); resolveDelete?.(); }
			else {
				const failure = result.type === 'failure' ? result.data as { ownerMessage?: unknown; ownerImpact?: DeleteImpact } : null;
				if (failure?.ownerImpact) {
					deleteImpact = failure.ownerImpact;
				}
				else toast.error(i18n.t(typeof failure?.ownerMessage === 'string' ? failure.ownerMessage : 'owners.deleteError'));
				rejectDelete?.(new Error(failure?.ownerImpact ? 'owner-has-pets' : 'owner-delete-failed'));
			}
			processing = false; resolveDelete = null; rejectDelete = null;
		};
	};
</script>

{#snippet petAvatar(pet: Owner['mascotas'][number])}
	{#if pet.foto_version}
		<img src={`/media/pets/${pet.id_mascotas}/${pet.foto_version}`} alt="" class="size-8 rounded-full object-cover" />
	{:else}
		<span class="grid size-8 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="paw-print" size={14} /></span>
	{/if}
{/snippet}

{#snippet ownerAvatar(mobile = false)}
	<span class="grid shrink-0 place-items-center rounded-full border border-hairline bg-canvas text-primary {mobile ? 'size-10' : 'size-9'}"><Icon name="user-round" size={mobile ? 19 : 17} /></span>
{/snippet}

{#snippet petAvatars(owner: Owner)}
	<Tooltip.Provider delayDuration={100}>
	<div class="flex items-center justify-center pl-2">
		{#each owner.mascotas as pet (pet.id_mascotas)}
			{#if canViewPets}
				<Tooltip.Root>
					<Tooltip.Trigger onclick={() => goto(`/clinic/pets/${pet.id_mascotas}/summary`)} aria-label={`${i18n.t('pets.viewProfile')}: ${pet.nombre}`} class="-ml-2 grid size-9 shrink-0 place-items-center rounded-full border-2 border-canvas transition-transform first:ml-0 hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{@render petAvatar(pet)}</Tooltip.Trigger>
					<Tooltip.Portal><Tooltip.Content side="top" sideOffset={7} class="z-50 whitespace-nowrap rounded-md border border-hairline-strong bg-ink px-2.5 py-1.5 text-xs font-medium text-canvas shadow-soft">{pet.nombre}</Tooltip.Content></Tooltip.Portal>
				</Tooltip.Root>
			{:else}
				<span title={pet.nombre} class="-ml-2 grid size-9 shrink-0 place-items-center rounded-full border-2 border-canvas first:ml-0">{@render petAvatar(pet)}</span>
			{/if}
		{/each}
		{#if owner.cantidad_mascotas > owner.mascotas.length}
			<span title={i18n.t('owners.petCount', { count: owner.cantidad_mascotas })} class="-ml-2 grid size-9 shrink-0 place-items-center rounded-full border-2 border-canvas bg-surface text-[11px] font-semibold text-steel">+{owner.cantidad_mascotas - owner.mascotas.length}</span>
		{/if}
	</div>
	</Tooltip.Provider>
{/snippet}

<svelte:head><title>{i18n.t('owners.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
	<div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start"><div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('owners.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('owners.description')}</p></div>{#if canCreate}<Button href="/clinic/owners/new"><Icon name="plus" size={18} />{i18n.t('owners.new')}</Button>{/if}</div>
	<CatalogSearch value={data.q} route="/clinic/owners" />
	<Card padding="none" class="relative overflow-hidden">
		<CatalogLoadingOverlay />
		{#if data.propietarios.length === 0}
			<div class="flex flex-col items-center px-4 py-16 text-center"><span class="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="contact" size={25} /></span><h2 class="text-lg text-ink">{i18n.t(data.q ? 'owners.noResults' : 'owners.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t(data.q ? 'owners.noResultsHelp' : 'owners.emptyDescription')}</p>{#if canCreate && !data.q}<Button href="/clinic/owners/new" class="mt-5"><Icon name="plus" size={17} />{i18n.t('owners.new')}</Button>{/if}</div>
		{:else}
			<div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[900px] border-collapse text-left"><thead class="bg-canvas"><tr class="border-b border-hairline text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{#if canUpdate || canDelete}<th class="w-[92px] border-r border-hairline px-3 py-3 text-center">{i18n.t('owners.actions')}</th>{/if}<th class="border-r border-hairline px-4 py-3">{i18n.t('owners.owner')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('owners.contact')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('owners.address')}</th><th class="w-[150px] px-4 py-3 text-center">{i18n.t('owners.pets')}</th></tr></thead><tbody class="divide-y divide-hairline">
				{#each ownersTable.getRowModel().rows as row (row.original.id_propietarios)}{@const owner = row.original}<tr class="odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">{#if canUpdate || canDelete}<td class="border-r border-hairline px-2 py-2.5"><div class="flex justify-center gap-1">{#if canUpdate}<button type="button" title={i18n.t('owners.edit')} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas hover:text-primary" onclick={() => goto(`/clinic/owners/${owner.id_propietarios}/edit`)}><Icon name="pencil" size={15} /></button>{/if}{#if canDelete}<DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('owners.actions')}: ${owner.nombre_completo}`} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="start"><DropdownMenu.Item variant="destructive" onSelect={() => prepareDelete(owner)}><Icon name="trash-2" size={15} />{i18n.t('owners.delete')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}</div></td>{/if}<td class="border-r border-hairline px-4 py-2.5"><div class="flex min-w-0 items-center gap-3">{@render ownerAvatar()}<div class="min-w-0"><span class="block truncate font-normal text-steel">{owner.nombre_completo}</span><span class="mt-0.5 block truncate text-xs text-stone">{owner.tipo_documento.etiqueta} · {owner.numero_documento}</span></div></div></td><td class="border-r border-hairline px-4 py-2.5"><span class="block font-normal text-steel">{owner.celular ?? ''}</span><span class="mt-0.5 block text-xs text-stone">{owner.sin_correo ? i18n.t('owners.noEmailShort') : owner.correo}</span></td><td class="max-w-[320px] border-r border-hairline px-4 py-2.5"><span class="block truncate font-normal text-steel" title={owner.direccion ?? ''}>{owner.direccion ?? ''}</span><span class="mt-0.5 block truncate text-xs text-stone" title={ownerLocation(owner)}>{ownerLocation(owner)}</span></td><td class="px-4 py-2.5">{@render petAvatars(owner)}</td></tr>{/each}
			</tbody></table></div>
			<div class="divide-y divide-hairline md:hidden">{#each data.propietarios as owner (owner.id_propietarios)}<article class="p-4"><div class="flex gap-3">{@render ownerAvatar(true)}<div class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{owner.nombre_completo}</strong><p class="mt-1 truncate text-xs text-steel">{owner.tipo_documento.etiqueta} · {owner.numero_documento}</p><div class="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2"><p class="text-sm text-ink">{owner.celular}</p>{@render petAvatars(owner)}</div><p class="mt-2 line-clamp-2 text-xs text-steel">{owner.direccion}</p><p class="mt-0.5 truncate text-xs text-stone">{ownerLocation(owner)}</p></div>{#if canUpdate || canDelete}<DropdownMenu.Root><DropdownMenu.Trigger aria-label={`${i18n.t('owners.actions')}: ${owner.nombre_completo}`} class="grid size-8 place-items-center rounded-md text-stone hover:bg-surface"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end">{#if canUpdate}<DropdownMenu.Item onSelect={() => goto(`/clinic/owners/${owner.id_propietarios}/edit`)}><Icon name="pencil" size={15} />{i18n.t('owners.edit')}</DropdownMenu.Item>{/if}{#if canDelete}<DropdownMenu.Item variant="destructive" onSelect={() => prepareDelete(owner)}><Icon name="trash-2" size={15} />{i18n.t('owners.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>{/if}</div></article>{/each}</div>
		{/if}
	</Card>
	<CatalogPagination route="/clinic/owners" search={data.q} current={data.propietarios.length} total={data.total} previous={data.paginacion.anterior} next={data.paginacion.siguiente} />
</section>

<ConfirmationDialog bind:open={deleteOpen} size={deleteImpact ? 'wide' : 'default'} variant="danger" icon="trash-2" title={i18n.t('owners.deleteTitle')} description={i18n.t('owners.deleteDescription', { name: target?.nombre_completo ?? '' })} confirmLabel={i18n.t(deleteImpact ? 'owners.deleteAnyway' : 'owners.delete')} cancelLabel={i18n.t('owners.cancel')} onConfirm={requestDelete}>
	{#if deleteImpact?.cantidad_mascotas}
		<div class="text-left">
			<div class="rounded-xl border border-warning/35 bg-warning/10 p-4"><div class="flex gap-3"><Icon name="paw-print" size={20} class="mt-0.5 shrink-0 text-warning" /><div><p class="font-semibold text-ink">{i18n.t('owners.hasPetsTitle', { count: deleteImpact.cantidad_mascotas })}</p><p class="mt-1 text-sm text-steel">{i18n.t('owners.resolvePetsHelp')}</p></div></div></div>
			<div class="mt-4 divide-y divide-hairline rounded-xl border border-hairline">
				{#each deleteImpact.mascotas as pet (pet.id_mascotas)}
					<article class="flex items-center gap-3 p-3 max-sm:items-start max-sm:flex-col">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							{#if pet.foto_version}<img src={`/media/pets/${pet.id_mascotas}/${pet.foto_version}`} alt={pet.nombre} class="size-14 shrink-0 rounded-full border border-hairline object-cover" />{:else}<span class="grid size-14 shrink-0 place-items-center rounded-full border border-hairline bg-surface text-stone"><Icon name="paw-print" size={23} /></span>{/if}
							<div class="min-w-0"><strong class="block truncate text-sm text-ink">{pet.nombre}</strong><span class="mt-1 block text-xs text-steel">{i18n.t('owners.petWillBeOwnerless')}</span></div>
						</div>
						<div class="flex shrink-0 gap-2 max-sm:w-full max-sm:flex-wrap">
							<span class="inline-flex items-center gap-2 px-2 text-sm font-medium text-steel"><Icon name="user-x" size={15} />{i18n.t('owners.withoutOwner')}</span>
							{#if canUpdatePets}<Button type="button" size="sm" variant="utility" onclick={() => goto(`/clinic/pets/${pet.id_mascotas}/edit`)}><Icon name="pencil" size={15} />{i18n.t('owners.editPetOwner')}</Button>{/if}
						</div>
					</article>
				{/each}
			</div>
		</div>
	{/if}
	<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden">{#if target}<input type="hidden" name="id" value={target.id_propietarios} />{#if deleteImpact}<input type="hidden" name="confirmar_desvinculacion" value="true" />{/if}{/if}</form>
</ConfirmationDialog>
