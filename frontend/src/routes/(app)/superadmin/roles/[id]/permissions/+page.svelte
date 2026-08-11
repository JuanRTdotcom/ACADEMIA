<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from "./$types";
  import { Breadcrumb, Button, Card, Icon, Switch, i18n } from "$lib";

  type Permission = { id_permisos: string; codigo: string; accion: string; descripcion: string | null; asignado: boolean };
  type Module = { id_modulos: string; codigo: string; nombre: string; icono: string | null; ruta: string | null; permisos: Permission[] };
  type Catalog = { rol: { id_roles: string; nombre: string; alias: string; icono: string; estado: number }; modulos: Module[] };
  type GroupKey = 'system' | 'superadmin' | 'administrator' | 'profile' | 'resources';
  type PermissionSubgroup = { key: string; modules: Module[] };

  const CANONICAL_ACTIONS = ['read', 'create', 'update', 'delete', 'export'] as const;
  type CanonicalAction = (typeof CANONICAL_ACTIONS)[number];

  function mapActionToCanonical(action: string): CanonicalAction {
    if (action === 'read') return 'read';
    if (action === 'create') return 'create';
    if (action === 'delete') return 'delete';
    if (action === 'export') return 'export';
    return 'update'; // status, assign, avatar, verify, manage
  }

  function getPermissionsForAction(module: Module, action: CanonicalAction): Permission[] {
    return module.permisos.filter((permission) => mapActionToCanonical(permission.accion) === action);
  }

  let { data }: PageProps = $props();
  let catalog = $derived(data as Catalog);
  const initialIds = (source: Catalog) => source.modulos.flatMap((module) => module.permisos.filter((permission) => permission.asignado).map((permission) => permission.id_permisos));
  const ssrSelected = untrack(() => initialIds(data as Catalog));
  let selected = $state<Set<string>>(new Set(ssrSelected));
  let initialSelected = $state<Set<string>>(new Set(ssrSelected));
  let saving = $state(false);
  let initializedRole = $state(untrack(() => (data as Catalog).rol.id_roles));

  const groupKey = (code: string): GroupKey => {
    if (code.startsWith('superadmin.')) return 'superadmin';
    if (code.startsWith('administrator.')) return 'administrator';
    if (code.startsWith('profile.')) return 'profile';
    if (code === 'resources') return 'resources';
    return 'system';
  };
  const subgroupKey = (group: GroupKey, code: string) => {
    if (group === 'administrator') {
      if (code.startsWith('administrator.users')) return 'company_users';
      return 'company';
    }
    if (group === 'profile') {
      if (['profile.personal', 'profile.authentication', 'profile.emails', 'profile.sessions', 'profile.privacy'].includes(code)) return 'account';
      if (['profile.nationalities', 'profile.insurance', 'profile.phones', 'profile.hobbies', 'profile.documents', 'profile.studies', 'profile.family'].includes(code)) return 'professional';
      if (['profile.appearance', 'profile.notifications', 'profile.activity'].includes(code)) return 'preferences';
      return 'information';
    }
    return 'management';
  };
  const groups = $derived.by(() => {
    const result = new Map<GroupKey, { key: GroupKey; modules: Module[] }>();
    for (const module of catalog.modulos) {
      const key = groupKey(module.codigo);
      const group = result.get(key) ?? { key, modules: [] };
      group.modules.push(module);
      result.set(key, group);
    }
    return [...result.values()].map((group) => {
      const subgroups = new Map<string, PermissionSubgroup>();
      for (const module of group.modules) {
        const key = subgroupKey(group.key, module.codigo);
        const subgroup = subgroups.get(key) ?? { key, modules: [] };
        subgroup.modules.push(module);
        subgroups.set(key, subgroup);
      }
      return { ...group, subgroups: [...subgroups.values()] };
    });
  });
  $effect(() => {
    if (initializedRole === catalog.rol.id_roles) return;
    initialSelected = new Set(initialIds(catalog));
    selected = new Set(initialSelected);
    initializedRole = catalog.rol.id_roles;
  });

  const items = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('nav.roles'), href: '/superadmin/roles' }, { label: catalog.rol.nombre }]);
  const dirty = $derived(selected.size !== initialSelected.size || [...selected].some((id) => !initialSelected.has(id)));
  const actionName = (action: string) => i18n.t(`permissions.actions.${action}`) || action;
  const groupName = (key: GroupKey) => i18n.t(`permissions.groups.${key}`);
  const subgroupName = (key: string) => i18n.t(`permissions.subgroups.${key}`);
  const idsOf = (modules: Module[]) => modules.flatMap((module) => module.permisos.map((permission) => permission.id_permisos));
  function isSelected(id: string) { return selected.has(id); }
  function allSelected(ids: string[]) { return ids.length > 0 && ids.every(isSelected); }
  function toggleAll(ids: string[], enabled: boolean) { const next = new Set(selected); ids.forEach((id) => enabled ? next.add(id) : next.delete(id)); selected = next; }
  function resultKey(result: ActionResult, fallback: string) {
    return result.type === 'failure' && typeof result.data?.roleMessage === 'string' ? result.data.roleMessage : fallback;
  }
  const save: SubmitFunction = () => {
    if (saving) return () => {};
    saving = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        initialSelected = new Set(selected);
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('roles.permissionsUpdated') });
      } else {
        const key = resultKey(result, 'roles.permissionsSaveError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
      }
      saving = false;
    };
  };
</script>

