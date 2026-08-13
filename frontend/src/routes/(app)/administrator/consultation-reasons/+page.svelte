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
  type Reason = (typeof data.motivos)[number];
  const tableFeatureSet = tableFeatures({});
  const columnHelper = createColumnHelper<typeof tableFeatureSet, Reason>();
  const columns = columnHelper.columns([
    columnHelper.display({ id: 'actions', header: 'actions' }),
    columnHelper.accessor('nombre', { header: 'name' }),
    columnHelper.accessor('descripcion', { header: 'description' }),
    columnHelper.accessor('estado', { header: 'status' })
  ]);
  const reasonsTable = createTable({
    features: tableFeatureSet,
    columns,
    get data() { return data.motivos; }
  });

  let target = $state<Reason | null>(null);
  let editorTarget = $state<Reason | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let pendingActive = $state(false);
  let processing = $state(false);
  let attempted = $state(false);
  let nombre = $state('');
  let descripcion = $state('');
  let editorForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let catalogTitle: HTMLHeadingElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;

  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('consultationReasons.title') }]);
  const validName = $derived(nombre.trim().length >= 2 && nombre.trim().length <= 120);
  const validDescription = $derived(descripcion.trim().length <= 500);
  const editorDirty = $derived(!editorTarget || nombre.trim() !== editorTarget.nombre || descripcion.trim() !== (editorTarget.descripcion ?? ''));
  const editorReady = $derived(validName && validDescription && editorDirty);
  const tableLoading = $derived(Boolean(navigating.to?.url.pathname === page.url.pathname && navigating.to.url.search !== page.url.search));

  function openCreate() {
    editorTarget = null;
    nombre = '';
    descripcion = '';
    attempted = false;
    editorOpen = true;
  }

  function openEdit(reason: Reason) {
    editorTarget = reason;
    nombre = reason.nombre;
    descripcion = reason.descripcion ?? '';
    attempted = false;
    editorOpen = true;
  }

  function paginationHref(position: string) {
    const query = new URLSearchParams({ p: position });
    if (data.busqueda) query.set('q', data.busqueda);
    return `?${query}`;
  }

  function firstPageHref() {
    return data.busqueda ? `?q=${encodeURIComponent(data.busqueda)}` : '/administrator/consultation-reasons';
  }

  function navigatePagination(event: MouseEvent, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void goto(href, { replaceState: true, noScroll: true });
  }

  function resultKey(result: ActionResult, fallback = 'consultationReasons.saveError') {
    return result.type === 'failure' && typeof result.data?.reasonMessage === 'string'
      ? result.data.reasonMessage
      : fallback;
  }

  async function status(reason: Reason, active: boolean) {
    if (processing) return;
    target = reason;
    pendingActive = active;
    await tick();
    statusForm.requestSubmit();
  }

  const changeStatus: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t(pendingActive ? 'consultationReasons.activated' : 'consultationReasons.deactivated')
        });
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
      }
      processing = false;
    };
  };

  const saveEditor: SubmitFunction = () => {
    const editing = Boolean(editorTarget);
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        if (editing) {
          await update({ invalidateAll: true, reset: false });
        } else {
          await goto('/administrator/consultation-reasons', { invalidateAll: true, noScroll: true, replaceState: true });
          await tick();
          catalogTitle.focus({ preventScroll: true });
        }
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t(editing ? 'consultationReasons.updated' : 'consultationReasons.created')
        });
        resolveEditor?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
        rejectEditor?.(new Error('consultation-reason-request-failed'));
      }
      processing = false;
      resolveEditor = null;
      rejectEditor = null;
    };
  };

  const remove: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('consultationReasons.deleted') });
        resolveDelete?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result, 'consultationReasons.deleteError')) });
        rejectDelete?.(new Error('consultation-reason-delete-failed'));
      }
      processing = false;
      resolveDelete = null;
      rejectDelete = null;
    };
  };

  function submitEditor(): Promise<void> {
    attempted = true;
    if (!editorReady) return Promise.reject(new Error('invalid-consultation-reason'));
    return new Promise((resolve, reject) => {
      resolveEditor = resolve;
      rejectEditor = reject;
      editorForm.requestSubmit();
    });
  }

  function submitDelete(): Promise<void> {
    if (!target) return Promise.reject(new Error('invalid-consultation-reason'));
    return new Promise((resolve, reject) => {
      resolveDelete = resolve;
      rejectDelete = reject;
      deleteForm.requestSubmit();
    });
  }
