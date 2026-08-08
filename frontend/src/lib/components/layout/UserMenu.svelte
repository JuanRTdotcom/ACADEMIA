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
		tone?: 'default' | 'light' | 'dark';
	}
	let { usuario, tone = 'default' }: Props = $props();
	const triggerTone = $derived(tone === 'light' ? 'text-white hover:bg-white/15' : tone === 'dark' ? 'text-slate-950 hover:bg-black/10' : 'hover:bg-surface');
	const mainTone = $derived(tone === 'light' ? 'text-white' : tone === 'dark' ? 'text-slate-950' : 'text-ink');
	const secondaryTone = $derived(tone === 'light' ? 'text-white/70' : tone === 'dark' ? 'text-slate-950/65' : 'text-steel');

	let abierto = $state(false);
	let cerrando = $state(false);
	const MAXIMO_CARACTERES_NOMBRE = 30;
	const primerNombre = $derived(usuario.persona.nombres.trim().split(/\s+/)[0] ?? '');
	const nombreCabeceraCompleto = $derived(
		`${primerNombre} ${usuario.persona.apellido_paterno}`.trim()
	);
	const nombreCabecera = $derived(
		nombreCabeceraCompleto.length > MAXIMO_CARACTERES_NOMBRE
			? `${nombreCabeceraCompleto.slice(0, MAXIMO_CARACTERES_NOMBRE - 1).trimEnd()}…`
			: nombreCabeceraCompleto
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
		class="flex items-center gap-2.5 py-1 pr-2 pl-1 bg-transparent border border-transparent rounded-md transition-colors duration-150 {triggerTone}"
		aria-label={i18n.t('header.accountMenu')}
		disabled={cerrando}
	>
		<Avatar name={nombreCabeceraCompleto} src={avatarSrc} size={34} tint="var(--tint-green)" />
		<span class="flex min-w-0 max-w-[180px] flex-col leading-tight text-left max-md:hidden">
			<strong class="truncate text-[13px] font-semibold {mainTone}" title={nombreCabeceraCompleto}>{nombreCabecera}</strong>
			<small class="truncate text-[11px] {secondaryTone}" title={rolPrincipal}>{rolPrincipal}</small>
		</span>
		<span
			class="flex transition-transform duration-150 max-md:hidden {secondaryTone}"
			class:rotate-180={abierto}
		>
			<Icon name="chevron-down" size={16} />
		</span>
	</DropdownMenu.Trigger>

	<DropdownMenu.Content align="end">
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
