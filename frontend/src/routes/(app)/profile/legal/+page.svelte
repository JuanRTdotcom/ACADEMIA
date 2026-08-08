<script lang="ts">
	import { Card, Icon, i18n } from '$lib';

	// Documentos legales de la plataforma (contenido estático, no por usuario).
	const docs = [
		{ id: 'terms', icon: 'scroll-text', tint: 'purple', updated: '2026-06-01' },
		{ id: 'privacy', icon: 'lock', tint: 'sky', updated: '2026-06-01' },
		{ id: 'community', icon: 'shield-check', tint: 'green', updated: '2026-05-15' }
	];

	const tintBg: Record<string, string> = {
		purple: 'bg-tint-purple',
		sky: 'bg-tint-sky',
		green: 'bg-tint-green'
	};
</script>

<svelte:head><title>{i18n.t('profile.tab.legal')} · Sumaq System</title></svelte:head>

<Card padding="xl">
	<div class="mb-5">
		<h3 class="text-lg text-ink">{i18n.t('profile.legal.title')}</h3>
		<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.legal.subtitle')}</p>
	</div>

	<ul class="list-none p-0 flex flex-col gap-2">
		{#each docs as doc (doc.id)}
			<li>
				<a
					href="#/"
					class="group flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-surface transition-colors duration-150"
				>
					<span class="grid place-items-center size-11 rounded-lg text-charcoal dark:text-ink shrink-0 {tintBg[doc.tint]}">
						<Icon name={doc.icon} size={22} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="text-sm text-ink font-semibold">{i18n.t(`profile.legal.${doc.id}`)}</p>
						<p class="text-[13px] text-steel mt-0.5">{i18n.t(`profile.legal.${doc.id}Desc`)}</p>
						<p class="text-xs text-stone mt-1 inline-flex items-center gap-1">
							<Icon name="clock" size={12} /> {i18n.t('profile.legal.updated', { date: doc.updated })}
						</p>
					</div>
					<span class="text-stone transition-transform duration-150 group-hover:translate-x-0.5"><Icon name="chevron-right" size={18} /></span>
				</a>
			</li>
		{/each}
	</ul>
</Card>
