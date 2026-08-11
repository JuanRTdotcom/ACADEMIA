<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

	let { data }: PageProps = $props();
	type Owner = (typeof data.propietarios)[number];
	let target = $state<Owner | null>(null);
	let deleteOpen = $state(false);
	let processing = $state(false);
	let deleteForm: HTMLFormElement;
	let resolveDelete: (() => void) | null = null;
	let rejectDelete: ((error: Error) => void) | null = null;
	const canCreate = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.create'));
	const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.update'));
	const canDelete = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.delete'));
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
	const remove: SubmitFunction = () => {
		processing = true;
		return async ({ result, update }) => {
			if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('owners.deleted')); resolveDelete?.(); }
			else { toast.error(i18n.t(result.type === 'failure' && typeof result.data?.ownerMessage === 'string' ? result.data.ownerMessage : 'owners.deleteError')); rejectDelete?.(new Error('owner-delete-failed')); }
			processing = false; resolveDelete = null; rejectDelete = null;
		};
	};
</script>

<svelte:head><title>{i18n.t('owners.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
	<div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start"><div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('owners.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('owners.description')}</p></div>{#if canCreate}<Button href="/clinic/owners/new"><Icon name="plus" size={18} />{i18n.t('owners.new')}</Button>{/if}</div>
	<div class="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
		<form method="GET" class="flex w-full max-w-md gap-2"><label class="sr-only" for="owner-search">{i18n.t('owners.search')}</label><div class="relative flex-1"><span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-steel"><Icon name="search" size={17} /></span><input id="owner-search" name="q" value={data.q} maxlength="120" placeholder={i18n.t('owners.searchPlaceholder')} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas pl-10 pr-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></div><Button type="submit" variant="utility">{i18n.t('owners.search')}</Button></form>
		<Badge variant="outline-sky">{i18n.t('owners.count', { count: data.total })}</Badge>
	</div>
	<Card padding="none" class="overflow-hidden">
		{#if data.propietarios.length === 0}
			<div class="flex flex-col items-center px-4 py-16 text-center"><span class="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="contact" size={25} /></span><h2 class="text-lg text-ink">{i18n.t(data.q ? 'owners.noResults' : 'owners.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t(data.q ? 'owners.noResultsHelp' : 'owners.emptyDescription')}</p>{#if canCreate && !data.q}<Button href="/clinic/owners/new" class="mt-5"><Icon name="plus" size={17} />{i18n.t('owners.new')}</Button>{/if}</div>
		{:else}
			<div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[840px] border-collapse text-left"><thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('owners.owner')}</th><th class="px-4 py-3.5">{i18n.t('owners.contact')}</th><th class="px-4 py-3.5">{i18n.t('owners.address')}</th><th class="px-4 py-3.5 text-center">{i18n.t('owners.pets')}</th>{#if canUpdate || canDelete}<th class="px-5 py-3.5 text-right">{i18n.t('owners.actions')}</th>{/if}</tr></thead><tbody class="divide-y divide-hairline">
				{#each data.propietarios as owner (owner.id_propietarios)}<tr class="transition-colors hover:bg-surface/55"><td class="px-5 py-4"><div class="flex min-w-0 items-center gap-3"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="contact" size={18} /></span><div class="min-w-0"><strong class="block truncate text-sm text-ink">{owner.nombre_completo}</strong><p class="mt-1 text-xs text-steel">{owner.tipo_documento.etiqueta} · {owner.numero_documento}</p></div></div></td><td class="px-4 py-4"><p class="text-sm text-ink">{owner.celular}</p><p class="mt-1 text-xs text-steel">{owner.sin_correo ? i18n.t('owners.noEmailShort') : owner.correo}</p></td><td class="max-w-[320px] px-4 py-4"><p class="truncate text-sm text-ink" title={owner.direccion}>{owner.direccion}</p><p class="mt-1 truncate text-xs text-steel" title={ownerLocation(owner)}>{ownerLocation(owner)}</p></td><td class="px-4 py-4 text-center"><span class="inline-flex min-w-8 justify-center rounded-full bg-surface px-2.5 py-1 text-sm font-semibold tabular-nums text-ink">{owner.cantidad_mascotas}</span></td>{#if canUpdate || canDelete}<td class="px-5 py-4"><div class="flex justify-end"><DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('owners.actions')}: ${owner.nombre_completo}`} class="grid size-8 place-items-center rounded-md text-stone hover:bg-surface hover:text-ink"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="min-w-[160px]">{#if canUpdate}<DropdownMenu.Item onSelect={() => goto(`/clinic/owners/${owner.id_propietarios}/edit`)}><Icon name="pencil" size={15} />{i18n.t('owners.edit')}</DropdownMenu.Item>{/if}{#if canUpdate && canDelete}<DropdownMenu.Separator />{/if}{#if canDelete}<DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = owner; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('owners.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root></div></td>{/if}</tr>{/each}
			</tbody></table></div>
			<div class="divide-y divide-hairline md:hidden">{#each data.propietarios as owner (owner.id_propietarios)}<article class="p-4"><div class="flex gap-3"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="contact" size={18} /></span><div class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{owner.nombre_completo}</strong><p class="mt-1 text-xs text-steel">{owner.tipo_documento.etiqueta} · {owner.numero_documento}</p><div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"><p class="text-sm text-ink">{owner.celular}</p><span class="inline-flex items-center gap-1.5 text-xs font-medium text-steel"><Icon name="paw-print" size={14} />{i18n.t('owners.petCount', { count: owner.cantidad_mascotas })}</span></div><p class="mt-2 line-clamp-2 text-xs text-steel">{owner.direccion}</p><p class="mt-0.5 truncate text-xs text-stone">{ownerLocation(owner)}</p></div>{#if canUpdate || canDelete}<DropdownMenu.Root><DropdownMenu.Trigger aria-label={`${i18n.t('owners.actions')}: ${owner.nombre_completo}`} class="grid size-8 place-items-center rounded-md text-stone hover:bg-surface"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end">{#if canUpdate}<DropdownMenu.Item onSelect={() => goto(`/clinic/owners/${owner.id_propietarios}/edit`)}><Icon name="pencil" size={15} />{i18n.t('owners.edit')}</DropdownMenu.Item>{/if}{#if canDelete}<DropdownMenu.Item class="text-error" onSelect={() => { target = owner; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('owners.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>{/if}</div></article>{/each}</div>
		{/if}
	</Card>
</section>

<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('owners.deleteTitle')} description={i18n.t('owners.deleteDescription', { name: target?.nombre_completo ?? '' })} confirmLabel={i18n.t('owners.delete')} cancelLabel={i18n.t('owners.cancel')} onConfirm={requestDelete}>
	<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove}>{#if target}<input type="hidden" name="id" value={target.id_propietarios} />{/if}</form>
</ConfirmationDialog>
