<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { navigating, page } from '$app/state';
  import { tick } from 'svelte';
  import { createColumnHelper, createTable, tableFeatures } from '@tanstack/svelte-table';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Switch, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Table from '$lib/components/ui/table/index.js';
  import CatalogDuplicateHints from '$lib/components/CatalogDuplicateHints.svelte';

  let { data }: PageProps = $props();
  type Vaccine = (typeof data.vacunas)[number];
  const featureSet = tableFeatures({});
  const columnHelper = createColumnHelper<typeof featureSet, Vaccine>();
  const columns = columnHelper.columns([
    columnHelper.display({ id: 'actions', header: 'actions' }),
    columnHelper.accessor('nombre', { header: 'name' }),
    columnHelper.accessor('estado', { header: 'status' })
  ]);
  const vaccinesTable = createTable({ features: featureSet, columns, get data() { return data.vacunas; } });

  let target = $state<Vaccine | null>(null);
  let editorTarget = $state<Vaccine | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let pendingActive = $state(false);
  let processing = $state(false);
  let attempted = $state(false);
  let nombre = $state('');
  let editorForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let catalogTitle: HTMLHeadingElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;

  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('vaccines.title') }]);
  const validName = $derived(nombre.trim().length >= 2 && nombre.trim().length <= 120);
  const editorDirty = $derived(!editorTarget || nombre.trim() !== editorTarget.nombre);
  const editorReady = $derived(validName && editorDirty);
  const tableLoading = $derived(Boolean(navigating.to?.url.pathname === page.url.pathname && navigating.to.url.search !== page.url.search));

  function openCreate() { editorTarget = null; nombre = ''; attempted = false; editorOpen = true; }
  function openEdit(vaccine: Vaccine) { editorTarget = vaccine; nombre = vaccine.nombre; attempted = false; editorOpen = true; }
  function paginationHref(position: string) { const query = new URLSearchParams({ p: position }); if (data.busqueda) query.set('q', data.busqueda); return `?${query}`; }
  function firstPageHref() { return data.busqueda ? `?q=${encodeURIComponent(data.busqueda)}` : '/administrator/vaccines'; }
  function navigatePagination(event: MouseEvent, href: string) { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); void goto(href, { replaceState: true, noScroll: true }); }
  function resultKey(result: ActionResult, fallback = 'vaccines.saveError') { return result.type === 'failure' && typeof result.data?.vaccineMessage === 'string' ? result.data.vaccineMessage : fallback; }
  async function status(vaccine: Vaccine, active: boolean) { if (processing) return; target = vaccine; pendingActive = active; await tick(); statusForm.requestSubmit(); }

  const changeStatus: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t(pendingActive ? 'vaccines.activated' : 'vaccines.deactivated') }); }
      else toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
      processing = false;
    };
  };
  const saveEditor: SubmitFunction = () => {
    const editing = Boolean(editorTarget); processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        if (editing) await update({ invalidateAll: true, reset: false });
        else { await goto('/administrator/vaccines', { invalidateAll: true, noScroll: true, replaceState: true }); await tick(); catalogTitle.focus({ preventScroll: true }); }
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t(editing ? 'vaccines.updated' : 'vaccines.created') }); resolveEditor?.();
      } else { toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) }); rejectEditor?.(new Error('vaccine-request-failed')); }
      processing = false; resolveEditor = null; rejectEditor = null;
    };
  };
  const remove: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t('vaccines.deleted') }); resolveDelete?.(); }
      else { toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result, 'vaccines.deleteError')) }); rejectDelete?.(new Error('vaccine-delete-failed')); }
      processing = false; resolveDelete = null; rejectDelete = null;
    };
  };
  function submitEditor(): Promise<void> { attempted = true; if (!editorReady) return Promise.reject(new Error('invalid-vaccine')); return new Promise((resolve, reject) => { resolveEditor = resolve; rejectEditor = reject; editorForm.requestSubmit(); }); }
  function submitDelete(): Promise<void> { if (!target) return Promise.reject(new Error('invalid-vaccine')); return new Promise((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); }); }
</script>

