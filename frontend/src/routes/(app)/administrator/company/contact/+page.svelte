<script lang="ts">
	import type { PageProps } from './$types';
	import { untrack } from 'svelte';
	import { AdministrativeLocation, CompanySectionCard, Icon, Input, Switch, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(
		(!values.correo_contacto || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo_contacto)) &&
		(!values.correo_contacto_secundario || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.correo_contacto_secundario)) &&
		(values.sin_sede_fisica || ((!values.fid_admin_level_0 && !values.codigo_admin_level_3) || Boolean(values.fid_admin_level_0 && values.codigo_admin_level_3)))
	);
	const dirty = $derived(JSON.stringify(values) !== baseline);
	function saved() { baseline = JSON.stringify(values); }
</script>

<CompanySectionCard title={i18n.t('companies.section.contact')} subtitle={i18n.t('companies.section.contactDescription')} {valid} {dirty} onSaved={saved}>
	<div class="col-span-12 flex items-center justify-between gap-5 rounded-lg border border-hairline bg-surface p-4 max-[560px]:items-start"><div><h2 class="text-sm font-semibold text-ink">Atención solo a domicilio</h2><p class="mt-1 max-w-[68ch] text-sm leading-relaxed text-steel">Actívalo si tu veterinaria no recibe pacientes en una sede. No pediremos dirección, ubicación ni coordenadas.</p></div><div class="shrink-0"><Switch name="sin_sede_fisica" bind:checked={values.sin_sede_fisica} label="Activar atención solo a domicilio" /></div></div>
	{#if !values.sin_sede_fisica}
	<AdministrativeLocation idPrefix="company-location" countryName="fid_admin_level_0" level3Name="codigo_admin_level_3" countries={data.catalogos.admin_level_0} levels1={data.catalogos.admin_level_1} levels2={data.catalogos.admin_level_2} levels3={data.catalogos.admin_level_3} bind:country={values.fid_admin_level_0} bind:level3={values.codigo_admin_level_3} />
	<div class="col-span-12"><Input name="direccion" label={i18n.t('companies.field.direccion')} icon="map-pin" bind:value={values.direccion} maxlength={200} /></div>
	<div class="col-span-12"><Input name="referencia" label={i18n.t('companies.field.reference')} icon="signpost" bind:value={values.referencia} maxlength={200} /></div>
	{#if values.direccion || values.referencia}
		<div class="col-span-12 text-sm"><a class="inline-flex items-center gap-2 text-primary hover:underline" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([values.direccion, values.referencia].filter(Boolean).join(', '))}`} target="_blank" rel="noreferrer"><Icon name="map-pin" size={16} />Buscar la veterinaria en el mapa</a></div>
	{/if}
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="latitud" label="Latitud" icon="map-pin" inputmode="decimal" bind:value={values.latitud} maxlength={11} /><p class="mt-1 text-xs text-steel">Coordenada para ubicar la veterinaria en mapas.</p></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="longitud" label="Longitud" icon="map-pin" inputmode="decimal" bind:value={values.longitud} maxlength={12} /></div>
	{#if values.latitud && values.longitud}<div class="col-span-12 text-sm"><a class="text-primary hover:underline" href={`https://www.openstreetmap.org/?mlat=${values.latitud}&mlon=${values.longitud}#map=17/${values.latitud}/${values.longitud}`} target="_blank" rel="noreferrer">Ver ubicación en el mapa</a></div>{/if}
	{/if}
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="telefono" label={i18n.t('companies.field.primaryPhone')} icon="phone" bind:value={values.telefono} maxlength={30} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="telefono_secundario" label={i18n.t('companies.field.secondaryPhone')} icon="phone-call" bind:value={values.telefono_secundario} maxlength={30} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="correo_contacto" label={i18n.t('companies.field.primaryEmail')} icon="mail" type="email" bind:value={values.correo_contacto} maxlength={120} /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="correo_contacto_secundario" label={i18n.t('companies.field.secondaryEmail')} icon="mail-plus" type="email" bind:value={values.correo_contacto_secundario} maxlength={120} /></div>
</CompanySectionCard>
