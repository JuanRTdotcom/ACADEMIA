<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, RoleIconSelect, Switch, i18n } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type Role = (typeof data.roles)[number];
  type Field = 'nombre' | 'alias' | 'descripcion';
  let form = $state({ nombre: '', alias: '', descripcion: '', icono: 'shield-check' });
  let target = $state<Role | null>(null);
  let createOpen = $state(false);
  let editOpen = $state(false);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let pendingActive = $state(false);
  let createForm: HTMLFormElement;
  let editForm: HTMLFormElement;
  let statusForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let resolveCreate: (() => void) | null = null;
  let rejectCreate: ((error: Error) => void) | null = null;
  let resolveEdit: (() => void) | null = null;
  let rejectEdit: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  let baseline = $state('');
  let attempted = $state(false);

  const errors = $derived.by(() => {
    const result: Partial<Record<Field, string>> = {};
    const name = form.nombre.trim().replace(/\s+/g, ' ');
    const alias = form.alias.trim().toUpperCase();
    const description = form.descripcion.trim().replace(/\s+/g, ' ');
    if (!name) result.nombre = 'roles.validation.required';
    else if (name.length < 2 || name.length > 80 || !/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-]*$/u.test(name)) result.nombre = 'roles.validation.name';
    if (!alias) result.alias = 'roles.validation.required';
    else if (alias.length < 2 || alias.length > 40 || !/^[A-Z][A-Z0-9_]*$/.test(alias)) result.alias = 'roles.validation.alias';
    if (!description) result.descripcion = 'roles.validation.required';
    else if (description.length < 5 || description.length > 250 || !/^[\p{L}\p{N}][\p{L}\p{N}\s&.,;:'"()¿?¡!/_\-]*$/u.test(description)) result.descripcion = 'roles.validation.description';
    return result;
  });
  const valid = $derived(Object.keys(errors).length === 0);
  const dirty = $derived(JSON.stringify(form) !== baseline);
  const breadcrumbItems = $derived([
    { label: i18n.t('nav.dashboard'), href: '/dashboard' },
    { label: i18n.t('nav.roles') }
  ]);

  function resetValidation() { attempted = false; }
  function reset() { form = { nombre: '', alias: '', descripcion: '', icono: 'shield-check' }; resetValidation(); }
  function fieldError(field: Field) { const key = errors[field]; return key && attempted ? i18n.t(key) : undefined; }
  function validate() {
    attempted = true;
    if (valid) return true;
    toast.error(i18n.t('notifications.type.error'), { description: i18n.t('roles.invalidData') });
    return false;
  }
  function openEdit(role: Role) {
    target = role;
    form = { nombre: role.nombre, alias: role.alias, descripcion: role.descripcion, icono: role.icono };
    baseline = JSON.stringify(form);
    resetValidation();
    editOpen = true;
  }
  $effect(() => {
    if (!createOpen && !editOpen) resetValidation();
  });
  function submitCreate() {
    if (!validate()) return Promise.reject(new Error('invalid-role'));
    return new Promise<void>((resolve, reject) => { resolveCreate = resolve; rejectCreate = reject; createForm.requestSubmit(); });
  }
  function submitEdit() {
    if (!validate()) return Promise.reject(new Error('invalid-role'));
    return new Promise<void>((resolve, reject) => { resolveEdit = resolve; rejectEdit = reject; editForm.requestSubmit(); });
  }
  function submitDelete() { return new Promise<void>((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); }); }
  async function changeStatus(role: Role, active: boolean) {
    if (processing) return;
    target = role;
    pendingActive = active;
    await tick();
    statusForm.requestSubmit();
  }
  function failureKey(result: ActionResult, fallback: string) {
    return result.type === 'failure' && typeof result.data?.roleMessage === 'string' ? result.data.roleMessage : fallback;
  }

  const create: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('roles.created') });
        reset(); resolveCreate?.();
      } else {
        const key = failureKey(result, 'roles.saveError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
        rejectCreate?.(new Error(key));
      }
      processing = false; resolveCreate = null; rejectCreate = null;
    };
  };
  const edit: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('roles.updated') });
        resolveEdit?.();
      } else {
        const key = failureKey(result, 'roles.saveError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
        rejectEdit?.(new Error(key));
      }
      processing = false; resolveEdit = null; rejectEdit = null;
    };
  };
  const status: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t(pendingActive ? 'roles.activated' : 'roles.deactivated') });
      } else {
        const key = failureKey(result, 'roles.saveError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
      }
      processing = false;
    };
  };
  const remove: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('roles.deleted') });
        resolveDelete?.();
      } else {
        const key = failureKey(result, 'roles.deleteError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
        rejectDelete?.(new Error(key));
      }
      processing = false; resolveDelete = null; rejectDelete = null;
    };
  };
