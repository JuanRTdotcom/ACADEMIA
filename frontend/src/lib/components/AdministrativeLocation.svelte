<script lang="ts">
	import { Select } from '$lib';
	import { untrack } from 'svelte';

	type Nivel0 = {
		id_admin_level_0: string;
		codigo_iso2: string;
		nombre: string;
		etiqueta_admin_level_1: string;
		etiqueta_admin_level_2: string | null;
		etiqueta_admin_level_3: string;
	};
	type Nivel1 = { id_admin_level_1: string; fid_admin_level_0: string; codigo: string; nombre: string };
	type Nivel2 = { id_admin_level_2: string; fid_admin_level_1: string; codigo: string; nombre: string };
	type Nivel3 = { fid_admin_level_1: string; fid_admin_level_2: string | null; codigo: string; nombre: string };

	let {
		idPrefix,
		countryName,
		level3Name,
		countries,
		levels1,
		levels2,
		levels3,
		country = $bindable(),
		level3 = $bindable(),
		countryError,
		level3Error
	}: {
		idPrefix: string;
		countryName: string;
		level3Name: string;
		countries: Nivel0[];
		levels1: Nivel1[];
		levels2: Nivel2[];
		levels3: Nivel3[];
		country: string;
		level3: string;
		countryError?: string;
		level3Error?: string;
	} = $props();

	const nivel3Inicial = untrack(() => {
		const idsNivel1Pais = new Set(
			levels1.filter((item) => item.fid_admin_level_0 === country).map((item) => item.id_admin_level_1)
		);
		return levels3.find((item) => item.codigo === level3 && idsNivel1Pais.has(item.fid_admin_level_1));
	});
	let level1 = $state(nivel3Inicial?.fid_admin_level_1 ?? '');
	let level2 = $state(nivel3Inicial?.fid_admin_level_2 ?? '');
	const config = $derived(countries.find((item) => item.id_admin_level_0 === country));
	const options1 = $derived(levels1.filter((item) => item.fid_admin_level_0 === country));
	const options2 = $derived(levels2.filter((item) => item.fid_admin_level_1 === level1));
	const options3 = $derived(
		levels3.filter((item) =>
			config?.etiqueta_admin_level_2
				? item.fid_admin_level_2 === level2
				: item.fid_admin_level_1 === level1 && item.fid_admin_level_2 === null
		)
	);

	function changeCountry(event: Event) {
		country = (event.currentTarget as HTMLSelectElement).value;
		level1 = '';
		level2 = '';
		level3 = '';
	}
	function changeLevel1(event: Event) {
		level1 = (event.currentTarget as HTMLSelectElement).value;
		level2 = '';
		level3 = '';
	}
	function changeLevel2(event: Event) {
		level2 = (event.currentTarget as HTMLSelectElement).value;
		level3 = '';
	}
</script>

<div class="col-span-12 flex flex-col gap-4">
	<div class="grid grid-cols-12 gap-4">
		<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
			<Select id={`${idPrefix}-country`} name={countryName} label="País" value={country} onchange={changeCountry} error={countryError} icon="globe">
				<option value="">Selecciona un país</option>
				{#each countries as item (item.id_admin_level_0)}
					<option value={item.id_admin_level_0}>{item.nombre}</option>
				{/each}
			</Select>
		</div>
	</div>
	<div class="grid grid-cols-12 gap-4">
		<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
			<Select id={`${idPrefix}-level-1`} label={config?.etiqueta_admin_level_1 ?? 'División principal'} value={level1} onchange={changeLevel1} icon="map-pin" disabled={!country}>
				<option value="">Selecciona una opción</option>
				{#each options1 as item (item.id_admin_level_1)}
					<option value={item.id_admin_level_1}>{item.nombre}</option>
				{/each}
			</Select>
		</div>
		{#if config?.etiqueta_admin_level_2}
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Select id={`${idPrefix}-level-2`} label={config.etiqueta_admin_level_2} value={level2} onchange={changeLevel2} icon="map-pin" disabled={!level1}>
					<option value="">Selecciona una opción</option>
					{#each options2 as item (item.id_admin_level_2)}
						<option value={item.id_admin_level_2}>{item.nombre}</option>
					{/each}
				</Select>
			</div>
		{/if}
		<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
			<Select id={`${idPrefix}-level-3`} name={level3Name} label={config?.etiqueta_admin_level_3 ?? 'División local'} bind:value={level3} error={level3Error} icon="map-pin" disabled={!level1 || Boolean(config?.etiqueta_admin_level_2 && !level2)}>
				<option value="">Selecciona una opción</option>
				{#each options3 as item (`${item.fid_admin_level_1}-${item.codigo}`)}
					<option value={item.codigo}>{item.nombre}</option>
				{/each}
			</Select>
		</div>
	</div>
</div>
