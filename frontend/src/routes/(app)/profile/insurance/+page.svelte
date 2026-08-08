<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, Input, ProfileCollectionShell, Select, i18n, parameterLabel } from '$lib';

	let { data }: PageProps = $props();
	type Seguro = (typeof data.seguros)[number];
	type Maestro = (typeof data.catalogo)[number];

	let seguros = $derived<Seguro[]>(data.seguros);
	let seleccion = $state('');
	let nombreOtro = $state('');
	let numero = $state('');
	let objetivo = $state<Seguro | null>(null);
	let edicionMaestro = $state('');
	let edicionOtro = $state('');
	let edicionNumero = $state('');
	let confirmacionAgregar = $state(false);
	let confirmacionEditar = $state(false);
	let confirmacionEliminar = $state(false);
	let procesando = $state(false);
	let formularioAgregar: HTMLFormElement;
	let formularioEditar: HTMLFormElement;
	let formularioEliminar: HTMLFormElement;
	let resolver: (() => void) | null = null;
	let rechazar: ((error: Error) => void) | null = null;

	const maestroSeleccionado = $derived(data.catalogo.find((item) => item.codigo === seleccion));
	const maestroEdicion = $derived(data.catalogo.find((item) => item.codigo === edicionMaestro));
	const agregarValido = $derived(!!seleccion && !!numero.trim() && (!maestroSeleccionado?.permite_otro || nombreOtro.trim().length >= 2));
	const editarValido = $derived(!!objetivo && !!edicionMaestro && !!edicionNumero.trim() && (!maestroEdicion?.permite_otro || edicionOtro.trim().length >= 2) && (edicionMaestro !== objetivo?.codigo_seguro || edicionOtro.trim().toLocaleLowerCase() !== (objetivo?.nombre_otro ?? '').toLocaleLowerCase() || edicionNumero.trim().toLocaleLowerCase() !== (objetivo?.numero_seguro ?? '').toLocaleLowerCase()));

	function nombreCompania(item: Seguro) {
		return item.seguro.permite_otro ? (item.nombre_otro ?? parameterLabel(item.seguro)) : parameterLabel(item.seguro);
	}

	function procesarResultado(result: { type: string; status?: number; data?: Record<string, unknown> }) {
		const respuesta = result.data as { insuranceMessage?: string; seguros?: Seguro[] } | undefined;
		if (result.type === 'success' && respuesta?.seguros) {
			seguros = respuesta.seguros;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t(respuesta.insuranceMessage ?? 'profile.insurance.saved') });
			resolver?.();
			return true;
		}
		const description = i18n.t(respuesta?.insuranceMessage ?? 'profile.insurance.saveError');
		if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description });
		else toast.error(i18n.t('notifications.type.error'), { description });
		rechazar?.(new Error('insurance-request-failed'));
		return false;
	}

	const mejorar = (limpiar: boolean): SubmitFunction => () => {
		procesando = true;
		return async ({ result }) => {
			const ok = procesarResultado(result);
			if (ok && limpiar) {
				seleccion = '';
				nombreOtro = '';
				numero = '';
			}
			procesando = false;
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

	function pedirEdicion(item: Seguro) {
		objetivo = item;
		edicionMaestro = item.codigo_seguro;
		edicionOtro = item.nombre_otro ?? '';
		edicionNumero = item.numero_seguro;
		confirmacionEditar = true;
	}

	function pedirEliminacion(item: Seguro) {
		objetivo = item;
		confirmacionEliminar = true;
	}

	$effect(() => {
		if (!maestroSeleccionado?.permite_otro) nombreOtro = '';
	});
	$effect(() => {
		if (!maestroEdicion?.permite_otro) edicionOtro = '';
	});
	$effect(() => {
		if (!confirmacionEditar && !confirmacionEliminar && !procesando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.insurance')} · Sumaq System</title></svelte:head>

<ProfileCollectionShell
	title={i18n.t('profile.tab.insurance')}
	subtitle={i18n.t('profile.professional.insuranceHint')}
	icon="shield-plus"
	hasItems={seguros.length > 0}
	emptyTitle={i18n.t('profile.insurance.emptyTitle')}
	emptyHint={i18n.t('profile.insurance.emptyHint')}
>
	{#snippet children()}
		<form bind:this={formularioAgregar} method="POST" action="?/add" use:enhance={mejorar(true)} class="contents">
			<div class="col-span-4 max-[760px]:col-span-12">
				<Select label={i18n.t('profile.insurance.provider')} icon="building-2" name="codigo_seguro" bind:value={seleccion} disabled={procesando} required>
					<option value="">{i18n.t('profile.insurance.selectProvider')}</option>
					{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}
				</Select>
			</div>
			{#if maestroSeleccionado?.permite_otro}
				<div class="col-span-3 max-[760px]:col-span-12">
					<Input label={i18n.t('profile.insurance.otherProvider')} icon="building-2" name="nombre_otro" bind:value={nombreOtro} minlength={2} maxlength={120} disabled={procesando} required />
				</div>
			{/if}
			<div class="col-span-3 max-[760px]:col-span-12">
				<Input label={i18n.t('profile.insurance.number')} icon="shield" name="numero_seguro" bind:value={numero} maxlength={80} disabled={procesando} required />
			</div>
			<div class="col-span-2 flex items-end max-[760px]:col-span-12">
				<Button type="button" loading={procesando} disabled={!agregarValido || procesando} onclick={() => (confirmacionAgregar = true)}>
					{#if !procesando}<Icon name="plus" size={18} />{/if}{i18n.t('profile.insurance.add')}
				</Button>
			</div>
		</form>
	{/snippet}

	{#snippet content()}
		<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
			{#each seguros as item (item.id_personas_seguros)}
				<li class="flex items-center gap-4 px-4 py-3.5 max-[640px]:items-start">
					<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="shield-check" size={19} /></span>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-semibold text-ink">{nombreCompania(item)}</p>
						<p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.insurance.number')}: {item.numero_seguro}</p>
					</div>
					<div class="flex shrink-0 gap-2">
						<Button size="sm" type="button" disabled={procesando} onclick={() => pedirEdicion(item)}><Icon name="pencil" size={16} /> {i18n.t('profile.insurance.edit')}</Button>
						<Button variant="secondary" size="sm" type="button" class="!border-error !bg-transparent !text-error hover:!border-error hover:!bg-transparent hover:!text-error" disabled={procesando} onclick={() => pedirEliminacion(item)}><Icon name="trash-2" size={16} /> {i18n.t('profile.insurance.delete')}</Button>
					</div>
				</li>
			{/each}
		</ul>
	{/snippet}
</ProfileCollectionShell>

<ConfirmationDialog bind:open={confirmacionAgregar} variant="info" icon="shield-plus" title={i18n.t('profile.insurance.addTitle')} description={i18n.t('profile.insurance.addDescription')} confirmLabel={i18n.t('profile.insurance.confirmAdd')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!agregarValido || procesando} onConfirm={() => enviar(formularioAgregar)} />

<ConfirmationDialog bind:open={confirmacionEditar} variant="info" icon="pencil" title={i18n.t('profile.insurance.editTitle')} description={i18n.t('profile.insurance.editDescription')} confirmLabel={i18n.t('profile.insurance.save')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!editarValido || procesando} onConfirm={() => enviar(formularioEditar)}>
	<div class="flex flex-col gap-4 text-left">
		<Select label={i18n.t('profile.insurance.provider')} icon="building-2" bind:value={edicionMaestro} disabled={procesando} required>
			{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}
		</Select>
		{#if maestroEdicion?.permite_otro}<Input label={i18n.t('profile.insurance.otherProvider')} icon="building-2" bind:value={edicionOtro} minlength={2} maxlength={120} disabled={procesando} required />{/if}
		<Input label={i18n.t('profile.insurance.number')} icon="shield" bind:value={edicionNumero} maxlength={80} disabled={procesando} required />
	</div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEliminar} variant="danger" icon="trash-2" title={i18n.t('profile.insurance.deleteTitle')} description={i18n.t('profile.insurance.deleteDescription')} confirmLabel={i18n.t('profile.insurance.delete')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!objetivo || procesando} onConfirm={() => enviar(formularioEliminar)}>
	{#if objetivo}<div class="rounded-md border border-hairline bg-surface/70 p-3 text-left"><p class="text-sm font-semibold text-ink">{nombreCompania(objetivo)}</p><p class="mt-1 text-xs text-steel">{objetivo.numero_seguro}</p></div>{/if}
</ConfirmationDialog>

<form bind:this={formularioEditar} method="POST" action="?/edit" use:enhance={mejorar(false)} class="hidden">
	<input type="hidden" name="id_personas_seguros" value={objetivo?.id_personas_seguros ?? ''} />
	<input type="hidden" name="codigo_seguro" value={edicionMaestro} />
	<input type="hidden" name="nombre_otro" value={edicionOtro} />
	<input type="hidden" name="numero_seguro" value={edicionNumero} />
</form>
<form bind:this={formularioEliminar} method="POST" action="?/delete" use:enhance={mejorar(false)} class="hidden">
	<input type="hidden" name="id_personas_seguros" value={objetivo?.id_personas_seguros ?? ''} />
</form>
