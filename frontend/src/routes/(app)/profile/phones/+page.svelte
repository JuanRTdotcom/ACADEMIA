<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, Input, ProfileCollectionShell, Select, Switch, i18n, parameterLabel } from '$lib';

	let { data }: PageProps = $props();
	type Telefono = (typeof data.telefonos)[number];

	let telefonos = $derived<Telefono[]>(data.telefonos);
	let tipo = $state('');
	let numero = $state('');
	let titular = $state('');
	let emergencia = $state(false);
	let objetivo = $state<Telefono | null>(null);
	let tipoEdicion = $state('');
	let numeroEdicion = $state('');
	let titularEdicion = $state('');
	let emergenciaEdicion = $state(false);
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

	const numeroValido = (valor: string) => /^\+?[0-9][0-9\s().-]{5,29}$/.test(valor.trim());
	const titularValido = (valor: string) => /^[\p{L}\p{N}][\p{L}\p{N}\s.'-]{1,119}$/u.test(valor.trim());
	const puedeAgregar = $derived(Boolean(tipo) && numeroValido(numero) && titularValido(titular) && !agregando);
	const puedeEditar = $derived(Boolean(objetivo) && Boolean(tipoEdicion) && numeroValido(numeroEdicion) && titularValido(titularEdicion) && !editando && (tipoEdicion !== objetivo?.codigo_tipo_telefono || numeroEdicion.trim() !== objetivo?.numero || titularEdicion.trim().toLocaleLowerCase() !== objetivo?.titular.toLocaleLowerCase() || emergenciaEdicion !== objetivo?.es_emergencia));
	const maestroSeleccionado = $derived(data.catalogo.find((item) => item.codigo === tipo));

	/** Agrupa móviles desde la derecha sin alterar el valor guardado o enviado. */
	function numeroParaMostrar(valor: string, codigoTipo: string) {
		if (codigoTipo !== 'movil') return valor;

		const digitos = valor.replace(/\D/g, '');
		if (!digitos) return valor;

		const grupos: string[] = [];
		for (let fin = digitos.length; fin > 0; fin -= 3) {
			grupos.unshift(digitos.slice(Math.max(0, fin - 3), fin));
		}
		return `${valor.trim().startsWith('+') ? '+' : ''}${grupos.join(' ')}`;
	}

	function procesarResultado(result: { type: string; status?: number; data?: Record<string, unknown> }) {
		const respuesta = result.data as { phoneMessage?: string; telefonos?: Telefono[] } | undefined;
		if (result.type === 'success' && respuesta?.telefonos) {
			telefonos = respuesta.telefonos;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t(respuesta.phoneMessage ?? 'profile.phones.added') });
			resolver?.();
			return true;
		}
		const description = i18n.t(respuesta?.phoneMessage ?? 'profile.phones.saveError');
		if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description });
		else toast.error(i18n.t('notifications.type.error'), { description });
		rechazar?.(new Error('phone-request-failed'));
		return false;
	}

	const mejorarAgregar: SubmitFunction = () => {
		agregando = true;
		return async ({ result }) => {
			if (procesarResultado(result)) {
				tipo = '';
				numero = '';
				titular = '';
				emergencia = false;
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

	function pedirEdicion(item: Telefono) {
		objetivo = item;
		tipoEdicion = item.codigo_tipo_telefono;
		numeroEdicion = item.numero;
		titularEdicion = item.titular;
		emergenciaEdicion = item.es_emergencia;
		confirmacionEditar = true;
	}

	function pedirEliminacion(item: Telefono) {
		objetivo = item;
		confirmacionEliminar = true;
	}

	$effect(() => {
		if (!confirmacionEditar && !confirmacionEliminar && !editando && !eliminando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.phones')} · Sumaq System</title></svelte:head>

<ProfileCollectionShell title={i18n.t('profile.tab.phones')} subtitle={i18n.t('profile.professional.phonesHint')} icon="phone-call" hasItems={telefonos.length > 0} emptyTitle={i18n.t('profile.phones.emptyTitle')} emptyHint={i18n.t('profile.phones.emptyHint')}>
	{#snippet children()}
		<form bind:this={formularioAgregar} method="POST" action="?/add" use:enhance={mejorarAgregar} class="contents">
			<div class="col-span-3 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('profile.phones.type')} icon="phone" name="codigo_tipo_telefono" bind:value={tipo} disabled={agregando || editando || eliminando} required><option value="">{i18n.t('profile.phones.selectType')}</option>{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select></div>
			<div class="col-span-3 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.phones.number')} type="tel" icon="phone" name="numero" bind:value={numero} minlength={6} maxlength={30} disabled={agregando || editando || eliminando} required /></div>
			<div class="col-span-3 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.phones.owner')} icon="user" name="titular" bind:value={titular} minlength={2} maxlength={120} disabled={agregando || editando || eliminando} required /></div>
			<div class="col-span-3 flex items-end justify-between gap-3 max-[760px]:col-span-6 max-[560px]:col-span-12"><label class="mb-2 flex items-center gap-2 text-sm text-charcoal"><Switch name="es_emergencia" bind:checked={emergencia} disabled={agregando || editando || eliminando} label={i18n.t('profile.phones.emergency')} />{i18n.t('profile.phones.emergency')}</label><Button type="button" loading={agregando} disabled={!puedeAgregar || editando || eliminando} onclick={() => (confirmacionAgregar = true)}>{#if !agregando}<Icon name="plus" size={18} />{/if}{i18n.t('profile.phones.add')}</Button></div>
		</form>
	{/snippet}

	{#snippet content()}
		<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
			{#each telefonos as item (item.id_personas_telefonos)}
				<li class="flex items-center gap-4 px-4 py-3.5 max-[700px]:items-start">
					<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="phone-call" size={19} /></span>
					<div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><p class="text-sm font-semibold text-ink">{numeroParaMostrar(item.numero, item.codigo_tipo_telefono)}</p>{#if item.es_emergencia}<span class="rounded-full border border-error px-2 py-0.5 text-[10px] font-semibold text-error">{i18n.t('profile.phones.emergency')}</span>{/if}</div><p class="mt-0.5 text-[13px] text-steel">{parameterLabel(item.tipo_telefono)} · {item.titular}</p></div>
					<div class="flex shrink-0 gap-2"><Button size="sm" type="button" disabled={agregando || editando || eliminando} onclick={() => pedirEdicion(item)}><Icon name="pencil" size={16} /> {i18n.t('profile.phones.edit')}</Button><Button variant="secondary" size="sm" type="button" class="!border-error !bg-transparent !text-error hover:!border-error hover:!bg-transparent hover:!text-error" disabled={agregando || editando || eliminando} onclick={() => pedirEliminacion(item)}><Icon name="trash-2" size={16} /> {i18n.t('profile.phones.delete')}</Button></div>
				</li>
			{/each}
		</ul>
	{/snippet}
</ProfileCollectionShell>

<ConfirmationDialog bind:open={confirmacionAgregar} variant="info" icon="phone-call" title={i18n.t('profile.phones.addTitle')} description={i18n.t('profile.phones.addDescription')} confirmLabel={i18n.t('profile.phones.add')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeAgregar} onConfirm={() => enviar(formularioAgregar)}>
	{#if maestroSeleccionado}<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-primary"><Icon name="phone-call" size={18} /></span><div><p class="text-sm font-semibold text-ink">{numeroParaMostrar(numero.trim(), maestroSeleccionado.codigo)}</p><p class="text-xs text-steel">{parameterLabel(maestroSeleccionado)} · {titular.trim()}</p></div></div>{/if}
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEditar} variant="info" icon="pencil" title={i18n.t('profile.phones.editTitle')} description={i18n.t('profile.phones.editDescription')} confirmLabel={i18n.t('profile.phones.save')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!puedeEditar} onConfirm={() => enviar(formularioEditar)}>
	<div class="flex flex-col gap-4 text-left"><Select label={i18n.t('profile.phones.type')} icon="phone" bind:value={tipoEdicion} disabled={editando} required>{#each data.catalogo as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select><Input label={i18n.t('profile.phones.number')} type="tel" icon="phone" bind:value={numeroEdicion} minlength={6} maxlength={30} disabled={editando} required /><Input label={i18n.t('profile.phones.owner')} icon="user" bind:value={titularEdicion} minlength={2} maxlength={120} disabled={editando} required /><label class="flex items-center justify-between gap-4 rounded-md border border-hairline p-3 text-sm text-charcoal"><span>{i18n.t('profile.phones.emergency')}</span><Switch bind:checked={emergenciaEdicion} disabled={editando} label={i18n.t('profile.phones.emergency')} /></label></div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={confirmacionEliminar} variant="danger" icon="trash-2" title={i18n.t('profile.phones.deleteTitle')} description={i18n.t('profile.phones.deleteDescription')} confirmLabel={i18n.t('profile.phones.delete')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!objetivo || eliminando} onConfirm={() => enviar(formularioEliminar)}>
	{#if objetivo}<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-error"><Icon name="phone-call" size={18} /></span><div><p class="text-sm font-semibold text-ink">{numeroParaMostrar(objetivo.numero, objetivo.codigo_tipo_telefono)}</p><p class="text-xs text-steel">{parameterLabel(objetivo.tipo_telefono)} · {objetivo.titular}</p></div></div>{/if}
</ConfirmationDialog>

<form bind:this={formularioEditar} method="POST" action="?/edit" use:enhance={mejorarEditar} class="hidden"><input type="hidden" name="id_personas_telefonos" value={objetivo?.id_personas_telefonos ?? ''} /><input type="hidden" name="codigo_tipo_telefono" value={tipoEdicion} /><input type="hidden" name="numero" value={numeroEdicion} /><input type="hidden" name="titular" value={titularEdicion} /><input type="hidden" name="es_emergencia" value={emergenciaEdicion ? 'true' : 'false'} /></form>
<form bind:this={formularioEliminar} method="POST" action="?/delete" use:enhance={mejorarEliminar} class="hidden"><input type="hidden" name="id_personas_telefonos" value={objetivo?.id_personas_telefonos ?? ''} /></form>