<svelte:head><title>{i18n.t('permissions.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={items} />

<section class="flex flex-col gap-4">
  <div class="flex items-center gap-3">
    <Button href="/superadmin/roles" variant="secondary" size="sm"><Icon name="arrow-left" size={16} />{i18n.t('permissions.back')}</Button>
    <h1 class="text-lg tracking-[-0.02em] text-ink">{catalog.rol.nombre} <span class="font-normal text-steel">· {catalog.rol.alias}</span></h1>
  </div>

  <Card padding="none" class="overflow-hidden">
    <div class="overflow-x-auto">
      <div class="min-w-[760px]">
        <div class="flex items-center border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.04em] text-stone">
          <div class="order-1 flex w-96 shrink-0 divide-x divide-hairline md:order-2">
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.all')}</div>
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.actions.read')}</div>
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.actions.create')}</div>
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.actions.update')}</div>
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.actions.delete')}</div>
            <div class="w-16 px-2 py-2 text-center">{i18n.t('permissions.actions.export')}</div>
          </div>
          <div class="order-2 flex-1 min-w-0 border-l border-hairline px-5 py-2 md:order-1 md:border-l-0 md:border-r">{i18n.t('permissions.module')}</div>
        </div>
        <div class="divide-y divide-hairline">
          {#each groups as group (group.key)}
            {@const groupIds = idsOf(group.modules)}
            <div class="flex items-center border-b border-hairline bg-surface/60">
              <div class="order-1 flex w-96 shrink-0 divide-x divide-hairline md:order-2">
                <div class="w-16 px-2 py-1.5"><div class="flex justify-center"><Switch checked={allSelected(groupIds)} label={`${i18n.t('permissions.all')}: ${groupName(group.key)}`} onchange={(enabled) => toggleAll(groupIds, enabled)} /></div></div>
                <div class="flex-1"></div>
              </div>
              <div class="order-2 flex-1 min-w-0 border-l border-hairline px-5 py-2 md:order-1 md:border-l-0 md:border-r"><strong class="text-[13px] font-extrabold text-ink">{groupName(group.key)}</strong></div>
            </div>
            {#each group.subgroups as subgroup (`${group.key}:${subgroup.key}`)}
              {@const subgroupIds = idsOf(subgroup.modules)}
              <div class="flex items-center border-b border-hairline bg-surface-soft/50">
                <div class="order-1 flex w-96 shrink-0 divide-x divide-hairline md:order-2">
                  <div class="w-16 px-2 py-1.5"><div class="flex justify-center"><Switch checked={allSelected(subgroupIds)} label={`${i18n.t('permissions.all')}: ${subgroupName(subgroup.key)}`} onchange={(enabled) => toggleAll(subgroupIds, enabled)} /></div></div>
                  <div class="flex-1"></div>
                </div>
                <div class="order-2 flex-1 min-w-0 border-l border-hairline px-5 py-2 md:order-1 md:border-l-0 md:border-r"><span class="pl-4 text-[13px] font-semibold text-charcoal">{subgroupName(subgroup.key)}</span></div>
              </div>
              {#each subgroup.modules as module (module.id_modulos)}
                {@const ids = module.permisos.map((permission) => permission.id_permisos)}
                <div class="flex items-stretch border-b border-hairline transition-colors hover:bg-surface/50">
                  <div class="order-1 flex w-96 shrink-0 divide-x divide-hairline md:order-2">
                    <div class="flex w-16 items-center justify-center px-2 py-1.5"><Switch checked={allSelected(ids)} label={`${i18n.t('permissions.all')}: ${module.nombre}`} onchange={(enabled) => toggleAll(ids, enabled)} /></div>
                    {#each CANONICAL_ACTIONS as action (action)}
                      {@const actionPerms = getPermissionsForAction(module, action)}
                      {@const actionIds = actionPerms.map((permission) => permission.id_permisos)}
                      {@const hasPerms = actionIds.length > 0}
                      {@const isChecked = hasPerms && allSelected(actionIds)}
                      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                      <div
                        class="flex w-16 items-center justify-center px-2 py-1.5 transition-colors {hasPerms ? 'cursor-pointer hover:bg-primary/10 active:bg-primary/15' : ''}"
                        onclick={() => hasPerms && toggleAll(actionIds, !isChecked)}
                        role={hasPerms ? 'checkbox' : undefined}
                        aria-checked={hasPerms ? isChecked : undefined}
                        tabindex={hasPerms ? 0 : undefined}
                        onkeydown={(e) => hasPerms && (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleAll(actionIds, !isChecked))}
                      >
                        {#if !hasPerms}
                          <span class="select-none text-steel/25">·</span>
                        {:else}
                          <input type="checkbox" checked={isChecked} tabindex={-1} class="pointer-events-none size-4 rounded border-hairline-strong accent-primary" />
                        {/if}
                      </div>
                    {/each}
                  </div>
                  <div class="order-2 flex flex-1 min-w-0 items-center border-l border-hairline px-5 py-2 md:order-1 md:border-l-0 md:border-r"><span class="block truncate pl-6 text-ink {allSelected(ids) ? 'font-bold' : 'font-normal'}">{module.nombre}</span></div>
                </div>
              {/each}
            {/each}
          {/each}
        </div>
      </div>
    </div>
  </Card>
  <div class="flex justify-end"><form method="POST" action="?/save" use:enhance={save}>{#each [...selected] as id (id)}<input type="hidden" name="permisos" value={id} />{/each}<Button type="submit" loading={saving} disabled={!dirty || saving}><Icon name="save" size={16} />{i18n.t('roles.save')}</Button></form></div>
</section>
