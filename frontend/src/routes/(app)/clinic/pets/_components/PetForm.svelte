<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import { Button, Card, ColorSelect, ConfirmationDialog, Icon, Input, Select, Switch, i18n } from '$lib';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import OwnerPicker from './OwnerPicker.svelte';

	type Parameter = { id_parametros: string; codigo: string; etiqueta: string; color_hex?: string | null };
	type Species = { id_especies_animales: string; codigo: string; nombre: string; nombre_cientifico?: string | null };
	type Subspecies = { id_subespecies_animales: string; fid_especies_animales: string; codigo: string; nombre: string; nombre_cientifico?: string | null };
	type Breed = { id_razas_animales: string; fid_especies_animales: string; codigo: string; nombre: string };
	type Owner = { id_propietarios: string; nombre_completo: string; numero_documento: string; celular: string | null; tipo_documento: { etiqueta: string } };
	type Options = { especies: Species[]; subespecies: Subspecies[]; razas: Breed[]; generos: Parameter[]; colores: Parameter[]; unidades_peso: Parameter[]; tallas: Parameter[]; estados_reproductivos: Parameter[]; temperamentos: Parameter[]; unidad_peso_predeterminada: string | null };
	type Pet = Partial<Record<'id_mascotas' | 'nombre' | 'codigo_chip' | 'fid_especies_animales' | 'fid_subespecies_animales' | 'fid_razas_animales' | 'fid_parametros_genero' | 'fid_parametros_color' | 'fecha_nacimiento' | 'peso' | 'fid_parametros_unidad_peso' | 'fid_parametros_talla' | 'fid_parametros_estado_reproductivo' | 'fid_parametros_temperamento' | 'alimento' | 'foto_version', string | null>> & { animal_servicio?: boolean; apoyo_emocional?: boolean; propietario?: Owner | null };
	type FormState = { petMessage?: string } | null;

	let { opciones, mascota = {}, form = null, editing = false, embedded = false, action = undefined, onSaved = () => {}, onCancel = () => {} }: { opciones: Options; mascota?: Pet; form?: FormState; editing?: boolean; embedded?: boolean; action?: string; onSaved?: () => void | Promise<void>; onCancel?: () => void } = $props();
	const source = untrack(() => mascota);
	let owner = $state<Owner | null>(source.propietario ?? null);
	let ownerDecided = $state(untrack(() => editing || Boolean(source.propietario)));
	let ownerError = $state(false);
	let species = $state(source.fid_especies_animales ?? '');
	let classification = $state(source.fid_razas_animales ? `r:${source.fid_razas_animales}` : source.fid_subespecies_animales ? `s:${source.fid_subespecies_animales}` : '');
	let serviceAnimal = $state(source.animal_servicio ?? false);
	let emotionalSupport = $state(source.apoyo_emocional ?? false);
	let temperament = $state(source.fid_parametros_temperamento ?? '');
	let color = $state(source.fid_parametros_color ?? '');
	let photoError = $state(false);
	let photoPreview = $state(source.id_mascotas && source.foto_version ? `/media/pets/${source.id_mascotas}/${source.foto_version}` : '');
	let removePhoto = $state(false);
	let photoInput: HTMLInputElement;
	let objectUrl = '';
	let confirmSave = $state(false);
	let saving = $state(false);
	let petForm: HTMLFormElement;
	let resolveSave: (() => void) | null = null;
	const availableBreeds = $derived(opciones.razas.filter((item) => item.fid_especies_animales === species));
	const availableSubspecies = $derived(opciones.subespecies.filter((item) => item.fid_especies_animales === species));
	const classifications = $derived(availableBreeds.length
		? availableBreeds.map((item) => ({ value: `r:${item.id_razas_animales}`, label: item.nombre }))
		: availableSubspecies.map((item) => ({ value: `s:${item.id_subespecies_animales}`, label: item.nombre })));
	const breedId = $derived(classification.startsWith('r:') ? classification.slice(2) : '');
	const subspeciesId = $derived(classification.startsWith('s:') ? classification.slice(2) : '');
	const today = new Date().toISOString().slice(0, 10);

	function changeSpecies(value: string) { species = value; classification = ''; }
	function photoChanged(event: Event) { const file = (event.currentTarget as HTMLInputElement).files?.[0]; photoError = false; if (!file) return; if (objectUrl) URL.revokeObjectURL(objectUrl); objectUrl = URL.createObjectURL(file); photoPreview = objectUrl; removePhoto = false; }
	function removeSelectedPhoto() {
		if (objectUrl) URL.revokeObjectURL(objectUrl);
		objectUrl = '';
		photoInput.value = '';
		photoPreview = '';
		removePhoto = editing;
		photoError = false;
	}
	function askToSave() {
		if (saving) return;
		ownerError = !ownerDecided;
		if (ownerError || !petForm.reportValidity()) return;
		confirmSave = true;
	}
	$effect(() => { if (ownerDecided) ownerError = false; });
	function submitPet(): Promise<void> { return new Promise((resolve) => { resolveSave = resolve; petForm.requestSubmit(); }); }

	const save: SubmitFunction = () => {
		if (saving) return () => {};
		saving = true;
		return async ({ result, update }) => {
			if (embedded && result.type === 'success') { toast.success(i18n.t('notifications.type.success'), { description: i18n.t(editing ? 'pets.updated' : 'pets.created') }); resolveSave?.(); resolveSave = null; saving = false; await onSaved(); return; }
			if (result.type === 'redirect') { toast.success(i18n.t('notifications.type.success'), { description: i18n.t(editing ? 'pets.updated' : 'pets.created') }); resolveSave?.(); saving = false; await goto(result.location); return; }
			await update({ reset: false, invalidateAll: false });
			const message = result.type === 'failure' && typeof result.data?.petMessage === 'string' ? result.data.petMessage : 'pets.saveError';
			toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); resolveSave?.(); resolveSave = null; saving = false;
		};
	};
