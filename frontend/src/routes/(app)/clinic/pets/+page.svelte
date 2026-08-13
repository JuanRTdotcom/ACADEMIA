<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { createColumnHelper, createTable, tableFeatures } from '@tanstack/svelte-table';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import CatalogSearch from '$lib/components/CatalogSearch.svelte';
  import CatalogLoadingOverlay from '$lib/components/CatalogLoadingOverlay.svelte';
  import CatalogPagination from '$lib/components/CatalogPagination.svelte';

  let { data }: PageProps = $props();
  type Pet = (typeof data.mascotas)[number];
  type DeleteImpact = { propietario: { id_propietarios: string; nombre_completo: string; numero_documento: string; celular: string | null; tipo_documento: { etiqueta: string } } };
  const features = tableFeatures({});
  const helper = createColumnHelper<typeof features, Pet>();
  const table = createTable({ features, columns: helper.columns([helper.display({ id: 'actions' }), helper.accessor('nombre', { header: 'pet' }), helper.accessor('propietario', { header: 'owner' }), helper.accessor('temperamento', { header: 'profile' }), helper.accessor('cantidad_atenciones', { header: 'attentions' })]), get data() { return data.mascotas; } });
  let target = $state<Pet | null>(null);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let deleteImpact = $state<DeleteImpact | null>(null);
  let deleteForm: HTMLFormElement;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.delete'));
  const canView = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.read'));
  const canHistory = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.read'));
  const canAny = $derived(canView || canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('pets.title') }]);
  const attentionDate = (value: string | Date) => new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  function edit(pet: Pet) { void goto(`/clinic/pets/${pet.id_mascotas}/edit`); }
  function view(pet: Pet) { void goto(`/clinic/pets/${pet.id_mascotas}/summary`); }
  function history(pet: Pet) { void goto(`/clinic/pets/${pet.id_mascotas}/history`); }
  function prepareDelete(pet: Pet) { target = pet; deleteImpact = null; deleteOpen = true; }
  function requestDelete() { if (!target) return Promise.reject(new Error('invalid-pet')); return new Promise<void>((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); }); }
  const remove: SubmitFunction = () => { processing = true; return async ({ result, update }) => {
    if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('pets.deleted')); resolveDelete?.(); }
    else { const failure = result.type === 'failure' ? result.data as { petMessage?: unknown; petImpact?: DeleteImpact } : null; if (failure?.petImpact) deleteImpact = failure.petImpact; else toast.error(i18n.t(typeof failure?.petMessage === 'string' ? failure.petMessage : 'pets.deleteError')); rejectDelete?.(new Error(failure?.petImpact ? 'pet-has-owner' : 'pet-delete-failed')); }
    processing = false; resolveDelete = null; rejectDelete = null;
  }; };
</script>

