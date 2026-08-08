<script lang="ts">
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { Card, Breadcrumb, Badge, Icon, i18n, tienePermiso } from '$lib';
	import { suscribirResumenAcciones } from '$lib/required-actions';

	type PestanaPerfil = {
		href: string;
		labelKey: string;
		icon: string;
		seccionAcciones?: string;
		permiso?: string;
	};

	let { children, data } = $props();
	let acciones = $state(untrack(() => data.usuario.acciones_requeridas));

	$effect(() => {
		data.usuario.acciones_requeridas;
		acciones = data.usuario.acciones_requeridas;
	});

	onMount(() => suscribirResumenAcciones((resumen) => (acciones = resumen)));

	const groups: { titleKey: string; items: PestanaPerfil[] }[] = [
		{
			titleKey: 'profile.group.account',
			items: [
				{ href: '/profile', labelKey: 'profile.tab.personal', icon: 'user', permiso: 'profile.personal.read' },
				{ href: '/profile/account', labelKey: 'profile.tab.authentication', icon: 'key-round', seccionAcciones: 'authentication', permiso: 'profile.authentication.read' },
				{
					href: '/profile/emails',
					labelKey: 'profile.tab.emails',
					icon: 'mail',
					seccionAcciones: 'emails',
					permiso: 'profile.emails.read'
				},
				{ href: '/profile/sessions', labelKey: 'profile.tab.sessions', icon: 'monitor-smartphone', permiso: 'profile.sessions.read' },
				{ href: '/profile/privacy', labelKey: 'profile.tab.privacy', icon: 'lock', permiso: 'profile.privacy.read' }
			]
		},
		{
			titleKey: 'profile.group.professional',
			items: [
				{ href: '/profile/nationalities', labelKey: 'profile.tab.nationalities', icon: 'flag', permiso: 'profile.nationalities.read' },
				{ href: '/profile/insurance', labelKey: 'profile.tab.insurance', icon: 'shield-plus', permiso: 'profile.insurance.read' },
				{ href: '/profile/phones', labelKey: 'profile.tab.phones', icon: 'phone-call', permiso: 'profile.phones.read' },
				{ href: '/profile/hobbies', labelKey: 'profile.tab.hobbies', icon: 'dumbbell', permiso: 'profile.hobbies.read' },
				{ href: '/profile/documents', labelKey: 'profile.tab.documents', icon: 'files', permiso: 'profile.documents.read' },
				{ href: '/profile/studies', labelKey: 'profile.tab.studies', icon: 'book-open-check', permiso: 'profile.studies.read' },
				{ href: '/profile/family', labelKey: 'profile.tab.family', icon: 'users-round', permiso: 'profile.family.read' }
			]
		},
		{
			titleKey: 'profile.group.preferences',
			items: [
				{ href: '/profile/appearance', labelKey: 'profile.tab.appearance', icon: 'palette', permiso: 'profile.appearance.read' },
				{ href: '/profile/notifications', labelKey: 'profile.tab.notifications', icon: 'bell', permiso: 'profile.notifications.read' },
				{ href: '/profile/activity', labelKey: 'profile.tab.activity', icon: 'history', permiso: 'profile.activity.read' }
			]
		},
		{
			titleKey: 'profile.group.info',
			items: [
				{ href: '/profile/help', labelKey: 'profile.tab.help', icon: 'help-circle', permiso: 'profile.help.read' },
				{ href: '/profile/legal', labelKey: 'profile.tab.legal', icon: 'scroll-text', permiso: 'profile.legal.read' }
			]
		}
	];

	const userPermissions = $derived<string[]>(data.usuario.permisos ?? []);
	const visibleGroups = $derived.by(() => {
		return groups
			.map((group) => ({
				...group,
				items: group.items.filter(
					(tab) => !tab.permiso || tienePermiso(userPermissions, tab.permiso)
				)
			}))
			.filter((group) => group.items.length > 0);
	});

	const activo = (href: string) => page.url.pathname === href;
	const cantidadAcciones = (seccion?: string) =>
		seccion ? (acciones.por_seccion[seccion] ?? 0) : 0;
</script>

<Breadcrumb />

<div class="grid grid-cols-[250px_minmax(0,1fr)] gap-7 items-start max-[860px]:grid-cols-1">
	<!-- Menú vertical de pestañas, agrupado -->
	<aside class="lg:sticky lg:top-20 max-[860px]:static">
		<Card padding="md">
			<nav aria-label={i18n.t('profile.title')} class="flex flex-col gap-5">
				{#each visibleGroups as group (group.titleKey)}
					<div class="flex flex-col gap-1">
						<p class="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-stone">
							{i18n.t(group.titleKey)}
						</p>
						{#each group.items as tab (tab.href)}
							<a
						href={tab.href}
						aria-current={activo(tab.href) ? 'page' : undefined}
						class="flex items-center gap-2.5 overflow-hidden px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 {activo(
							tab.href
						)
							? 'bg-primary-soft text-primary font-semibold'
							: 'text-steel hover:bg-surface hover:text-ink'}"
					>
						<span class="grid size-5 shrink-0 place-items-center"><Icon name={tab.icon} size={18} /></span>
						<span class="min-w-0 truncate" title={i18n.t(tab.labelKey)}>{i18n.t(tab.labelKey)}</span>
						{#if cantidadAcciones(tab.seccionAcciones) > 0}
							<span class="ml-auto shrink-0" aria-label={i18n.t('profile.actionsRequiredCount', { count: cantidadAcciones(tab.seccionAcciones) })}>
								<Badge variant="danger">{cantidadAcciones(tab.seccionAcciones)}</Badge>
							</span>
						{/if}
					</a>
						{/each}
					</div>
				{/each}
			</nav>
		</Card>
	</aside>

	<!-- Panel de la pestaña activa (ruta hija) -->
	<div class="min-w-0">
		{@render children()}
	</div>
</div>
