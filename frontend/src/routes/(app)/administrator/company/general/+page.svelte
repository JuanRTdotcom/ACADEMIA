<script lang="ts">
	import type { PageProps } from './$types';
	import { Card, Icon, i18n } from '$lib';
	let { data }: PageProps = $props();
	const fields = $derived([
		{ label: i18n.t('companies.section.branch'), value: data.sede?.nombre, icon: 'map-pin' },
		{ label: i18n.t('companies.field.name'), value: data.section.nombre, icon: 'building-2' },
		{ label: i18n.t('companies.field.slug'), value: data.section.slug, icon: 'link' },
		{ label: i18n.t('companies.field.razonSocial'), value: data.section.razon_social, icon: 'file-text' },
		{ label: i18n.t('companies.field.ruc'), value: data.section.ruc_nif, icon: 'hash' },
		{ label: i18n.t('companies.field.plan'), value: data.section.plan_nombre, icon: 'package' }
	]);
</script>

<Card padding="xl">
	<h2 class="text-xl font-semibold text-ink">{i18n.t('companies.section.basic')}</h2>
	<p class="mt-1 text-sm leading-relaxed text-steel">{i18n.t('companies.section.basicReadonlyDescription')}</p>
	<div class="mt-6 grid grid-cols-12 gap-4">
		{#each fields as field (field.label)}
			<div class="col-span-6 min-w-0 rounded-md border border-hairline bg-surface p-4 max-[620px]:col-span-12">
				<div class="flex items-center gap-2 text-xs font-medium text-stone"><Icon name={field.icon} size={16} /><span>{field.label}</span></div>
				<p class="mt-2 truncate text-sm font-medium text-ink" title={field.value || '—'}>{field.value || '—'}</p>
			</div>
		{/each}
	</div>
</Card>
