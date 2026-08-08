<script lang="ts">
	// Preferencias regionales de la empresa autenticada.
	import type { PageProps } from './$types'; import { untrack } from 'svelte'; import { CompanySectionCard, Select, i18n } from '$lib';
	let { data }: PageProps = $props(); let values = $state(untrack(() => ({ ...data.section }))); let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(Boolean(values.idioma_por_defecto && values.zona_horaria_por_defecto)); const dirty = $derived(JSON.stringify(values) !== baseline); function saved() { baseline = JSON.stringify(values); }
</script>
<CompanySectionCard title={i18n.t('companies.section.regional')} subtitle={i18n.t('companies.section.regionalDescription')} {valid} {dirty} protectedCompany={data.protegida} onSaved={saved}>
	<div class="col-span-6 max-[620px]:col-span-12"><Select name="idioma_por_defecto" label={i18n.t('companies.field.idioma')} icon="languages" bind:value={values.idioma_por_defecto} required><option value="es">{i18n.t('language.es')}</option><option value="en">{i18n.t('language.en')}</option></Select></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Select name="zona_horaria_por_defecto" label={i18n.t('companies.field.zona')} icon="clock" bind:value={values.zona_horaria_por_defecto} required>{#each data.catalogos.zonas_horarias as zone (zone.id_zonas_horarias)}<option value={zone.nombre_iana}>{zone.nombre_iana} ({zone.desfase_utc})</option>{/each}</Select></div>
</CompanySectionCard>
