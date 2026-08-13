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
  import * as Command from '$lib/components/ui/command/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let { data }: PageProps = $props();
  type Service = (typeof data.servicios)[number];
  const tableFeatureSet = tableFeatures({});
  const columnHelper = createColumnHelper<typeof tableFeatureSet, Service>();
  const columns = columnHelper.columns([
    columnHelper.display({ id: 'actions', header: 'actions' }),
    columnHelper.accessor('nombre', { header: 'service' }),
    columnHelper.accessor('descripcion', { header: 'description' }),
    columnHelper.accessor('precio', { header: 'price' }),
    columnHelper.accessor('estado', { header: 'status' })
  ]);
  const servicesTable = createTable({
    features: tableFeatureSet,
    columns,
    get data() { return data.servicios; }
  });
  let target = $state<Service | null>(null);
  let editorTarget = $state<Service | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let pendingActive = $state(false);
  let processing = $state(false);
  let attempted = $state(false);
  let nombre = $state('');
  let descripcion = $state('');
  let precio = $state('');
  let suggestions = $state<Service[]>([]);
  let suggestionsLoading = $state(false);
  let nameFocused = $state(false);
  let blurTimer: number | undefined;
  let statusForm: HTMLFormElement;
  let editorForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let catalogTitle: HTMLHeadingElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.services.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.services.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.services.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('services.title') }]);
  const validName = $derived(nombre.trim().length >= 2 && nombre.trim().length <= 120);
  const validDescription = $derived(descripcion.trim().length <= 500);
  const validPrice = $derived(/^$|^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(precio.trim()));
  const validEditor = $derived(validName && validDescription && validPrice);
  const editorDirty = $derived(!editorTarget || nombre.trim() !== editorTarget.nombre || descripcion.trim() !== (editorTarget.descripcion ?? '') || precio.trim() !== (editorTarget.precio ?? ''));
  const normalizeName = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
  const editorReady = $derived(validEditor && editorDirty);
  const tableLoading = $derived(Boolean(
    navigating.to?.url.pathname === page.url.pathname && navigating.to.url.search !== page.url.search
  ));

  $effect(() => {
    const query = nombre.trim();
    if (!editorOpen || editorTarget || query.length < 3) {
      suggestions = [];
      suggestionsLoading = false;
      return;
    }
    suggestionsLoading = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/administrator/services/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error('service-search-failed');
        const result = await response.json() as { servicios?: Service[] };
        suggestions = result.servicios ?? [];
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          suggestions = [];
        }
      } finally {
        if (!controller.signal.aborted) suggestionsLoading = false;
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  });

  function openCreate() {
    editorTarget = null;
    nombre = '';
    descripcion = '';
    precio = '';
    suggestions = [];
    attempted = false;
    editorOpen = true;
  }

  function openEdit(service: Service) {
    editorTarget = service;
    nombre = service.nombre;
    descripcion = service.descripcion ?? '';
    precio = service.precio ?? '';
    suggestions = [];
    attempted = false;
    editorOpen = true;
  }

  function focusServiceName() {
    if (blurTimer) window.clearTimeout(blurTimer);
    nameFocused = true;
  }

  function blurServiceName() {
    blurTimer = window.setTimeout(() => { nameFocused = false; }, 100);
  }

  function displayPrice(value: string | null) {
    return value === null ? '' : `${data.moneda.codigo} ${value}`;
  }

  function highlightedName(value: string) {
    const source = Array.from(value);
    const normalized: string[] = [];
    const sourceIndexes: number[] = [];
    source.forEach((character, index) => {
      for (const normalizedCharacter of Array.from(normalizeName(character))) {
        normalized.push(normalizedCharacter);
        sourceIndexes.push(index);
      }
    });
    const match = normalized.join('').indexOf(normalizeName(nombre.trim()));
    if (match < 0 || !nombre.trim()) return [{ text: value, match: false }];
    const start = sourceIndexes[match] ?? 0;
    const end = (sourceIndexes[match + normalizeName(nombre.trim()).length - 1] ?? start) + 1;
    return [
      { text: source.slice(0, start).join(''), match: false },
      { text: source.slice(start, end).join(''), match: true },
      { text: source.slice(end).join(''), match: false }
    ].filter((part) => part.text);
  }

  function paginationHref(position: string) {
    const query = new URLSearchParams({ p: position });
    if (data.busqueda) query.set('q', data.busqueda);
    return `?${query}`;
  }

  function firstPageHref() {
    return data.busqueda ? `?q=${encodeURIComponent(data.busqueda)}` : '/administrator/services';
  }

  function navigatePagination(event: MouseEvent, href: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void goto(href, { replaceState: true, noScroll: true });
  }

  function resultKey(result: ActionResult, fallback = 'services.saveError') {
    return result.type === 'failure' && typeof result.data?.serviceMessage === 'string'
      ? result.data.serviceMessage
      : fallback;
  }

  async function status(service: Service, active: boolean) {
    if (processing) return;
    target = service;
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
          description: i18n.t(pendingActive ? 'services.activated' : 'services.deactivated')
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
          await goto('/administrator/services', { invalidateAll: true, noScroll: true, replaceState: true });
          await tick();
          catalogTitle.focus({ preventScroll: true });
        }
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t(editing ? 'services.updated' : 'services.created')
        });
        resolveEditor?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
        rejectEditor?.(new Error('service-request-failed'));
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
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('services.deleted') });
        resolveDelete?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result, 'services.deleteError')) });
        rejectDelete?.(new Error('service-delete-failed'));
      }
      processing = false;
      resolveDelete = null;
      rejectDelete = null;
    };
  };

  function submitEditor(): Promise<void> {
    attempted = true;
    if (!editorReady) return Promise.reject(new Error('invalid-service'));
    return new Promise((resolve, reject) => {
      resolveEditor = resolve;
      rejectEditor = reject;
      editorForm.requestSubmit();
    });
  }

  function submitDelete(): Promise<void> {
    if (!target) return Promise.reject(new Error('invalid-service'));
    return new Promise((resolve, reject) => {
      resolveDelete = resolve;
      rejectDelete = reject;
      deleteForm.requestSubmit();
    });
  }
