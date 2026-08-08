<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, Card, Badge, Input, Icon, i18n } from '$lib';
	import {
		emitirResumenAcciones,
		type ResumenAccionesRequeridas
	} from '$lib/required-actions';
	import EmailVerificationSwitch from './_components/EmailVerificationSwitch.svelte';
	import EmailUseSelector from './_components/EmailUseSelector.svelte';
	import EmailActionsMenu from './_components/EmailActionsMenu.svelte';

	type TipoUso = 'principal' | 'mensajes' | 'respaldo';

	let { data }: PageProps = $props();
	const correosIniciales = untrack(() => [...data.usuario.correos]);
	let correos = $state(correosIniciales);
	let avisoVerificacion = $state(
		untrack(() => (data.usuario.acciones_requeridas.por_seccion.emails ?? 0) > 0)
	);
	let guardando = $state<string | null>(null);

	const opcionesUso: {
		tipo: TipoUso;
		icono: string;
		titulo: string;
		descripcion: string;
	}[] = [
		{
			tipo: 'principal',
			icono: 'mail',
			titulo: 'profile.email.primaryTitle',
			descripcion: 'profile.email.primaryDescription'
		},
		{
			tipo: 'mensajes',
			icono: 'send',
			titulo: 'profile.email.messagesTitle',
			descripcion: 'profile.email.messagesDescription'
		},
		{
			tipo: 'respaldo',
			icono: 'download',
			titulo: 'profile.email.backupTitle',
			descripcion: 'profile.email.backupDescription'
		}
	];

	const idAsignado = (tipo: TipoUso) =>
		correos.find((correo) => correo.usos.includes(tipo))?.id_personas_correos ?? '';
	const correosVerificados = $derived(correos.filter((correo) => correo.verificado));
	const limiteCorreosAlcanzado = $derived(correos.length >= 10);
	function sincronizar(nuevos: typeof correos) {
		correos = nuevos;
	}

	function exito(
		nuevos: typeof correos,
		mensaje: string,
		accionesRequeridas?: ResumenAccionesRequeridas
	) {
		sincronizar(nuevos);
		if (accionesRequeridas) {
			avisoVerificacion = (accionesRequeridas.por_seccion.emails ?? 0) > 0;
			emitirResumenAcciones(accionesRequeridas);
		}
		toast.success(i18n.t('notifications.type.success'), {
			description: i18n.t(mensaje)
		});
	}

	function error(mensaje: string, status?: number) {
		const opciones = { description: i18n.t(mensaje) };
		if (status === 429) {
			toast.warning(i18n.t('notifications.type.warning'), opciones);
		} else {
			toast.error(i18n.t('notifications.type.error'), opciones);
		}
	}

	const mejorarAgregar: SubmitFunction = () => {
		guardando = 'agregar';
		return async ({ result, update }) => {
			guardando = null;
			const respuesta = ('data' in result ? result.data : undefined) as
				| {
						correos?: typeof correos;
						emailMessage?: string;
						acciones_requeridas?: ResumenAccionesRequeridas;
				  }
				| undefined;
			if (result.type === 'success' && respuesta?.correos) {
					exito(
						respuesta.correos,
						respuesta.emailMessage ?? 'profile.email.added',
						respuesta.acciones_requeridas
				);
			} else {
				error(
					respuesta?.emailMessage ?? 'profile.email.saveError',
					result.type === 'failure' ? result.status : undefined
				);
			}
			await update({ reset: true, invalidateAll: false });
		};
	};
</script>

