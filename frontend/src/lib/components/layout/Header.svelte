<script lang="ts">
	import Icon from '../Icon.svelte';
	import ThemeToggle from '../ThemeToggle.svelte';
	import LanguageSwitcher from '../LanguageSwitcher.svelte';
	import UserMenu from './UserMenu.svelte';
	import ConfirmationDialog from '../ConfirmationDialog.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import { toast } from 'svelte-sonner';
	import type { UsuarioCabecera } from '$lib/user-profile-channel';
	import { normalizeHexColor, prefersLightText } from '$lib/color-contrast';
	import { theme } from '$lib/stores/theme.svelte';

	interface Props {
		onToggleSidebar?: () => void;
		title?: string;
		usuario: UsuarioCabecera;
		organizacionNombre: string;
		lightColor?: string | null;
		darkColor?: string | null;
		hideBottomBorder?: boolean;
	}
	let { onToggleSidebar, title = '', usuario, organizacionNombre, lightColor = null, darkColor = null, hideBottomBorder = false }: Props = $props();
	let probandoNotificaciones = $state(false);
	let confirmacionAbierta = $state(false);

	const backgroundColor = $derived(normalizeHexColor(theme.current === 'dark' ? darkColor : lightColor));
	const lightText = $derived(prefersLightText(backgroundColor));
	const tone = $derived(backgroundColor ? (lightText ? 'light' : 'dark') : 'default');
	const iconBtn = $derived(`relative grid place-items-center size-[38px] bg-transparent border border-transparent rounded-md transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none ${tone === 'light' ? 'text-white hover:bg-white/15' : tone === 'dark' ? 'text-slate-950 hover:bg-black/10' : 'text-slate hover:bg-surface hover:text-ink'}`);

	/** Secuencia temporal para revisar los cinco estados visuales de Sonner. */
	async function probarNotificaciones() {
		if (probandoNotificaciones) return;
		probandoNotificaciones = true;

		const mensajes = [
			() =>
				toast.error(i18n.t('notifications.type.error'), {
					description: i18n.t('notifications.test.error')
				}),
			() =>
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('notifications.test.success')
				}),
			() =>
				toast.warning(i18n.t('notifications.type.warning'), {
					description: i18n.t('notifications.test.warning')
				}),
			() =>
				toast.info(i18n.t('notifications.type.info'), {
					description: i18n.t('notifications.test.info')
				}),
			() =>
				toast(i18n.t('notifications.type.neutral'), {
					description: i18n.t('notifications.test.neutral')
				})
		];

		for (const mostrar of mensajes) {
			mostrar();
			await new Promise((resolver) => setTimeout(resolver, 600));
		}

		probandoNotificaciones = false;
	}

	function confirmarDemostracion() {
		toast.success(i18n.t('notifications.type.success'), {
			description: i18n.t('confirmation.test.confirmed')
		});
	}
</script>

<header
	class="sticky top-0 z-30 flex items-center gap-4 h-16 px-6 max-md:px-4 max-md:gap-2 border-b {hideBottomBorder ? 'border-transparent' : 'border-hairline'} bg-canvas/80 backdrop-blur-md backdrop-saturate-150"
	style:background-color={backgroundColor}
>
	<div class="flex items-center gap-3 shrink-0">
		<button class={iconBtn} onclick={onToggleSidebar} aria-label={i18n.t('header.menu')}>
			<Icon name="menu" size={20} />
		</button>
		{#if title}<h1 class="text-lg font-semibold whitespace-nowrap max-md:hidden {tone === 'light' ? 'text-white' : tone === 'dark' ? 'text-slate-950' : 'text-ink'}">{title}</h1>{/if}
	</div>

	<div class="flex items-center gap-2 shrink-0 ml-auto">
		<button
			class="{iconBtn} max-md:hidden"
			type="button"
			disabled={probandoNotificaciones}
			aria-busy={probandoNotificaciones}
			aria-label={i18n.t('notifications.test.action')}
			onclick={probarNotificaciones}
		>
			<Icon name="plus" size={20} />
		</button>
		<button
			class={iconBtn}
			type="button"
			aria-label={i18n.t('confirmation.test.action')}
			aria-haspopup="dialog"
			onclick={() => (confirmacionAbierta = true)}
		>
			<Icon name="bell" size={20} />
			<span class="absolute top-2 right-[9px] size-[7px] rounded-full bg-accent-pink border-2 {tone === 'light' ? 'border-white' : tone === 'dark' ? 'border-slate-950' : 'border-canvas'}"></span>
		</button>
		<LanguageSwitcher {tone} />
		<ThemeToggle {tone} />
		<UserMenu {usuario} {organizacionNombre} {tone} />
	</div>
</header>

<ConfirmationDialog
	bind:open={confirmacionAbierta}
	variant="danger"
	title={i18n.t('confirmation.test.title')}
	description={i18n.t('confirmation.test.description')}
	confirmLabel={i18n.t('confirmation.test.confirm')}
	cancelLabel={i18n.t('confirmation.cancel')}
	onConfirm={confirmarDemostracion}
/>
