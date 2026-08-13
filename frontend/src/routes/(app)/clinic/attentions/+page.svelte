<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { createColumnHelper, createTable, tableFeatures } from '@tanstack/svelte-table';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import CatalogSearch from '$lib/components/CatalogSearch.svelte';
  import CatalogLoadingOverlay from '$lib/components/CatalogLoadingOverlay.svelte';
  import CatalogPagination from '$lib/components/CatalogPagination.svelte';

  let { data }: PageProps = $props();
  type Attention = (typeof data.atenciones)[number];
  const featureSet = tableFeatures({});
  const columnHelper = createColumnHelper<typeof featureSet, Attention>();
  const attentionsTable = createTable({ features: featureSet, columns: columnHelper.columns([columnHelper.display({ id: 'actions' }), columnHelper.accessor('llegada_en', { header: 'arrival' }), columnHelper.accessor('mascota', { header: 'patient' }), columnHelper.accessor('propietario', { header: 'owner' }), columnHelper.accessor('registros', { header: 'records' }), columnHelper.accessor('estado_atencion', { header: 'status' })]), get data() { return data.atenciones; } });
  type AttentionStatus = { id_parametros: string; codigo: string; etiqueta: string; color_hex: string };
  type DeleteImpact = { estado_codigo: string; cantidad_registros: number };
  let target = $state<Attention | null>(null);
  let selectedStatus = $state<AttentionStatus | null>(null);
  let deleteOpen = $state(false);
  let deleteImpact = $state<DeleteImpact | null>(null);
  let statusOpen = $state(false);
  let deleteForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let processing = $state(false);
  let resolveStatus: (() => void) | undefined;
  let resolveDelete: (() => void) | undefined;
  let rejectDelete: ((error: Error) => void) | undefined;
  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.delete'));
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('attentions.title') }]);
  const closed = (item: Attention) => ['finalizada', 'cancelada'].includes(item.estado_atencion.codigo);
  const availableStatuses = (item: Attention) => (data.estados as AttentionStatus[]).filter((status) => status.id_parametros !== item.estado_atencion.id_parametros);
  const time = (value: string | Date) => new Intl.DateTimeFormat(i18n.locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  const civilDate = (value: string | Date) => new Intl.DateTimeFormat(i18n.locale, { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(value));
  const ownerLocation = (item: Attention) => item.propietario ? [item.propietario.admin_level_3?.nombre, item.propietario.admin_level_3?.admin_level_2?.nombre, item.propietario.admin_level_3?.admin_level_1.nombre].filter(Boolean).join(', ') || '—' : '—';

  function listHref(includeYesterday: boolean) {
    const params = new URLSearchParams();
    if (data.q) params.set('q', data.q);
    if (includeYesterday) params.set('incluir_ayer', '1');
    return `/clinic/attentions${params.size ? `?${params}` : ''}`;
  }

  function chooseStatus(item: Attention, status: AttentionStatus) {
    target = item;
    selectedStatus = status;
    statusOpen = true;
  }

  function chooseDelete(item: Attention) {
    target = item;
    deleteImpact = null;
    deleteOpen = true;
  }

  function requestDelete() {
    return new Promise<void>((resolve, reject) => {
      resolveDelete = resolve;
      rejectDelete = reject;
      deleteForm.requestSubmit();
    });
  }

  function requestStatus() {
    return new Promise<void>((resolve) => {
      resolveStatus = resolve;
      statusForm.requestSubmit();
    });
  }

  const saveStatus: SubmitFunction = () => async ({ result, update }) => {
    if (result.type === 'success') {
      await update({ invalidateAll: true, reset: false });
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.statusSaved') });
    } else {
      const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
    }
    resolveStatus?.();
    resolveStatus = undefined;
  };

  const remove: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.deleted') });
        resolveDelete?.();
      } else {
        const failure = result.type === 'failure' ? result.data as { attentionMessage?: unknown; attentionImpact?: DeleteImpact } : null;
        if (failure?.attentionImpact) deleteImpact = failure.attentionImpact;
        else {
          const message = typeof failure?.attentionMessage === 'string' ? failure.attentionMessage : 'attentions.deleteError';
          toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
        }
        rejectDelete?.(new Error(failure?.attentionImpact ? 'protected-attention' : 'attention-delete-failed'));
      }
      processing = false;
      resolveDelete = undefined;
      rejectDelete = undefined;
    };
  };
</script>

