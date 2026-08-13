<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { createColumnHelper, createTable, tableFeatures } from '@tanstack/svelte-table';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Switch, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import CatalogSearch from '$lib/components/CatalogSearch.svelte'; import CatalogLoadingOverlay from '$lib/components/CatalogLoadingOverlay.svelte'; import CatalogPagination from '$lib/components/CatalogPagination.svelte';
  import CatalogDuplicateHints from '$lib/components/CatalogDuplicateHints.svelte';

  let { data }: PageProps = $props();
  type HospitalizationType = (typeof data.tipos)[number];
  const featureSet = tableFeatures({}); const columnHelper = createColumnHelper<typeof featureSet, HospitalizationType>(); const typesTable = createTable({ features: featureSet, columns: columnHelper.columns([columnHelper.display({ id: 'actions' }), columnHelper.accessor('nombre', { header: 'name' }), columnHelper.accessor('estado', { header: 'status' })]), get data() { return data.tipos; } });
  let selected = $state<HospitalizationType | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let operation = $state<'save' | 'status' | 'delete'>('save');
  let nombre = $state('');
  let editorForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('hospitalizationTypes.title') }]);

  function edit(item: HospitalizationType | null) {
    selected = item;
    nombre = item?.nombre ?? '';
    editorOpen = true;
  }

  const submit: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        if (operation === 'save' && !selected) await goto('/administrator/hospitalization-types', { invalidateAll: true, noScroll: true, replaceState: true }); else await update({ invalidateAll: true, reset: false });
        const message = operation === 'delete' ? 'hospitalizationTypes.deleted' : operation === 'status' ? (selected?.estado === 1 ? 'hospitalizationTypes.deactivated' : 'hospitalizationTypes.activated') : 'hospitalizationTypes.saved';
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t(message) });
        resolveEditor?.();
        resolveDelete?.();
      } else {
        const message = result.type === 'failure' && typeof result.data?.hospitalizationTypeMessage === 'string' ? result.data.hospitalizationTypeMessage : 'hospitalizationTypes.saveError';
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
        rejectEditor?.(new Error(message));
        rejectDelete?.(new Error(message));
      }
      processing = false;
      resolveEditor = null;
      rejectEditor = null;
      resolveDelete = null;
      rejectDelete = null;
    };
  };

  function submitEditor() {
    if (!editorForm?.reportValidity()) return Promise.reject(new Error('invalid-hospitalization-type'));
    return new Promise<void>((resolve, reject) => {
      operation = 'save';
      resolveEditor = resolve;
      rejectEditor = reject;
      editorForm.requestSubmit();
    });
  }

  function submitDelete() {
    return new Promise<void>((resolve, reject) => {
      operation = 'delete';
      resolveDelete = resolve;
      rejectDelete = reject;
      deleteForm.requestSubmit();
    });
  }

  function status(item: HospitalizationType, active: boolean) {
    selected = item;
    operation = 'status';
    requestAnimationFrame(() => {
      (statusForm.elements.namedItem('activo') as HTMLInputElement).value = String(active);
      statusForm.requestSubmit();
    });
  }
</script>

