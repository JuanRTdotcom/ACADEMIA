<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type Attention = (typeof data.atenciones)[number];
  type AttentionStatus = { id_parametros: string; codigo: string; etiqueta: string; color_hex: string };
  let target = $state<Attention | null>(null);
  let selectedStatus = $state<AttentionStatus | null>(null);
  let deleteOpen = $state(false);
  let statusOpen = $state(false);
  let deleteForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let processing = $state(false);
  let resolveStatus: (() => void) | undefined;
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
        deleteOpen = false;
      } else {
        const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.deleteError';
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      }
      processing = false;
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
    <form method="GET" class="flex w-full max-w-md gap-2"><label class="sr-only" for="attention-search">{i18n.t('attentions.search')}</label>{#if data.incluirAyer}<input type="hidden" name="incluir_ayer" value="1" />{/if}<div class="relative flex-1"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel"><Icon name="search" size={17} /></span><input id="attention-search" name="q" value={data.q} maxlength="120" placeholder={i18n.t('attentions.searchPlaceholder')} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas pl-10 pr-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></div><Button type="submit" variant="utility">{i18n.t('attentions.search')}</Button></form>
    <div class="flex flex-wrap items-center justify-end gap-2"><Button href={listHref(!data.incluirAyer)} variant="secondary"><Icon name="history" size={17} />{i18n.t(data.incluirAyer ? 'attentions.onlyToday' : 'attentions.includeYesterday')}</Button><Badge variant="outline-sky">{i18n.t(data.incluirAyer ? 'attentions.todayAndYesterday' : 'attentions.today')}</Badge><Badge variant="outline-sky">{data.total}</Badge></div>
  </div>
  <Card padding="none" class="overflow-hidden">
    {#if data.atenciones.length === 0}
      <div class="flex flex-col items-center px-5 py-16 text-center"><span class="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="stethoscope" size={24} /></span><h2 class="text-lg text-ink">{i18n.t(data.q ? 'attentions.noResults' : 'attentions.empty')}</h2><p class="mt-1 max-w-md text-sm text-steel">{i18n.t(data.q ? 'attentions.noResultsHelp' : 'attentions.emptyHelp')}</p></div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[1040px] border-collapse text-left">
          <thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('attentions.arrival')}</th><th class="px-4 py-3.5">{i18n.t('attentions.patient')}</th><th class="px-4 py-3.5">{i18n.t('attentions.owner')}</th><th class="px-4 py-3.5">{i18n.t('owners.address')}</th><th class="px-4 py-3.5">{i18n.t('attentions.records')}</th><th class="px-4 py-3.5">{i18n.t('attentions.status')}</th><th class="px-5 py-3.5"></th></tr></thead>
          <tbody class="divide-y divide-hairline">{#each data.atenciones as item (item.id_atenciones)}<tr class="cursor-pointer transition-colors hover:bg-surface/55" onclick={() => goto(`/clinic/attentions/${item.id_atenciones}`)}><td class="px-5 py-4">{#if data.incluirAyer}<span class="block text-sm font-medium text-ink">{civilDate(item.fecha_atencion)}</span><span class="mt-1 block text-xs text-steel">{time(item.llegada_en)}</span>{:else}<span class="text-sm font-medium text-ink">{time(item.llegada_en)}</span>{/if}</td><td class="px-4 py-4"><div class="flex items-center gap-3">{#if item.mascota.foto_version}<img src={`/media/pets/${item.mascota.id_mascotas}/${item.mascota.foto_version}`} alt="" class="size-10 rounded-lg border border-hairline object-cover" />{:else}<span class="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name="paw-print" size={19} /></span>{/if}<div><strong class="block text-sm text-ink">{item.mascota.nombre}</strong><span class="text-xs text-steel">{item.mascota.especie.nombre}{item.mascota.clasificacion ? ` · ${item.mascota.clasificacion}` : ''}</span></div></div></td><td class="px-4 py-4"><strong class="block text-sm font-medium text-ink">{item.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</strong>{#if item.propietario}<span class="mt-1 block text-xs text-steel">{item.propietario.celular ?? '—'}</span>{/if}</td><td class="max-w-[260px] px-4 py-4"><span class="block truncate text-sm text-ink" title={item.propietario?.direccion ?? '—'}>{item.propietario?.direccion ?? '—'}</span><span class="mt-1 block truncate text-xs text-steel" title={ownerLocation(item)}>{ownerLocation(item)}</span></td><td class="px-4 py-4 text-sm text-steel">{item.registros.length}</td><td class="px-4 py-4"><span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" style:background-color={`${item.estado_atencion.color_hex}18`} style:color={item.estado_atencion.color_hex}>{item.estado_atencion.etiqueta}</span></td><td class="px-5 py-4" onclick={(event) => event.stopPropagation()}><DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.actions')} class="grid size-8 place-items-center rounded-md text-stone hover:bg-surface"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="min-w-[210px]"><DropdownMenu.Item onSelect={() => goto(`/clinic/attentions/${item.id_atenciones}`)}><Icon name="eye" size={15} />{i18n.t('attentions.open')}</DropdownMenu.Item>{#if canUpdate && !closed(item)}<DropdownMenu.Separator /><DropdownMenu.Label>{i18n.t('attentions.changeStatus')}</DropdownMenu.Label>{#each availableStatuses(item) as status (status.id_parametros)}<DropdownMenu.Item onSelect={() => chooseStatus(item, status)}><span class="size-2.5 rounded-full" style:background-color={status.color_hex}></span>{status.etiqueta}</DropdownMenu.Item>{/each}{/if}{#if canDelete && !closed(item)}<DropdownMenu.Separator /><DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('attentions.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root></td></tr>{/each}</tbody>
        </table>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.atenciones as item (item.id_atenciones)}
          <article class="flex items-center gap-2 p-4"><button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={() => goto(`/clinic/attentions/${item.id_atenciones}`)}>{#if item.mascota.foto_version}<img src={`/media/pets/${item.mascota.id_mascotas}/${item.mascota.foto_version}`} alt="" class="size-12 rounded-lg object-cover" />{:else}<span class="grid size-12 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name="paw-print" size={21} /></span>{/if}<span class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{item.mascota.nombre}</strong><span class="mt-1 block truncate text-xs text-steel">{data.incluirAyer ? `${civilDate(item.fecha_atencion)} · ` : ''}{time(item.llegada_en)} · {item.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</span>{#if item.propietario}<span class="mt-1 block truncate text-xs text-steel">{item.propietario.celular ?? '—'}</span><span class="mt-1 block truncate text-xs text-ink">{item.propietario.direccion ?? '—'}</span><span class="mt-0.5 block truncate text-[11px] text-stone">{ownerLocation(item)}</span>{/if}<span class="mt-2 inline-flex rounded-full px-2 py-0.5 text-xs" style:background-color={`${item.estado_atencion.color_hex}18`} style:color={item.estado_atencion.color_hex}>{item.estado_atencion.etiqueta}</span></span></button><DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.actions')} class="grid size-9 shrink-0 place-items-center rounded-md text-stone hover:bg-surface"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="min-w-[210px]"><DropdownMenu.Item onSelect={() => goto(`/clinic/attentions/${item.id_atenciones}`)}><Icon name="eye" size={15} />{i18n.t('attentions.open')}</DropdownMenu.Item>{#if canUpdate && !closed(item)}<DropdownMenu.Separator /><DropdownMenu.Label>{i18n.t('attentions.changeStatus')}</DropdownMenu.Label>{#each availableStatuses(item) as status (status.id_parametros)}<DropdownMenu.Item onSelect={() => chooseStatus(item, status)}><span class="size-2.5 rounded-full" style:background-color={status.color_hex}></span>{status.etiqueta}</DropdownMenu.Item>{/each}{/if}{#if canDelete && !closed(item)}<DropdownMenu.Separator /><DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('attentions.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root></article>
        {/each}
      </div>
    {/if}
  </Card>
</section>

<ConfirmationDialog bind:open={statusOpen} variant="info" icon="refresh-cw" title={i18n.t('attentions.changeStatusTitle')} description={i18n.t('attentions.changeStatusHelp', { status: selectedStatus?.etiqueta ?? '' })} confirmLabel={i18n.t('attentions.confirmStatus')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={!target || !selectedStatus} onConfirm={requestStatus}>
  <form bind:this={statusForm} method="POST" action="?/status" use:enhance={saveStatus}><input type="hidden" name="id_atenciones" value={target?.id_atenciones ?? ''} /><input type="hidden" name="fid_parametros_estado" value={selectedStatus?.id_parametros ?? ''} /></form>
</ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('attentions.deleteTitle')} description={i18n.t('attentions.deleteHelp')} confirmLabel={i18n.t('attentions.delete')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={() => new Promise((resolve) => { deleteForm.requestSubmit(); const timer = setInterval(() => { if (!processing) { clearInterval(timer); resolve(); } }, 100); })}><form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove}>{#if target}<input type="hidden" name="id_atenciones" value={target.id_atenciones} />{/if}</form></ConfirmationDialog>
