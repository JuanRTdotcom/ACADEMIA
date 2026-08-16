<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, Icon, Input, Select, UserPermissionsCard, i18n } from '$lib';
  import { modulesForRoles, permissionsForRoleModules, reconcileRoleChange } from '$lib/config/user-permissions';

  let { data }: PageProps = $props();
  type RoleOption = { id_roles: string; nombre: string; codigo: string; icono: string; permisos: string[] };
  let saving = $state(false); let attempted = $state(false);
  let form = $state({ fid_organizaciones: '', usuario: '', nombres: '', apellido_paterno: '', apellido_materno: '', correoPrefix: '', contrasenia_temporal: '', confirmacion_contrasenia: '', fid_roles: [] as string[], fid_permisos: [] as string[], fid_sedes: [] as string[] });
  let roleToAdd = $state('');
  const roles = $derived(data.roles as RoleOption[]);
  const modules = $derived(data.modulos);
  const inheritedPermissions = $derived(permissionsForRoleModules(form.fid_roles, roles, modules));
  const visibleModules = $derived(modulesForRoles(form.fid_roles, roles, modules));
  const companySlug = $derived(data.usuario.organizacion.slug || 'empresa');
  const emailSuffix = $derived(`@${companySlug}.com`);
  const fullCorreo = $derived(form.correoPrefix.trim() ? `${form.correoPrefix.trim()}@${companySlug}.com` : '');
  const selectedRoles = $derived(roles.filter((role) => form.fid_roles.includes(role.id_roles)));

  $effect(() => {
    if (data.usuario?.fid_organizaciones && !form.fid_organizaciones) {
      form.fid_organizaciones = data.usuario.fid_organizaciones;
      form.fid_sedes = (data.sedes ?? []).filter((sede: any) => sede.es_principal).map((sede: any) => sede.id_sedes);
    }
  });

  function handleCorreoInput(e: Event) {
    const target = e.target as HTMLInputElement;
    form.correoPrefix = target.value.replace(/@/g, '').toLowerCase().replace(/\s/g, '');
  }

  function addRole() {
    const role = roles.find((item) => item.id_roles === roleToAdd);
    if (role && !form.fid_roles.includes(role.id_roles)) {
      const nextRoles = [...form.fid_roles, role.id_roles];
      form.fid_permisos = reconcileRoleChange(form.fid_permisos, inheritedPermissions, permissionsForRoleModules(nextRoles, roles, modules));
      form.fid_roles = nextRoles;
    }
    roleToAdd = '';
  }
  function removeRole(id: string) {
    const nextRoles = form.fid_roles.filter((roleId) => roleId !== id);
    form.fid_permisos = reconcileRoleChange(form.fid_permisos, inheritedPermissions, permissionsForRoleModules(nextRoles, roles, modules));
    form.fid_roles = nextRoles;
  }
  const errors = $derived.by(() => {
    const e: Record<string, string> = {}; const n = (value: string, max: number) => value.trim().length >= 2 && value.trim().length <= max && /^[\p{L}][\p{L}\s'\-]*$/u.test(value.trim());
    if (!form.fid_organizaciones) e.company = 'users.validation.required';
    if (!/^[A-Z0-9]{3,12}$/.test(form.usuario)) e.usuario = 'users.validation.username';
    if (!n(form.nombres, 50)) e.nombres = 'users.validation.name'; if (!n(form.apellido_paterno, 30)) e.apellido_paterno = 'users.validation.name'; if (!n(form.apellido_materno, 30)) e.apellido_materno = 'users.validation.name';
    if (!fullCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fullCorreo) || fullCorreo.length > 254) e.correo = 'users.validation.email';
    if (form.fid_roles.length === 0) e.roles = 'users.validation.roles';
    if (form.fid_sedes.length === 0) e.sedes = 'users.validation.branches';
    if (form.contrasenia_temporal.length < 8 || form.contrasenia_temporal.length > 20 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).+$/.test(form.contrasenia_temporal)) e.contrasenia_temporal = 'users.validation.password';
    if (form.confirmacion_contrasenia !== form.contrasenia_temporal) e.confirmacion_contrasenia = 'users.validation.passwordMatch'; return e;
  });
  const valid = $derived(Object.keys(errors).length === 0);
  const message = (result: any) => result.type === 'failure' && typeof result.data?.userMessage === 'string' ? result.data.userMessage : 'users.saveError';
  const create: SubmitFunction = () => { attempted = true; if (!valid) { toast.error(i18n.t('notifications.type.error'), { description: i18n.t('users.invalidData') }); return () => {}; } saving = true; return async ({ result, update }) => { if (result.type === 'success') { await update({ reset: false, invalidateAll: false }); form = { fid_organizaciones: data.usuario.fid_organizaciones, usuario: '', nombres: '', apellido_paterno: '', apellido_materno: '', correoPrefix: '', contrasenia_temporal: '', confirmacion_contrasenia: '', fid_roles: [], fid_permisos: [], fid_sedes: (data.sedes ?? []).filter((sede: any) => sede.es_principal).map((sede: any) => sede.id_sedes) }; roleToAdd = ''; attempted = false; saving = false; toast.success(i18n.t('notifications.type.success'), { description: i18n.t('users.created') }); return; } toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message(result)) }); saving = false; }; };