</script>

<svelte:head><title>{i18n.t('services.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('services.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('services.description')}</p></div>
    {#if canCreate}<Button onclick={openCreate}><Icon name="plus" size={18} />{i18n.t('services.new')}</Button>{/if}
  </div>

  <div class="flex items-center justify-between gap-4">
    <h2 bind:this={catalogTitle} tabindex="-1" class="text-lg font-semibold text-ink outline-none">{i18n.t('services.catalog')}</h2>
    <Badge variant="outline-sky">{i18n.t(data.busqueda ? 'services.resultsCount' : 'services.count', { count: data.total })}</Badge>
  </div>

  <form method="GET" autocomplete="off" class="flex max-w-2xl items-end gap-2 max-sm:max-w-none max-sm:flex-col max-sm:items-stretch">
    <div class="min-w-0 flex-1">
      <Input
        name="q"
        value={data.busqueda}
        autocomplete="off"
        label={i18n.t('services.searchLabel')}
        icon="search"
        placeholder={i18n.t('services.searchPlaceholder')}
        minlength={3}
        maxlength={120}
        oninvalid={(event) => {
          if (event.currentTarget.validity.tooShort) {
            event.currentTarget.setCustomValidity(i18n.t('services.searchMinLength'));
          }
        }}
        oninput={(event) => event.currentTarget.setCustomValidity('')}
      />
    </div>
    <div class="flex h-11 items-center gap-2">
      <Button type="submit" variant="secondary"><Icon name="search" size={17} />{i18n.t('services.search')}</Button>
      {#if data.busqueda}<Button href="/administrator/services" variant="ghost">{i18n.t('services.clearSearch')}</Button>{/if}
    </div>
  </form>

  <div aria-busy={tableLoading}>
  <Card padding="none" class="relative overflow-hidden">
    {#if tableLoading}
      <div class="absolute inset-0 z-20 grid place-items-center bg-transparent backdrop-blur-[2px]" role="status" aria-live="polite">
        <div class="flex items-center gap-2.5 rounded-full border border-hairline bg-canvas px-4 py-2.5 text-sm font-semibold text-ink shadow-card">
          <span class="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true"></span>
          {i18n.t('services.loading')}
        </div>
      </div>
    {/if}
    {#if data.servicios.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center">
        <Icon name="clipboard-check" size={34} class="mb-4 text-stone" />
        <h2 class="text-lg text-ink">{i18n.t(data.busqueda ? 'services.noResultsTitle' : 'services.emptyTitle')}</h2>
        <p class="mt-1 text-sm text-steel">{i18n.t(data.busqueda ? 'services.noResultsDescription' : 'services.emptyDescription')}</p>
        {#if canCreate}<Button class="mt-5" onclick={openCreate}><Icon name="plus" size={17} />{i18n.t('services.new')}</Button>{/if}
      </div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <Table.Root class="min-w-[900px] table-fixed text-left text-sm">
          <colgroup>
            {#if canAny}<col class="w-[92px]" />{/if}
            <col class="w-[23%]" />
            <col />
            <col class="w-[16%]" />
            <col class="w-[12%]" />
          </colgroup>
          <Table.Header class="bg-canvas">
            <Table.Row class="border-hairline hover:bg-canvas">
              {#if canAny}<Table.Head class="h-10 border-r border-hairline px-3 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('services.actions')}</Table.Head>{/if}
              <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('services.service')}</Table.Head>
              <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('services.serviceDescription')}</Table.Head>
              <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('services.price')}</Table.Head>
              <Table.Head class="h-10 px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('services.status')}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each servicesTable.getRowModel().rows as row (row.original.id_servicios_veterinaria)}
              {@const service = row.original}
              <Table.Row class="border-hairline odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">
                {#if canAny}
                  <Table.Cell class="border-r border-hairline px-2 py-2.5">
                    <div class="flex items-center justify-center gap-1">
                      {#if canUpdate}
                        <button
                          type="button"
                          disabled={processing}
                          title={i18n.t('services.editAction')}
                          aria-label={`${i18n.t('services.editAction')}: ${service.nombre}`}
                          class="grid size-7 place-items-center rounded-md border border-transparent text-steel transition-colors hover:border-hairline hover:bg-canvas hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-40"
                          onclick={() => openEdit(service)}
                        ><Icon name="pencil" size={15} /></button>
                      {/if}
                      {#if canDelete}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger
                            disabled={processing}
                            aria-label={`${i18n.t('services.actions')}: ${service.nombre}`}
                            class="grid size-7 place-items-center rounded-md border border-transparent text-steel transition-colors hover:border-hairline hover:bg-canvas hover:text-steel disabled:pointer-events-none disabled:opacity-40"
                          ><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger>
                          <DropdownMenu.Content align="start" class="min-w-[160px]">
                            <DropdownMenu.Item
                              disabled={processing}
                              class="text-error focus:bg-error/10 focus:text-error"
                              onSelect={() => { target = service; deleteOpen = true; }}
                            ><Icon name="trash-2" size={15} /><span>{i18n.t('services.delete')}</span></DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      {/if}
                    </div>
                  </Table.Cell>
                {/if}
                <Table.Cell class="border-r border-hairline px-4 py-2.5">
                  <span class="block truncate font-normal text-steel" title={service.nombre}>{service.nombre}</span>
                </Table.Cell>
                <Table.Cell class="border-r border-hairline px-4 py-2.5 text-steel">
                  {#if service.descripcion}<span class="block truncate" title={service.descripcion}>{service.descripcion}</span>{/if}
                </Table.Cell>
                <Table.Cell class="border-r border-hairline px-4 py-2.5 font-normal text-steel">{displayPrice(service.precio)}</Table.Cell>
                <Table.Cell class="px-4 py-2.5">
                  <div class="flex justify-center">
                    <Switch checked={service.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('services.status')}: ${service.nombre} · ${i18n.t(service.estado === 1 ? 'services.active' : 'services.inactive')}`} onchange={(active) => status(service, active)} />
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.servicios as service (service.id_servicios_veterinaria)}
          <article class="p-4">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="clipboard-check" size={18} /></span>
              <div class="min-w-0 flex-1">
                <strong class="block truncate text-sm text-ink">{service.nombre}</strong>
                <p class="mt-1 line-clamp-2 text-xs leading-5 text-steel">{service.descripcion || i18n.t('services.noDescription')}</p>
                {#if service.precio}<p class="mt-2 text-sm font-semibold text-ink">{displayPrice(service.precio)}</p>{/if}
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <div class="flex items-center gap-2">
                <Switch checked={service.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('services.status')}: ${service.nombre}`} onchange={(active) => status(service, active)} />
                <span class="text-xs text-steel">{i18n.t(service.estado === 1 ? 'services.active' : 'services.inactive')}</span>
              </div>
              {#if canAny}
                <div class="flex items-center gap-1">
                  {#if canUpdate}
                    <button
                      type="button"
                      disabled={processing}
                      title={i18n.t('services.editAction')}
                      aria-label={`${i18n.t('services.editAction')}: ${service.nombre}`}
                      class="grid size-8 place-items-center rounded-md border border-hairline text-steel transition-colors hover:bg-surface hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                      onclick={() => openEdit(service)}
                    ><Icon name="pencil" size={16} /></button>
                  {/if}
                  {#if canDelete}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        disabled={processing}
                        aria-label={`${i18n.t('services.actions')}: ${service.nombre}`}
                        class="grid size-8 place-items-center rounded-md border border-hairline text-steel transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40"
                      ><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" class="min-w-[160px]">
                      <DropdownMenu.Item
                        disabled={processing}
                        class="text-error focus:bg-error/10 focus:text-error"
                        onSelect={() => { target = service; deleteOpen = true; }}
                      >
                        <Icon name="trash-2" size={15} />
                        <span>{i18n.t('services.delete')}</span>
                      </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  {/if}
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
    <nav class="flex items-center justify-between gap-4 max-sm:flex-col" aria-label={i18n.t('services.pagination')}>
      <p class="text-sm text-steel">{i18n.t('services.pageSummary', { count: data.servicios.length, total: data.total })}</p>
      <div class="flex items-center gap-2">
        {#if data.paginacion.anterior}
          <Button
            variant="ghost"
            size="sm"
            href={firstPageHref()}
            disabled={tableLoading}
            onclick={(event) => navigatePagination(event, firstPageHref())}
          >{i18n.t('services.firstPage')}</Button>
        {/if}
        <Button
          variant="secondary"
          size="sm"
          href={data.paginacion.anterior ? paginationHref(data.paginacion.anterior) : undefined}
          disabled={!data.paginacion.anterior || tableLoading}
          onclick={(event) => data.paginacion.anterior && navigatePagination(event, paginationHref(data.paginacion.anterior))}
        ><Icon name="chevron-left" size={16} />{i18n.t('services.previous')}</Button>
        <Button
          variant="secondary"
          size="sm"
          href={data.paginacion.siguiente ? paginationHref(data.paginacion.siguiente) : undefined}
          disabled={!data.paginacion.siguiente || tableLoading}
          onclick={(event) => data.paginacion.siguiente && navigatePagination(event, paginationHref(data.paginacion.siguiente))}
        >{i18n.t('services.next')}<Icon name="chevron-right" size={16} /></Button>
      </div>
    </nav>
  {/if}
</section>

<ConfirmationDialog
  bind:open={editorOpen}
  size="wide"
  variant="info"
  icon={editorTarget ? 'pencil' : 'clipboard-check'}
  title={i18n.t(editorTarget ? 'services.edit' : 'services.new')}
  description={i18n.t(editorTarget ? 'services.editDescription' : 'services.newDescription')}
  confirmLabel={i18n.t(editorTarget ? 'services.save' : 'services.create')}
  cancelLabel={i18n.t('services.cancel')}
  confirmDisabled={!editorReady || processing}
  onConfirm={submitEditor}
>
  <form bind:this={editorForm} method="POST" action={editorTarget ? '?/update' : '?/create'} use:enhance={saveEditor} autocomplete="off" class="grid grid-cols-12 gap-4 text-left">
    {#if editorTarget}<input type="hidden" name="id" value={editorTarget.id_servicios_veterinaria} />{/if}
    <div class="relative z-20 col-span-8 max-[700px]:col-span-12">
      <Input
        name="nombre"
        autocomplete="off"
        label={i18n.t('services.name')}
        icon="clipboard-check"
        placeholder={i18n.t('services.namePlaceholder')}
        bind:value={nombre}
        onfocus={focusServiceName}
        onblur={blurServiceName}
        maxlength={120}
        error={attempted && !validName ? i18n.t('services.validation.name') : undefined}
        disabled={processing}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={nameFocused && !suggestionsLoading && suggestions.length > 0}
        aria-controls="service-name-suggestions"
        required
      />
      {#if nameFocused && !suggestionsLoading && suggestions.length > 0}
        <Command.Root
          shouldFilter={false}
          id="service-name-suggestions"
          class="absolute inset-x-0 top-[calc(100%+0.4rem)] z-50 h-auto overflow-hidden rounded-md border border-hairline-strong bg-canvas p-0 shadow-card"
          aria-label={i18n.t('services.matches')}
        >
          <Command.List class="max-h-64 p-1">
            {#each suggestions as service (service.id_servicios_veterinaria)}
                <Command.Item
                  value={service.id_servicios_veterinaria}
                  onSelect={() => openEdit(service)}
                  class="rounded-md px-3 py-2.5 text-ink data-selected:bg-primary-soft data-selected:text-ink"
                >
                  <span class="min-w-0 flex-1 truncate text-sm font-normal text-steel">
                    {#each highlightedName(service.nombre) as part}{#if part.match}<mark class="bg-transparent font-semibold text-primary">{part.text}</mark>{:else}{part.text}{/if}{/each}
                  </span>
                </Command.Item>
            {/each}
          </Command.List>
        </Command.Root>
      {/if}
    </div>
    <div class="col-span-4 max-[700px]:col-span-12">
      <Input name="precio" label={`${i18n.t('services.price')} · ${i18n.t('services.priceOptional')}`} inputmode="decimal" placeholder="0.00" suffix={data.moneda.codigo} bind:value={precio} maxlength={11} error={attempted && !validPrice ? i18n.t('services.validation.price') : undefined} disabled={processing} />
    </div>
    <div class="col-span-12 flex flex-col gap-1.5">
      <label for="service-description" class="text-sm font-medium text-charcoal">{i18n.t('services.serviceDescription')} · {i18n.t('services.priceOptional')}</label>
      <textarea id="service-description" name="descripcion" bind:value={descripcion} maxlength={500} rows="3" disabled={processing} placeholder={i18n.t('services.descriptionPlaceholder')} aria-invalid={attempted && !validDescription} class="min-h-24 w-full resize-y rounded-md border bg-canvas px-3.5 py-3 text-base text-ink outline-none transition focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:opacity-55 {attempted && !validDescription ? 'border-error' : 'border-hairline-strong'}"></textarea>
      <span class="self-end text-xs {attempted && !validDescription ? 'text-error' : 'text-stone'}">{descripcion.length}/500</span>
    </div>
  </form>
</ConfirmationDialog>

<ConfirmationDialog
  bind:open={deleteOpen}
  variant="danger"
  icon="trash-2"
  title={i18n.t('services.deleteTitle')}
  description={i18n.t('services.deleteDescription', { name: target?.nombre ?? '' })}
  confirmLabel={i18n.t('services.delete')}
  cancelLabel={i18n.t('services.cancel')}
  confirmDisabled={!target || processing}
  onConfirm={submitDelete}
/>

<form bind:this={statusForm} method="POST" action="?/status" use:enhance={changeStatus} class="hidden">
  <input name="id" value={target?.id_servicios_veterinaria ?? ''} />
  <input name="activo" value={pendingActive ? 'true' : 'false'} />
</form>

<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden">
  <input name="id" value={target?.id_servicios_veterinaria ?? ''} />
</form>
