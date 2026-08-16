<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { CompanySectionCard, Input, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(
		!values.soporte_correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.soporte_correo)
	);
	const dirty = $derived(JSON.stringify(values) !== baseline);
	function saved() { baseline = JSON.stringify(values); }
</script>

<CompanySectionCard title={i18n.t('companies.section.communications')} subtitle={i18n.t('companies.section.communicationsDescription')} {valid} {dirty} onSaved={saved}>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_correo" label={i18n.t('companies.field.supportEmail')} icon="mail" type="email" bind:value={values.soporte_correo} maxlength={120} /></div>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_telefono" label={i18n.t('companies.field.supportPhone')} icon="phone-call" bind:value={values.soporte_telefono} maxlength={30} /></div>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_whatsapp" label={i18n.t('companies.field.supportWhatsapp')} icon="message-circle" bind:value={values.soporte_whatsapp} maxlength={30} /></div>
</CompanySectionCard>