</script>

<svelte:head><title>{i18n.t('consultationReasons.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('consultationReasons.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('consultationReasons.description')}</p></div>
    {#if canCreate}<Button onclick={openCreate}><Icon name="plus" size={18} />{i18n.t('consultationReasons.new')}</Button>{/if}
  </div>

  <div class="flex items-center justify-between gap-4">
    <h2 bind:this={catalogTitle} tabindex="-1" class="text-lg font-semibold text-ink outline-none">{i18n.t('consultationReasons.catalog')}</h2>
    <Badge variant="outline-sky">{i18n.t(data.busqueda ? 'consultationReasons.resultsCount' : 'consultationReasons.count', { count: data.total })}</Badge>
  </div>

  <form method="GET" autocomplete="off" class="flex max-w-2xl items-end gap-2 max-sm:max-w-none max-sm:flex-col max-sm:items-stretch">
    <div class="min-w-0 flex-1">
      <Input
        name="q"
        value={data.busqueda}
        autocomplete="off"
        label={i18n.t('consultationReasons.searchLabel')}
        icon="search"
        placeholder={i18n.t('consultationReasons.searchPlaceholder')}
        minlength={3}
        maxlength={120}
        oninvalid={(event) => {
          if (event.currentTarget.validity.tooShort) event.currentTarget.setCustomValidity(i18n.t('consultationReasons.searchMinLength'));
        }}
        oninput={(event) => event.currentTarget.setCustomValidity('')}
      />
    </div>
    <div class="flex h-11 items-center gap-2">
      <Button type="submit" variant="secondary"><Icon name="search" size={17} />{i18n.t('consultationReasons.search')}</Button>
      {#if data.busqueda}<Button href="/administrator/consultation-reasons" variant="ghost">{i18n.t('consultationReasons.clearSearch')}</Button>{/if}
    </div>
  </form>

  <div aria-busy={tableLoading}>
    <Card padding="none" class="relative overflow-hidden">
      {#if tableLoading}
        <div class="absolute inset-0 z-20 grid place-items-center bg-transparent backdrop-blur-[2px]" role="status" aria-live="polite">
          <div class="flex items-center gap-2.5 rounded-full border border-hairline bg-canvas px-4 py-2.5 text-sm font-semibold text-ink shadow-card">
            <span class="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true"></span>
            {i18n.t('consultationReasons.loading')}
          </div>
        </div>
      {/if}
      {#if data.motivos.length === 0}
        <div class="flex flex-col items-center px-4 py-16 text-center">
          <Icon name="stethoscope" size={34} class="mb-4 text-stone" />
          <h2 class="text-lg text-ink">{i18n.t(data.busqueda ? 'consultationReasons.noResultsTitle' : 'consultationReasons.emptyTitle')}</h2>
          <p class="mt-1 text-sm text-steel">{i18n.t(data.busqueda ? 'consultationReasons.noResultsDescription' : 'consultationReasons.emptyDescription')}</p>
          {#if canCreate}<Button class="mt-5" onclick={openCreate}><Icon name="plus" size={17} />{i18n.t('consultationReasons.new')}</Button>{/if}
        </div>
      {:else}
        <div class="hidden overflow-x-auto md:block">
          <Table.Root class="min-w-[760px] table-fixed text-left text-sm">
            <colgroup>
              {#if canAny}<col class="w-[92px]" />{/if}
              <col class="w-[32%]" />
              <col />
              <col class="w-[14%]" />
            </colgroup>
            <Table.Header class="bg-canvas">
              <Table.Row class="border-hairline hover:bg-canvas">
                {#if canAny}<Table.Head class="h-10 border-r border-hairline px-3 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('consultationReasons.actions')}</Table.Head>{/if}
                <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('consultationReasons.name')}</Table.Head>
                <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('consultationReasons.reasonDescription')}</Table.Head>
                <Table.Head class="h-10 px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('consultationReasons.status')}</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each reasonsTable.getRowModel().rows as row (row.original.id_motivos_consulta)}
                {@const reason = row.original}
                <Table.Row class="border-hairline odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">
                  {#if canAny}
                    <Table.Cell class="border-r border-hairline px-2 py-2.5">
                      <div class="flex items-center justify-center gap-1">
                        {#if canUpdate}
                          <button type="button" disabled={processing} title={i18n.t('consultationReasons.edit')} aria-label={`${i18n.t('consultationReasons.edit')}: ${reason.nombre}`} class="grid size-7 place-items-center rounded-md border border-transparent text-steel transition-colors hover:border-hairline hover:bg-canvas hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40" onclick={() => openEdit(reason)}><Icon name="pencil" size={15} /></button>
                        {/if}
                        {#if canDelete}
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('consultationReasons.actions')}: ${reason.nombre}`} class="grid size-7 place-items-center rounded-md border border-transparent text-steel transition-colors hover:border-hairline hover:bg-canvas hover:text-steel disabled:pointer-events-none disabled:opacity-40"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger>
                            <DropdownMenu.Content align="start" class="min-w-[160px]">
                              <DropdownMenu.Item disabled={processing} class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = reason; deleteOpen = true; }}><Icon name="trash-2" size={15} /><span>{i18n.t('consultationReasons.delete')}</span></DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Root>
                        {/if}
                      </div>
                    </Table.Cell>
                  {/if}
                  <Table.Cell class="border-r border-hairline px-4 py-2.5"><span class="block truncate font-normal text-steel" title={reason.nombre}>{reason.nombre}</span></Table.Cell>
                  <Table.Cell class="border-r border-hairline px-4 py-2.5 text-steel">{#if reason.descripcion}<span class="block truncate" title={reason.descripcion}>{reason.descripcion}</span>{/if}</Table.Cell>
                  <Table.Cell class="px-4 py-2.5"><div class="flex justify-center"><Switch checked={reason.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('consultationReasons.status')}: ${reason.nombre} · ${i18n.t(reason.estado === 1 ? 'consultationReasons.active' : 'consultationReasons.inactive')}`} onchange={(active) => status(reason, active)} /></div></Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </div>

        <div class="divide-y divide-hairline md:hidden">
          {#each data.motivos as reason (reason.id_motivos_consulta)}
            <article class="p-4">
              <div class="flex min-w-0 items-start gap-3">
                <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="stethoscope" size={18} /></span>
                <div class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{reason.nombre}</strong>{#if reason.descripcion}<p class="mt-1 line-clamp-2 text-xs leading-5 text-steel">{reason.descripcion}</p>{/if}</div>
              </div>
              <div class="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
                <div class="flex items-center gap-2"><Switch checked={reason.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('consultationReasons.status')}: ${reason.nombre}`} onchange={(active) => status(reason, active)} /><span class="text-xs text-steel">{i18n.t(reason.estado === 1 ? 'consultationReasons.active' : 'consultationReasons.inactive')}</span></div>
                {#if canAny}
                  <div class="flex items-center gap-1">
                    {#if canUpdate}<button type="button" disabled={processing} title={i18n.t('consultationReasons.edit')} aria-label={`${i18n.t('consultationReasons.edit')}: ${reason.nombre}`} class="grid size-8 place-items-center rounded-md border border-hairline text-steel transition-colors hover:bg-surface hover:text-primary disabled:pointer-events-none disabled:opacity-40" onclick={() => openEdit(reason)}><Icon name="pencil" size={16} /></button>{/if}
                    {#if canDelete}<DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} aria-label={`${i18n.t('consultationReasons.actions')}: ${reason.nombre}`} class="grid size-8 place-items-center rounded-md border border-hairline text-steel transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="min-w-[160px]"><DropdownMenu.Item disabled={processing} class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = reason; deleteOpen = true; }}><Icon name="trash-2" size={15} /><span>{i18n.t('consultationReasons.delete')}</span></DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}
                  </div>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </Card>
  </div>

  {#if data.total > 0}
    <nav class="flex items-center justify-between gap-4 max-sm:flex-col" aria-label={i18n.t('consultationReasons.pagination')}>
      <p class="text-sm text-steel">{i18n.t('consultationReasons.pageSummary', { count: data.motivos.length, total: data.total })}</p>
      <div class="flex items-center gap-2">
        {#if data.paginacion.anterior}<Button variant="ghost" size="sm" href={firstPageHref()} disabled={tableLoading} onclick={(event) => navigatePagination(event, firstPageHref())}>{i18n.t('consultationReasons.firstPage')}</Button>{/if}
        <Button variant="secondary" size="sm" href={data.paginacion.anterior ? paginationHref(data.paginacion.anterior) : undefined} disabled={!data.paginacion.anterior || tableLoading} onclick={(event) => data.paginacion.anterior && navigatePagination(event, paginationHref(data.paginacion.anterior))}><Icon name="chevron-left" size={16} />{i18n.t('consultationReasons.previous')}</Button>
        <Button variant="secondary" size="sm" href={data.paginacion.siguiente ? paginationHref(data.paginacion.siguiente) : undefined} disabled={!data.paginacion.siguiente || tableLoading} onclick={(event) => data.paginacion.siguiente && navigatePagination(event, paginationHref(data.paginacion.siguiente))}>{i18n.t('consultationReasons.next')}<Icon name="chevron-right" size={16} /></Button>
      </div>
    </nav>
  {/if}
</section>

<ConfirmationDialog
  bind:open={editorOpen}
  variant="info"
  icon={editorTarget ? 'pencil' : 'stethoscope'}
  title={i18n.t(editorTarget ? 'consultationReasons.editTitle' : 'consultationReasons.new')}
  description={i18n.t(editorTarget ? 'consultationReasons.editDescription' : 'consultationReasons.newDescription')}
	confirmLabel={i18n.t(editorTarget ? 'consultationReasons.saveChanges' : 'consultationReasons.create')}
  cancelLabel={i18n.t('consultationReasons.cancel')}
  confirmDisabled={!editorReady || processing}
  onConfirm={submitEditor}
>
  <form bind:this={editorForm} method="POST" action={editorTarget ? '?/update' : '?/create'} use:enhance={saveEditor} autocomplete="off" class="grid grid-cols-12 gap-4 text-left">
    {#if editorTarget}<input type="hidden" name="id" value={editorTarget.id_motivos_consulta} />{/if}
    <div class="relative z-20 col-span-12">
      <Input name="nombre" autocomplete="off" label={i18n.t('consultationReasons.name')} icon="stethoscope" placeholder={i18n.t('consultationReasons.namePlaceholder')} bind:value={nombre} maxlength={120} error={attempted && !validName ? i18n.t('consultationReasons.validation.name') : undefined} disabled={processing} required />
      <CatalogDuplicateHints query={nombre} endpoint="/administrator/consultation-reasons/search" collection="motivos" idKey="id_motivos_consulta" disabled={Boolean(editorTarget)} onSelect={(item) => openEdit(item as Reason)} />
    </div>
    <div class="col-span-12 flex flex-col gap-1.5">
      <label for="consultation-reason-description" class="text-sm font-medium text-charcoal">{i18n.t('consultationReasons.reasonDescription')} · {i18n.t('consultationReasons.optional')}</label>
      <textarea id="consultation-reason-description" name="descripcion" bind:value={descripcion} maxlength={500} rows="3" disabled={processing} placeholder={i18n.t('consultationReasons.descriptionPlaceholder')} aria-invalid={attempted && !validDescription} class="min-h-24 w-full resize-y rounded-md border bg-canvas px-3.5 py-3 text-base text-ink outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:opacity-55 {attempted && !validDescription ? 'border-error' : 'border-hairline-strong'}"></textarea>
      <span class="self-end text-xs {attempted && !validDescription ? 'text-error' : 'text-stone'}">{descripcion.length}/500</span>
    </div>
  </form>
</ConfirmationDialog>

<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('consultationReasons.deleteTitle')} description={i18n.t('consultationReasons.deleteHelp')} confirmLabel={i18n.t('consultationReasons.delete')} cancelLabel={i18n.t('consultationReasons.cancel')} confirmDisabled={!target || processing} onConfirm={submitDelete} />

<form bind:this={statusForm} method="POST" action="?/status" use:enhance={changeStatus} class="hidden"><input name="id" value={target?.id_motivos_consulta ?? ''} /><input name="activo" value={pendingActive ? 'true' : 'false'} /></form>
<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id" value={target?.id_motivos_consulta ?? ''} /></form>
