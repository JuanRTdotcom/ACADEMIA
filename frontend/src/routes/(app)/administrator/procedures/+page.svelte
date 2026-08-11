<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Switch, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type Procedure = (typeof data.procedimientos)[number];
  let selected = $state<Procedure | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let operation = $state<'save' | 'status' | 'delete'>('save');
  let nombre = $state('');
  let descripcionGuia = $state('');
  let editorForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('procedures.title') }]);

  function edit(item: Procedure | null) {
    selected = item;
    nombre = item?.nombre ?? '';
    descripcionGuia = item?.descripcion_guia ?? '';
    editorOpen = true;
  }

  const submit: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        const message = operation === 'delete' ? 'procedures.deleted' : operation === 'status' ? (selected?.estado === 1 ? 'procedures.deactivated' : 'procedures.activated') : 'procedures.saved';
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t(message) });
        resolveEditor?.();
        resolveDelete?.();
      } else {
        const message = result.type === 'failure' && typeof result.data?.procedureMessage === 'string' ? result.data.procedureMessage : 'procedures.saveError';
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
    if (!editorForm?.reportValidity()) return Promise.reject(new Error('invalid-procedure'));
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

  function status(item: Procedure, active: boolean) {
    selected = item;
    operation = 'status';
    requestAnimationFrame(() => {
      (statusForm.elements.namedItem('activo') as HTMLInputElement).value = String(active);
      statusForm.requestSubmit();
    });
  }
</script>

<svelte:head><title>{i18n.t('procedures.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-6">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('procedures.title')}</h1><p class="mt-1.5 max-w-[64ch] text-steel">{i18n.t('procedures.description')}</p></div>
    {#if canCreate}<Button onclick={() => edit(null)}><Icon name="plus" size={17} />{i18n.t('procedures.new')}</Button>{/if}
  </div>
  <Card padding="none" class="overflow-hidden">
    {#if !data.procedimientos.length}
      <div class="py-14 text-center"><Icon name="scissors" size={32} class="mx-auto text-stone" /><p class="mt-3 font-semibold text-ink">{i18n.t('procedures.empty')}</p></div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[620px] border-collapse text-left">
          <thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('procedures.name')}</th><th class="px-4 py-3.5 text-center">{i18n.t('procedures.status')}</th>{#if canAny}<th class="px-5 py-3.5 text-right">{i18n.t('procedures.actions')}</th>{/if}</tr></thead>
          <tbody class="divide-y divide-hairline">
            {#each data.procedimientos as item (item.id_procedimientos_veterinarios)}
              <tr class="transition-colors hover:bg-surface/55"><td class="px-5 py-4"><div class="flex items-start gap-3"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="scissors" size={18} /></span><div class="min-w-0"><strong class="block truncate text-sm text-ink">{item.nombre}</strong><p class="mt-1 line-clamp-2 max-w-2xl text-xs leading-5 text-steel">{item.descripcion_guia}</p></div></div></td><td class="px-4 py-4"><div class="flex items-center justify-center gap-2"><Switch checked={item.estado === 1} disabled={!canUpdate || processing} label={`${i18n.t('procedures.status')}: ${item.nombre}`} onchange={(active) => status(item, active)} /><span class="text-xs text-steel">{i18n.t(item.estado === 1 ? 'procedures.active' : 'procedures.inactive')}</span></div></td>{#if canAny}<td class="px-5 py-4"><div class="flex justify-end"><DropdownMenu.Root><DropdownMenu.Trigger disabled={processing} class="grid size-8 place-items-center rounded-md text-stone hover:bg-surface hover:text-ink" aria-label={`${i18n.t('procedures.actions')}: ${item.nombre}`}><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end">{#if canUpdate}<DropdownMenu.Item onSelect={() => edit(item)}><Icon name="pencil" size={15} />{i18n.t('procedures.edit')}</DropdownMenu.Item>{/if}{#if canUpdate && canDelete}<DropdownMenu.Separator />{/if}{#if canDelete}<DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { selected = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('procedures.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root></div></td>{/if}</tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.procedimientos as item (item.id_procedimientos_veterinarios)}
          <article class="p-4"><div class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="scissors" size={18} /></span><strong class="min-w-0 flex-1 truncate text-sm text-ink">{item.nombre}</strong></div><div class="mt-4 flex items-center justify-between border-t border-hairline pt-3"><div class="flex items-center gap-2"><Switch checked={item.estado === 1} disabled={!canUpdate || processing} label={`${i18n.t('procedures.status')}: ${item.nombre}`} onchange={(active) => status(item, active)} /><span class="text-xs text-steel">{i18n.t(item.estado === 1 ? 'procedures.active' : 'procedures.inactive')}</span></div>{#if canAny}<DropdownMenu.Root><DropdownMenu.Trigger class="grid size-8 place-items-center rounded-md text-stone" aria-label={`${i18n.t('procedures.actions')}: ${item.nombre}`}><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger><DropdownMenu.Content align="end">{#if canUpdate}<DropdownMenu.Item onSelect={() => edit(item)}><Icon name="pencil" size={15} />{i18n.t('procedures.edit')}</DropdownMenu.Item>{/if}{#if canDelete}<DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { selected = item; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('procedures.delete')}</DropdownMenu.Item>{/if}</DropdownMenu.Content></DropdownMenu.Root>{/if}</div></article>
        {/each}
      </div>
    {/if}
  </Card>
</section>

<form bind:this={statusForm} class="hidden" method="POST" action="?/status" use:enhance={submit}><input name="id" value={selected?.id_procedimientos_veterinarios ?? ''} /><input name="activo" /></form>
<form bind:this={deleteForm} class="hidden" method="POST" action="?/delete" use:enhance={submit}><input name="id" value={selected?.id_procedimientos_veterinarios ?? ''} /></form>
<ConfirmationDialog bind:open={editorOpen} variant="info" icon={selected ? 'pencil' : 'scissors'} title={i18n.t(selected ? 'procedures.editTitle' : 'procedures.new')} description={i18n.t('procedures.editorHelp')} confirmLabel={i18n.t('procedures.save')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={processing} onConfirm={submitEditor}><form bind:this={editorForm} method="POST" action={selected ? '?/update' : '?/create'} use:enhance={submit} class="grid gap-4 text-left"><input type="hidden" name="id" value={selected?.id_procedimientos_veterinarios ?? ''} /><Input name="nombre" label={i18n.t('procedures.name')} bind:value={nombre} required maxlength={160} /><label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('procedures.guideDescription')}<span class="ml-0.5 text-error">*</span></span><textarea name="descripcion_guia" bind:value={descripcionGuia} required minlength="5" maxlength="1000" rows="5" class="w-full resize-y rounded-md border border-hairline-strong bg-canvas px-3.5 py-3 text-sm leading-5 text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"></textarea></label></form></ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" title={i18n.t('procedures.deleteTitle')} description={i18n.t('procedures.deleteHelp')} confirmLabel={i18n.t('procedures.delete')} cancelLabel={i18n.t('attentions.cancel')} confirmDisabled={processing} onConfirm={submitDelete} />
