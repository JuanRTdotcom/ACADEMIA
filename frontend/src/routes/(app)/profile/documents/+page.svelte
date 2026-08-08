<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, Input, ProfileCollectionShell, Select, i18n, parameterLabel } from '$lib';

	let { data }: PageProps = $props();
	type Documento = (typeof data.documentos)[number];

	let documentos = $derived<Documento[]>(data.documentos);
	let tipo = $state('');
	let numero = $state('');
	let objetivo = $state<Documento | null>(null);
	let tipoEdicion = $state('');
	let numeroEdicion = $state('');
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

	const puedeAgregar = $derived(Boolean(tipo) && /^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,39}$/.test(numero.trim()) && !agregando);
	const puedeEditar = $derived(Boolean(objetivo) && Boolean(tipoEdicion) && /^[A-Za-z0-9][A-Za-z0-9 .\-/]{0,39}$/.test(numeroEdicion.trim()) && !editando && (tipoEdicion !== objetivo?.codigo_tipo_documento || numeroEdicion.trim().toLocaleUpperCase() !== objetivo?.numero_documento.toLocaleUpperCase()));
	const maestroSeleccionado = $derived(data.catalogo.find((item) => item.codigo === tipo));

	function procesarResultado(result: { type: string; status?: number; data?: Record<string, unknown> }) {
		const respuesta = result.data as { documentMessage?: string; documentos?: Documento[] } | undefined;
		if (result.type === 'success' && respuesta?.documentos) {
			documentos = respuesta.documentos;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t(respuesta.documentMessage ?? 'profile.documents.added') });
			resolver?.();
			return true;
		}
		const description = i18n.t(respuesta?.documentMessage ?? 'profile.documents.saveError');
		if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description });
		else toast.error(i18n.t('notifications.type.error'), { description });
		rechazar?.(new Error('document-request-failed'));
		return false;
	}

	const mejorarAgregar: SubmitFunction = () => {
		agregando = true;
		return async ({ result }) => {
			if (procesarResultado(result)) {
				tipo = '';
				numero = '';
			}
			agregando = false;
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

	const mejorarEditar: SubmitFunction = () => {
		editando = true;
		return async ({ result }) => {
			procesarResultado(result);
			editando = false;
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

	function pedirEliminacion(item: Documento) {
		objetivo = item;
		confirmacionEliminar = true;
	}

	function pedirEdicion(item: Documento) {
		objetivo = item;
		tipoEdicion = item.codigo_tipo_documento;
		numeroEdicion = item.numero_documento;
		confirmacionEditar = true;
	}

	$effect(() => {
		if (!confirmacionEditar && !confirmacionEliminar && !editando && !eliminando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.documents')} · Sumaq System</title></svelte:head>

<ProfileCollectionShell title={i18n.t('profile.tab.documents')} subtitle={i18n.t('profile.professional.documentsHint')} icon="files" hasItems={documentos.length > 0} emptyTitle={i18n.t('profile.documents.emptyTitle')} emptyHint={i18n.t('profile.documents.emptyHint')}>
	{#snippet children()}
		<form bind:this={formularioAgregar} method="POST" action="?/add" use:enhance={mejorarAgregar} class="contents">
			<div class="col-span-4 max-[760px]:col-span-12">
				<Select label={i18n.t('profile.documents.type')} icon="id-card" name="codigo_tipo_documento" bind:value={tipo} disabled={agregando || editando || eliminando} required>
					<option value="">{i18n.t('profile.documents.selectType')}</option>
					{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}
				</Select>
			</div>
			<div class="col-span-4 max-[760px]:col-span-12"><Input label={i18n.t('profile.documents.number')} icon="contact" name="numero_documento" bind:value={numero} maxlength={40} disabled={agregando || editando || eliminando} required /></div>
			<div class="col-span-2 flex items-end max-[760px]:col-span-12"><Button type="button" loading={agregando} disabled={!puedeAgregar || editando || eliminando} onclick={() => (confirmacionAgregar = true)}>{#if !agregando}<Icon name="plus" size={18} />{/if}{i18n.t('profile.documents.add')}</Button></div>
		</form>
	{/snippet}

	{#snippet content()}
		<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
			{#each documentos as item (item.id_personas_documentos)}
				<li class="flex items-center gap-4 px-4 py-3.5">
					<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="id-card" size={19} /></span>
					<div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-ink">{parameterLabel(item.tipo_documento)}</p><p class="mt-0.5 text-[13px] text-steel">{item.numero_documento}</p></div>
					<div class="flex shrink-0 gap-2"><Button size="sm" type="button" disabled={agregando || editando || eliminando} onclick={() => pedirEdicion(item)}><Icon name="pencil" size={16} /> {i18n.t('profile.documents.edit')}</Button><Button variant="secondary" size="sm" type="button" class="!border-error !bg-transparent !text-error hover:!border-error hover:!bg-transparent hover:!text-error" disabled={agregando || editando || eliminando} onclick={() => pedirEliminacion(item)}><Icon name="trash-2" size={16} /> {i18n.t('profile.documents.delete')}</Button></div>
				</li>
			{/each}
		</ul>
	{/snippet}
</ProfileCollectionShell>

<ConfirmationDialog bind:open={confirmacionAgregar} variant="info" icon="id-card" title={i18n.t('profile.documents.addTitle')} description={i18n.t('profile.documents.addDescription')} confirmLabel={i18n.t('profile.documents.add')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeAgregar} onConfirm={() => enviar(formularioAgregar)}>
	{#if maestroSeleccionado}<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-primary"><Icon name="id-card" size={18} /></span><div><p class="text-sm font-semibold text-ink">{parameterLabel(maestroSeleccionado)}</p><p class="text-xs text-steel">{numero.trim().toUpperCase()}</p></div></div>{/if}
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEditar} variant="info" icon="pencil" title={i18n.t('profile.documents.editTitle')} description={i18n.t('profile.documents.editDescription')} confirmLabel={i18n.t('profile.documents.save')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeEditar} onConfirm={() => enviar(formularioEditar)}>
	<div class="flex flex-col gap-4 text-left"><Select label={i18n.t('profile.documents.type')} icon="id-card" bind:value={tipoEdicion} disabled={editando} required>{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select><Input label={i18n.t('profile.documents.number')} icon="contact" bind:value={numeroEdicion} maxlength={40} disabled={editando} required /></div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEliminar} variant="danger" icon="trash-2" title={i18n.t('profile.documents.deleteTitle')} description={i18n.t('profile.documents.deleteDescription')} confirmLabel={i18n.t('profile.documents.delete')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!objetivo || eliminando} onConfirm={() => enviar(formularioEliminar)}>
	{#if objetivo}<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-error"><Icon name="id-card" size={18} /></span><div><p class="text-sm font-semibold text-ink">{parameterLabel(objetivo.tipo_documento)}</p><p class="text-xs text-steel">{objetivo.numero_documento}</p></div></div>{/if}
</ConfirmationDialog>

<form bind:this={formularioEditar} method="POST" action="?/edit" use:enhance={mejorarEditar} class="hidden"><input type="hidden" name="id_personas_documentos" value={objetivo?.id_personas_documentos ?? ''} /><input type="hidden" name="codigo_tipo_documento" value={tipoEdicion} /><input type="hidden" name="numero_documento" value={numeroEdicion} /></form>
<form bind:this={formularioEliminar} method="POST" action="?/delete" use:enhance={mejorarEliminar} class="hidden"><input type="hidden" name="id_personas_documentos" value={objetivo?.id_personas_documentos ?? ''} /></form>
