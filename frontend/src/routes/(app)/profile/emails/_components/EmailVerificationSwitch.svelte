<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { tick, untrack } from 'svelte';
	import { Switch, i18n } from '$lib';
	import type { ResumenAccionesRequeridas } from '$lib/required-actions';

	type Correo = {
		id_personas_correos: string;
		correo: string;
		usos: ('principal' | 'mensajes' | 'respaldo')[];
		verificado: boolean;
	};

	interface Props {
		id: string;
		verificado: boolean;
		disabled?: boolean;
		onsuccess: (
			correos: Correo[],
			mensaje: string,
			accionesRequeridas?: ResumenAccionesRequeridas
		) => void;
		onerror: (mensaje: string, status?: number) => void;
	}

	let { id, verificado, disabled = false, onsuccess, onerror }: Props = $props();
	const valorInicial = untrack(() => verificado);
	let seleccionado = $state(valorInicial);
	let guardado = $state(valorInicial);
	let enviando = $state(false);
	let formulario: HTMLFormElement;

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
				guardado = seleccionado;
					onsuccess(
						respuesta.correos,
						respuesta.emailMessage ?? 'profile.email.verificationUpdated',
						respuesta.acciones_requeridas
				);
			} else {
				seleccionado = guardado;
				onerror(
					respuesta?.emailMessage ?? 'profile.email.saveError',
					result.type === 'failure' ? result.status : undefined
				);
			}
			await update({ reset: false, invalidateAll: false });
		};
	};

	async function enviar() {
		await tick();
		formulario.requestSubmit();
	}
</script>

<form
	bind:this={formulario}
	method="POST"
	action="?/emailVerification"
	use:enhance={mejorar}
	class="flex items-center gap-3"
>
	<input type="hidden" name="id_personas_correos" value={id} />
	<span class="text-xs font-medium text-steel">
		{i18n.t(seleccionado ? 'common.enabled' : 'common.disabled')}
	</span>
	<Switch
		name="verificado"
		bind:checked={seleccionado}
		disabled={enviando || disabled}
		label={i18n.t('profile.email.manualVerification')}
		onchange={enviar}
	/>
</form>
