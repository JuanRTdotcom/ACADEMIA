<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from "./$types";
  import { Breadcrumb, Button, Card, Icon, Switch, i18n } from "$lib";

  type Module = { id_modulos: string; codigo: string; nombre: string; icono: string | null; description?: string };
  type Plan = { id_planes: string; codigo: string; nombre: string; descripcion: string | null; modulos: { id_modulos: string }[] };
  type PageData = { plan: Plan; modulosDisponibles: Module[] };

  let { data }: PageProps = $props();
  const pageData = $derived(data as PageData);

  const initialIds = (d: PageData) => d.plan.modulos.map((m) => m.id_modulos);
  const ssrSelected = untrack(() => initialIds(data as PageData));
  
  let selected = $state<Set<string>>(new Set(ssrSelected));
  let initialSelected = $state<Set<string>>(new Set(ssrSelected));
  let saving = $state(false);
  let initializedPlan = $state(untrack(() => (data as PageData).plan.id_planes));

  type GroupKey = 'superadmin' | 'administrator' | 'profile' | 'resources' | 'system';
  
  const groupKey = (code: string): GroupKey => {
    if (code.startsWith('superadmin.')) return 'superadmin';
    if (code.startsWith('administrator.')) return 'administrator';
    if (code.startsWith('profile.')) return 'profile';
    if (code === 'resources') return 'resources';
    return 'system';
  };

  const groupName = (key: GroupKey) => i18n.t(`permissions.groups.${key}`);

  const groups = $derived.by(() => {
    const result = new Map<GroupKey, { key: GroupKey; modules: Module[] }>();
    for (const module of pageData.modulosDisponibles) {
      const key = groupKey(module.codigo);
      const group = result.get(key) ?? { key, modules: [] };
      group.modules.push(module);
      result.set(key, group);
    }
    return [...result.values()];
  });

  $effect(() => {
    if (initializedPlan === pageData.plan.id_planes) return;
    initialSelected = new Set(initialIds(pageData));
    selected = new Set(initialSelected);
    initializedPlan = pageData.plan.id_planes;
  });

  const items = $derived([
    { label: i18n.t('nav.dashboard'), href: '/dashboard' },
    { label: i18n.t('nav.plans'), href: '/superadmin/plans' },
    { label: pageData.plan.nombre }
  ]);

  const dirty = $derived(selected.size !== initialSelected.size || [...selected].some((id) => !initialSelected.has(id)));

  function isSelected(id: string) { return selected.has(id); }
  function allSelected(ids: string[]) { return ids.length > 0 && ids.every(id => selected.has(id)); }
  
  function toggleModule(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selected = next;
  }

  function toggleAll(ids: string[], enabled: boolean) {
    const next = new Set(selected);
    ids.forEach((id) => enabled ? next.add(id) : next.delete(id));
    selected = next;
  }

  function resultKey(result: ActionResult, fallback: string) {
    return result.type === 'failure' && typeof result.data?.planMessage === 'string' ? result.data.planMessage : fallback;
  }

  const save: SubmitFunction = () => {
    if (saving) return () => {};
    saving = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        initialSelected = new Set(selected);
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('plans.updated') });
      } else {
        const key = resultKey(result, 'plans.saveError');
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
      }
      saving = false;
    };
  };
</script>

<svelte:head><title>{i18n.t('plans.modulesTitle')} · Sumaq System</title></svelte:head>
<Breadcrumb items={items} />

<section class="flex flex-col gap-4">
  <div class="flex items-center gap-3">
    <Button href="/superadmin/plans" variant="secondary" size="sm"><Icon name="arrow-left" size={16} />{i18n.t('plans.back')}</Button>
    <h1 class="text-lg tracking-[-0.02em] text-ink">{pageData.plan.nombre} <span class="font-normal text-steel">· {pageData.plan.codigo}</span></h1>
  </div>

  <Card padding="none" class="overflow-hidden">
    <!-- Cabecera: control a la izquierda en móvil, a la derecha en escritorio (md:flex-row-reverse) -->
    <div class="flex items-center border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.04em] text-stone md:flex-row-reverse">
      <div class="w-20 shrink-0 px-2 py-2 text-center">{i18n.t('permissions.all')}</div>
      <div class="flex-1 min-w-0 border-l border-hairline px-3 py-2 md:border-l-0 md:border-r">{i18n.t('permissions.module')}</div>
    </div>
    <div class="divide-y divide-hairline">
      {#each groups as group (group.key)}
        {@const groupModuleIds = group.modules.map((m) => m.id_modulos)}
        <div class="flex items-center bg-surface/60 md:flex-row-reverse">
          <div class="w-20 shrink-0 px-2 py-1.5 text-center"><div class="flex justify-center"><Switch checked={allSelected(groupModuleIds)} label={`${i18n.t('permissions.all')}: ${groupName(group.key)}`} onchange={(enabled) => toggleAll(groupModuleIds, enabled)} /></div></div>
          <div class="flex-1 min-w-0 border-l border-hairline px-3 py-1.5 md:border-l-0 md:border-r"><strong class="text-[13px] font-extrabold text-ink">{groupName(group.key)}</strong></div>
        </div>
        {#each group.modules as module (module.id_modulos)}
          {@const active = isSelected(module.id_modulos)}
          <div
            class="flex cursor-pointer items-center transition-colors hover:bg-surface/50 md:flex-row-reverse"
            onclick={() => toggleModule(module.id_modulos)}
            onkeydown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), toggleModule(module.id_modulos))}
            role="checkbox"
            aria-checked={active}
            tabindex="0"
          >
            <div class="w-20 shrink-0 px-2 py-1.5 text-center"><input type="checkbox" checked={active} tabindex={-1} class="pointer-events-none size-4 rounded border-hairline-strong accent-primary" /></div>
            <div class="flex-1 min-w-0 border-l border-hairline px-3 py-1.5 md:border-l-0 md:border-r"><span class="block truncate pl-2 text-ink {active ? 'font-bold' : 'font-normal'}">{module.nombre}</span></div>
          </div>
        {/each}
      {/each}
    </div>
  </Card>

  <div class="flex justify-end">
    <form method="POST" action="?/save" use:enhance={save}>
      {#each [...selected] as id (id)}
        <input type="hidden" name="fid_modulos" value={id} />
      {/each}
      <Button type="submit" loading={saving} disabled={!dirty || saving}>
        <Icon name="save" size={16} />
        {i18n.t('plans.save')}
      </Button>
    </form>
  </div>
</section>
