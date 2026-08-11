<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Switch, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type Service = (typeof data.servicios)[number];
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
  let statusForm: HTMLFormElement;
  let editorForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
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
  const editorReady = $derived(validEditor && editorDirty);

  function openCreate() {
    editorTarget = null;
    nombre = '';
    descripcion = '';
    precio = '';
    attempted = false;
    editorOpen = true;
  }

  function openEdit(service: Service) {
    editorTarget = service;
    nombre = service.nombre;
    descripcion = service.descripcion ?? '';
    precio = service.precio ?? '';
    attempted = false;
    editorOpen = true;
  }

  function displayPrice(value: string | null) {
    return value === null ? i18n.t('services.noPrice') : `${data.moneda.codigo} ${value}`;
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
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t(editorTarget ? 'services.updated' : 'services.created')
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
    <h2 class="text-lg font-semibold text-ink">{i18n.t('services.catalog')}</h2>
    <Badge variant="outline-sky">{i18n.t('services.count', { count: data.total })}</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if data.servicios.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center">
        <Icon name="clipboard-check" size={34} class="mb-4 text-stone" />
        <h2 class="text-lg text-ink">{i18n.t('services.emptyTitle')}</h2>
        <p class="mt-1 text-sm text-steel">{i18n.t('services.emptyDescription')}</p>
        {#if canCreate}<Button class="mt-5" onclick={openCreate}><Icon name="plus" size={17} />{i18n.t('services.new')}</Button>{/if}
      </div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[720px] border-collapse text-left">
          <thead class="bg-surface/70">
            <tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone">
              <th class="px-5 py-3.5">{i18n.t('services.service')}</th>
              <th class="px-4 py-3.5">{i18n.t('services.price')}</th>
              <th class="px-4 py-3.5 text-center">{i18n.t('services.status')}</th>
              {#if canAny}<th class="px-5 py-3.5 text-right">{i18n.t('services.actions')}</th>{/if}
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each data.servicios as service (service.id_servicios_veterinaria)}
              <tr class="transition-colors hover:bg-surface/55">
                <td class="px-5 py-4">
                  <div class="flex min-w-0 items-start gap-3">
                    <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="clipboard-check" size={18} /></span>
                    <div class="min-w-0"><strong class="block max-w-[360px] truncate text-sm text-ink">{service.nombre}</strong><p class="mt-1 max-w-[440px] truncate text-xs text-steel">{service.descripcion || i18n.t('services.noDescription')}</p></div>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm font-semibold text-ink">{displayPrice(service.precio)}</td>
                <td class="px-4 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <Switch checked={service.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('services.status')}: ${service.nombre}`} onchange={(active) => status(service, active)} />
                    <span class="text-xs text-steel">{i18n.t(service.estado === 1 ? 'services.active' : 'services.inactive')}</span>
                  </div>
                </td>
                {#if canAny}
                  <td class="px-5 py-4">
                    <div class="flex justify-end">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                          disabled={processing}
                          aria-label={`${i18n.t('services.actions')}: ${service.nombre}`}
                          class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Icon name="ellipsis" size={18} />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="min-w-[160px]">
                          {#if canUpdate}
                            <DropdownMenu.Item disabled={processing} onSelect={() => openEdit(service)}>
                              <Icon name="pencil" size={15} />
                              <span>{i18n.t('services.edit')}</span>
                            </DropdownMenu.Item>
                          {/if}
                          {#if canUpdate && canDelete}<DropdownMenu.Separator />{/if}
                          {#if canDelete}
                            <DropdownMenu.Item
                              disabled={processing}
                              class="text-error focus:bg-error/10 focus:text-error"
                              onSelect={() => { target = service; deleteOpen = true; }}
                            >
                              <Icon name="trash-2" size={15} />
                              <span>{i18n.t('services.delete')}</span>
                            </DropdownMenu.Item>
                          {/if}
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.servicios as service (service.id_servicios_veterinaria)}
          <article class="p-4">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="clipboard-check" size={18} /></span>
              <div class="min-w-0 flex-1">
                <strong class="block truncate text-sm text-ink">{service.nombre}</strong>
                <p class="mt-1 line-clamp-2 text-xs leading-5 text-steel">{service.descripcion || i18n.t('services.noDescription')}</p>
                <p class="mt-2 text-sm font-semibold text-ink">{displayPrice(service.precio)}</p>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <div class="flex items-center gap-2">
                <Switch checked={service.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('services.status')}: ${service.nombre}`} onchange={(active) => status(service, active)} />
                <span class="text-xs text-steel">{i18n.t(service.estado === 1 ? 'services.active' : 'services.inactive')}</span>
              </div>
              {#if canAny}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger
                    disabled={processing}
                    aria-label={`${i18n.t('services.actions')}: ${service.nombre}`}
                    class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon name="ellipsis" size={18} />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" class="min-w-[160px]">
                    {#if canUpdate}
                      <DropdownMenu.Item disabled={processing} onSelect={() => openEdit(service)}>
                        <Icon name="pencil" size={15} />
                        <span>{i18n.t('services.edit')}</span>
                      </DropdownMenu.Item>
                    {/if}
                    {#if canUpdate && canDelete}<DropdownMenu.Separator />{/if}
                    {#if canDelete}
                      <DropdownMenu.Item
                        disabled={processing}
                        class="text-error focus:bg-error/10 focus:text-error"
                        onSelect={() => { target = service; deleteOpen = true; }}
                      >
                        <Icon name="trash-2" size={15} />
                        <span>{i18n.t('services.delete')}</span>
                      </DropdownMenu.Item>
                    {/if}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </Card>
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
  <form bind:this={editorForm} method="POST" action={editorTarget ? '?/update' : '?/create'} use:enhance={saveEditor} class="grid grid-cols-12 gap-4 text-left">
    {#if editorTarget}<input type="hidden" name="id" value={editorTarget.id_servicios_veterinaria} />{/if}
    <div class="col-span-8 max-[700px]:col-span-12">
      <Input name="nombre" label={i18n.t('services.name')} icon="clipboard-check" placeholder={i18n.t('services.namePlaceholder')} bind:value={nombre} maxlength={120} error={attempted && !validName ? i18n.t('services.validation.name') : undefined} disabled={processing} required />
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