</script>

<svelte:head><title>{i18n.t('users.createTitle')} · Sumaq System</title></svelte:head>
<Breadcrumb items={[{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('nav.companyUsers'), href: '/administrator/users' }, { label: i18n.t('users.new') }]} />
<section class="flex w-full flex-col gap-6">
  <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('users.createTitle')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('users.createDescription')}</p></div>
  <form method="POST" action="?/create" use:enhance={create} class="flex flex-col gap-5">
    <Card class="overflow-hidden border-primary/20">
      <div class="mb-5 flex items-start gap-3 border-b border-hairline pb-4">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon name="map-pin" size={20} /></span>
        <div><h2 class="text-base font-semibold text-ink">{i18n.t('users.branches')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('users.branchesHelp')}</p></div>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.sedes ?? [] as sede (sede.id_sedes)}
          <label class="group flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition-colors {form.fid_sedes.includes(sede.id_sedes) ? 'border-primary bg-primary-soft/45' : 'border-hairline bg-canvas hover:border-primary/40'}">
            <input class="sr-only" type="checkbox" name="fid_sedes" value={sede.id_sedes} checked={form.fid_sedes.includes(sede.id_sedes)} onchange={(event) => form.fid_sedes = event.currentTarget.checked ? [...form.fid_sedes, sede.id_sedes] : form.fid_sedes.filter((id) => id !== sede.id_sedes)} />
            <Icon name={form.fid_sedes.includes(sede.id_sedes) ? 'circle-check' : 'circle'} size={19} class={form.fid_sedes.includes(sede.id_sedes) ? 'text-primary' : 'text-stone'} />
            <span class="min-w-0 flex-1"><strong class="block truncate text-sm font-semibold text-ink">{sede.nombre}</strong><span class="mt-0.5 block truncate text-xs text-steel">{sede.codigo}</span></span>
            {#if sede.es_principal}<span class="rounded-full bg-canvas px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">{i18n.t('companies.branches.main')}</span>{/if}
          </label>
        {/each}
      </div>
      {#if attempted && errors.sedes}<p class="mt-3 text-xs text-danger">{i18n.t(errors.sedes)}</p>{/if}
    </Card>
    <Card>
      <div class="mb-5"><h2 class="text-base font-semibold text-ink">{i18n.t('users.roles')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('users.rolesHelp')}</p></div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <Select id="user-create-roles" label={i18n.t('users.roles')} icon="shield-check" bind:value={roleToAdd} onchange={addRole} error={attempted && errors.roles ? i18n.t(errors.roles) : undefined} disabled={saving}>
            <option value="">Selecciona un rol</option>
            {#each roles.filter((role) => !form.fid_roles.includes(role.id_roles)) as role (role.id_roles)}
              <option value={role.id_roles}>{role.nombre}</option>
            {/each}
          </Select>
        </div>
        {#if selectedRoles.length > 0}
          <div class="lg:col-span-2 mt-auto flex flex-wrap gap-2 pb-1">
            {#each selectedRoles as role (role.id_roles)}
              <button type="button" class="inline-flex items-center gap-1.5 rounded-md border border-primary/35 bg-primary/5 px-2.5 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50" onclick={() => removeRole(role.id_roles)} disabled={saving}>
                <Icon name={role.icono || 'shield-check'} size={15} />{role.nombre}<Icon name="x" size={14} />
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </Card>
    {#if selectedRoles.length > 0}
      <UserPermissionsCard modules={visibleModules} bind:selected={form.fid_permisos} disabled={saving} />
    {/if}
    <Card><div class="mb-5"><h2 class="text-base font-semibold text-ink">{i18n.t('users.title')}</h2><p class="mt-1 text-sm text-steel">Datos básicos que identifican la cuenta dentro de la institución.</p></div><div class="grid gap-4 lg:grid-cols-3"><Input name="nombres" label={i18n.t('users.firstNames')} icon="user" bind:value={form.nombres} maxlength={50} error={attempted && errors.nombres ? i18n.t(errors.nombres) : undefined} disabled={saving} required /><Input name="apellido_paterno" label={i18n.t('users.lastName')} icon="user" bind:value={form.apellido_paterno} maxlength={30} error={attempted && errors.apellido_paterno ? i18n.t(errors.apellido_paterno) : undefined} disabled={saving} required /><Input name="apellido_materno" label={i18n.t('users.secondLastName')} icon="user" bind:value={form.apellido_materno} maxlength={30} error={attempted && errors.apellido_materno ? i18n.t(errors.apellido_materno) : undefined} disabled={saving} required /><div class="lg:col-span-1"><Input name="usuario" label={i18n.t('users.username')} icon="user-round" bind:value={form.usuario} oninput={() => (form.usuario = form.usuario.toUpperCase())} maxlength={12} error={attempted && errors.usuario ? i18n.t(errors.usuario) : undefined} disabled={saving} required /></div><div class="lg:col-span-2"><Input id="user-new-correo" label={i18n.t('users.email')} icon="mail" type="text" suffix={emailSuffix} bind:value={form.correoPrefix} oninput={handleCorreoInput} maxlength={100} error={attempted && errors.correo ? i18n.t(errors.correo) : undefined} disabled={saving} required /><input type="hidden" name="correo" value={fullCorreo} /></div></div></Card>
    <Card><div class="mb-5"><h2 class="text-base font-semibold text-ink">{i18n.t('users.initialAccess')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('users.passwordHelp')}</p></div><div class="grid gap-4 lg:grid-cols-2"><Input name="contrasenia_temporal" label={i18n.t('users.temporaryPassword')} icon="lock-keyhole" type="password" bind:value={form.contrasenia_temporal} maxlength={20} error={attempted && errors.contrasenia_temporal ? i18n.t(errors.contrasenia_temporal) : undefined} disabled={saving} required /><Input name="confirmacion_contrasenia" label={i18n.t('users.confirmPassword')} icon="lock-keyhole" type="password" bind:value={form.confirmacion_contrasenia} maxlength={20} error={attempted && errors.confirmacion_contrasenia ? i18n.t(errors.confirmacion_contrasenia) : undefined} disabled={saving} required /></div></Card>
    <input type="hidden" name="fid_organizaciones" value={form.fid_organizaciones} />
    {#each form.fid_roles as fid_rol}<input type="hidden" name="fid_roles" value={fid_rol} />{/each}
    {#each form.fid_permisos as fid_permiso}<input type="hidden" name="fid_permisos" value={fid_permiso} />{/each}
    <div class="flex justify-end"><Button type="submit" disabled={saving}>{#if saving}<Icon name="loader-circle" class="animate-spin" size={18} />{:else}<Icon name="user-plus" size={18} />{/if}{i18n.t('users.create')}</Button></div>
  </form>
</section>
