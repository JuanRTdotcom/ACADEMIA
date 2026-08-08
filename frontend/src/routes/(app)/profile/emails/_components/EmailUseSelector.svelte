<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import { Icon, Select, i18n } from '$lib';
	import type { ResumenAccionesRequeridas } from '$lib/required-actions';

	type TipoUso = 'principal' | 'mensajes' | 'respaldo';
	type Correo = {
		id_personas_correos: string;
		correo: string;
		usos: TipoUso[];
		verificado: boolean;
	};

	interface Props {
		tipo: TipoUso;
		titulo: string;
		correos: Correo[];
		seleccionado: string;
		onsuccess: (
			correos: Correo[],
			mensaje: string,
			accionesRequeridas?: ResumenAccionesRequeridas
		) => void;
		onerror: (mensaje: string, status?: number) => void;
	}

	let { tipo, titulo, correos, seleccionado, onsuccess, onerror }: Props = $props();
	const valorInicial = untrack(() => seleccionado);
	let valor = $state(valorInicial);
	let guardado = $state(valorInicial);
	let enviando = $state(false);
	let formulario: HTMLFormElement;

	$effect(() => {
		if (!enviando && seleccionado !== guardado) {
			valor = seleccionado;
			guardado = seleccionado;
		}
	});

	const mejorar: SubmitFunction = () => {
		enviando = true;
		return async ({ result, update }) => {
			enviando = false;
			const respuesta = ('data' in result ? result.data : undefined) as
				| {
						correos?: Correo[];
						emailMessage?: string;
						acciones_requeridas?: ResumenAccionesRequeridas;
				  }
				| undefined;
			if (result.type === 'success' && respuesta?.correos) {
				guardado = valor;
				onsuccess(
					respuesta.correos,
					respuesta.emailMessage ?? 'profile.email.useUpdated',
					respuesta.acciones_requeridas
				);
			} else {
				valor = guardado;
				onerror(
					respuesta?.emailMessage ?? 'profile.email.saveError',
					result.type === 'failure' ? result.status : undefined
				);
			}
			await update({ reset: false, invalidateAll: false });
		};
	};

	async function guardarAlCambiar() {
		if (!valor || valor === guardado || enviando) return;
		await tick();
		formulario.requestSubmit();
	}
</script>

<form bind:this={formulario} method="POST" action="?/emailUse" use:enhance={mejorar}>
	<input type="hidden" name="tipo" value={tipo} />
	<Select
		name="id_personas_correos"
		label={titulo}
		bind:value={valor}
		icon={tipo === 'principal' ? 'lock' : 'mail'}
		disabled={enviando || correos.length === 0 || tipo === 'principal'}
		onchange={guardarAlCambiar}
		required
	>
		<option value="" disabled>
			{i18n.t(
				tipo === 'principal' ? 'profile.email.selectInstitutional' : 'profile.email.selectVerified'
			)}
		</option>
		{#each correos as correo (correo.id_personas_correos)}
			<option value={correo.id_personas_correos}>{correo.correo}</option>
		{/each}
	</Select>
	<p
		class="mt-1.5 h-4 text-xs text-steel transition-opacity duration-150 {tipo === 'principal' || enviando
			? 'opacity-100'
			: 'opacity-0'}"
		aria-live="polite"
	>
		{#if tipo === 'principal'}
			<span class="inline-flex items-center gap-1">
				<Icon name="lock" size={12} class="text-steel" />
				{i18n.t('profile.email.use.principalFixed')}
			</span>
		{:else if enviando}
			{i18n.t('profile.email.savingSelection')}
		{:else}
			{'\u00a0'}
		{/if}
	</p>
</form>