{#snippet petPhoto(pet: Pet, mobile = false)}
  {#if pet.foto_version}<img src={`/media/pets/${pet.id_mascotas}/${pet.foto_version}`} alt="" title={pet.temperamento?.etiqueta} class="shrink-0 rounded-lg border-[3px] border-hairline object-cover {mobile ? 'size-12' : 'size-10'}" style:border-color={pet.temperamento?.color_hex ?? undefined} />{:else}<span class="grid shrink-0 place-items-center rounded-lg border border-hairline bg-surface text-stone {mobile ? 'size-12' : 'size-10'}"><Icon name="paw-print" size={mobile ? 21 : 19} /></span>{/if}
{/snippet}

{#snippet ownerAvatar(hasOwner: boolean, mobile = false)}
  <span class="grid shrink-0 place-items-center rounded-full border border-hairline bg-canvas {hasOwner ? 'text-primary' : 'text-stone'} {mobile ? 'size-9' : 'size-8'}"><Icon name={hasOwner ? 'user-round' : 'user-x'} size={mobile ? 17 : 15} /></span>
{/snippet}

{#snippet menu(pet: Pet, mobile = false)}
  <DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('pets.actions')}: ${pet.nombre}`} class="grid place-items-center rounded-md text-steel hover:bg-canvas {mobile ? 'size-8' : 'size-7'}"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align={mobile ? 'end' : 'start'} class="min-w-[190px]">{#if canView}<DropdownMenu.Item onSelect={() => view(pet)}><Icon name="eye" size={15} />{i18n.t('pets.viewProfile')}</DropdownMenu.Item>{/if}{#if canHistory}<DropdownMenu.Item onSelect={() => history(pet)}><Icon name="history" size={15} />{i18n.t('pets.clinicalHistory')}</DropdownMenu.Item>{/if}{#if mobile && canUpdate}<DropdownMenu.Item onSelect={() => edit(pet)}><Icon name="pencil" size={15} />{i18n.t('pets.edit')}</DropdownMenu.Item>{/if}{#if canDelete}<DropdownMenu.Separator /><DropdownMenu.Item variant="destructive" onSelect={() => prepareDelete(pet)}><Icon name="trash-2" size={15} />{i18n.t('pets.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>
{/snippet}

<svelte:head><title>{i18n.t('pets.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start"><div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('pets.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('pets.description')}</p></div>{#if canCreate}<Button href="/clinic/pets/new"><Icon name="plus" size={18} />{i18n.t('pets.new')}</Button>{/if}</div>
  <CatalogSearch value={data.q} route="/clinic/pets" />
  <Card padding="none" class="relative overflow-hidden">
    <CatalogLoadingOverlay />
    {#if !data.mascotas.length}
      <div class="flex flex-col items-center px-4 py-16 text-center"><span class="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="paw-print" size={25} /></span><h2 class="text-lg text-ink">{i18n.t(data.q ? 'pets.noResults' : 'pets.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t(data.q ? 'pets.noResultsHelp' : 'pets.emptyDescription')}</p>{#if canCreate && !data.q}<Button href="/clinic/pets/new" class="mt-5"><Icon name="plus" size={17} />{i18n.t('pets.new')}</Button>{/if}</div>
    {:else}
      <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[980px] border-collapse text-left"><thead class="bg-canvas"><tr class="border-b border-hairline text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{#if canAny}<th class="w-[92px] border-r border-hairline px-3 py-3 text-center">{i18n.t('pets.actions')}</th>{/if}<th class="border-r border-hairline px-4 py-3">{i18n.t('pets.pet')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('pets.ownerColumn')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('pets.profile')}</th><th class="w-[200px] px-4 py-3">{i18n.t('pets.attentions')}</th></tr></thead><tbody class="divide-y divide-hairline">
        {#each table.getRowModel().rows as row (row.original.id_mascotas)}{@const pet = row.original}<tr class="odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">{#if canAny}<td class="border-r border-hairline px-2 py-2.5"><div class="flex justify-center gap-1">{#if canUpdate}<button type="button" title={i18n.t('pets.edit')} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas hover:text-primary" onclick={() => edit(pet)}><Icon name="pencil" size={15} /></button>{/if}{@render menu(pet)}</div></td>{/if}<td class="border-r border-hairline px-4 py-2.5"><div class="flex min-w-0 items-center gap-3">{@render petPhoto(pet)}<div class="min-w-0"><span class="block truncate font-normal text-steel">{pet.nombre}</span><span class="mt-0.5 block text-xs text-stone">{pet.especie.nombre}{#if pet.subespecie} · {pet.subespecie.nombre}{/if}</span></div></div></td><td class="border-r border-hairline px-4 py-2.5"><div class="flex min-w-0 items-center gap-2.5">{@render ownerAvatar(Boolean(pet.propietario))}<div class="min-w-0"><span class="block truncate font-normal text-steel">{pet.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</span>{#if pet.propietario}<span class="mt-0.5 block truncate text-xs text-stone">{pet.propietario.tipo_documento.etiqueta} · {pet.propietario.numero_documento}</span>{/if}</div></div></td><td class="border-r border-hairline px-4 py-2.5">{#if pet.temperamento}<span class="flex items-center gap-2 font-normal text-steel"><span class="size-2.5 rounded-full" style:background-color={pet.temperamento.color_hex ?? 'currentColor'}></span>{pet.temperamento.etiqueta}</span>{/if}<span class="mt-0.5 block text-xs text-stone">{#if pet.peso}{pet.peso}{#if pet.unidad_peso} {pet.unidad_peso.codigo}{/if}{/if}{#if pet.peso && pet.talla} · {/if}{pet.talla?.etiqueta ?? (!pet.peso && !pet.temperamento ? '—' : '')}</span></td><td class="px-4 py-2.5"><span class="block font-normal text-steel">{i18n.t('pets.attentionCount', { count: pet.cantidad_atenciones })}</span>{#if pet.ultima_atencion_en}<span class="mt-0.5 block text-xs text-stone">{i18n.t('pets.lastAttention', { date: attentionDate(pet.ultima_atencion_en) })}</span>{:else}<span class="mt-0.5 block text-xs text-stone">{i18n.t('pets.noAttentions')}</span>{/if}</td></tr>{/each}
      </tbody></table></div>
      <div class="divide-y divide-hairline md:hidden">{#each data.mascotas as pet (pet.id_mascotas)}<article class="p-4"><div class="flex gap-3">{@render petPhoto(pet, true)}<div class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{pet.nombre}</strong><p class="mt-1 truncate text-xs text-steel">{pet.especie.nombre}{#if pet.subespecie} · {pet.subespecie.nombre}{/if}</p><div class="mt-3 flex min-w-0 items-center gap-2">{@render ownerAvatar(Boolean(pet.propietario), true)}<div class="min-w-0"><p class="truncate text-sm text-ink">{pet.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</p>{#if pet.propietario}<p class="mt-0.5 truncate text-xs text-stone">{pet.propietario.tipo_documento.etiqueta} · {pet.propietario.numero_documento}</p>{/if}</div></div><p class="mt-2 text-xs text-steel">{i18n.t('pets.attentionCount', { count: pet.cantidad_atenciones })}{#if pet.ultima_atencion_en} · {attentionDate(pet.ultima_atencion_en)}{/if}</p></div>{#if canAny}{@render menu(pet, true)}{/if}</div></article>{/each}</div>
    {/if}
  </Card>
  <CatalogPagination route="/clinic/pets" search={data.q} current={data.mascotas.length} total={data.total} previous={data.paginacion.anterior} next={data.paginacion.siguiente} />
</section>

<ConfirmationDialog bind:open={deleteOpen} size={deleteImpact ? 'wide' : 'default'} variant="danger" icon="trash-2" title={i18n.t(deleteImpact ? 'pets.unlinkTitle' : 'pets.deleteTitle')} description={i18n.t(deleteImpact ? 'pets.unlinkDescription' : 'pets.deleteDescription', { name: target?.nombre ?? '', owner: deleteImpact?.propietario.nombre_completo ?? '' })} confirmLabel={i18n.t(deleteImpact ? 'pets.deleteAnyway' : 'pets.delete')} cancelLabel={i18n.t('pets.cancel')} onConfirm={requestDelete}>
  {#if deleteImpact}<article class="flex items-center gap-4 rounded-xl border border-hairline bg-surface p-4 text-left"><span class="grid size-14 shrink-0 place-items-center rounded-full border border-hairline bg-canvas text-primary"><Icon name="contact" size={24} /></span><div class="min-w-0 flex-1"><span class="block text-xs font-medium text-steel">{i18n.t('pets.linkedOwner')}</span><strong class="mt-0.5 block truncate text-base text-ink">{deleteImpact.propietario.nombre_completo}</strong><div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-steel"><span>{deleteImpact.propietario.tipo_documento.etiqueta} · {deleteImpact.propietario.numero_documento}</span>{#if deleteImpact.propietario.celular}<span class="inline-flex items-center gap-1.5"><Icon name="phone" size={14} />{deleteImpact.propietario.celular}</span>{/if}</div></div></article>{/if}
  <form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden">{#if target}<input type="hidden" name="id" value={target.id_mascotas} />{#if deleteImpact}<input type="hidden" name="confirmar_desvinculacion" value="true" />{/if}{/if}</form>
</ConfirmationDialog>
