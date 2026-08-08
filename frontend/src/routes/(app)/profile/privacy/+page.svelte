<script lang="ts">
	import { Button, Card, Icon, Switch, i18n } from '$lib';

	// Consentimientos de ejemplo — a futuro persistidos por usuario.
	let analytics = $state(true);
	let personalization = $state(true);
	let thirdParty = $state(false);
</script>

<svelte:head><title>{i18n.t('profile.tab.privacy')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<!-- Tus datos -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.privacy.dataTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.privacy.dataSubtitle')}</p>
		</div>
		<div class="flex items-center gap-4 max-[560px]:flex-wrap">
			<span class="grid place-items-center size-10 rounded-md bg-tint-sky text-charcoal dark:text-ink shrink-0"><Icon name="download" size={20} /></span>
			<div class="min-w-0 flex-1">
				<p class="text-sm text-ink font-semibold">{i18n.t('profile.privacy.export')}</p>
				<p class="text-[13px] text-steel">{i18n.t('profile.privacy.exportHint')}</p>
			</div>
			<Button variant="secondary" size="sm"><Icon name="download" size={16} /> {i18n.t('profile.privacy.request')}</Button>
		</div>
	</Card>

	<!-- Consentimientos -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.privacy.consentTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.privacy.consentSubtitle')}</p>
		</div>
		<ul class="list-none p-0 flex flex-col divide-y divide-hairline">
			<li class="flex items-center gap-4 py-4 first:pt-0">
				<div class="min-w-0 flex-1">
					<p class="text-sm text-ink font-semibold">{i18n.t('profile.privacy.analytics')}</p>
					<p class="text-[13px] text-steel">{i18n.t('profile.privacy.analyticsHint')}</p>
				</div>
				<Switch bind:checked={analytics} label={i18n.t('profile.privacy.analytics')} />
			</li>
			<li class="flex items-center gap-4 py-4">
				<div class="min-w-0 flex-1">
					<p class="text-sm text-ink font-semibold">{i18n.t('profile.privacy.personalization')}</p>
					<p class="text-[13px] text-steel">{i18n.t('profile.privacy.personalizationHint')}</p>
				</div>
				<Switch bind:checked={personalization} label={i18n.t('profile.privacy.personalization')} />
			</li>
			<li class="flex items-center gap-4 py-4 last:pb-0">
				<div class="min-w-0 flex-1">
					<p class="text-sm text-ink font-semibold">{i18n.t('profile.privacy.thirdParty')}</p>
					<p class="text-[13px] text-steel">{i18n.t('profile.privacy.thirdPartyHint')}</p>
				</div>
				<Switch bind:checked={thirdParty} label={i18n.t('profile.privacy.thirdParty')} />
			</li>
		</ul>
	</Card>

	<!-- Zona de riesgo -->
	<Card padding="xl" class="border-error/40">
		<div class="flex items-center gap-4 max-[560px]:flex-wrap">
			<span class="grid place-items-center size-10 rounded-md bg-tint-orange text-error shrink-0"><Icon name="trash-2" size={20} /></span>
			<div class="min-w-0 flex-1">
				<p class="text-sm text-ink font-semibold">{i18n.t('profile.privacy.delete')}</p>
				<p class="text-[13px] text-steel">{i18n.t('profile.privacy.deleteHint')}</p>
			</div>
			<button
				type="button"
				class="inline-flex items-center gap-2 h-9 px-3.5 rounded-md text-sm font-medium text-error border border-error/50 transition-colors duration-150 hover:bg-error/10"
			>
				{i18n.t('profile.privacy.delete')}
			</button>
		</div>
	</Card>
</div>