<svelte:head><title>{i18n.t('hospitalizationTypes.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('hospitalizationTypes.title')}</h1><p class="mt-1.5 max-w-[64ch] text-steel">{i18n.t('hospitalizationTypes.description')}</p></div>
    {#if canCreate}<Button onclick={() => edit(null)}><Icon name="plus" size={17} />{i18n.t('hospitalizationTypes.new')}</Button>{/if}
  </div>
  <CatalogSearch value={data.busqueda} route="/administrator/hospitalization-types" maxLength={120} />
  <Card padding="none" class="relative overflow-hidden"><CatalogLoadingOverlay />
    {#if !data.tipos.length}
      <div class="py-14 text-center"><Icon name="hospital" size={32} class="mx-auto text-stone" /><p class="mt-3 font-semibold text-ink">{i18n.t('hospitalizationTypes.empty')}</p></div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[620px] border-collapse text-left">
          <thead class="bg-canvas"><tr class="border-b border-hairline text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{#if canAny}<th class="w-[92px] border-r border-hairline px-3 py-3 text-center">{i18n.t('hospitalizationTypes.actions')}</th>{/if}<th class="border-r border-hairline px-4 py-3">{i18n.t('hospitalizationTypes.name')}</th><th class="w-[18%] px-4 py-3 text-center">{i18n.t('hospitalizationTypes.status')}</th></tr></thead>
          <tbody class="divide-y divide-hairline">
            {#each typesTable.getRowModel().rows as row (row.original.id_tipos_hospitalizacion)}{@const item = row.original}
              <tr class="border-b border-hairline odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">{#if canAny}<td class="border-r border-hairline px-2 py-2.5"><div class="flex justify-center gap-1">{#if canUpdate}<button type="button" title={i18n.t('hospitalizationTypes.edit')} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas hover:text-primary" onclick={() => edit(item)}><Icon name="pencil" size={15} /></button>{/if}{#if canDelete}<DropdownMenu.Root><DropdownMenu.Trigger class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="start"><DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { selected = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('hospitalizationTypes.delete')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}</div></td>{/if}<td class="border-r border-hairline px-4 py-2.5 font-normal text-steel">{item.nombre}</td><td class="px-4 py-2.5"><div class="flex justify-center"><Switch checked={item.estado === 1} disabled={!canUpdate || processing} label={`${i18n.t('hospitalizationTypes.status')}: ${item.nombre}`} onchange={(active) => status(item, active)} /></div></td></tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.tipos as item (item.id_tipos_hospitalizacion)}
          <article class="p-4"><strong class="block truncate text-sm text-ink">{item.nombre}</strong><div class="mt-4 flex items-center justify-between border-t border-hairline pt-3"><div class="flex items-center gap-2"><Switch checked={item.estado === 1} disabled={!canUpdate || processing} label={`${i18n.t('hospitalizationTypes.status')}: ${item.nombre}`} onchange={(active) => status(item, active)} /><span class="text-xs text-steel">{i18n.t(item.estado === 1 ? 'hospitalizationTypes.active' : 'hospitalizationTypes.inactive')}</span></div>{#if canAny}<DropdownMenu.Root><DropdownMenu.Trigger class="grid size-8 place-items-center rounded-md text-stone" aria-label={`${i18n.t('hospitalizationTypes.actions')}: ${item.nombre}`}><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end">{#if canUpdate}<DropdownMenu.Item onSelect={() => edit(item)}><Icon name="pencil" size={15} />{i18n.t('hospitalizationTypes.edit')}</DropdownMenu.Item>{/if}{#if canDelete}<DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { selected = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('hospitalizationTypes.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>{/if}</div></article>
        {/each}
      </div>
    {/if}
  </Card>
  <CatalogPagination route="/administrator/hospitalization-types" search={data.busqueda} current={data.tipos.length} total={data.total} previous={data.paginacion.anterior} next={data.paginacion.siguiente} />
</section>

<form bind:this={statusForm} class="hidden" method="POST" action="?/status" use:enhance={submit}><input name="id" value={selected?.id_tipos_hospitalizacion ?? ''} /><input name="activo" /></form>
<form bind:this={deleteForm} class="hidden" method="POST" action="?/delete" use:enhance={submit}><input name="id" value={selected?.id_tipos_hospitalizacion ?? ''} /></form>
<ConfirmationDialog bind:open={editorOpen} variant="info" icon={selected ? 'pencil' : 'hospital'} title={i18n.t(selected ? 'hospitalizationTypes.editTitle' : 'hospitalizationTypes.new')} description={i18n.t('hospitalizationTypes.editorHelp')} confirmLabel={i18n.t('hospitalizationTypes.save')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={processing} onConfirm={submitEditor}><form bind:this={editorForm} method="POST" action={selected ? '?/update' : '?/create'} use:enhance={submit} autocomplete="off" class="text-left"><input type="hidden" name="id" value={selected?.id_tipos_hospitalizacion ?? ''} /><div class="relative"><Input name="nombre" autocomplete="off" label={i18n.t('hospitalizationTypes.name')} bind:value={nombre} required maxlength={120} /><CatalogDuplicateHints query={nombre} endpoint="/administrator/hospitalization-types/search" collection="tipos" idKey="id_tipos_hospitalizacion" disabled={Boolean(selected)} onSelect={(item) => edit(item as HospitalizationType)} /></div></form></ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" title={i18n.t('hospitalizationTypes.deleteTitle')} description={i18n.t('hospitalizationTypes.deleteHelp')} confirmLabel={i18n.t('hospitalizationTypes.delete')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={processing} onConfirm={submitDelete} />
