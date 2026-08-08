<script lang="ts">
	import { enhance } from '$app/forms';
	import { Card, Button, Select, Icon, i18n, theme } from '$lib';
	import type { ThemeMode } from '$lib/stores/theme.svelte';
	import type { Locale } from '$lib/i18n/index.svelte';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let guardando = $state(false);

	function paisInicial() {
		return data.usuario.preferencias.fid_admin_level_0 ?? '';
	}

	function zonaHorariaInicial() {
		return data.usuario.preferencias.fid_zonas_horarias ?? '';
	}

	let paisGuardado = $state(paisInicial());
	let zonaHorariaGuardada = $state(zonaHorariaInicial());
	let paisSeleccionado = $state(paisInicial());
	let zonaHorariaSeleccionada = $state(zonaHorariaInicial());

	// El formulario solo puede enviarse cuando ambos campos son válidos y
	// al menos uno difiere de los valores que llegaron inicialmente por SSR.
	const hayCambios = $derived(
		paisSeleccionado !== paisGuardado || zonaHorariaSeleccionada !== zonaHorariaGuardada
	);
	const puedeGuardar = $derived(
		hayCambios && paisSeleccionado.length > 0 && zonaHorariaSeleccionada.length > 0
	);

	const paises = $derived(
		[...data.catalogos.paises].sort((a, b) =>
			(i18n.locale === 'es' ? a.nombre_es : a.nombre_en).localeCompare(
				i18n.locale === 'es' ? b.nombre_es : b.nombre_en,
				i18n.locale
			)
		)
	);

	const temas: { id: ThemeMode; labelKey: string; icon: string }[] = [
		{ id: 'light', labelKey: 'profile.appearance.themeLight', icon: 'sun' },
		{ id: 'dark', labelKey: 'profile.appearance.themeDark', icon: 'moon' },
		{ id: 'system', labelKey: 'profile.appearance.themeSystem', icon: 'monitor' }
	];

	function cambiarIdioma(event: Event) {
		i18n.set((event.currentTarget as HTMLSelectElement).value as Locale);
	}

	function cambiarTema(modo: ThemeMode) {
		theme.setMode(modo);
	}

</script>

<svelte:head><title>{i18n.t('profile.tab.appearance')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<!-- Tema (se aplica al instante, en toda la app) -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.appearance.themeTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.appearance.themeSubtitle')}</p>
		</div>
		<div class="grid grid-cols-12 gap-3">
			{#each temas as t (t.id)}
				<button
					type="button"
					onclick={() => cambiarTema(t.id)}
					aria-pressed={theme.mode === t.id}
					class="col-span-2 max-[480px]:col-span-12 flex flex-col items-center gap-2 py-4 rounded-lg border transition-all duration-150 {theme.mode === t.id
						? 'border-primary bg-primary-soft text-primary ring-[3px] ring-primary/20'
						: 'border-hairline-strong text-steel hover:text-ink hover:border-hairline'}"
				>
					<Icon name={t.icon} size={22} />
					<span class="text-sm font-medium">{i18n.t(t.labelKey)}</span>
				</button>
			{/each}
		</div>
	</Card>

	<!-- Idioma (se aplica al instante, igual que el selector del header) -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.appearance.languageTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.appearance.languageSubtitle')}</p>
		</div>
		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-4 max-[560px]:col-span-12">
				<Select
					id="idioma"
					label={i18n.t('profile.appearance.language')}
					icon="globe"
					value={i18n.locale}
					onchange={cambiarIdioma}
				>
					<option value="es">Español</option>
					<option value="en">English</option>
				</Select>
			</div>
		</div>
	</Card>

	<!-- Los catálogos y selecciones llegan completos desde SSR antes de pintar. -->
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.appearance.regionTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.appearance.regionSubtitle')}</p>
		</div>
		<form
			method="POST"
			use:enhance={({ cancel }) => {
				// También protege envíos por Enter o disparados programáticamente.
				if (!puedeGuardar || guardando) {
					cancel();
					return;
				}
				guardando = true;
				return ({ result }) => {
					guardando = false;
					if (result.type === 'success') {
						// La selección confirmada pasa a ser la nueva referencia sin recargar la vista.
						paisGuardado = paisSeleccionado;
						zonaHorariaGuardada = zonaHorariaSeleccionada;
						toast.success(i18n.t('notifications.type.success'), {
							description: i18n.t('profile.appearance.saved')
						});
					} else if (result.type === 'failure') {
						const respuesta = result.data as { error?: string } | undefined;
						const description = i18n.t(respuesta?.error ?? 'profile.appearance.saveError');
						if (result.status === 429) {
							toast.warning(i18n.t('notifications.type.warning'), { description });
						} else {
							toast.error(i18n.t('notifications.type.error'), { description });
						}
					} else if (result.type === 'error') {
						toast.error(i18n.t('notifications.type.error'), {
							description: i18n.t('profile.appearance.saveError')
						});
					}
				};
			}}
		>
			<div class="grid grid-cols-12 gap-4">
				<div class="col-span-4 max-[560px]:col-span-12">
					<Select
						id="region"
						name="fid_admin_level_0"
						label={i18n.t('profile.appearance.region')}
						bind:value={paisSeleccionado}
						required
					>
						<option value="" disabled>{i18n.t('profile.appearance.selectCountry')}</option>
						{#each paises as pais (pais.id_admin_level_0)}
							<option value={pais.id_admin_level_0}>
								{i18n.locale === 'es' ? pais.nombre_es : pais.nombre_en}
							</option>
						{/each}
					</Select>
				</div>
				<div class="col-span-4 max-[560px]:col-span-12">
					<Select
						id="zona"
						name="fid_zonas_horarias"
						label={i18n.t('profile.appearance.timezone')}
						bind:value={zonaHorariaSeleccionada}
						required
					>
						<option value="" disabled>{i18n.t('profile.appearance.selectTimezone')}</option>
						{#each data.catalogos.zonas_horarias as zonaHoraria (zonaHoraria.id_zonas_horarias)}
							<option value={zonaHoraria.id_zonas_horarias}>
								{zonaHoraria.nombre_iana} ({zonaHoraria.desfase_utc})
							</option>
						{/each}
					</Select>
				</div>
			</div>

			<div class="flex items-center justify-end mt-7 pt-5 border-t border-hairline">
				<Button type="submit" loading={guardando} disabled={guardando || !puedeGuardar}>
					{#if !guardando}<Icon name="save" size={18} />{/if}
					{i18n.t('profile.save')}
				</Button>
			</div>
		</form>
	</Card>
</div>
