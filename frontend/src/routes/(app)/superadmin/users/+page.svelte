<script lang="ts">
  import { enhance } from '$app/forms';
  import { tick } from 'svelte';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Switch, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

  let { data }: PageProps = $props();
  type User = (typeof data.usuarios)[number];
  let target = $state<User | null>(null);
  let deleteOpen = $state(false); let resetPasswordOpen = $state(false); let processing = $state(false); let pendingActive = $state(false);
  let nuevaContrasenia = $state('');
  let statusForm: HTMLFormElement; let deleteForm: HTMLFormElement; let resetPasswordForm: HTMLFormElement;

  const canCreate = $derived(tienePermiso(data.usuario.permisos, 'superadmin.users.create', 'systemUsers.manage'));
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'superadmin.users.update', 'systemUsers.manage'));
  const canDelete = $derived(tienePermiso(data.usuario.permisos, 'superadmin.users.delete', 'systemUsers.manage'));
  const canAny = $derived(canUpdate || canDelete);

  const reglasPassword = $derived([
    { clave: 'profile.password.rule.length', cumple: nuevaContrasenia.length >= 8 },
    { clave: 'profile.password.rule.uppercase', cumple: /[A-Z]/.test(nuevaContrasenia) },
    { clave: 'profile.password.rule.lowercase', cumple: /[a-z]/.test(nuevaContrasenia) },
    { clave: 'profile.password.rule.number', cumple: /\d/.test(nuevaContrasenia) },
    { clave: 'profile.password.rule.special', cumple: /[^A-Za-z0-9\s]/.test(nuevaContrasenia) }
  ]);
  const contraseniaSegura = $derived(reglasPassword.every(r => r.cumple));

  const avatarSrc = (user: User) => user.foto_version ? `/media/users/${user.id_usuarios}/avatar/${encodeURIComponent(user.foto_version)}` : undefined;
  const breadcrumbItems = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('nav.systemUsers') }]);
  const key = (result: ActionResult, fallback: string) => result.type === 'failure' && typeof result.data?.userMessage === 'string' ? result.data.userMessage : fallback;
  function submitDelete() { return new Promise<void>((resolve) => { deleteForm.requestSubmit(); resolve(); }); }
  function submitResetPassword() { return new Promise<void>((resolve) => { resetPasswordForm.requestSubmit(); resolve(); }); }
  async function status(user: User, active: boolean) { if (processing) return; target = user; pendingActive = active; await tick(); statusForm.requestSubmit(); }
  const changeStatus: SubmitFunction = () => { if (processing) return () => {}; processing = true; return async ({ result, update }) => { if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t(pendingActive ? 'users.activated' : 'users.deactivated') }); } else toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key(result, 'users.saveError')) }); processing = false; }; };
  const remove: SubmitFunction = () => { if (processing) return () => {}; processing = true; return async ({ result, update }) => { if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t('users.deleted') }); deleteOpen = false; } else toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key(result, 'users.deleteError')) }); processing = false; }; };
  const resetPassword: SubmitFunction = () => { if (processing) return () => {}; processing = true; return async ({ result, update }) => { if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t('users.resetPasswordSuccess') }); resetPasswordOpen = false; nuevaContrasenia = ''; } else toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key(result, 'users.saveError')) }); processing = false; }; };
</script>

<svelte:head>
  <title>{i18n.t('users.title')} · Sumaq System</title>
</svelte:head>

