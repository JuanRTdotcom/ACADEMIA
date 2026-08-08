<script lang="ts">
	import { Card, Button, Input, Icon, i18n } from '$lib';

	const faqs = ['profile.help.faq1', 'profile.help.faq2', 'profile.help.faq3'];

	const contactOptions = [
		{ id: 'email', icon: 'mail', tint: 'sky' },
		{ id: 'docs', icon: 'scroll-text', tint: 'purple' },
		{ id: 'chat', icon: 'help-circle', tint: 'green' }
	];

	const tintBg: Record<string, string> = {
		sky: 'bg-tint-sky',
		purple: 'bg-tint-purple',
		green: 'bg-tint-green'
	};
</script>

<svelte:head><title>{i18n.t('profile.tab.help')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<!-- Buscador + preguntas frecuentes -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.help.title')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.help.subtitle')}</p>
		</div>

		<Input icon="search" placeholder={i18n.t('profile.help.searchPlaceholder')} />

		<p class="text-[13px] font-semibold text-ink mt-6 mb-1">{i18n.t('profile.help.faqTitle')}</p>
		<ul class="list-none p-0 flex flex-col divide-y divide-hairline">
			{#each faqs as faq (faq)}
				<li>
					<a
						href="#/"
						class="flex items-center gap-3 py-3.5 group text-steel hover:text-ink transition-colors duration-150"
					>
						<span class="flex-1 text-sm text-ink font-medium">{i18n.t(faq)}</span>
						<span class="text-stone transition-transform duration-150 group-hover:translate-x-0.5"><Icon name="chevron-right" size={16} /></span>
					</a>
				</li>
			{/each}
		</ul>
	</Card>

	<!-- Opciones de contacto -->
	<div>
		<p class="text-[13px] font-semibold text-ink mb-3">{i18n.t('profile.help.contactTitle')}</p>
		<div class="grid grid-cols-3 gap-4 max-[640px]:grid-cols-1">
			{#each contactOptions as opt (opt.id)}
				<Card padding="lg" hoverable>
					<div class="flex flex-col gap-2">
						<span class="grid place-items-center size-11 rounded-lg text-charcoal dark:text-ink {tintBg[opt.tint]}">
							<Icon name={opt.icon} size={22} />
						</span>
						<h4 class="text-[15px] mt-1">{i18n.t(`profile.help.${opt.id}`)}</h4>
						<p class="text-[13px] text-steel -mt-0.5">{i18n.t(`profile.help.${opt.id}Hint`)}</p>
					</div>
				</Card>
			{/each}
		</div>
	</div>

	<!-- Comentarios -->
	<Card padding="xl">
		<div class="mb-4">
			<h3 class="text-lg text-ink">{i18n.t('profile.help.feedbackTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.help.feedbackSubtitle')}</p>
		</div>
		<textarea
			rows="4"
			placeholder={i18n.t('profile.help.feedbackPlaceholder')}
			class="w-full bg-canvas border border-hairline-strong rounded-md p-3.5 text-ink text-base outline-none resize-y transition-all duration-150 placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/20"
		></textarea>
		<div class="flex items-center justify-between gap-3 mt-4 flex-wrap">
			<p class="text-xs text-stone">{i18n.t('profile.help.feedbackNote')}</p>
			<Button><Icon name="send" size={17} /> {i18n.t('profile.help.send')}</Button>
		</div>
	</Card>
</div>