<svelte:head><title>{i18n.t('profile.tab.emails')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<Card padding="xl">
		<div>
			<h3 class="text-lg text-ink">{i18n.t('profile.account.emailTitle')}</h3>
			<p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.account.emailListHint')}</p>
		</div>

		{#if avisoVerificacion}
			<div class="mt-5 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
				<span class="mt-0.5 text-destructive"><Icon name="alert-triangle" size={18} /></span>
				<p class="text-[13px] leading-relaxed text-ink">
					{i18n.t('profile.email.verifiedWarning')}
				</p>
			</div>
		{/if}

		<div class="mt-5 flex flex-col gap-3">
			{#each correos as correo (correo.id_personas_correos)}
				<div
					class="flex items-center justify-between gap-5 rounded-md border border-l-4 border-hairline-strong bg-canvas p-4 transition-colors max-[680px]:items-start max-[680px]:flex-col {correo.verificado
						? 'border-l-primary'
						: 'border-l-destructive'}"
				>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<p class="min-w-0 break-all text-sm font-semibold text-ink">{correo.correo}</p>
							{#each correo.usos as uso (uso)}
								<Badge variant="outline-sky">{i18n.t(`profile.email.use.${uso}`)}</Badge>
							{/each}
							<Badge variant={correo.verificado ? 'outline-green' : 'outline-danger'}>
								{i18n.t(correo.verificado ? 'profile.account.verifiedTag' : 'profile.account.unverified')}
							</Badge>
						</div>
						<p class="mt-2 text-[13px] leading-relaxed text-steel">
							{i18n.t(correo.verificado ? 'profile.email.verifiedHint' : 'profile.email.pendingHint')}
						</p>
					</div>
					<div class="flex shrink-0 items-center gap-3 max-[680px]:w-full max-[680px]:justify-between">
						<div>
							<p class="mb-2 text-right text-xs font-medium text-steel max-[680px]:text-left">
								{i18n.t('profile.email.manualVerification')}
							</p>
							<EmailVerificationSwitch
								id={correo.id_personas_correos}
								verificado={correo.verificado}
								disabled={correo.usos.includes('principal')}
								onsuccess={exito}
								onerror={error}
							/>
						</div>
						<EmailActionsMenu {correo} onsuccess={exito} onerror={error} />
					</div>
				</div>
			{/each}
		</div>

		<form
			method="POST"
			action="?/addEmail"
			use:enhance={mejorarAgregar}
			class="mt-5 grid grid-cols-12 items-end gap-3 border-t border-hairline pt-5"
		>
			<div class="col-span-4 max-[760px]:col-span-12">
				<Input
					name="correo"
					type="email"
					label={i18n.t('profile.email.add')}
					icon="mail-plus"
					maxlength={254}
					disabled={limiteCorreosAlcanzado || guardando !== null}
					required
				/>
			</div>
			<div class="col-span-2 flex items-end max-[760px]:col-span-12">
				<Button
					type="submit"
					disabled={guardando !== null || limiteCorreosAlcanzado}
					loading={guardando === 'agregar'}
				>
					{#if guardando !== 'agregar'}<Icon name="plus" size={18} />{/if}
					{i18n.t('profile.email.addButton')}
				</Button>
			</div>
			<p class="col-span-12 text-xs text-steel">
				{i18n.t(limiteCorreosAlcanzado ? 'profile.email.limit' : 'profile.email.limitHint')}
			</p>
		</form>
	</Card>

	<Card padding="xl">
		<div>
			<h3 class="text-lg text-ink">{i18n.t('profile.email.destinationsTitle')}</h3>
			<p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.email.destinationsDescription')}</p>
		</div>

		<div class="mt-5 flex flex-col divide-y divide-hairline rounded-md border border-hairline-strong">
			{#each opcionesUso as opcion (opcion.tipo)}
				<div class="grid grid-cols-12 items-center gap-5 p-5 max-[760px]:gap-4">
					<div class="col-span-8 flex items-center gap-5 max-[760px]:col-span-12">
						<span class="grid size-6 shrink-0 place-items-center text-primary">
							<Icon name={opcion.icono} size={20} />
						</span>
						<div>
							<h4 class="text-sm font-semibold text-ink">{i18n.t(opcion.titulo)}</h4>
							<p class="mt-1 max-w-[65ch] text-[13px] leading-relaxed text-steel">{i18n.t(opcion.descripcion)}</p>
						</div>
					</div>
					<div class="col-span-4 max-[760px]:col-span-12">
						<EmailUseSelector
							tipo={opcion.tipo}
							titulo={i18n.t(opcion.titulo)}
							correos={opcion.tipo === 'principal' ? correos : correosVerificados}
							seleccionado={idAsignado(opcion.tipo)}
							onsuccess={exito}
							onerror={error}
						/>
					</div>
				</div>
			{/each}
		</div>
	</Card>
</div>