<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div>
      <h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('users.title')}</h1>
      <p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('users.description')}</p>
    </div>
    {#if canCreate}<Button href="/superadmin/users/new"><Icon name="plus" size={18} />{i18n.t('users.new')}</Button>{/if}
  </div>

  <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
    <form method="GET" class="w-full max-w-md">
      <Input name="q" value={data.q} icon="search" aria-label={i18n.t('users.search')} placeholder={i18n.t('users.searchPlaceholder')} maxlength={120} />
    </form>
    <Badge variant="outline-sky">{i18n.t('users.count', { count: data.total })}</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if data.usuarios.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center">
        <Icon name="user-cog" size={34} class="mb-4 text-stone" />
        <h2 class="text-lg text-ink">{i18n.t(data.q ? 'users.noResults' : 'users.emptyTitle')}</h2>
        <p class="mt-1 text-sm text-steel">{i18n.t(data.q ? 'users.noResultsDescription' : 'users.emptyDescription')}</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] border-collapse text-left">
          <thead class="bg-surface/70">
            <tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone">
              <th class="px-5 py-3.5">{i18n.t('users.user')}</th>
              <th class="px-4 py-3.5">{i18n.t('users.company')}</th>
              <th class="px-4 py-3.5">{i18n.t('users.roles')}</th>
              <th class="px-4 py-3.5 text-center">{i18n.t('users.status')}</th>
              {#if canAny}<th class="w-12 px-5 py-3.5 text-right">{i18n.t('users.actions')}</th>{/if}
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each data.usuarios as user (user.id_usuarios)}
              <tr class="transition-colors hover:bg-surface/55">
                <!-- Avatar + nombre -->
                <td class="px-5 py-4">
                  <div class="flex min-w-0 items-center gap-3.5">
                    <span class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline bg-primary-soft font-semibold text-primary">
                      {user.nombres.slice(0, 1).toUpperCase()}
                      {#if avatarSrc(user)}<img src={avatarSrc(user) ?? ''} alt="" class="absolute inset-0 size-full bg-canvas object-cover" loading="lazy" decoding="async" onerror={(e) => { (e.currentTarget as HTMLImageElement).hidden = true; }} />{/if}
                    </span>
                    <div class="min-w-0">
                      <strong class="block max-w-[260px] truncate text-sm text-ink">{user.nombres} {user.apellido_paterno}</strong>
                      <p class="mt-0.5 max-w-[300px] truncate text-xs text-steel">{user.usuario} · {user.correo ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <!-- Empresa -->
                <td class="px-4 py-4">
                  <p class="max-w-[180px] truncate text-sm text-charcoal">{user.empresa.nombre}</p>
                  <p class="mt-0.5 text-xs text-steel">{user.empresa.slug}</p>
                </td>
                <!-- Roles -->
                <td class="px-4 py-4">
                  <div class="flex max-w-[220px] flex-wrap gap-1">
                    {#each user.roles as role (role.id_roles)}<Badge variant="outline-sky">{role.nombre}</Badge>{/each}
                  </div>
                </td>
                <!-- Estado (switch) -->
                <td class="px-4 py-4">
                  <div class="flex items-center justify-center gap-2">
                    <Switch checked={user.estado === 1} disabled={processing || !canUpdate} label={`${i18n.t('users.status')}: ${user.usuario}`} onchange={(active) => status(user, active)} />
                    <span class="text-xs text-steel">{i18n.t(user.estado === 1 ? 'users.active' : 'users.inactive')}</span>
                  </div>
                </td>
                <!-- Menú de 3 puntos -->
                {#if canAny}
                  <td class="px-5 py-4">
                    <div class="flex justify-end">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                          disabled={processing}
                          aria-label={`${i18n.t('users.actions')}: ${user.usuario}`}
                          class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
                        >
                          <Icon name="ellipsis" size={18} />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="min-w-[190px]">
                          {#if canUpdate}
                            <DropdownMenu.Item
                              disabled={processing || user.estado !== 1}
                              onSelect={() => void (window.location.href = `/superadmin/users/${user.id_usuarios}/edit`)}
                            >
                              <Icon name="pencil" size={15} />
                              <span>{i18n.t('users.edit')}</span>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              disabled={processing || user.estado !== 1}
                              onSelect={() => { target = user; nuevaContrasenia = ''; resetPasswordOpen = true; }}
                            >
                              <Icon name="lock-open" size={15} />
                              <span>{i18n.t('users.resetPassword')}</span>
                            </DropdownMenu.Item>
                          {/if}
                          {#if canDelete}
                            {#if canUpdate}<DropdownMenu.Separator />{/if}
                            <DropdownMenu.Item
                              disabled={processing}
                              class="text-error focus:bg-error/10 focus:text-error"
                              onSelect={() => { target = user; deleteOpen = true; }}
                            >
                              <Icon name="trash-2" size={15} />
                              <span>{i18n.t('users.delete')}</span>
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
    {/if}
  </Card>
</section>

<!-- Modal: reiniciar contraseña -->
<ConfirmationDialog bind:open={resetPasswordOpen} variant="warning" icon="key-round" title={i18n.t('users.resetPasswordTitle')} description={i18n.t('users.resetPasswordDescription')} confirmLabel={i18n.t('users.resetPassword')} cancelLabel={i18n.t('users.cancel')} confirmDisabled={!contraseniaSegura || processing} onConfirm={submitResetPassword}>
  <div class="flex flex-col gap-4 text-left">
    <p class="text-sm font-semibold text-ink">{target?.nombres} {target?.apellido_paterno} ({target?.usuario})</p>
    <Input name="contrasenia_nueva" type="password" label={i18n.t('profile.password.new')} icon="key-round" bind:value={nuevaContrasenia} maxlength={80} disabled={processing} required />
    <div class="rounded-md border border-hairline bg-canvas p-3">
      <p class="mb-2 text-xs font-semibold text-steel">{i18n.t('profile.password.strength')}</p>
      <ul class="grid grid-cols-2 gap-1.5 text-xs max-[600px]:grid-cols-1">
        {#each reglasPassword as regla (regla.clave)}
          <li class="flex items-center gap-1.5 {regla.cumple ? 'text-accent-green font-medium' : 'text-steel'}">
            <Icon name={regla.cumple ? 'circle-check' : 'circle'} size={13} />
            {i18n.t(regla.clave)}
          </li>
        {/each}
      </ul>
    </div>
  </div>
</ConfirmationDialog>

<!-- Modal: eliminar usuario -->
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('users.deleteTitle')} description={i18n.t('users.deleteDescription')} confirmLabel={i18n.t('users.delete')} cancelLabel={i18n.t('users.cancel')} confirmDisabled={!target || processing} onConfirm={submitDelete} />

<!-- Formularios ocultos -->
<form bind:this={statusForm} method="POST" action="?/status" use:enhance={changeStatus} class="hidden"><input name="id" value={target?.id_usuarios ?? ''} /><input name="activo" value={pendingActive ? 'true' : 'false'} /></form>
<form bind:this={resetPasswordForm} method="POST" action="?/resetPassword" use:enhance={resetPassword} class="hidden"><input name="id" value={target?.id_usuarios ?? ''} /><input name="contrasenia_nueva" value={nuevaContrasenia} /></form>
<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id" value={target?.id_usuarios ?? ''} /></form>