</script>

<form bind:this={petForm} method="POST" {action} enctype="multipart/form-data" use:enhance={save} aria-busy={saving} class="flex w-full flex-col gap-4">
	{#if form?.petMessage}<div role="alert" class="flex gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"><Icon name="circle-alert" size={18} />{i18n.t(form.petMessage)}</div>{/if}
	<Card padding="md"><div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('pets.owner')}<span class="ml-0.5 text-error" aria-hidden="true">*</span></h2><p class="mt-0.5 text-sm text-steel">{i18n.t('pets.ownerHelp')}</p></div><OwnerPicker bind:owner bind:decided={ownerDecided} error={ownerError} /></Card>

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('pets.identification')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('pets.identificationHelp')}</p></div>
		<div class="grid grid-cols-[176px_minmax(0,1fr)] gap-5 max-[560px]:grid-cols-1">
			<div class="flex w-40 flex-col items-center gap-3 max-[560px]:mx-auto">
				<div class="relative size-[130px]">
					<div class="size-full overflow-hidden rounded-2xl border {photoError ? 'border-error' : 'border-hairline'} bg-surface">
						{#if photoPreview}<img src={photoPreview} alt="" class="size-full object-cover" />{:else}<span class="grid size-full place-items-center text-stone"><Icon name="paw-print" size={36} /></span>{/if}
					</div>
					<DropdownMenu.Root><DropdownMenu.Trigger type="button" aria-label={i18n.t('pets.editPhoto')} class="absolute -bottom-2 -right-2 grid size-9 place-items-center rounded-full border-[3px] border-canvas bg-primary text-primary-foreground shadow-soft hover:bg-primary/80"><Icon name="pencil" size={15} /></DropdownMenu.Trigger><DropdownMenu.Content side="right" align="start" class="w-40"><DropdownMenu.Item onSelect={() => photoInput.click()}><Icon name="upload" size={15} />{i18n.t('pets.uploadPhoto')}</DropdownMenu.Item><DropdownMenu.Item variant="destructive" disabled={!photoPreview} onSelect={removeSelectedPhoto}><Icon name="trash-2" size={15} />{i18n.t('pets.removePhoto')}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>
					<input bind:this={photoInput} class="sr-only" type="file" name="foto" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onchange={photoChanged} />
					<input type="hidden" name="eliminar_foto" value={removePhoto ? 'true' : 'false'} />
				</div>
				<p class="text-center text-[11px] leading-4 text-stone">{i18n.t('pets.photoHelp')}</p>
			</div>
			<div class="grid content-start grid-cols-12 gap-3"><div class="col-span-6 max-[760px]:col-span-12"><Input name="nombre" label={i18n.t('pets.name')} icon="paw-print" value={source.nombre ?? ''} minlength={1} maxlength={120} required /></div><div class="col-span-6 max-[760px]:col-span-12"><Input name="codigo_chip" label={i18n.t('pets.chip')} icon="hash" value={source.codigo_chip ?? ''} maxlength={50} /></div><div class="col-span-12 flex flex-wrap gap-2 pt-1"><div class="inline-flex min-h-10 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2"><span class="text-xs font-medium text-ink">{i18n.t('pets.serviceAnimal')}</span><Switch name="animal_servicio" bind:checked={serviceAnimal} label={i18n.t('pets.serviceAnimal')} /></div><div class="inline-flex min-h-10 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2"><span class="text-xs font-medium text-ink">{i18n.t('pets.emotionalSupport')}</span><Switch name="apoyo_emocional" bind:checked={emotionalSupport} label={i18n.t('pets.emotionalSupport')} /></div></div></div>
		</div>
	</Card>

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('pets.classification')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('pets.classificationHelp')}</p></div>
		<input type="hidden" name="fid_razas_animales" value={breedId} /><input type="hidden" name="fid_subespecies_animales" value={subspeciesId} />
		<div class="grid grid-cols-12 gap-3"><div class="col-span-4 max-[820px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_especies_animales" label={i18n.t('pets.species')} icon="paw-print" bind:value={species} onchange={(event) => changeSpecies(event.currentTarget.value)} required><option value="">{i18n.t('pets.select')}</option>{#each opciones.especies as item (item.id_especies_animales)}<option value={item.id_especies_animales}>{item.nombre}</option>{/each}</Select></div><div class="col-span-4 max-[820px]:col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('pets.subspecies')} bind:value={classification} disabled={!species}><option value="">{i18n.t('pets.select')}</option>{#each classifications as item (item.value)}<option value={item.value}>{item.label}</option>{/each}</Select></div><div class="col-span-4 max-[820px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_parametros_genero" label={i18n.t('pets.gender')} icon="venus-and-mars" value={source.fid_parametros_genero ?? ''} required><option value="">{i18n.t('pets.select')}</option>{#each opciones.generos as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div><div class="col-span-4 max-[820px]:col-span-6 max-[560px]:col-span-12"><ColorSelect name="fid_parametros_color" label={i18n.t('pets.color')} options={opciones.colores} bind:value={color} placeholder={i18n.t('pets.select')} /></div><div class="col-span-4 max-[820px]:col-span-6 max-[560px]:col-span-12"><Input name="fecha_nacimiento" type="date" label={i18n.t('pets.birthDate')} value={source.fecha_nacimiento ? String(source.fecha_nacimiento).slice(0, 10) : ''} min="1900-01-01" max={today} /></div><div class="col-span-2 max-[820px]:col-span-3 max-[560px]:col-span-6"><Input name="peso" type="number" label={i18n.t('pets.weight')} value={source.peso ?? ''} min="0.001" max="99999.999" step="0.001" /></div><div class="col-span-2 max-[820px]:col-span-3 max-[560px]:col-span-6"><Select name="fid_parametros_unidad_peso" label={i18n.t('pets.weightUnit')} value={source.fid_parametros_unidad_peso ?? opciones.unidad_peso_predeterminada ?? ''}><option value="">{i18n.t('pets.select')}</option>{#each opciones.unidades_peso as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div></div>
	</Card>

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('pets.clinicalProfile')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('pets.clinicalProfileHelp')}</p></div>
		<div class="grid grid-cols-12 gap-3"><div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_parametros_talla" label={i18n.t('pets.size')} value={source.fid_parametros_talla ?? ''}><option value="">{i18n.t('pets.select')}</option>{#each opciones.tallas as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div><div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_parametros_estado_reproductivo" label={i18n.t('pets.reproductiveStatus')} value={source.fid_parametros_estado_reproductivo ?? ''}><option value="">{i18n.t('pets.select')}</option>{#each opciones.estados_reproductivos as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div><div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_parametros_temperamento" label={i18n.t('pets.temperament')} bind:value={temperament}><option value="">{i18n.t('pets.select')}</option>{#each opciones.temperamentos as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div><div class="col-span-12"><Input name="alimento" label={i18n.t('pets.food')} value={source.alimento ?? ''} maxlength={250} /></div></div>
	</Card>

	<div class="flex justify-end gap-3 border-t border-hairline pt-4 max-[480px]:flex-col-reverse">{#if embedded}<Button type="button" variant="secondary" disabled={saving} onclick={onCancel}>{i18n.t('pets.cancel')}</Button>{:else}<Button href="/clinic/pets" variant="secondary" disabled={saving}>{i18n.t('pets.cancel')}</Button>{/if}<Button type="button" loading={saving} onclick={askToSave}><Icon name="save" size={17} />{i18n.t(editing ? 'pets.saveChanges' : 'pets.create')}</Button></div>
</form>

<ConfirmationDialog bind:open={confirmSave} variant="info" icon="save" title={i18n.t(editing ? 'pets.confirmEditTitle' : 'pets.confirmCreateTitle')} description={i18n.t(editing ? 'pets.confirmEditDescription' : 'pets.confirmCreateDescription')} confirmLabel={i18n.t(editing ? 'pets.saveChanges' : 'pets.create')} cancelLabel={i18n.t('pets.cancel')} confirmDisabled={saving} onConfirm={submitPet} />
