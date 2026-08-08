<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, ProfileCollectionShell, Select, i18n } from '$lib';

	let { data }: PageProps = $props();
	type Nacionalidad = (typeof data.nacionalidades)[number];
	type Pais = (typeof data.catalogo)[number];

	// Derivado sobreescribible: inicia con SSR y luego acepta la respuesta de cada acción.
	let nacionalidades = $derived<Nacionalidad[]>(data.nacionalidades);
	let seleccion = $state('');
	let confirmacionAgregar = $state(false);
	let confirmacionEliminar = $state(false);
	let agregando = $state(false);
	let eliminando = $state(false);
	let objetivo = $state<Nacionalidad | null>(null);
	let formularioAgregar: HTMLFormElement;
	let formularioEliminar: HTMLFormElement;
	let resolver: (() => void) | null = null;
	let rechazar: ((error: Error) => void) | null = null;

	const paisesDisponibles = $derived(
		data.catalogo.filter((pais) => !nacionalidades.some((item) => item.fid_admin_level_0 === pais.id_admin_level_0))
	);
	const paisSeleccionado = $derived(data.catalogo.find((pais) => pais.id_admin_level_0 === seleccion));

	function nombrePais(pais: Pais): string {
		return i18n.locale === 'es' ? pais.nombre_es : pais.nombre_en;
	}

	function procesarResultado(
		result: { type: string; status?: number; data?: Record<string, unknown> },
		mensajeExito: string,
		mensajeError: string
	) {
		const respuesta = result.data as
			| { nationalityMessage?: string; nacionalidades?: Nacionalidad[] }
			| undefined;
		if (result.type === 'success' && respuesta?.nacionalidades) {
			nacionalidades = respuesta.nacionalidades;
			toast.success(i18n.t('notifications.type.success'), {
				description: i18n.t(respuesta.nationalityMessage ?? mensajeExito)
			});
			resolver?.();
			return true;
		}
		const description = i18n.t(respuesta?.nationalityMessage ?? mensajeError);
		if (result.status === 429) {
			toast.warning(i18n.t('notifications.type.warning'), { description });
		} else {
			toast.error(i18n.t('notifications.type.error'), { description });
		}
		rechazar?.(new Error('nationality-request-failed'));
		return false;
	}

	const mejorarAgregar: SubmitFunction = () => {
		agregando = true;
		return async ({ result }) => {
			const ok = procesarResultado(result, 'profile.nationalities.added', 'profile.nationalities.saveError');
			if (ok) seleccion = '';
			agregando = false;
			resolver = null;
			rechazar = null;
		};
	};

	const mejorarEliminar: SubmitFunction = () => {
		eliminando = true;
		return async ({ result }) => {
			procesarResultado(result, 'profile.nationalities.deleted', 'profile.nationalities.deleteError');
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

	function pedirEliminacion(item: Nacionalidad) {
		objetivo = item;
		confirmacionEliminar = true;
	}

	$effect(() => {
		if (!confirmacionEliminar && !eliminando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.nationalities')} · Sumaq System</title></svelte:head>

<ProfileCollectionShell
	title={i18n.t('profile.tab.nationalities')}
	subtitle={i18n.t('profile.professional.nationalitiesHint')}
	icon="flag"
	hasItems={nacionalidades.length > 0}
	emptyTitle={i18n.t('profile.nationalities.emptyTitle')}
	emptyHint={i18n.t('profile.nationalities.emptyHint')}
>
	{#snippet children()}
		<form bind:this={formularioAgregar} method="POST" action="?/add" use:enhance={mejorarAgregar} class="contents">
			<div class="col-span-4 max-[760px]:col-span-12">
				<Select
					label={i18n.t('profile.nationalities.selectLabel')}
					icon="flag"
					name="fid_admin_level_0"
					bind:value={seleccion}
					disabled={agregando || paisesDisponibles.length === 0}
					required
				>
					<option value="">{i18n.t('profile.nationalities.selectPlaceholder')}</option>
					{#each paisesDisponibles as pais (pais.id_admin_level_0)}
						<option value={pais.id_admin_level_0}>{nombrePais(pais)}</option>
					{/each}
				</Select>
			</div>
			<div class="col-span-2 flex items-end max-[760px]:col-span-12">
				<Button
					type="button"
					loading={agregando}
					disabled={!seleccion || agregando}
					onclick={() => (confirmacionAgregar = true)}
				>
					{#if !agregando}<Icon name="plus" size={18} />{/if}
					{i18n.t('profile.nationalities.add')}
				</Button>
			</div>
		</form>
	{/snippet}

	{#snippet content()}
		<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
			{#each nacionalidades as item (item.id_personas_nacionalidades)}
				<li class="flex items-center gap-4 px-4 py-3.5">
					<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
						<Icon name="flag" size={19} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-ink">{nombrePais(item.pais)}</p>
						<p class="mt-0.5 text-xs uppercase tracking-wide text-steel">{item.pais.codigo_iso2}</p>
					</div>
					<Button
						variant="secondary"
						size="sm"
						type="button"
						class="!border-error !bg-transparent !text-error hover:!border-error hover:!bg-transparent hover:!text-error"
						disabled={eliminando || agregando}
						onclick={() => pedirEliminacion(item)}
					>
						<Icon name="trash-2" size={16} /> {i18n.t('profile.nationalities.delete')}
					</Button>
				</li>
			{/each}
		</ul>
	{/snippet}
</ProfileCollectionShell>

<ConfirmationDialog
	bind:open={confirmacionAgregar}
	variant="info"
	icon="flag"
	title={i18n.t('profile.nationalities.addTitle')}
	description={i18n.t('profile.nationalities.addDescription')}
	confirmLabel={i18n.t('profile.nationalities.confirmAdd')}
	cancelLabel={i18n.t('profile.cancel')}
	confirmDisabled={!seleccion || agregando}
	onConfirm={() => enviar(formularioAgregar)}
>
	{#if paisSeleccionado}
		<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left">
			<span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-primary"><Icon name="flag" size={18} /></span>
			<p class="text-sm font-semibold text-ink">{nombrePais(paisSeleccionado)}</p>
		</div>
	{/if}
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={confirmacionEliminar}
	variant="danger"
	icon="trash-2"
	title={i18n.t('profile.nationalities.deleteTitle')}
	description={i18n.t('profile.nationalities.deleteDescription')}
	confirmLabel={i18n.t('profile.nationalities.delete')}
	cancelLabel={i18n.t('profile.cancel')}
	confirmDisabled={!objetivo || eliminando}
	onConfirm={() => enviar(formularioEliminar)}
>
	{#if objetivo}
		<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left">
			<span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-error"><Icon name="flag" size={18} /></span>
			<p class="text-sm font-semibold text-ink">{nombrePais(objetivo.pais)}</p>
		</div>
	{/if}
</ConfirmationDialog>

<form bind:this={formularioEliminar} method="POST" action="?/delete" use:enhance={mejorarEliminar} class="hidden">
	<input type="hidden" name="id_personas_nacionalidades" value={objetivo?.id_personas_nacionalidades ?? ''} />
</form>
