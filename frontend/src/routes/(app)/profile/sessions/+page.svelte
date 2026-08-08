<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, Card, Badge, ConfirmationDialog, Icon, i18n } from '$lib';

	let { data }: PageProps = $props();

	type Sesion = (typeof data.sesiones)[number];

	let cerrando = $state<string | null>(null);
	let confirmar = $state(false);
	let objetivo = $state<Sesion | null>(null);
	let formularioCierre: HTMLFormElement;
	let resolverCierre: (() => void) | null = null;
	let rechazarCierre: ((error: Error) => void) | null = null;

	const locale = $derived(i18n.locale === 'es' ? 'es-PE' : 'en-US');
	const fecha = $derived(
		new Intl.DateTimeFormat(locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: data.zona_horaria
		})
	);

	function icono(tipo: string): string {
		if (tipo === 'movil' || tipo === 'telefono') return 'smartphone';
		if (tipo === 'tablet') return 'tablet';
		return 'monitor';
	}

	function nombre(sesion: Sesion): string {
		if (sesion.modelo) return sesion.modelo;
		const plataforma = sesion.plataforma === 'web' ? 'Web' : sesion.plataforma;
		return `${plataforma} · ${sesion.tipo_dispositivo}`;
	}

	// Ubicación aproximada desde la IP (país/región) o "Red local" para IP privadas.
	function ubicacion(sesion: Sesion): string | null {
		const u = sesion.ubicacion;
		if (!u) return null;
		if (u.local) return i18n.t('profile.sessions.localNetwork');
		const pais = i18n.locale === 'es' ? u.pais_es : u.pais_en;
		return [u.ciudad, pais].filter(Boolean).join(', ') || null;
	}

	// Abre el diálogo de confirmación para la sesión elegida.
	function pedirCierre(sesion: Sesion) {
		objetivo = sesion;
		confirmar = true;
	}

	const mejorar: SubmitFunction = () => {
		if (!objetivo) return;
		cerrando = objetivo.id_sesiones;
		return async ({ result, update }) => {
			cerrando = null;
			const respuesta = ('data' in result ? result.data : undefined) as
				| { sessionMessage?: string }
				| undefined;
			if (result.type === 'success') {
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t(respuesta?.sessionMessage ?? 'profile.sessions.closed')
				});
				resolverCierre?.();
			} else {
				const description = i18n.t(respuesta?.sessionMessage ?? 'profile.sessions.closeError');
				if (result.type === 'failure' && result.status === 429) {
					toast.warning(i18n.t('notifications.type.warning'), { description });
				} else {
					toast.error(i18n.t('notifications.type.error'), { description });
				}
				rechazarCierre?.(new Error('session-close-failed'));
			}
			resolverCierre = null;
			rechazarCierre = null;
			// Éxito → recarga la lista (la sesión cerrada ya no aparece).
			await update({ reset: false, invalidateAll: result.type === 'success' });
		};
	};

	function cerrarSesion(): Promise<void> {
		if (!objetivo || cerrando) return Promise.resolve();
		return new Promise((resolve, reject) => {
			resolverCierre = resolve;
			rechazarCierre = reject;
			formularioCierre.requestSubmit();
		});
	}

	$effect(() => {
		if (!confirmar && !cerrando) objetivo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.sessions')} · Sumaq System</title></svelte:head>

<Card padding="xl">
	<div class="mb-7">
		<h3 class="text-lg text-ink">{i18n.t('profile.sessions.title')}</h3>
		<p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.sessions.subtitle')}</p>
	</div>

	<ul class="m-0 flex list-none flex-col divide-y divide-hairline p-0">
		{#each data.sesiones as sesion (sesion.id_sesiones)}
			<li class="flex items-center gap-4 py-4 first:pt-0 last:pb-0 max-[640px]:flex-wrap">
				<span class="grid size-10 shrink-0 place-items-center rounded-md bg-surface text-steel">
					<Icon name={icono(sesion.tipo_dispositivo)} size={20} />
				</span>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-sm font-semibold capitalize text-ink">{nombre(sesion)}</p>
						{#if sesion.actual}<Badge variant="outline-green">{i18n.t('profile.sessions.current')}</Badge>{/if}
					</div>
					{#if ubicacion(sesion)}
						<p class="mt-1 inline-flex items-center gap-1 text-[13px] text-steel">
							<Icon name="map-pin" size={13} /> {ubicacion(sesion)}
						</p>
					{/if}
					<p class="mt-1 inline-flex items-center gap-1 text-[13px] text-steel">
						<Icon name="clock" size={13} /> {i18n.t('profile.sessions.lastActivity')}: {fecha.format(new Date(sesion.ultimo_uso_en))}
					</p>
					<p class="mt-0.5 text-xs text-stone">{i18n.t('profile.sessions.started')}: {fecha.format(new Date(sesion.iniciada_en))}</p>
				</div>
				{#if !sesion.actual}
					<Button
						variant="primary"
						size="sm"
						type="button"
						disabled={Boolean(cerrando)}
						onclick={() => pedirCierre(sesion)}
					>
						<Icon name="log-out" size={16} /> {i18n.t('profile.sessions.revoke')}
					</Button>
				{/if}
			</li>
		{/each}
	</ul>
</Card>

<!-- Confirmación reutilizable antes de cerrar una sesión -->
<ConfirmationDialog
	bind:open={confirmar}
	variant="danger"
	icon="log-out"
	title={i18n.t('profile.sessions.confirmTitle')}
	description={i18n.t('profile.sessions.confirmBody')}
	confirmLabel={i18n.t('profile.sessions.revoke')}
	cancelLabel={i18n.t('profile.cancel')}
	onConfirm={cerrarSesion}
>
	{#if objetivo}
		<div class="flex items-center gap-3 rounded-md border border-hairline bg-surface/70 p-3 text-left">
			<span class="grid size-9 shrink-0 place-items-center rounded-md bg-canvas text-steel">
				<Icon name={icono(objetivo.tipo_dispositivo)} size={18} />
			</span>
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold capitalize text-ink">{nombre(objetivo)}</p>
				<p class="text-xs text-steel">
					{i18n.t('profile.sessions.lastActivity')}: {fecha.format(new Date(objetivo.ultimo_uso_en))}
				</p>
			</div>
		</div>
	{/if}
</ConfirmationDialog>

<form bind:this={formularioCierre} method="POST" action="?/revoke" use:enhance={mejorar} class="hidden">
	<input type="hidden" name="id_sesiones" value={objetivo?.id_sesiones ?? ''} />
</form>
