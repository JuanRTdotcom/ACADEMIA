<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Select, Switch, i18n } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type Plan = (typeof data.planes)[number];
  type StorageUnit = { id_parametros: string; codigo: string; etiqueta: string; factor_bytes: number };
  let form = $state({ codigo: '', nombre: '', descripcion: '', almacenamiento_valor: '', fid_parametros_unidad_almacenamiento: '', maximo_sedes: '', maximo_usuarios: '', maximo_mensajes_mensuales: '', maximo_uso_ia_mensual: '' });
  let target = $state<Plan | null>(null);
  let createOpen = $state(false);
  let editOpen = $state(false);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let statusForm: HTMLFormElement;
  let createForm: HTMLFormElement;
  let editForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let pendingActive = $state(false);
  let resolveCreate: (() => void) | null = null;
  let rejectCreate: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;
  let resolveEdit: (() => void) | null = null;
  let rejectEdit: ((error: Error) => void) | null = null;
  let editBaseline = $state('');
  let validationAttempted = $state(false);

  type PlanField = keyof typeof form;
  type FieldError = Partial<Record<PlanField, string>>;

  const fieldErrors = $derived.by(() => {
    const errors: FieldError = {};
    const codigo = form.codigo.trim().toUpperCase();
    const nombre = form.nombre.trim().replace(/\s+/g, ' ');
    const txtDescripcion = form.descripcion.trim().replace(/\s+/g, ' ');
    const almacenamiento = String(form.almacenamiento_valor ?? '').trim();
    const sedes = String(form.maximo_sedes ?? '').trim();
    const usuarios = String(form.maximo_usuarios ?? '').trim();
    const mensajes = String(form.maximo_mensajes_mensuales ?? '').trim();
    const usoIa = String(form.maximo_uso_ia_mensual ?? '').trim();

    if (!codigo) errors.codigo = 'plans.validation.requiredCode';
    else if (!/^[A-Z0-9_]{2,40}$/.test(codigo)) errors.codigo = 'plans.validation.code';
    if (!nombre) errors.nombre = 'plans.validation.requiredName';
    else if (nombre.length < 2 || nombre.length > 100) errors.nombre = 'plans.validation.name';
    if (txtDescripcion.length > 250) errors.descripcion = 'plans.validation.description';
    const unidad = (data.unidades_almacenamiento as StorageUnit[]).find((item) => item.id_parametros === form.fid_parametros_unidad_almacenamiento);
    if (almacenamiento && (!/^\d+$/.test(almacenamiento) || Number(almacenamiento) < 1 || !unidad || !Number.isSafeInteger(Number(almacenamiento) * unidad.factor_bytes))) errors.almacenamiento_valor = 'plans.validation.storage';
    if (sedes && (!/^\d+$/.test(sedes) || Number(sedes) < 1 || Number(sedes) > 1_000_000)) errors.maximo_sedes = 'plans.validation.branches';
    if (usuarios && (!/^\d+$/.test(usuarios) || Number(usuarios) < 1 || Number(usuarios) > 1_000_000)) errors.maximo_usuarios = 'plans.validation.users';
    if (mensajes && (!/^\d+$/.test(mensajes) || Number(mensajes) < 1 || Number(mensajes) > 1_000_000_000)) errors.maximo_mensajes_mensuales = 'plans.validation.messages';
    if (usoIa && (!/^\d+$/.test(usoIa) || Number(usoIa) < 1 || Number(usoIa) > 1_000_000_000)) errors.maximo_uso_ia_mensual = 'plans.validation.aiUsage';
    return errors;
  });

  const valid = $derived(Object.keys(fieldErrors).length === 0);
  const editDirty = $derived(JSON.stringify(form) !== editBaseline);
  const breadcrumbItems = $derived([
    { label: i18n.t('nav.dashboard'), href: '/dashboard' },
    { label: i18n.t('nav.plans') }
  ]);

  function clearValidation() {
    validationAttempted = false;
  }

  function reset() {
    form = { codigo: '', nombre: '', descripcion: '', almacenamiento_valor: '', fid_parametros_unidad_almacenamiento: defaultStorageUnit()?.id_parametros ?? '', maximo_sedes: '', maximo_usuarios: '', maximo_mensajes_mensuales: '', maximo_uso_ia_mensual: '' };
    clearValidation();
  }

  function fieldError(field: PlanField) {
    const key = fieldErrors[field];
    return key && validationAttempted ? i18n.t(key) : undefined;
  }

  function validateForm() {
    validationAttempted = true;
    if (valid) return true;
    toast.error(i18n.t('notifications.type.error'), { description: i18n.t('plans.invalidData') });
    return false;
  }

  function submitCreate() {
    if (!validateForm()) return Promise.reject(new Error('invalid-plan-form'));
    return new Promise<void>((resolve, reject) => { resolveCreate = resolve; rejectCreate = reject; createForm.requestSubmit(); });
  }

  function submitEdit() {
    if (!validateForm()) return Promise.reject(new Error('invalid-plan-form'));
    return new Promise<void>((resolve, reject) => { resolveEdit = resolve; rejectEdit = reject; editForm.requestSubmit(); });
  }

  function requestDelete() { return new Promise<void>((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); }); }

  async function changeStatus(plan: Plan, active: boolean) {
    if (processing) return;
    target = plan;
    pendingActive = active;
    await tick();
    statusForm.requestSubmit();
  }

  function openEdit(plan: Plan) {
    target = plan;
    clearValidation();
    const almacenamiento = storageValue(plan.almacenamiento_max_bytes);
    form = {
      codigo: plan.codigo,
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? '',
      almacenamiento_valor: almacenamiento.value,
      fid_parametros_unidad_almacenamiento: almacenamiento.unit?.id_parametros ?? '',
      maximo_sedes: plan.maximo_sedes === null ? '' : String(plan.maximo_sedes),
      maximo_usuarios: plan.maximo_usuarios === null ? '' : String(plan.maximo_usuarios),
      maximo_mensajes_mensuales: plan.maximo_mensajes_mensuales === null ? '' : String(plan.maximo_mensajes_mensuales),
      maximo_uso_ia_mensual: plan.maximo_uso_ia_mensual === null ? '' : String(plan.maximo_uso_ia_mensual)
    };
    editBaseline = JSON.stringify(form);
    editOpen = true;
  }

  function defaultStorageUnit(): StorageUnit | undefined {
    return [...(data.unidades_almacenamiento as StorageUnit[])].sort((a, b) => b.factor_bytes - a.factor_bytes)[0];
  }

  function storageValue(bytes: number | null): { value: string; unit?: StorageUnit } {
    if (bytes === null) return { value: '', unit: defaultStorageUnit() };
    const units = [...(data.unidades_almacenamiento as StorageUnit[])].sort((a, b) => b.factor_bytes - a.factor_bytes);
    const unit = units.find((item) => bytes % item.factor_bytes === 0) ?? units.at(-1);
    return { value: unit ? String(bytes / unit.factor_bytes) : '', unit };
  }

  function formatStorage(bytes: number | null) {
    if (bytes === null) return i18n.t('plans.unlimited');
    const storage = storageValue(bytes);
    return storage.unit ? `${storage.value} ${storage.unit.etiqueta}` : String(bytes);
  }

  $effect(() => {
    if (!createOpen && !editOpen) clearValidation();
  });

  const create: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      const key = result.type === 'failure' && typeof result.data?.planMessage === 'string' ? result.data.planMessage : 'plans.saveError';
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('plans.created') });
        reset(); resolveCreate?.();
      } else {
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
      const key = result.type === 'failure' && typeof result.data?.planMessage === 'string' ? result.data.planMessage : 'plans.saveError';
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('plans.updated') });
        resolveEdit?.();
      } else {
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
      const key = result.type === 'failure' && typeof result.data?.planMessage === 'string' ? result.data.planMessage : 'plans.saveError';
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t(pendingActive ? 'plans.activated' : 'plans.deactivated') });
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
      }
      processing = false;
    };
  };

  const remove: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      const key = result.type === 'failure' && typeof result.data?.planMessage === 'string' ? result.data.planMessage : 'plans.deleteError';
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('plans.deleted') });
        resolveDelete?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
        rejectDelete?.(new Error(key));
      }
      processing = false; resolveDelete = null; rejectDelete = null;
    };
  };
