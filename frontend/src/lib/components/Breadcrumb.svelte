<script lang="ts" module>
	// Etiquetas por ruta (clave i18n). El breadcrumb se arma solo desde la URL;
	// registra aquí cada ruta nueva para que muestre un nombre legible.
	export const routeLabels: Record<string, string> = {
		'/dashboard': 'nav.dashboard',
		'/recursos': 'nav.resources',
		'/profile': 'profile.title',
		'/profile/account': 'profile.tab.authentication',
		'/profile/emails': 'profile.tab.emails',
		'/profile/sessions': 'profile.tab.sessions',
		'/profile/nationalities': 'profile.tab.nationalities',
		'/profile/insurance': 'profile.tab.insurance',
		'/profile/phones': 'profile.tab.phones',
		'/profile/hobbies': 'profile.tab.hobbies',
		'/profile/documents': 'profile.tab.documents',
		'/profile/studies': 'profile.tab.studies',
		'/profile/family': 'profile.tab.family',
		'/profile/privacy': 'profile.tab.privacy',
		'/profile/appearance': 'profile.tab.appearance',
		'/profile/notifications': 'profile.tab.notifications',
		'/profile/activity': 'profile.tab.activity',
		'/profile/help': 'profile.tab.help',
		'/profile/legal': 'profile.tab.legal',
		'/administrator': 'nav.group.administrator',
		'/administrator/company': 'nav.company',
		'/superadmin/roles': 'nav.roles',
		'/superadmin/companies': 'nav.companies',
		'/superadmin/users': 'nav.systemUsers'
	};
</script>

<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	interface Crumb {
		label: string;
		href?: string;
	}
	interface Props {
		items?: Crumb[];
	}

	let { items }: Props = $props();

	const ROOT = '/dashboard';

	// Convierte un segmento suelto (sin etiqueta registrada) en texto legible.
	function prettify(segment: string): string {
		return decodeURIComponent(segment).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
	}

	// Arma la migaja a partir de la URL actual. La raíz es siempre el dashboard.
	const automaticTrail = $derived.by<Crumb[]>(() => {
		const path = page.url.pathname;
		const root: Crumb = { label: i18n.t(routeLabels[ROOT]), href: ROOT };
		if (path === ROOT) return [{ label: root.label }];

		const segments = path.split('/').filter(Boolean);
		const crumbs: Crumb[] = [root];
		let acc = '';
		for (const seg of segments) {
			acc += `/${seg}`;
			const key = routeLabels[acc];
			crumbs.push({ label: key ? i18n.t(key) : prettify(seg), href: acc });
		}
		// El último es la página actual: sin enlace.
		crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
		return crumbs;
	});
	const trail = $derived(items ?? automaticTrail);
</script>

<nav aria-label={i18n.t('breadcrumb.aria')} class="mb-4">
	<ol class="flex items-center flex-wrap gap-1.5 list-none p-0 text-[13px]">
		{#each trail as crumb, i (crumb.label + i)}
			<li class="flex items-center gap-1.5">
				{#if i > 0}
					<span class="text-stone" aria-hidden="true"><Icon name="chevron-right" size={15} /></span>
				{/if}
				{#if crumb.href}
					<a
						href={crumb.href}
						class="inline-flex items-center gap-1 text-steel font-medium rounded-sm px-1 -mx-1 transition-colors duration-150 hover:text-ink"
					>
						{#if i === 0}<Icon name="house" size={15} />{/if}
						{crumb.label}
					</a>
				{:else}
					<span class="inline-flex items-center gap-1 text-ink font-semibold" aria-current="page">
						{#if i === 0}<Icon name="house" size={15} />{/if}
						{crumb.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
