<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import * as Table from '$lib/components/ui/table/index.js';

  let { data }: PageProps = $props();
  type Branch = (typeof data.sedes)[number];
  let target = $state<Branch | null>(null);
  let editorOpen = $state(false);
  let deleteOpen = $state(false);
  let processing = $state(false);
  let attempted = $state(false);
  let codigo = $state('');
  let nombre = $state('');
  let editorForm: HTMLFormElement;
  let deleteForm: HTMLFormElement;
  let resolveEditor: (() => void) | null = null;
  let rejectEditor: ((error: Error) => void) | null = null;
  let resolveDelete: (() => void) | null = null;
  let rejectDelete: ((error: Error) => void) | null = null;

  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'administrator.company.branches.create'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'administrator.company.branches.update'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'administrator.company.branches.delete'));
  const canAny = $derived(canUpdate || canDelete);
  const limitReached = $derived(data.limite !== null && data.total >= data.limite);
  const validCode = $derived(/^[A-Za-z0-9][A-Za-z0-9_-]{1,23}$/.test(codigo.trim()));
  const validName = $derived(nombre.trim().length >= 2 && nombre.trim().length <= 120);
  const dirty = $derived(!target || codigo.trim().toUpperCase() !== target.codigo || nombre.trim() !== target.nombre);
  const ready = $derived(validCode && validName && dirty && !processing);
  const breadcrumbs = $derived([
    { label: i18n.t('nav.dashboard'), href: '/dashboard' },
    { label: i18n.t('companies.branches.title') }
  ]);

  function createBranch() {
    target = null;
    codigo = '';
    nombre = '';
    attempted = false;
    editorOpen = true;
  }

  function editBranch(branch: Branch) {
    target = branch;
    codigo = branch.codigo;
    nombre = branch.nombre;
    attempted = false;
    editorOpen = true;
  }

  function resultKey(result: ActionResult) {
    return result.type === 'failure' && typeof result.data?.message === 'string'
      ? result.data.message
      : 'companies.saveError';
  }

  const save: SubmitFunction = () => {
    processing = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t(result.data?.message ?? 'companies.branches.created')
        });
        resolveEditor?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
        rejectEditor?.(new Error('branch-save-failed'));
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
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.branches.deleted') });
        resolveDelete?.();
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(resultKey(result)) });
        rejectDelete?.(new Error('branch-delete-failed'));
      }
      processing = false;
      resolveDelete = null;
      rejectDelete = null;
    };
  };

  function submitEditor(): Promise<void> {
    attempted = true;
    if (!ready) return Promise.reject(new Error('invalid-branch'));
    return new Promise((resolve, reject) => {
      resolveEditor = resolve;
      rejectEditor = reject;
      editorForm.requestSubmit();
    });
  }

  function submitDelete(): Promise<void> {
    if (!target) return Promise.reject(new Error('invalid-branch'));
    return new Promise((resolve, reject) => {
      resolveDelete = resolve;
      rejectDelete = reject;
      deleteForm.requestSubmit();
    });
  }
</script>

