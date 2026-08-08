<script lang="ts">
	import type { PageProps } from './$types';
	import { untrack } from 'svelte';
	import { AdministrativeLocation, CompanySectionCard, Input, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(
		(!values.correo_contacto || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo_contacto)) &&
		(!values.correo_contacto_secundario || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo_contacto_secundario)) &&
		((!values.fid_admin_level_0 && !values.codigo_admin_level_3) || Boolean(values.fid_admin_level_0 && values.codigo_admin_level_3))
	);
	const dirty = $derived(JSON.stringify(values) !== baseline);
	function saved() { baseline = JSON.stringify(values); }
</script>

<CompanySectionCard title={i18n.t('companies.section.contact')} subtitle={i18n.t('companies.section.contactDescription')} {valid} {dirty} onSaved={saved}>
	<AdministrativeLocation idPrefix="company-location" countryName="fid_admin_level_0" level3Name="codigo_admin_level_3" countries={data.catalogos.admin_level_0} levels1={data.catalogos.admin_level_1} levels2={data.catalogos.admin_level_2} levels3={data.catalogos.admin_level_3} bind:country={values.fid_admin_level_0} bind:level3={values.codigo_admin_level_3} />
	<div class="col-span-12"><Input name="direccion" label={i18n.t('companies.field.direccion')} icon="map-pin" bind:value={values.direccion} maxlength={200} /></div>
	<div class="col-span-12"><Input name="referencia" label={i18n.t('companies.field.reference')} icon="signpost" bind:value={values.referencia} maxlength={200} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="telefono" label={i18n.t('companies.field.primaryPhone')} icon="phone" bind:value={values.telefono} maxlength={30} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="telefono_secundario" label={i18n.t('companies.field.secondaryPhone')} icon="phone-call" bind:value={values.telefono_secundario} maxlength={30} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="correo_contacto" label={i18n.t('companies.field.primaryEmail')} icon="mail" type="email" bind:value={values.correo_contacto} maxlength={120} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="correo_contacto_secundario" label={i18n.t('companies.field.secondaryEmail')} icon="mail-plus" type="email" bind:value={values.correo_contacto_secundario} maxlength={120} /></div>
</CompanySectionCard>