<svelte:head><title>{i18n.t('attentions.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('attentions.title')}</h1><p class="mt-1.5 max-w-[64ch] text-steel">{i18n.t('attentions.description')}</p></div>
    {#if canCreate}<Button href="/clinic/attentions/new"><Icon name="plus" size={18} />{i18n.t('attentions.new')}</Button>{/if}
  </div>
  <div class="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
    <CatalogSearch value={data.q} route="/clinic/attentions" parameters={{ incluir_ayer: data.incluirAyer ? '1' : '' }} />
    <Button href={listHref(!data.incluirAyer)} variant="secondary"><Icon name="history" size={17} />{i18n.t(data.incluirAyer ? 'attentions.onlyToday' : 'attentions.includeYesterday')}</Button>
  </div>
  <Card padding="none" class="relative overflow-hidden">
    <CatalogLoadingOverlay />
    {#if data.atenciones.length === 0}
      <div class="flex flex-col items-center px-5 py-16 text-center"><span class="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="stethoscope" size={24} /></span><h2 class="text-lg text-ink">{i18n.t(data.q ? 'attentions.noResults' : 'attentions.empty')}</h2><p class="mt-1 max-w-md text-sm text-steel">{i18n.t(data.q ? 'attentions.noResultsHelp' : 'attentions.emptyHelp')}</p></div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[1040px] border-collapse text-left">
          <thead class="bg-canvas"><tr class="border-b border-hairline text-[11px] font-bold uppercase tracking-[0.04em] text-ink"><th class="w-[92px] border-r border-hairline px-3 py-3 text-center">{i18n.t('attentions.actions')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('attentions.arrival')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('attentions.patient')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('attentions.owner')}</th><th class="border-r border-hairline px-4 py-3">{i18n.t('owners.address')}</th><th class="border-r border-hairline px-4 py-3 text-center">{i18n.t('attentions.records')}</th><th class="px-4 py-3">{i18n.t('attentions.status')}</th></tr></thead>
          <tbody class="divide-y divide-hairline">{#each attentionsTable.getRowModel().rows as row (row.original.id_atenciones)}{@const item = row.original}<tr class="odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35"><td class="border-r border-hairline px-2 py-2.5"><div class="flex justify-center gap-1"><button type="button" title={i18n.t('attentions.open')} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas hover:text-primary" onclick={() => goto(`/clinic/attentions/${item.id_atenciones}`)}><Icon name="eye" size={15} /></button>{#if (canUpdate && !closed(item)) || canDelete}<DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.actions')} class="grid size-7 place-items-center rounded-md text-steel hover:bg-canvas"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="start" class="min-w-[210px]">{#if canUpdate && !closed(item)}<DropdownMenu.Label>{i18n.t('attentions.changeStatus')}</DropdownMenu.Label>{#each availableStatuses(item) as status (status.id_parametros)}<DropdownMenu.Item onSelect={() => chooseStatus(item, status)}><span class="size-2.5 rounded-full" style:background-color={status.color_hex}></span>{status.etiqueta}</DropdownMenu.Item>{/each}{/if}{#if canDelete}<DropdownMenu.Separator /><DropdownMenu.Item variant="destructive" onSelect={() => chooseDelete(item)}><Icon name="trash-2" size={15} />{i18n.t('attentions.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>{/if}</div></td><td class="border-r border-hairline px-4 py-2.5">{#if data.incluirAyer}<span class="block font-normal text-steel">{civilDate(item.fecha_atencion)}</span><span class="mt-0.5 block text-xs text-stone">{time(item.llegada_en)}</span>{:else}<span class="font-normal text-steel">{time(item.llegada_en)}</span>{/if}</td><td class="border-r border-hairline px-4 py-2.5"><div class="flex items-center gap-3">{#if item.mascota.foto_version}<img src={`/media/pets/${item.mascota.id_mascotas}/${item.mascota.foto_version}`} alt="" class="size-10 rounded-lg border border-hairline object-cover" />{:else}<span class="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name="paw-print" size={19} /></span>{/if}<div class="min-w-0"><span class="block truncate font-normal text-steel">{item.mascota.nombre}</span><span class="text-xs text-stone">{item.mascota.especie.nombre}{item.mascota.clasificacion ? ` · ${item.mascota.clasificacion}` : ''}</span></div></div></td><td class="border-r border-hairline px-4 py-2.5"><span class="block truncate font-normal text-steel">{item.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</span>{#if item.propietario}<span class="mt-0.5 block text-xs text-stone">{item.propietario.celular ?? '—'}</span>{/if}</td><td class="max-w-[260px] border-r border-hairline px-4 py-2.5"><span class="block truncate font-normal text-steel" title={item.propietario?.direccion ?? '—'}>{item.propietario?.direccion ?? '—'}</span><span class="mt-0.5 block truncate text-xs text-stone" title={ownerLocation(item)}>{ownerLocation(item)}</span></td><td class="border-r border-hairline px-4 py-2.5 text-center font-normal text-steel">{item.registros.length}</td><td class="px-4 py-2.5"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style:background-color={`${item.estado_atencion.color_hex}18`} style:color={item.estado_atencion.color_hex}>{item.estado_atencion.etiqueta}</span></td></tr>{/each}</tbody>
        </table>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.atenciones as item (item.id_atenciones)}
          <article class="flex items-center gap-2 p-4"><button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => goto(`/clinic/attentions/${item.id_atenciones}`)}>{#if item.mascota.foto_version}<img src={`/media/pets/${item.mascota.id_mascotas}/${item.mascota.foto_version}`} alt="" class="size-12 rounded-lg object-cover" />{:else}<span class="grid size-12 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name="paw-print" size={21} /></span>{/if}<span class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{item.mascota.nombre}</strong><span class="mt-1 block truncate text-xs text-steel">{data.incluirAyer ? `${civilDate(item.fecha_atencion)} · ` : ''}{time(item.llegada_en)} · {item.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</span>{#if item.propietario}<span class="mt-1 block truncate text-xs text-steel">{item.propietario.celular ?? '—'}</span><span class="mt-1 block truncate text-xs text-ink">{item.propietario.direccion ?? '—'}</span><span class="mt-0.5 block truncate text-[11px] text-stone">{ownerLocation(item)}</span>{/if}<span class="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs" style:background-color={`${item.estado_atencion.color_hex}18`} style:color={item.estado_atencion.color_hex}>{item.estado_atencion.etiqueta}</span></span></button><DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.actions')} class="grid size-9 shrink-0 place-items-center rounded-md text-stone hover:bg-surface"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="min-w-[210px]"><DropdownMenu.Item onSelect={() => goto(`/clinic/attentions/${item.id_atenciones}`)}><Icon name="eye" size={15} />{i18n.t('attentions.open')}</DropdownMenu.Item>{#if canUpdate && !closed(item)}<DropdownMenu.Separator /><DropdownMenu.Label>{i18n.t('attentions.changeStatus')}</DropdownMenu.Label>{#each availableStatuses(item) as status (status.id_parametros)}<DropdownMenu.Item onSelect={() => chooseStatus(item, status)}><span class="size-2.5 rounded-full" style:background-color={status.color_hex}></span>{status.etiqueta}</DropdownMenu.Item>{/each}{/if}{#if canDelete}<DropdownMenu.Separator /><DropdownMenu.Item variant="destructive" onSelect={() => chooseDelete(item)}><Icon name="trash-2" size={15} />{i18n.t('attentions.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root></article>
        {/each}
      </div>
    {/if}
  </Card>
  <CatalogPagination route="/clinic/attentions" search={data.q} parameters={{ incluir_ayer: data.incluirAyer ? '1' : '' }} current={data.atenciones.length} total={data.total} previous={data.paginacion.anterior} next={data.paginacion.siguiente} />
</section>

<ConfirmationDialog bind:open={statusOpen} variant="info" icon="refresh-cw" title={i18n.t('attentions.changeStatusTitle')} description={i18n.t('attentions.changeStatusHelp', { status: selectedStatus?.etiqueta ?? '' })} confirmLabel={i18n.t('attentions.confirmStatus')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={!target || !selectedStatus} onConfirm={requestStatus}>
  <form bind:this={statusForm} method="POST" action="?/status" use:enhance={saveStatus}><input type="hidden" name="id_atenciones" value={target?.id_atenciones ?? ''} /><input type="hidden" name="fid_parametros_estado" value={selectedStatus?.id_parametros ?? ''} /></form>
</ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t(deleteImpact ? 'attentions.protectedDeleteTitle' : 'attentions.deleteTitle')} description={i18n.t(deleteImpact ? 'attentions.protectedDeleteHelp' : 'attentions.deleteHelp', { count: deleteImpact?.cantidad_registros ?? 0 })} confirmLabel={i18n.t(deleteImpact ? 'attentions.deleteAnyway' : 'attentions.delete')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={requestDelete}>
  {#if deleteImpact && target}<div class="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface p-4 text-left"><div class="min-w-0"><strong class="block truncate text-sm text-ink">{target.mascota.nombre}</strong><span class="mt-1 block text-xs text-steel">{target.estado_atencion.etiqueta}</span></div><span class="shrink-0 text-sm font-medium text-steel">{i18n.t('attentions.recordCount', { count: deleteImpact.cantidad_registros })}</span></div>{/if}
  <form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden">{#if target}<input type="hidden" name="id_atenciones" value={target.id_atenciones} />{#if deleteImpact}<input type="hidden" name="confirmar_eliminacion_protegida" value="true" />{/if}{/if}</form>
</ConfirmationDialog>
