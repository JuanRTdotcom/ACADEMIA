<script lang="ts">
	import Avatar from '../Avatar.svelte';
	import Icon from '../Icon.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { i18n } from '$lib/i18n/index.svelte';
	import { cerrarSesionLocal } from '$lib/session-client';
	import { goto } from '$app/navigation';
	import type { UsuarioCabecera } from '$lib/user-profile-channel';

	interface Props {
		usuario: UsuarioCabecera;
		organizacionNombre: string;
		tone?: 'default' | 'light' | 'dark';
	}
	let { usuario, organizacionNombre, tone = 'default' }: Props = $props();
	const triggerTone = $derived(tone === 'light' ? 'text-white hover:bg-white/15' : tone === 'dark' ? 'text-slate-950 hover:bg-black/10' : 'hover:bg-surface');
	const mainTone = $derived(tone === 'light' ? 'text-white' : tone === 'dark' ? 'text-slate-950' : 'text-ink');
	const secondaryTone = $derived(tone === 'light' ? 'text-white/70' : tone === 'dark' ? 'text-slate-950/65' : 'text-steel');

	let abierto = $state(false);
	let cerrando = $state(false);
	const nombreCabeceraCompleto = $derived(
		`${usuario.persona.nombres} ${usuario.persona.apellido_paterno}`.trim()
	);
	const rolPrincipal = $derived(usuario.roles[0]?.nombre ?? '');
	const avatarSrc = $derived(
		usuario.avatar.disponible && usuario.avatar.version
			? `/media/avatar?v=${encodeURIComponent(usuario.avatar.version)}`
			: undefined
	);

	import { page } from '$app/state';
	import { tienePermiso } from '$lib/permissions-client';

	const userPermissions = $derived<string[]>(page.data?.usuario?.permisos ?? []);
	const tieneAccesoPerfil = $derived(
		tienePermiso(
			userPermissions,
			'profile.personal.read',
			'profile.authentication.read',
			'profile.emails.read',
			'profile.sessions.read',
			'profile.privacy.read',
			'profile.nationalities.read',
			'profile.insurance.read',
			'profile.phones.read',
			'profile.hobbies.read',
			'profile.documents.read',
			'profile.studies.read',
			'profile.family.read',
			'profile.appearance.read',
			'profile.notifications.read',
			'profile.activity.read',
			'profile.help.read',
			'profile.legal.read'
		)
	);

	// Mantiene visible el estado y bloquea interacciones repetidas mientras termina.
	async function cerrarSesion() {
		if (cerrando) return;

		cerrando = true;
		try {
			await cerrarSesionLocal();
		} finally {
			cerrando = false;
		}
	}
</script>

<DropdownMenu.Root bind:open={abierto}>
	<DropdownMenu.Trigger
		class="grid size-[38px] place-items-center rounded-full border border-transparent bg-transparent transition-colors duration-150 {triggerTone}"
		aria-label={i18n.t('header.accountMenu')}
		disabled={cerrando}
	>
		<Avatar name={nombreCabeceraCompleto} src={avatarSrc} size={34} tint="var(--tint-green)" />
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end" class="w-80 p-2">
		<div class="mb-2 flex items-center gap-3 rounded-md bg-surface p-3">
			<Avatar name={nombreCabeceraCompleto} src={avatarSrc} size={48} tint="var(--tint-green)" />
			<div class="min-w-0"><strong class="block truncate text-sm text-ink" title={nombreCabeceraCompleto}>{nombreCabeceraCompleto}</strong><span class="mt-0.5 block truncate text-xs text-steel" title={rolPrincipal}>{rolPrincipal}</span><span class="mt-1 block truncate text-xs font-medium text-primary" title={organizacionNombre}>{organizacionNombre}</span></div>
		</div>
		{#if tieneAccesoPerfil}
			<DropdownMenu.Item
				disabled={cerrando}
				onSelect={() => void goto('/profile')}
			>
				<Icon name="user" size={18} />
				<span>{i18n.t('header.profile')}</span>
			</DropdownMenu.Item>

			<DropdownMenu.Separator />
		{/if}

		<DropdownMenu.Item
			variant="destructive"
			class="mt-2 min-h-10 justify-center border border-destructive/30 bg-destructive/5 text-sm font-semibold"
			disabled={cerrando}
			closeOnSelect={false}
			aria-busy={cerrando}
			onSelect={() => void cerrarSesion()}
		>
			<Icon name={cerrando ? 'loader-circle' : 'logout'} size={18} class={cerrando ? 'animate-spin' : ''} />
			<span aria-live="polite">{i18n.t(cerrando ? 'header.loggingOut' : 'header.logout')}</span>
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
