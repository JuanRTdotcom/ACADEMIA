<script lang="ts">
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';
	import { Badge, Breadcrumb, Card, Icon, i18n, theme } from '$lib';

	let { children, data }: LayoutProps = $props();
	const base = '/administrator/company';
	const tabs = $derived(data.usuario.modulos
		.filter((modulo) => modulo.ruta?.startsWith(`${base}/`))
		.map((modulo) => ({ path: modulo.ruta!.slice(base.length + 1), key: modulo.nombre, icon: modulo.icono ?? 'circle' })));
	const active = (path: string) => page.url.pathname === `${base}/${path}`;
	const activeTab = $derived(tabs.find((tab) => active(tab.path)) ?? tabs[0]);
	const breadcrumbItems = $derived([
		{ label: i18n.t('nav.dashboard'), href: '/dashboard' },
		{ label: i18n.t('nav.group.administrator') },
		{ label: data.empresa.nombre, href: `${base}/general` },
		{ label: activeTab?.key ?? i18n.t('companies.title') }
	]);
	const shieldVersion = $derived(theme.current === 'dark' ? data.empresa.escudo_oscuro_version : data.empresa.escudo_version);
	const shieldType = $derived(theme.current === 'dark' ? 'escudo_oscuro' : 'escudo');
</script>

<svelte:head><title>{data.empresa.nombre} · {i18n.t('companies.title')}</title></svelte:head>

<Breadcrumb items={breadcrumbItems} />

<div class="mb-7">
	<Card padding="xl">
		<div class="flex flex-wrap items-start justify-between gap-5">
			<div class="flex min-w-0 items-stretch gap-5">
				{#if shieldVersion}
					<img src={`/media/tenant/${shieldType}/${shieldVersion}`} alt="" class="aspect-square min-h-28 w-28 shrink-0 self-stretch rounded-md border border-hairline bg-surface object-contain p-2 max-[560px]:min-h-20 max-[560px]:w-20" />
				{:else}
					<span class="grid aspect-square min-h-28 w-28 shrink-0 self-stretch place-items-center rounded-md border border-hairline bg-surface text-primary max-[560px]:min-h-20 max-[560px]:w-20"><Icon name="building-2" size={36} /></span>
				{/if}
				<div class="min-w-0">
				<h1 class="break-words text-[28px] tracking-[-0.02em] text-ink">
					{data.empresa.nombre}
				</h1>
				<a href={data.empresa.url_publica} target="_blank" rel="noreferrer" class="mt-2 flex min-w-0 items-center gap-2 text-sm text-primary hover:underline">
					<Icon name="globe" size={16} class="shrink-0" />
					<span class="truncate font-mono text-xs" title={data.empresa.url_publica}>{data.empresa.url_publica}</span>
					<Icon name="arrow-up-right" size={14} class="shrink-0" />
				</a>
				<p class="mt-3 max-w-[70ch] text-sm leading-relaxed text-steel">
					{i18n.t('companies.manageDescription')}
				</p>
				</div>
			</div>

			<div class="shrink-0">
				{#if data.protegida}
					<Badge variant="neutral">{i18n.t('companies.protected')}</Badge>
				{:else if data.empresa.estado === 1}
					<Badge variant="outline-green">{i18n.t('companies.active')}</Badge>
				{:else}
					<Badge variant="outline-danger">{i18n.t('companies.inactive')}</Badge>
				{/if}
			</div>
		</div>
	</Card>
</div>

<div class="grid grid-cols-[250px_minmax(0,1fr)] items-start gap-7 max-[860px]:grid-cols-1">
	<aside class="lg:sticky lg:top-20 max-[860px]:static">
		<Card padding="md">
			<nav aria-label={i18n.t('companies.title')} class="flex flex-col gap-5">
				<div class="flex flex-col gap-1">
					<p class="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone">
						{i18n.t('companies.settingsGroup')}
					</p>
					{#each tabs as tab (tab.path)}
						<a
							href={`${base}/${tab.path}`}
							aria-current={active(tab.path) ? 'page' : undefined}
							class="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 {active(tab.path)
								? 'bg-primary-soft font-semibold text-primary'
								: 'text-steel hover:bg-surface hover:text-ink'}"
						>
							<span class="grid size-5 shrink-0 place-items-center"><Icon name={tab.icon} size={18} /></span>
							<span class="min-w-0 truncate" title={tab.key}>{tab.key}</span>
						</a>
					{/each}
				</div>
			</nav>
		</Card>
	</aside>
	<div class="min-w-0">{@render children()}</div>
</div>