</script>

<svelte:head><title>{i18n.t('plans.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('plans.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('plans.description')}</p></div>
    <Button type="button" onclick={() => { reset(); createOpen = true; }}><Icon name="plus" size={18} />{i18n.t('plans.new')}</Button>
  </div>
  <div class="flex justify-end">
    <Badge variant="outline-sky">{i18n.t('plans.count', { count: data.planes.length })}</Badge>
  </div>
  <Card padding="none" class="overflow-hidden">
    {#if data.planes.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center"><Icon name="package" size={32} class="mb-4 text-stone" /><h2 class="text-lg text-ink">{i18n.t('plans.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('plans.emptyDescription')}</p></div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1580px] border-collapse text-left">
          <thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('plans.field.name')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.code')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.description')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.storage')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.branches')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.users')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.messages')}</th><th class="px-4 py-3.5">{i18n.t('plans.field.aiUsage')}</th><th class="px-4 py-3.5 text-center">{i18n.t('plans.field.status')}</th><th class="px-5 py-3.5 text-right">{i18n.t('plans.actions')}</th></tr></thead>
          <tbody class="divide-y divide-hairline">
            {#each data.planes as plan (plan.id_planes)}
              <tr class="transition-colors hover:bg-surface/55">
                <td class="px-5 py-4"><strong class="text-sm font-medium text-ink">{plan.nombre}</strong></td>
                <td class="px-4 py-4"><code class="rounded bg-surface px-2 py-1 text-xs font-semibold text-slate">{plan.codigo}</code></td>
                <td class="px-4 py-4 text-sm text-slate">{plan.descripcion || '—'}</td>
                <td class="px-4 py-4 text-sm font-medium text-ink">{formatStorage(plan.almacenamiento_max_bytes)}</td>
                <td class="px-4 py-4 text-sm text-slate">{plan.maximo_sedes ?? i18n.t('plans.unlimited')}</td>
                <td class="px-4 py-4 text-sm text-slate">{plan.maximo_usuarios ?? i18n.t('plans.unlimited')}</td>
                <td class="px-4 py-4 text-sm text-slate">{plan.maximo_mensajes_mensuales ?? i18n.t('plans.unlimited')}</td>
                <td class="px-4 py-4 text-sm text-slate">{plan.maximo_uso_ia_mensual ?? i18n.t('plans.unlimited')}</td>
                <td class="px-4 py-4 text-center"><Switch checked={plan.estado === 1} disabled={processing} label={`${i18n.t('plans.field.status')}: ${plan.nombre}`} onchange={(active) => changeStatus(plan, active)} /></td>
                <td class="px-5 py-4">
                  <div class="flex justify-end">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger
                        disabled={processing}
                        aria-label={`${i18n.t('plans.actions')}: ${plan.nombre}`}
                        class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Icon name="ellipsis" size={18} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" class="min-w-[200px]">
                        <DropdownMenu.Item
                          disabled={processing || plan.estado !== 1}
                          onSelect={() => void (window.location.href = `/superadmin/plans/${plan.id_planes}/modules`)}
                        >
                          <Icon name="boxes" size={15} />
                          <span>{i18n.t('plans.manageModules')}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          disabled={processing || plan.estado !== 1}
                          onSelect={() => openEdit(plan)}
                        >
                          <Icon name="pencil" size={15} />
                          <span>{i18n.t('plans.edit')}</span>
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          disabled={processing || plan.estado !== 1}
                          class="text-error focus:bg-error/10 focus:text-error"
                          onSelect={() => { target = plan; deleteOpen = true; }}
                        >
                          <Icon name="trash-2" size={15} />
                          <span>{i18n.t('plans.delete')}</span>
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

<!-- Diálogo de Creación -->
<ConfirmationDialog bind:open={createOpen} size="wide" variant="info" icon="package" title={i18n.t('plans.createTitle')} description={i18n.t('plans.createDescription')} confirmLabel={i18n.t('plans.create')} cancelLabel={i18n.t('plans.cancel')} confirmDisabled={processing} onConfirm={submitCreate} onCancel={clearValidation}>
  <div class="grid grid-cols-12 gap-4 text-left">
    <div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('plans.field.name')} icon="package" bind:value={form.nombre} error={fieldError('nombre')} maxlength={100} disabled={processing} required /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('plans.field.code')} icon="hash" bind:value={form.codigo} error={fieldError('codigo')} oninput={() => (form.codigo = form.codigo.toUpperCase())} maxlength={40} disabled={processing} required /></div>
    <div class="col-span-12"><Input label={i18n.t('plans.field.description')} icon="file-text" bind:value={form.descripcion} error={fieldError('descripcion')} maxlength={250} disabled={processing} /></div>
    <div class="col-span-4 max-sm:col-span-8"><Input type="number" label={i18n.t('plans.field.storage')} bind:value={form.almacenamiento_valor} error={fieldError('almacenamiento_valor')} min="1" step="1" disabled={processing} /></div>
    <div class="col-span-2 max-sm:col-span-4"><Select label={i18n.t('plans.field.storageUnit')} bind:value={form.fid_parametros_unidad_almacenamiento} disabled={processing}>{#each data.unidades_almacenamiento as unidad (unidad.id_parametros)}<option value={unidad.id_parametros}>{unidad.etiqueta}</option>{/each}</Select></div>
    <div class="col-span-3 max-sm:col-span-6"><Input type="number" label={i18n.t('plans.field.branches')} bind:value={form.maximo_sedes} error={fieldError('maximo_sedes')} min="1" max="1000000" step="1" disabled={processing} /></div>
    <div class="col-span-3 max-sm:col-span-6"><Input type="number" label={i18n.t('plans.field.users')} bind:value={form.maximo_usuarios} error={fieldError('maximo_usuarios')} min="1" max="1000000" step="1" disabled={processing} /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input type="number" label={i18n.t('plans.field.messages')} bind:value={form.maximo_mensajes_mensuales} error={fieldError('maximo_mensajes_mensuales')} min="1" max="1000000000" step="1" disabled={processing} /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input type="number" label={i18n.t('plans.field.aiUsage')} bind:value={form.maximo_uso_ia_mensual} error={fieldError('maximo_uso_ia_mensual')} min="1" max="1000000000" step="1" disabled={processing} /></div>
  </div>
</ConfirmationDialog>

<!-- Diálogo de Edición -->
<ConfirmationDialog bind:open={editOpen} size="wide" variant="info" icon="pencil" title={i18n.t('plans.editTitle')} description={i18n.t('plans.editDescription')} confirmLabel={i18n.t('plans.save')} cancelLabel={i18n.t('plans.cancel')} confirmDisabled={!editDirty || processing} onConfirm={submitEdit} onCancel={clearValidation}>
  <div class="grid grid-cols-12 gap-4 text-left">
    <div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('plans.field.name')} icon="package" bind:value={form.nombre} error={fieldError('nombre')} maxlength={100} disabled={processing} required /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('plans.field.code')} icon="hash" bind:value={form.codigo} error={fieldError('codigo')} oninput={() => (form.codigo = form.codigo.toUpperCase())} maxlength={40} disabled={processing} required /></div>
    <div class="col-span-12"><Input label={i18n.t('plans.field.description')} icon="file-text" bind:value={form.descripcion} error={fieldError('descripcion')} maxlength={250} disabled={processing} /></div>
    <div class="col-span-4 max-sm:col-span-8"><Input type="number" label={i18n.t('plans.field.storage')} bind:value={form.almacenamiento_valor} error={fieldError('almacenamiento_valor')} min="1" step="1" disabled={processing} /></div>
    <div class="col-span-2 max-sm:col-span-4"><Select label={i18n.t('plans.field.storageUnit')} bind:value={form.fid_parametros_unidad_almacenamiento} disabled={processing}>{#each data.unidades_almacenamiento as unidad (unidad.id_parametros)}<option value={unidad.id_parametros}>{unidad.etiqueta}</option>{/each}</Select></div>
    <div class="col-span-3 max-sm:col-span-6"><Input type="number" label={i18n.t('plans.field.branches')} bind:value={form.maximo_sedes} error={fieldError('maximo_sedes')} min="1" max="1000000" step="1" disabled={processing} /></div>
    <div class="col-span-3 max-sm:col-span-6"><Input type="number" label={i18n.t('plans.field.users')} bind:value={form.maximo_usuarios} error={fieldError('maximo_usuarios')} min="1" max="1000000" step="1" disabled={processing} /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input type="number" label={i18n.t('plans.field.messages')} bind:value={form.maximo_mensajes_mensuales} error={fieldError('maximo_mensajes_mensuales')} min="1" max="1000000000" step="1" disabled={processing} /></div>
    <div class="col-span-6 max-sm:col-span-12"><Input type="number" label={i18n.t('plans.field.aiUsage')} bind:value={form.maximo_uso_ia_mensual} error={fieldError('maximo_uso_ia_mensual')} min="1" max="1000000000" step="1" disabled={processing} /></div>
  </div>
</ConfirmationDialog>

<!-- Diálogo de Eliminación -->
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('plans.deleteTitle')} description={i18n.t('plans.deletePermanentDescription')} confirmLabel={i18n.t('plans.delete')} cancelLabel={i18n.t('plans.cancel')} confirmDisabled={!target || processing} onConfirm={requestDelete} />

