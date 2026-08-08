<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, Input, ProfileCollectionShell, Select, i18n, parameterLabel } from '$lib';

	let { data }: PageProps = $props();
	type Hobby = (typeof data.hobbies)[number];
	const OTROS = 'otros';

	let hobbies = $derived<Hobby[]>(data.hobbies);
	let hobbyCodigo = $state('');
	let hobbyOtro = $state('');
	let frecuenciaCodigo = $state('');
	let objetivo = $state<Hobby | null>(null);
	let hobbyCodigoEdicion = $state('');
	let hobbyOtroEdicion = $state('');
	let frecuenciaCodigoEdicion = $state('');
	let confirmacionAgregar = $state(false);
	let confirmacionEditar = $state(false);
	let confirmacionEliminar = $state(false);
	let agregando = $state(false);
	let editando = $state(false);
	let eliminando = $state(false);
	let formularioAgregar: HTMLFormElement;
	let formularioEditar: HTMLFormElement;
	let formularioEliminar: HTMLFormElement;
	let resolver: (() => void) | null = null;
	let rechazar: ((error: Error) => void) | null = null;

	const esOtros = $derived(hobbyCodigo === OTROS);
	const esOtrosEdicion = $derived(hobbyCodigoEdicion === OTROS);
	const puedeAgregar = $derived(Boolean(hobbyCodigo) && Boolean(frecuenciaCodigo) && (!esOtros || hobbyOtro.trim().length >= 2) && !agregando);
	const puedeEditar = $derived(Boolean(objetivo) && Boolean(hobbyCodigoEdicion) && Boolean(frecuenciaCodigoEdicion) && (!esOtrosEdicion || hobbyOtroEdicion.trim().length >= 2) && !editando && (hobbyCodigoEdicion !== objetivo?.codigo_hobby || hobbyOtroEdicion.trim().toLocaleLowerCase() !== (objetivo?.hobby_personalizado ?? '').toLocaleLowerCase() || frecuenciaCodigoEdicion !== objetivo?.codigo_frecuencia));
	const etiquetaHobby = $derived(esOtros ? hobbyOtro.trim() : (() => { const item = data.catalogoHobbies.find((h) => h.codigo === hobbyCodigo); return item ? parameterLabel(item) : ''; })());
	const etiquetaFrecuencia = $derived((() => { const item = data.catalogoFrecuencias.find((f) => f.codigo === frecuenciaCodigo); return item ? parameterLabel(item) : ''; })());
	const nombreHobby = (item: Hobby) => item.codigo_hobby === OTROS && item.hobby_personalizado ? item.hobby_personalizado : parameterLabel(item.hobby);

	function procesarResultado(result: { type: string; status?: number; data?: Record<string, unknown> }) {
		const respuesta = result.data as { hobbyMessage?: string; hobbies?: Hobby[] } | undefined;
		if (result.type === 'success' && respuesta?.hobbies) {
			hobbies = respuesta.hobbies;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t(respuesta.hobbyMessage ?? 'profile.hobbies.added') });
			resolver?.();
			return true;
		}
		const description = i18n.t(respuesta?.hobbyMessage ?? 'profile.hobbies.saveError');
		if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description });
		else toast.error(i18n.t('notifications.type.error'), { description });
		rechazar?.(new Error('hobby-request-failed'));
		return false;
	}

	const mejorarAgregar: SubmitFunction = () => {
		agregando = true;
		return async ({ result }) => {
			if (procesarResultado(result)) {
				hobbyCodigo = '';
				hobbyOtro = '';
				frecuenciaCodigo = '';
			}
			agregando = false;
			resolver = null;
			rechazar = null;
		};
	};

	const mejorarEditar: SubmitFunction = () => {
		editando = true;
		return async ({ result }) => {
			procesarResultado(result);
			editando = false;
			resolver = null;
			rechazar = null;
		};
	};

	const mejorarEliminar: SubmitFunction = () => {
		eliminando = true;
		return async ({ result }) => {
			procesarResultado(result);
			eliminando = false;
			resolver = null;
			rechazar = null;
		};
	};

	function enviar(formulario: HTMLFormElement): Promise<void> {
		return new Promise((resolve, reject) => {
			resolver = resolve;
			rechazar = reject;
			formulario.requestSubmit();
		});
	}

	function pedirEdicion(item: Hobby) {
		objetivo = item;
		hobbyCodigoEdicion = item.codigo_hobby;
		hobbyOtroEdicion = item.hobby_personalizado ?? '';
		frecuenciaCodigoEdicion = item.codigo_frecuencia;
		confirmacionEditar = true;
	}

	function pedirEliminacion(item: Hobby) {
		objetivo = item;
		confirmacionEliminar = true;
	}

	$effect(() => {
		if (!esOtrosEdicion) hobbyOtroEdicion = '';
	});
	$effect(() => {
		if (!confirmacionEditar && !confirmacionEliminar && !editando && !eliminando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.hobbies')} · Sumaq System</title></svelte:head>

<ProfileCollectionShell title={i18n.t('profile.tab.hobbies')} subtitle={i18n.t('profile.professional.hobbiesHint')} icon="dumbbell" hasItems={hobbies.length > 0} emptyTitle={i18n.t('profile.hobbies.emptyTitle')} emptyHint={i18n.t('profile.hobbies.emptyHint')}>
	{#snippet children()}
		<form bind:this={formularioAgregar} method="POST" action="?/add" use:enhance={mejorarAgregar} class="contents">
			<div class="col-span-4 max-[760px]:col-span-12">
				<Select label={i18n.t('profile.hobbies.hobbyLabel')} icon="dumbbell" name="codigo_hobby" bind:value={hobbyCodigo} disabled={agregando || editando || eliminando} required>
					<option value="">{i18n.t('profile.hobbies.hobbyPlaceholder')}</option>
					{#each data.catalogoHobbies as hobby (hobby.codigo)}<option value={hobby.codigo}>{parameterLabel(hobby)}</option>{/each}
				</Select>
			</div>
			{#if esOtros}
				<div class="col-span-3 max-[760px]:col-span-12"><Input label={i18n.t('profile.hobbies.customLabel')} icon="pencil" name="hobby_personalizado" bind:value={hobbyOtro} placeholder={i18n.t('profile.hobbies.customPlaceholder')} minlength={2} maxlength={100} disabled={agregando} required /></div>
			{/if}
			<div class="col-span-3 max-[760px]:col-span-12">
				<Select label={i18n.t('profile.hobbies.frequencyLabel')} icon="clock" name="codigo_frecuencia" bind:value={frecuenciaCodigo} disabled={agregando || editando || eliminando} required>
					<option value="">{i18n.t('profile.hobbies.frequencyPlaceholder')}</option>
					{#each data.catalogoFrecuencias as frecuencia (frecuencia.codigo)}<option value={frecuencia.codigo}>{parameterLabel(frecuencia)}</option>{/each}
				</Select>
			</div>
			<div class="col-span-2 flex items-end max-[760px]:col-span-12"><Button type="button" loading={agregando} disabled={!puedeAgregar} onclick={() => (confirmacionAgregar = true)}>{#if !agregando}<Icon name="plus" size={18} />{/if}{i18n.t('profile.hobbies.add')}</Button></div>
		</form>
	{/snippet}

	{#snippet content()}
		<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
			{#each hobbies as item (item.id_personas_hobbies)}
				<li class="flex items-center gap-4 px-4 py-3.5">
					<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="dumbbell" size={19} /></span>
					<div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-ink">{nombreHobby(item)}</p><p class="mt-0.5 inline-flex items-center gap-1 text-xs text-steel"><Icon name="clock" size={12} /> {parameterLabel(item.frecuencia)}</p></div>
					<div class="flex shrink-0 gap-2">
						<Button size="sm" type="button" disabled={agregando || editando || eliminando} onclick={() => pedirEdicion(item)}><Icon name="pencil" size={16} /> {i18n.t('profile.hobbies.edit')}</Button>
						<Button variant="secondary" size="sm" type="button" class="!border-error !bg-transparent !text-error hover:!border-error hover:!bg-transparent hover:!text-error" disabled={agregando || editando || eliminando} onclick={() => pedirEliminacion(item)}><Icon name="trash-2" size={16} /> {i18n.t('profile.hobbies.delete')}</Button>
					</div>
				</li>
			{/each}
		</ul>
	{/snippet}
</ProfileCollectionShell>

<ConfirmationDialog bind:open={confirmacionAgregar} variant="info" icon="dumbbell" title={i18n.t('profile.hobbies.addTitle')} description={i18n.t('profile.hobbies.addDescription')} confirmLabel={i18n.t('profile.hobbies.add')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeAgregar} onConfirm={() => enviar(formularioAgregar)}>
	<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-primary"><Icon name="dumbbell" size={18} /></span><div class="min-w-0"><p class="truncate text-sm font-semibold text-ink">{etiquetaHobby}</p><p class="text-xs text-steel">{etiquetaFrecuencia}</p></div></div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEditar} variant="info" icon="pencil" title={i18n.t('profile.hobbies.editTitle')} description={i18n.t('profile.hobbies.editDescription')} confirmLabel={i18n.t('profile.hobbies.save')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeEditar} onConfirm={() => enviar(formularioEditar)}>
	<div class="flex flex-col gap-4 text-left">
		<Select label={i18n.t('profile.hobbies.hobbyLabel')} icon="dumbbell" bind:value={hobbyCodigoEdicion} disabled={editando} required>{#each data.catalogoHobbies as hobby (hobby.codigo)}<option value={hobby.codigo}>{parameterLabel(hobby)}</option>{/each}</Select>
		{#if esOtrosEdicion}<Input label={i18n.t('profile.hobbies.customLabel')} icon="pencil" bind:value={hobbyOtroEdicion} minlength={2} maxlength={100} disabled={editando} required />{/if}
		<Select label={i18n.t('profile.hobbies.frequencyLabel')} icon="clock" bind:value={frecuenciaCodigoEdicion} disabled={editando} required>{#each data.catalogoFrecuencias as frecuencia (frecuencia.codigo)}<option value={frecuencia.codigo}>{parameterLabel(frecuencia)}</option>{/each}</Select>
	</div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEliminar} variant="danger" icon="trash-2" title={i18n.t('profile.hobbies.deleteTitle')} description={i18n.t('profile.hobbies.deleteDescription')} confirmLabel={i18n.t('profile.hobbies.delete')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!objetivo || eliminando} onConfirm={() => enviar(formularioEliminar)}>
	{#if objetivo}<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-error"><Icon name="dumbbell" size={18} /></span><div class="min-w-0"><p class="truncate text-sm font-semibold text-ink">{nombreHobby(objetivo)}</p><p class="text-xs text-steel">{parameterLabel(objetivo.frecuencia)}</p></div></div>{/if}
</ConfirmationDialog>

<form bind:this={formularioEditar} method="POST" action="?/edit" use:enhance={mejorarEditar} class="hidden">
	<input type="hidden" name="id_personas_hobbies" value={objetivo?.id_personas_hobbies ?? ''} /><input type="hidden" name="codigo_hobby" value={hobbyCodigoEdicion} /><input type="hidden" name="hobby_personalizado" value={hobbyOtroEdicion} /><input type="hidden" name="codigo_frecuencia" value={frecuenciaCodigoEdicion} />
</form>
<form bind:this={formularioEliminar} method="POST" action="?/delete" use:enhance={mejorarEliminar} class="hidden"><input type="hidden" name="id_personas_hobbies" value={objetivo?.id_personas_hobbies ?? ''} /></form>
