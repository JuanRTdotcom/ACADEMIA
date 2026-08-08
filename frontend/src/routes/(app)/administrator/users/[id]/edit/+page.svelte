<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, Icon, Input, Select, i18n } from '$lib';

  let { data }: PageProps = $props();
  type RoleOption = { id_roles: string; nombre: string; codigo: string; icono: string };
  const roles = $derived(data.opciones.roles as RoleOption[]);
  let saving = $state(false);
  let attempted = $state(false);
  let roleToAdd = $state('');

  function extractCorreoPrefix(correo: string | null | undefined): string {
    if (!correo) return '';
    return correo.split('@')[0].replace(/@/g, '').toLowerCase().replace(/\s/g, '');
  }

  function initialForm() {
    return {
      fid_organizaciones: data.usuarioEditado.fid_organizaciones,
      usuario: data.usuarioEditado.usuario,
      nombres: data.usuarioEditado.nombres,
      apellido_paterno: data.usuarioEditado.apellido_paterno,
      apellido_materno: data.usuarioEditado.apellido_materno,
      correoPrefix: extractCorreoPrefix(data.usuarioEditado.correo),
      fid_roles: data.usuarioEditado.roles.map((role: RoleOption) => role.id_roles)
    };
  }

  let form = $state(initialForm());
  let baseline = $state(JSON.stringify(form));
  const selectedRoles = $derived(roles.filter((role) => form.fid_roles.includes(role.id_roles)));
  const companySlug = $derived(data.usuario.organizacion.slug ?? 'empresa');
  const emailSuffix = $derived(`@${companySlug}.com`);
  const fullCorreo = $derived(form.correoPrefix.trim() ? `${form.correoPrefix.trim()}@${companySlug}.com` : '');

  function handleCorreoInput(e: Event) {
    const target = e.target as HTMLInputElement;
    form.correoPrefix = target.value.replace(/@/g, '').toLowerCase().replace(/\s/g, '');
  }

  function addRole() {
    if (roleToAdd && !form.fid_roles.includes(roleToAdd)) form.fid_roles = [...form.fid_roles, roleToAdd];
    roleToAdd = '';
  }
  function removeRole(id: string) {
    if (!saving) form.fid_roles = form.fid_roles.filter((roleId: string) => roleId !== id);
  }

  const errors = $derived.by(() => {
    const e: Record<string, string> = {};
    const validName = (value: string, max: number) => value.trim().length >= 2 && value.trim().length <= max && /^[\p{L}][\p{L}\s'\-]*$/u.test(value.trim());
    if (!/^[A-Z0-9]{3,12}$/.test(form.usuario)) e.usuario = 'users.validation.username';
    if (!validName(form.nombres, 50)) e.nombres = 'users.validation.name';
    if (!validName(form.apellido_paterno, 30)) e.apellido_paterno = 'users.validation.name';
    if (!validName(form.apellido_materno, 30)) e.apellido_materno = 'users.validation.name';
    if (!fullCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fullCorreo) || fullCorreo.length > 254) e.correo = 'users.validation.email';
    if (form.fid_roles.length === 0) e.roles = 'users.validation.roles';
    return e;
  });
  const valid = $derived(Object.keys(errors).length === 0);
  const dirty = $derived(JSON.stringify(form) !== baseline);
  const message = (result: any) => result.type === 'failure' && typeof result.data?.userMessage === 'string' ? result.data.userMessage : 'users.saveError';
  const save: SubmitFunction = () => {
    attempted = true;
    if (!valid) {
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t('users.invalidData') });
      return () => {};
    }
    if (!dirty || saving) return () => {};
    saving = true;
    return async ({ result, update }) => {
      if (result.type === 'success') {
        await update({ reset: false, invalidateAll: false });
        baseline = JSON.stringify(form);
        attempted = false;
        saving = false;
        toast.success(i18n.t('notifications.type.success'), { description: i18n.t('users.updated') });
        return;
      }
      saving = false;
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message(result)) });
    };
  };
</script>

<svelte:head><title>{i18n.t('users.editTitle')} · Sumaq System</title></svelte:head>
<Breadcrumb items={[{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('nav.companyUsers'), href: '/administrator/users' }, { label: i18n.t('users.edit') }]} />
<section class="flex w-full flex-col gap-6">
  <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('users.editTitle')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('users.editDescription')}</p></div>
  <form method="POST" action="?/save" use:enhance={save} class="flex flex-col gap-5">
    <Card>
      <div class="mb-5"><h2 class="text-base font-semibold text-ink">{i18n.t('users.assignments')}</h2><p class="mt-1 text-sm text-steel">Los roles de la cuenta pueden actualizarse desde aquí.</p></div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <Select id="user-edit-roles" label={i18n.t('users.roles')} icon="shield-check" bind:value={roleToAdd} onchange={addRole} error={attempted && errors.roles ? i18n.t(errors.roles) : undefined} disabled={saving}>
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
    <Card>
      <div class="mb-5"><h2 class="text-base font-semibold text-ink">{i18n.t('users.title')}</h2><p class="mt-1 text-sm text-steel">Datos básicos que identifican la cuenta dentro de la institución.</p></div>
      <div class="grid gap-4 lg:grid-cols-3">
        <Input name="nombres" label={i18n.t('users.firstNames')} icon="user" bind:value={form.nombres} maxlength={50} error={attempted && errors.nombres ? i18n.t(errors.nombres) : undefined} disabled={saving} required />
        <Input name="apellido_paterno" label={i18n.t('users.lastName')} icon="user" bind:value={form.apellido_paterno} maxlength={30} error={attempted && errors.apellido_paterno ? i18n.t(errors.apellido_paterno) : undefined} disabled={saving} required />
        <Input name="apellido_materno" label={i18n.t('users.secondLastName')} icon="user" bind:value={form.apellido_materno} maxlength={30} error={attempted && errors.apellido_materno ? i18n.t(errors.apellido_materno) : undefined} disabled={saving} required />
        <div class="lg:col-span-1"><Input name="usuario" label={i18n.t('users.username')} icon="user-round" bind:value={form.usuario} oninput={() => (form.usuario = form.usuario.toUpperCase())} maxlength={12} error={attempted && errors.usuario ? i18n.t(errors.usuario) : undefined} disabled={saving} required /></div>
        <div class="lg:col-span-2"><Input id="user-edit-correo" label={i18n.t('users.email')} icon="mail" type="text" suffix={emailSuffix} bind:value={form.correoPrefix} oninput={handleCorreoInput} maxlength={100} error={attempted && errors.correo ? i18n.t(errors.correo) : undefined} disabled={saving} required /><input type="hidden" name="correo" value={fullCorreo} /></div>
      </div>
    </Card>
    <input type="hidden" name="fid_organizaciones" value={form.fid_organizaciones} />
    {#each form.fid_roles as fid_rol}<input type="hidden" name="fid_roles" value={fid_rol} />{/each}
    <div class="flex justify-end"><Button type="submit" disabled={saving || !dirty}>{#if saving}<Icon name="loader-circle" class="animate-spin" size={18} />{:else}<Icon name="save" size={18} />{/if}{i18n.t('users.save')}</Button></div>
  </form>
</section>