<!-- Formularios de Envío de Formulario HTTP -->
<form bind:this={createForm} method="POST" action="?/create" use:enhance={create} class="hidden">
  <input name="codigo" value={form.codigo} />
  <input name="nombre" value={form.nombre} />
  <input name="descripcion" value={form.descripcion} />
  <input name="almacenamiento_valor" value={form.almacenamiento_valor} />
  <input name="fid_parametros_unidad_almacenamiento" value={form.fid_parametros_unidad_almacenamiento} />
  <input name="maximo_sedes" value={form.maximo_sedes} />
  <input name="maximo_usuarios" value={form.maximo_usuarios} />
  <input name="maximo_mensajes_mensuales" value={form.maximo_mensajes_mensuales} />
  <input name="maximo_uso_ia_mensual" value={form.maximo_uso_ia_mensual} />
</form>

<form bind:this={editForm} method="POST" action="?/edit" use:enhance={edit} class="hidden">
  <input name="id" value={target?.id_planes ?? ''} />
  <input name="codigo" value={form.codigo} />
  <input name="nombre" value={form.nombre} />
  <input name="descripcion" value={form.descripcion} />
  <input name="almacenamiento_valor" value={form.almacenamiento_valor} />
  <input name="fid_parametros_unidad_almacenamiento" value={form.fid_parametros_unidad_almacenamiento} />
  <input name="maximo_sedes" value={form.maximo_sedes} />
  <input name="maximo_usuarios" value={form.maximo_usuarios} />
  <input name="maximo_mensajes_mensuales" value={form.maximo_mensajes_mensuales} />
  <input name="maximo_uso_ia_mensual" value={form.maximo_uso_ia_mensual} />
</form>

<form bind:this={statusForm} method="POST" action="?/status" use:enhance={status} class="hidden">
  <input name="id" value={target?.id_planes ?? ''} />
  <input name="activo" value={pendingActive ? 'true' : 'false'} />
</form>

<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden">
  <input name="id" value={target?.id_planes ?? ''} />
</form>