<svelte:head><title>{i18n.t('vaccines.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('vaccines.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('vaccines.description')}</p></div>
    {#if canCreate}<Button onclick={openCreate}><Icon name="plus" size={18} />{i18n.t('vaccines.new')}</Button>{/if}
  </div>
  <div class="flex items-center justify-between gap-4"><h2 bind:this={catalogTitle} tabindex="-1" class="text-lg font-semibold text-ink outline-none">{i18n.t('vaccines.catalog')}</h2><Badge variant="outline-sky">{i18n.t(data.busqueda ? 'vaccines.resultsCount' : 'vaccines.count', { count: data.total })}</Badge></div>
  <form method="GET" autocomplete="off" class="flex max-w-2xl items-end gap-2 max-sm:max-w-none max-sm:flex-col max-sm:items-stretch">
    <div class="min-w-0 flex-1"><Input name="q" value={data.busqueda} autocomplete="off" label={i18n.t('vaccines.searchLabel')} icon="search" placeholder={i18n.t('vaccines.searchPlaceholder')} minlength={3} maxlength={120} oninvalid={(event) => { if (event.currentTarget.validity.tooShort) event.currentTarget.setCustomValidity(i18n.t('vaccines.searchMinLength')); }} oninput={(event) => event.currentTarget.setCustomValidity('')} /></div>
    <div class="flex h-11 items-center gap-2"><Button type="submit" variant="secondary"><Icon name="search" size={17} />{i18n.t('vaccines.search')}</Button>{#if data.busqueda}<Button href="/administrator/vaccines" variant="ghost">{i18n.t('vaccines.clearSearch')}</Button>{/if}</div>
  </form>
  <div aria-busy={tableLoading}>
    <Card padding="none" class="relative overflow-hidden">
      {#if tableLoading}<div class="absolute inset-0 z-20 grid place-items-center bg-transparent backdrop-blur-[2px]" role="status" aria-live="polite"><div class="flex items-center gap-2.5 rounded-full border border-hairline bg-canvas px-4 py-2.5 text-sm font-semibold text-ink shadow-card"><span class="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true"></span>{i18n.t('vaccines.loading')}</div></div>{/if}
      {#if data.vacunas.length === 0}
        <div class="flex flex-col items-center px-4 py-16 text-center"><Icon name="syringe" size={34} class="mb-4 text-stone" /><h2 class="text-lg text-ink">{i18n.t(data.busqueda ? 'vaccines.noResultsTitle' : 'vaccines.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t(data.busqueda ? 'vaccines.noResultsDescription' : 'vaccines.emptyDescription')}</p>{#if canCreate}<Button class="mt-5" onclick={openCreate}><Icon name="plus" size={17} />{i18n.t('vaccines.new')}</Button>{/if}</div>
      {:else}
        <div class="hidden overflow-x-auto md:block">
          <Table.Root class="min-w-[560px] table-fixed text-left text-sm"><colgroup>{#if canAny}<col class="w-[92px]" />{/if}<col /><col class="w-[18%]" /></colgroup>
            <Table.Header class="bg-canvas"><Table.Row class="border-hairline hover:bg-canvas">{#if canAny}<Table.Head class="h-10 border-r border-hairline px-3 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('vaccines.actions')}</Table.Head>{/if}<Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('vaccines.name')}</Table.Head><Table.Head class="h-10 px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('vaccines.status')}</Table.Head></Table.Row></Table.Header>
            <Table.Body>{#each vaccinesTable.getRowModel().rows as row (row.original.id_vacunas)}{@const vaccine = row.original}<Table.Row class="border-hairline odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">
              {#if canAny}<Table.Cell class="border-r border-hairline px-2 py-2.5"><div class="flex items-center justify-center gap-1">{#if canUpdate}<button type="button" disabled={processing} title={i18n.t('vaccines.edit')} aria-label={`${i18n.t('vaccines.edit')}: ${vaccine.nombre}`} class="grid size-7 place-items-center rounded-md border border-transparent text-steel transition-colors hover:border-hairline hover:bg-canvas hover:text-primary disabled:pointer-events-none disabled:opacity-40" onclick={() => openEdit(vaccine)}><Icon name="pencil" size={15} /></button>{/if}{#if canDelete}<DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('vaccines.actions')}: ${vaccine.nombre}`} class="grid size-7 place-items-center rounded-md border border-transparent text-steel hover:border-hairline hover:bg-canvas disabled:opacity-40"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="start" class="min-w-[160px]"><DropdownMenu.Item disabled={processing} class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = vaccine; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('vaccines.delete')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}</div></Table.Cell>{/if}
              <Table.Cell class="border-r border-hairline px-4 py-2.5"><span class="block truncate font-normal text-steel" title={vaccine.nombre}>{vaccine.nombre}</span></Table.Cell><Table.Cell class="px-4 py-2.5"><div class="flex justify-center"><Switch checked={vaccine.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('vaccines.status')}: ${vaccine.nombre}`} onchange={(active) => status(vaccine, active)} /></div></Table.Cell>
            </Table.Row>{/each}</Table.Body>
          </Table.Root>
        </div>
        <div class="divide-y divide-hairline md:hidden">{#each data.vacunas as vaccine (vaccine.id_vacunas)}<article class="p-4"><div class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="syringe" size={18} /></span><strong class="min-w-0 flex-1 truncate text-sm text-ink">{vaccine.nombre}</strong></div><div class="mt-4 flex items-center justify-between border-t border-hairline pt-3"><div class="flex items-center gap-2"><Switch checked={vaccine.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('vaccines.status')}: ${vaccine.nombre}`} onchange={(active) => status(vaccine, active)} /><span class="text-xs text-steel">{i18n.t(vaccine.estado === 1 ? 'vaccines.active' : 'vaccines.inactive')}</span></div>{#if canAny}<div class="flex gap-1">{#if canUpdate}<button type="button" title={i18n.t('vaccines.edit')} class="grid size-8 place-items-center rounded-md border border-hairline text-steel" onclick={() => openEdit(vaccine)}><Icon name="pencil" size={16} /></button>{/if}{#if canDelete}<DropdownMenu.Root><DropdownMenu.Trigger class="grid size-8 place-items-center rounded-md border border-hairline text-steel"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end"><DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = vaccine; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('vaccines.delete')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}</div>{/if}</div></article>{/each}</div>
      {/if}
    </Card>
  </div>
  {#if data.total > 0}<nav class="flex items-center justify-between gap-4 max-sm:flex-col" aria-label={i18n.t('vaccines.pagination')}><p class="text-sm text-steel">{i18n.t('vaccines.pageSummary', { count: data.vacunas.length, total: data.total })}</p><div class="flex items-center gap-2">{#if data.paginacion.anterior}<Button variant="ghost" size="sm" href={firstPageHref()} disabled={tableLoading} onclick={(event) => navigatePagination(event, firstPageHref())}>{i18n.t('vaccines.firstPage')}</Button>{/if}<Button variant="secondary" size="sm" href={data.paginacion.anterior ? paginationHref(data.paginacion.anterior) : undefined} disabled={!data.paginacion.anterior || tableLoading} onclick={(event) => data.paginacion.anterior && navigatePagination(event, paginationHref(data.paginacion.anterior))}><Icon name="chevron-left" size={16} />{i18n.t('vaccines.previous')}</Button><Button variant="secondary" size="sm" href={data.paginacion.siguiente ? paginationHref(data.paginacion.siguiente) : undefined} disabled={!data.paginacion.siguiente || tableLoading} onclick={(event) => data.paginacion.siguiente && navigatePagination(event, paginationHref(data.paginacion.siguiente))}>{i18n.t('vaccines.next')}<Icon name="chevron-right" size={16} /></Button></div></nav>{/if}
</section>

<ConfirmationDialog bind:open={editorOpen} variant="info" icon={editorTarget ? 'pencil' : 'syringe'} title={i18n.t(editorTarget ? 'vaccines.editTitle' : 'vaccines.new')} description={i18n.t(editorTarget ? 'vaccines.editDescription' : 'vaccines.newDescription')} confirmLabel={i18n.t(editorTarget ? 'vaccines.saveChanges' : 'vaccines.create')} cancelLabel={i18n.t('vaccines.cancel')} confirmDisabled={!editorReady || processing} onConfirm={submitEditor}>
  <form bind:this={editorForm} method="POST" action={editorTarget ? '?/update' : '?/create'} use:enhance={saveEditor} autocomplete="off" class="text-left">{#if editorTarget}<input type="hidden" name="id" value={editorTarget.id_vacunas} />{/if}<div class="relative z-20"><Input name="nombre" autocomplete="off" label={i18n.t('vaccines.name')} icon="syringe" placeholder={i18n.t('vaccines.namePlaceholder')} bind:value={nombre} maxlength={120} error={attempted && !validName ? i18n.t('vaccines.validationName') : undefined} disabled={processing} required /><CatalogDuplicateHints query={nombre} endpoint="/administrator/vaccines/search" collection="vacunas" idKey="id_vacunas" disabled={Boolean(editorTarget)} onSelect={(item) => openEdit(item as Vaccine)} /></div></form>
</ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('vaccines.deleteTitle')} description={i18n.t('vaccines.deleteHelp')} confirmLabel={i18n.t('vaccines.delete')} cancelLabel={i18n.t('vaccines.cancel')} confirmDisabled={!target || processing} onConfirm={submitDelete} />
<form bind:this={statusForm} method="POST" action="?/status" use:enhance={changeStatus} class="hidden"><input name="id" value={target?.id_vacunas ?? ''} /><input name="activo" value={pendingActive ? 'true' : 'false'} /></form>
<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id" value={target?.id_vacunas ?? ''} /></form>
