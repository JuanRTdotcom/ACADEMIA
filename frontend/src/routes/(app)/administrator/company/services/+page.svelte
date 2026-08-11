<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { CompanySectionCard } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(JSON.stringify(values));
	const valid = $derived(true);
	const dirty = $derived(JSON.stringify(values) !== baseline);
</script>

<CompanySectionCard title="Atención veterinaria" subtitle="Los servicios se administran desde el menú principal. Aquí define las especies y condiciones generales de atención." {valid} {dirty} onSaved={() => baseline = JSON.stringify(values)}>
	<fieldset class="col-span-12"><legend class="mb-2 text-sm font-medium text-charcoal">Especies atendidas</legend><div class="grid grid-cols-3 gap-2 max-[700px]:grid-cols-2">{#each data.catalogos.especies_animales as especie (especie.id_parametros)}<label class="flex items-center gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink"><input type="checkbox" name="fid_parametros_especies" value={especie.id_parametros} checked={values.fid_parametros_especies.includes(especie.id_parametros)} onchange={(e) => { values.fid_parametros_especies = e.currentTarget.checked ? [...values.fid_parametros_especies, especie.id_parametros] : values.fid_parametros_especies.filter((item) => item !== especie.id_parametros); }} />{especie.etiqueta}</label>{/each}</div></fieldset>
</CompanySectionCard>