<svelte:head><title>{i18n.t('companies.branches.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div>
      <h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('companies.branches.title')}</h1>
      <p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('companies.branches.description')}</p>
    </div>
    {#if canCreate}
      <Button onclick={createBranch} disabled={limitReached} title={limitReached ? i18n.t('companies.branches.planLimit') : undefined}>
        <Icon name="plus" size={18} />{i18n.t('companies.branches.new')}
      </Button>
    {/if}
  </div>

  <div class="flex items-center justify-between gap-4">
    <h2 class="text-lg font-semibold text-ink">{i18n.t('companies.branches.catalog')}</h2>
    <Badge variant="outline-sky">
      {data.limite === null
        ? i18n.t('companies.branches.unlimitedCount', { count: data.total })
        : i18n.t('companies.branches.limitCount', { count: data.total, limit: data.limite })}
    </Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if data.sedes.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center">
        <Icon name="map-pin" size={34} class="mb-4 text-stone" />
        <h2 class="text-lg text-ink">{i18n.t('companies.branches.empty')}</h2>
      </div>
    {:else}
      <div class="hidden overflow-x-auto md:block">
        <Table.Root class="min-w-[680px] table-fixed text-left text-sm">
          <colgroup>
            {#if canAny}<col class="w-[92px]" />{/if}
            <col />
            <col class="w-[28%]" />
            <col class="w-[18%]" />
            <col class="w-[16%]" />
          </colgroup>
          <Table.Header class="bg-canvas">
            <Table.Row class="border-hairline hover:bg-canvas">
              {#if canAny}<Table.Head class="h-10 border-r border-hairline px-3 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('companies.branches.actions')}</Table.Head>{/if}
              <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('companies.branches.name')}</Table.Head>
              <Table.Head class="h-10 border-r border-hairline px-4 text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('companies.branches.code')}</Table.Head>
              <Table.Head class="h-10 border-r border-hairline px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('companies.branches.users')}</Table.Head>
              <Table.Head class="h-10 px-4 text-center text-[11px] font-bold uppercase tracking-[0.04em] text-ink">{i18n.t('companies.branches.type')}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.sedes as branch (branch.id_sedes)}
              <Table.Row class="border-hairline odd:bg-surface/55 even:bg-canvas hover:bg-primary-soft/35">
                {#if canAny}
                  <Table.Cell class="border-r border-hairline px-2 py-2.5">
                    <div class="flex items-center justify-center gap-1">
                      {#if canUpdate && !branch.es_principal}<button type="button" title={i18n.t('common.edit')} class="grid size-7 place-items-center rounded-md border border-transparent text-steel hover:border-hairline hover:bg-canvas hover:text-primary" onclick={() => editBranch(branch)}><Icon name="pencil" size={15} /></button>{/if}
                      {#if canDelete && !branch.es_principal}
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger aria-label={i18n.t('companies.branches.actions')} class="grid size-7 place-items-center rounded-md border border-transparent text-steel hover:border-hairline hover:bg-canvas"><Icon name="ellipsis" size={18} /></DropdownMenu.Trigger>
                          <DropdownMenu.Content align="start" class="min-w-[160px]"><DropdownMenu.Item class="text-error focus:bg-error/10 focus:text-error" onSelect={() => { target = branch; deleteOpen = true; }}><Icon name="trash-2" size={15} />{i18n.t('common.delete')}</DropdownMenu.Item></DropdownMenu.Content>
                        </DropdownMenu.Root>
                      {/if}
                    </div>
                  </Table.Cell>
                {/if}
                <Table.Cell class="border-r border-hairline px-4 py-2.5 text-steel">{branch.nombre}</Table.Cell>
                <Table.Cell class="border-r border-hairline px-4 py-2.5 text-steel">{branch.codigo}</Table.Cell>
                <Table.Cell class="border-r border-hairline px-4 py-2.5 text-center text-steel">{branch._count.usuarios}</Table.Cell>
                <Table.Cell class="px-4 py-2.5 text-center text-steel">{i18n.t(branch.es_principal ? 'companies.branches.main' : 'companies.branches.secondary')}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
      <div class="divide-y divide-hairline md:hidden">
        {#each data.sedes as branch (branch.id_sedes)}
          <article class="flex items-center gap-3 p-4">
            <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="map-pin" size={18} /></span>
            <div class="min-w-0 flex-1"><strong class="block truncate text-sm text-ink">{branch.nombre}</strong><span class="text-xs text-steel">{branch.codigo} · {i18n.t(branch.es_principal ? 'companies.branches.main' : 'companies.branches.secondary')}</span></div>
            {#if canUpdate && !branch.es_principal}<button type="button" title={i18n.t('common.edit')} class="grid size-8 place-items-center rounded-md border border-hairline text-steel hover:text-primary" onclick={() => editBranch(branch)}><Icon name="pencil" size={16} /></button>{/if}
            {#if canDelete && !branch.es_principal}<button type="button" title={i18n.t('common.delete')} class="grid size-8 place-items-center rounded-md border border-hairline text-error" onclick={() => { target = branch; deleteOpen = true; }}><Icon name="trash-2" size={16} /></button>{/if}
          </article>
        {/each}
      </div>
    {/if}
  </Card>
</section>

<ConfirmationDialog bind:open={editorOpen} variant="info" icon={target ? 'pencil' : 'map-pin'} title={i18n.t(target ? 'companies.branches.edit' : 'companies.branches.new')} description={i18n.t('companies.branches.formHelp')} confirmLabel={i18n.t('common.save')} cancelLabel={i18n.t('common.cancel')} confirmDisabled={!ready} onConfirm={submitEditor}>
  <form bind:this={editorForm} method="POST" action="?/save" use:enhance={save} class="grid grid-cols-1 gap-4 text-left">
    {#if target}<input type="hidden" name="id_sedes" value={target.id_sedes} />{/if}
    <Input name="nombre" label={i18n.t('companies.branches.name')} icon="map-pin" bind:value={nombre} maxlength={120} required disabled={processing} error={attempted && !validName ? i18n.t('companies.branches.invalidName') : undefined} />
    <Input name="codigo" label={i18n.t('companies.branches.code')} bind:value={codigo} maxlength={24} required disabled={processing} error={attempted && !validCode ? i18n.t('companies.branches.invalidCode') : undefined} />
  </form>
</ConfirmationDialog>

<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('companies.branches.confirmDelete')} description={i18n.t('companies.branches.confirmDeleteHelp')} confirmLabel={i18n.t('common.delete')} cancelLabel={i18n.t('common.cancel')} confirmDisabled={!target || processing} onConfirm={submitDelete} />

<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id_sedes" value={target?.id_sedes ?? ''} /></form>
