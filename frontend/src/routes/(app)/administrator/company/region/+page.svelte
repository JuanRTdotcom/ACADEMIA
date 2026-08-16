<script lang="ts">
	// Preferencias regionales de la empresa autenticada.
	import type { PageProps } from './$types'; import { onMount, untrack } from 'svelte'; import { CompanySectionCard, Select, i18n } from '$lib';
	let { data }: PageProps = $props(); let values = $state(untrack(() => ({ ...data.section }))); let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(Boolean(values.fid_parametros_idioma && values.fid_zonas_horarias && values.fid_parametros_moneda)); const dirty = $derived(JSON.stringify(values) !== baseline); function saved() { baseline = JSON.stringify(values); }
	let ahora = $state(new Date());
	const formatosHora = new Map<string, Intl.DateTimeFormat>();
	const formatosDesfase = new Map<string, Intl.DateTimeFormat>();
	const zonaSeleccionada = $derived(data.catalogos.zonas_horarias.find((zona) => zona.id_zonas_horarias === values.fid_zonas_horarias));
	function horaActual(zona: string) {
		try {
			let formato = formatosHora.get(zona);
			if (!formato) {
				formato = new Intl.DateTimeFormat('es-PE', { timeZone: zona, hour: '2-digit', minute: '2-digit', hour12: false });
				formatosHora.set(zona, formato);
			}
			return formato.format(ahora);
		} catch { return ''; }
	}
	function desfaseUtc(zona: string) {
		try {
			let formato = formatosDesfase.get(zona);
			if (!formato) {
				formato = new Intl.DateTimeFormat('es-PE', { timeZone: zona, timeZoneName: 'longOffset' });
				formatosDesfase.set(zona, formato);
			}
			const valor = formato.formatToParts(ahora).find((parte) => parte.type === 'timeZoneName')?.value ?? 'GMT';
			return valor === 'GMT' ? 'UTC+00:00' : valor.replace('GMT', 'UTC');
		} catch { return 'UTC'; }
	}
	onMount(() => { const temporizador = window.setInterval(() => ahora = new Date(), 60_000); return () => window.clearInterval(temporizador); });
</script>
<CompanySectionCard title="Internacionalización" subtitle="Valores predeterminados de la entidad legal y la sede principal. Cada sede puede personalizarlos desde Sedes." {valid} {dirty} protectedCompany={data.protegida} onSaved={saved}>
	<div class="col-span-6 max-[620px]:col-span-12"><Select name="fid_parametros_idioma" label={i18n.t('companies.field.idioma')} icon="languages" bind:value={values.fid_parametros_idioma} required>{#each data.catalogos.idiomas as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div>
	<div class="col-span-6 max-[620px]:col-span-12">
		<Select name="fid_zonas_horarias" label={i18n.t('companies.field.zona')} icon="clock" bind:value={values.fid_zonas_horarias} required>{#each data.catalogos.zonas_horarias as zone (zone.id_zonas_horarias)}<option value={zone.id_zonas_horarias}>{zone.nombre_iana} — {desfaseUtc(zone.nombre_iana)}</option>{/each}</Select>
		{#if zonaSeleccionada}<p class="mt-1.5 text-xs text-muted" aria-live="polite">Hora actual en {zonaSeleccionada.nombre_iana}: <strong class="font-medium text-ink">{horaActual(zonaSeleccionada.nombre_iana)}</strong></p>{/if}
	</div>
	<div class="col-span-6 max-[620px]:col-span-12"><Select name="fid_parametros_moneda" label="Moneda de cobro" icon="dollar-sign" bind:value={values.fid_parametros_moneda} required>{#each data.catalogos.monedas as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div>
</CompanySectionCard>
