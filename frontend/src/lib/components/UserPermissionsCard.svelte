<script lang="ts">
  import { Card, Icon, Switch, i18n } from '$lib';
  import { groupModulesByRoot } from '$lib/config/user-permissions';

  type Permission = { id_permisos: string };
  type Module = {
    id_modulos: string;
    codigo: string;
    nombre: string;
    descripcion: string;
    acceso_usuario_obligatorio: boolean;
    icono: string | null;
    fid_modulos_padre: string | null;
    permisos: Permission[];
  };
  interface Props {
    modules: Module[];
    selected?: string[];
    disabled?: boolean;
  }

  let { modules, selected = $bindable([]), disabled = false }: Props = $props();
  const groupedModules = $derived(groupModulesByRoot(modules));

  const enabled = (id: string) => selected.includes(id);
  const moduleEnabled = (module: Module) =>
    module.permisos.length > 0 && module.permisos.every((permission) => enabled(permission.id_permisos));
  const enabledModules = $derived(groupedModules.filter(moduleEnabled).length);
  function toggleModule(module: Module, active: boolean) {
    const ids = module.permisos.map((permission) => permission.id_permisos);
    selected = active
      ? [...new Set([...selected, ...ids])]
      : selected.filter((id) => !ids.includes(id));
  }
</script>

<Card>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-base font-semibold text-ink">{i18n.t('users.moduleAccess')}</h2>
      <p class="mt-1 max-w-[72ch] text-xs leading-relaxed text-steel">{i18n.t('users.moduleAccessHelp')}</p>
    </div>
    <span class="rounded-md border border-hairline bg-surface px-2.5 py-1 text-xs font-medium text-steel">
      {enabledModules} {i18n.t('users.modulesEnabled')}
    </span>
  </div>

  <div class="mt-4 divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
    {#each groupedModules as module (module.id_modulos)}
      {@const allEnabled = moduleEnabled(module)}
      <section class="grid grid-cols-[minmax(180px,.9fr)_64px_minmax(240px,1.55fr)] items-center bg-canvas max-[760px]:grid-cols-[minmax(0,1fr)_auto]">
        <div class="flex min-w-0 items-center gap-2.5 bg-surface px-3 py-2.5 max-[760px]:bg-canvas">
          <span class="grid size-8 shrink-0 place-items-center rounded-md border border-hairline bg-canvas text-primary">
            <Icon name={module.icono ?? 'circle'} size={16} />
          </span>
          <h3 class="min-w-0 truncate text-sm font-semibold text-ink" title={module.nombre}>{module.nombre}</h3>
        </div>
        <div class="flex items-center justify-center px-2 py-2.5 max-[760px]:justify-end">
          <Switch checked={allEnabled} label={`${i18n.t('users.enableModule')}: ${module.nombre}`} {disabled} onchange={(active) => toggleModule(module, active)} />
        </div>
        <div class="px-3 py-2.5 max-[760px]:col-span-2 max-[760px]:border-t max-[760px]:border-hairline">
          <p class="max-w-[72ch] text-xs leading-relaxed text-steel">{module.descripcion}</p>
        </div>
      </section>
    {/each}
  </div>
</Card>
