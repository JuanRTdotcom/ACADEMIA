<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import { ConfirmationDialog, Icon, Input, i18n } from '$lib';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import type { ResumenAccionesRequeridas } from '$lib/required-actions';

	type TipoUso = 'principal' | 'mensajes' | 'respaldo';
	type Correo = {
		id_personas_correos: string;
		correo: string;
		usos: TipoUso[];
		verificado: boolean;
	};

	interface Props {
		correo: Correo;
		disabled?: boolean;
		onsuccess: (
			correos: Correo[],
			mensaje: string,
			accionesRequeridas?: ResumenAccionesRequeridas
		) => void;
		onerror: (mensaje: string, status?: number) => void;
	}

	let { correo, disabled = false, onsuccess, onerror }: Props = $props();
	let editando = $state(false);
	let confirmandoEliminacion = $state(false);
	let procesandoEdicion = $state(false);
	let procesandoEliminacion = $state(false);
	let nuevoCorreo = $state(untrack(() => correo.correo));
	let formularioEliminar: HTMLFormElement;
	let formularioEditar: HTMLFormElement;
	const idFormularioEditar = untrack(() => `editar-correo-${correo.id_personas_correos}`);
	let resolverEdicion: (() => void) | null = null;
	let rechazarEdicion: ((error: Error) => void) | null = null;
	let resolverEliminacion: (() => void) | null = null;
	let rechazarEliminacion: ((error: Error) => void) | null = null;

	function abrirEdicion() {
		nuevoCorreo = correo.correo;
		editando = true;
	}

	const mejorarEdicion: SubmitFunction = () => {
		procesandoEdicion = true;
		return async ({ result }) => {
			procesandoEdicion = false;
			const respuesta = ('data' in result ? result.data : undefined) as
				| {
						correos?: Correo[];
						emailMessage?: string;
						acciones_requeridas?: ResumenAccionesRequeridas;
				  }
				| undefined;
			if (result.type === 'success' && respuesta?.correos) {
				onsuccess(
					respuesta.correos,
					respuesta.emailMessage ?? 'profile.email.modified',
					respuesta.acciones_requeridas
				);
				resolverEdicion?.();
			} else {
				onerror(
					respuesta?.emailMessage ?? 'profile.email.modifyError',
					result.type === 'failure' ? result.status : undefined
				);
				rechazarEdicion?.(new Error('email-edit-failed'));
			}
			resolverEdicion = null;
			rechazarEdicion = null;
		};
	};

	function modificar(): Promise<void> {
		if (procesandoEdicion) return Promise.resolve();
		if (!formularioEditar.reportValidity()) {
			return Promise.reject(new Error('email-invalid'));
		}
		return new Promise((resolve, reject) => {
			resolverEdicion = resolve;
			rechazarEdicion = reject;
			formularioEditar.requestSubmit();
		});
	}

	const mejorarEliminacion: SubmitFunction = () => {
		procesandoEliminacion = true;
		return async ({ result }) => {
			procesandoEliminacion = false;
			const respuesta = ('data' in result ? result.data : undefined) as
				| {
						correos?: Correo[];
						emailMessage?: string;
						acciones_requeridas?: ResumenAccionesRequeridas;
				  }
				| undefined;
			if (result.type === 'success' && respuesta?.correos) {
				onsuccess(
					respuesta.correos,
					respuesta.emailMessage ?? 'profile.email.deleted',
					respuesta.acciones_requeridas
				);
				resolverEliminacion?.();
			} else {
				onerror(
					respuesta?.emailMessage ?? 'profile.email.deleteError',
					result.type === 'failure' ? result.status : undefined
				);
				rechazarEliminacion?.(new Error('email-delete-failed'));
			}
			resolverEliminacion = null;
			rechazarEliminacion = null;
		};
	};

	function eliminar(): Promise<void> {
		if (procesandoEliminacion) return Promise.resolve();
		return new Promise((resolve, reject) => {
			resolverEliminacion = resolve;
			rechazarEliminacion = reject;
			formularioEliminar.requestSubmit();
		});
	}
</script>

{#if correo.usos.includes('principal')}
	<span class="inline-flex items-center gap-1.5 text-xs text-steel font-medium px-2.5 py-1.5 bg-surface/80 rounded-md border border-hairline" title={i18n.t('profile.email.principalImmutable')}>
		<Icon name="lock" size={14} class="text-steel" />
		<span>{i18n.t('profile.email.use.principal')}</span>
	</span>
{:else}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="grid size-9 place-items-center rounded-md text-steel transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
			aria-label={i18n.t('profile.email.actions')}
			{disabled}
		>
			<Icon name="more-horizontal" size={18} />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content side="bottom" align="end" class="w-40">
			<DropdownMenu.Item onSelect={abrirEdicion}>
				<Icon name="pencil" size={16} />
				{i18n.t('profile.email.modify')}
			</DropdownMenu.Item>
			<DropdownMenu.Item variant="destructive" onSelect={() => (confirmandoEliminacion = true)}>
				<Icon name="trash-2" size={16} />
				{i18n.t('profile.email.delete')}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}

<ConfirmationDialog
	bind:open={editando}
	variant="info"
	icon="pencil"
	title={i18n.t('profile.email.modifyTitle')}
	description={i18n.t('profile.email.modifyDescription')}
	confirmLabel={i18n.t('profile.save')}
	cancelLabel={i18n.t('confirmation.cancel')}
	confirmDisabled={procesandoEdicion || nuevoCorreo.trim().toLowerCase() === correo.correo}
	onConfirm={modificar}
>
	<Input
		form={idFormularioEditar}
		name="correo"
		type="email"
		label={i18n.t('profile.email.address')}
		icon="mail"
		bind:value={nuevoCorreo}
		maxlength={254}
		disabled={procesandoEdicion}
		required
	/>
</ConfirmationDialog>

<form
	id={idFormularioEditar}
	bind:this={formularioEditar}
	method="POST"
	action="?/modifyEmail"
	use:enhance={mejorarEdicion}
	class="hidden"
>
	<input type="hidden" name="id_personas_correos" value={correo.id_personas_correos} />
</form>

<form bind:this={formularioEliminar} method="POST" action="?/deleteEmail" use:enhance={mejorarEliminacion} class="hidden">
	<input type="hidden" name="id_personas_correos" value={correo.id_personas_correos} />
</form>

<ConfirmationDialog
	bind:open={confirmandoEliminacion}
	variant="danger"
	title={i18n.t('profile.email.deleteTitle')}
	description={i18n.t('profile.email.deleteDescription')}
	confirmLabel={i18n.t('profile.email.delete')}
	cancelLabel={i18n.t('confirmation.cancel')}
	onConfirm={eliminar}
/>