</script>

<svelte:head><title>{i18n.t('roles.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('roles.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('roles.description')}</p></div>
    <Button type="button" onclick={() => { reset(); createOpen = true; }}><Icon name="plus" size={18} />{i18n.t('roles.new')}</Button>
  </div>
  <div class="flex justify-end"><Badge variant="outline-sky">{i18n.t('roles.count', { count: data.total })}</Badge></div>
  <Card padding="none" class="overflow-hidden">
    {#if data.roles.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center"><Icon name="shield-check" size={34} class="mb-4 text-stone" /><h2 class="text-lg text-ink">{i18n.t('roles.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('roles.emptyDescription')}</p></div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('roles.role')}</th><th class="px-4 py-3.5">{i18n.t('roles.alias')}</th><th class="px-4 py-3.5 text-center">{i18n.t('roles.status')}</th><th class="px-5 py-3.5 text-right">{i18n.t('roles.actions')}</th></tr></thead>
          <tbody class="divide-y divide-hairline">
            {#each data.roles as role (role.id_roles)}
              <tr class="transition-colors hover:bg-surface/55">
                <td class="px-5 py-4"><div class="flex min-w-0 items-center gap-3.5"><span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={role.icono} size={19} /></span><div class="min-w-0"><strong class="block max-w-[320px] truncate text-sm text-ink">{role.nombre}</strong><p class="mt-0.5 max-w-[420px] truncate text-xs text-steel" title={role.descripcion}>{role.descripcion}</p></div></div></td>
                <td class="px-4 py-4"><code class="rounded-md bg-surface px-2 py-1 text-xs font-semibold text-slate">{role.alias}</code></td>
                <td class="px-4 py-4"><div class="flex items-center justify-center gap-2"><Switch checked={role.estado === 1} disabled={processing} label={`${i18n.t('roles.status')}: ${role.nombre}`} onchange={(active) => changeStatus(role, active)} /><span class="text-xs text-steel">{i18n.t(role.estado === 1 ? 'roles.active' : 'roles.inactive')}</span></div></td>
                <td class="px-5 py-4">
                  <div class="flex justify-end">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        disabled={processing}
                        aria-label={`${i18n.t('roles.actions')}: ${role.nombre}`}
                        class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Icon name="ellipsis" size={18} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" class="min-w-[190px]">
                        <DropdownMenu.Item
                          disabled={processing || role.estado !== 1}
                          onSelect={() => openEdit(role)}
                        >
                          <Icon name="pencil" size={15} />
                          <span>{i18n.t('roles.edit')}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          disabled={processing}
                          onSelect={() => void (window.location.href = `/superadmin/roles/${role.id_roles}/permissions`)}
                        >
                          <Icon name="key-round" size={15} />
                          <span>{i18n.t('roles.permissions')}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          disabled={processing || role.estado !== 1}
                          class="text-error focus:bg-error/10 focus:text-error"
                          onSelect={() => { target = role; deleteOpen = true; }}
                        >
                          <Icon name="trash-2" size={15} />
                          <span>{i18n.t('roles.delete')}</span>
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<ConfirmationDialog bind:open={createOpen} variant="info" icon="shield-plus" title={i18n.t('roles.createTitle')} description={i18n.t('roles.createDescription')} confirmLabel={i18n.t('roles.create')} cancelLabel={i18n.t('roles.cancel')} confirmDisabled={processing} onConfirm={submitCreate} onCancel={resetValidation}>
  <div class="flex flex-col gap-4 text-left">
    <Input label={i18n.t('roles.name')} icon="shield-check" bind:value={form.nombre} error={fieldError('nombre')} maxlength={80} disabled={processing} required />
    <Input label={i18n.t('roles.alias')} icon="at-sign" bind:value={form.alias} error={fieldError('alias')} oninput={() => (form.alias = form.alias.toUpperCase())} maxlength={40} disabled={processing} required />
    <div class="flex flex-col gap-1.5"><label for="role-create-description" class="text-sm font-medium text-charcoal">{i18n.t('roles.fieldDescription')}</label><div class="relative rounded-md border bg-canvas transition-all duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20" class:border-error={Boolean(fieldError('descripcion'))} class:border-hairline-strong={!fieldError('descripcion')}><Icon name="file-text" size={18} class="pointer-events-none absolute left-3 top-3 text-steel" /><textarea id="role-create-description" bind:value={form.descripcion} maxlength={250} rows={3} disabled={processing} required class="min-h-24 w-full resize-y bg-transparent py-2.5 pl-10 pr-3.5 text-base text-ink outline-none placeholder:text-muted"></textarea></div>{#if fieldError('descripcion')}<span class="text-[13px] text-error">{fieldError('descripcion')}</span>{/if}</div>
    <RoleIconSelect name="icono_visual" label={i18n.t('roles.icon')} bind:value={form.icono} disabled={processing} />
  </div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={editOpen} variant="info" icon="pencil" title={i18n.t('roles.editTitle')} description={i18n.t('roles.editDescription')} confirmLabel={i18n.t('roles.save')} cancelLabel={i18n.t('roles.cancel')} confirmDisabled={!dirty || processing} onConfirm={submitEdit} onCancel={resetValidation}>
  <div class="flex flex-col gap-4 text-left">
    <Input label={i18n.t('roles.name')} icon="shield-check" bind:value={form.nombre} error={fieldError('nombre')} maxlength={80} disabled={processing} required />
    <Input label={i18n.t('roles.alias')} icon="at-sign" bind:value={form.alias} error={fieldError('alias')} oninput={() => (form.alias = form.alias.toUpperCase())} maxlength={40} disabled={processing} required />
    <div class="flex flex-col gap-1.5"><label for="role-edit-description" class="text-sm font-medium text-charcoal">{i18n.t('roles.fieldDescription')}</label><div class="relative rounded-md border bg-canvas transition-all duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20" class:border-error={Boolean(fieldError('descripcion'))} class:border-hairline-strong={!fieldError('descripcion')}><Icon name="file-text" size={18} class="pointer-events-none absolute left-3 top-3 text-steel" /><textarea id="role-edit-description" bind:value={form.descripcion} maxlength={250} rows={3} disabled={processing} required class="min-h-24 w-full resize-y bg-transparent py-2.5 pl-10 pr-3.5 text-base text-ink outline-none placeholder:text-muted"></textarea></div>{#if fieldError('descripcion')}<span class="text-[13px] text-error">{fieldError('descripcion')}</span>{/if}</div>
    <RoleIconSelect name="icono_visual_editar" label={i18n.t('roles.icon')} bind:value={form.icono} disabled={processing} />
  </div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('roles.deleteTitle')} description={i18n.t('roles.deleteDescription')} confirmLabel={i18n.t('roles.delete')} cancelLabel={i18n.t('roles.cancel')} confirmDisabled={!target || processing} onConfirm={submitDelete} />

<form bind:this={createForm} method="POST" action="?/create" use:enhance={create} class="hidden"><input name="nombre" value={form.nombre} /><input name="alias" value={form.alias} /><input name="descripcion" value={form.descripcion} /><input name="icono" value={form.icono} /></form>
<form bind:this={editForm} method="POST" action="?/edit" use:enhance={edit} class="hidden"><input name="id" value={target?.id_roles ?? ''} /><input name="nombre" value={form.nombre} /><input name="alias" value={form.alias} /><input name="descripcion" value={form.descripcion} /><input name="icono" value={form.icono} /></form>
<form bind:this={statusForm} method="POST" action="?/status" use:enhance={status} class="hidden"><input name="id" value={target?.id_roles ?? ''} /><input name="activo" value={pendingActive ? 'true' : 'false'} /></form>
<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id" value={target?.id_roles ?? ''} /></form>
