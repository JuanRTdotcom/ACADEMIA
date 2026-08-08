<script lang="ts">
	import { Card, Button, Icon, i18n } from '$lib';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Tinte = 'green' | 'orange' | 'purple' | 'sky' | 'pink' | 'neutral';
	type Evento = (typeof data.eventos)[number];

	interface AparienciaEvento {
		labelKey: string;
		icon: string;
		tint: Tinte;
	}

	interface GrupoActividad {
		clave: string;
		etiqueta: string;
		eventos: Evento[];
	}

	const tintBg: Record<Tinte, string> = {
		green: 'bg-tint-green',
		orange: 'bg-tint-orange',
		purple: 'bg-tint-purple',
		sky: 'bg-tint-sky',
		pink: 'bg-tint-pink',
		neutral: 'bg-surface'
	};

	// Toda fecha se convierte con la zona IANA guardada del usuario. Nunca se usa
	// silenciosamente la zona del navegador ni un valor UTC por defecto.
	const zonaHoraria = $derived(data.zona_horaria);
	const locale = $derived(i18n.locale === 'es' ? 'es-PE' : 'en-US');
	const formateadorHora = $derived(
		new Intl.DateTimeFormat(locale, {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: zonaHoraria
		})
	);
	const formateadorDia = $derived(
		new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: zonaHoraria
		})
	);
	const formateadorPartesDia = $derived(
		new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: zonaHoraria
		})
	);

	function claveDia(fecha: string): string {
		const partes = formateadorPartesDia.formatToParts(new Date(fecha));
		const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
			partes.find((parte) => parte.type === tipo)?.value ?? '';
		return `${valor('year')}-${valor('month')}-${valor('day')}`;
	}

	function diaAnterior(clave: string): string {
		const [anio, mes, dia] = clave.split('-').map(Number);
		const fecha = new Date(Date.UTC(anio, mes - 1, dia - 1));
		return fecha.toISOString().slice(0, 10);
	}

	function apariencia(tipo: string): AparienciaEvento {
		switch (tipo) {
			case 'autenticacion.ingreso.exito':
				return { labelKey: 'profile.activity.login', icon: 'log-in', tint: 'green' };
			case 'autenticacion.cierre.exito':
				return { labelKey: 'profile.activity.logout', icon: 'log-out', tint: 'orange' };
			case 'perfil.apariencia.actualizada':
				return { labelKey: 'profile.activity.appearanceUpdate', icon: 'palette', tint: 'sky' };
			case 'perfil.datos_personales.actualizados':
				return { labelKey: 'profile.activity.personalUpdate', icon: 'user', tint: 'purple' };
			case 'perfil.avatar.actualizado':
				return { labelKey: 'profile.activity.avatarUpdate', icon: 'image', tint: 'green' };
			case 'perfil.avatar.eliminado':
				return { labelKey: 'profile.activity.avatarDelete', icon: 'trash-2', tint: 'orange' };
			case 'perfil.contrasenia.actualizada':
				return { labelKey: 'profile.activity.passwordChange', icon: 'key-round', tint: 'sky' };
			case 'perfil.correo.modificado':
				return { labelKey: 'profile.activity.emailModified', icon: 'pencil', tint: 'sky' };
			case 'perfil.correo.agregado':
				return { labelKey: 'profile.activity.emailAdded', icon: 'mail-plus', tint: 'green' };
			case 'perfil.correo.uso_seleccionado':
				return { labelKey: 'profile.activity.emailAssigned', icon: 'mail', tint: 'sky' };
			case 'perfil.correo.eliminado':
				return { labelKey: 'profile.activity.emailDeleted', icon: 'trash-2', tint: 'orange' };
			case 'perfil.nacionalidad.agregada':
				return { labelKey: 'profile.activity.nationalityAdded', icon: 'flag', tint: 'green' };
			case 'perfil.nacionalidad.eliminada':
				return { labelKey: 'profile.activity.nationalityDeleted', icon: 'flag', tint: 'orange' };
			case 'perfil.seguro.agregado':
				return { labelKey: 'profile.activity.insuranceAdded', icon: 'shield-plus', tint: 'green' };
			case 'perfil.seguro.modificado':
				return { labelKey: 'profile.activity.insuranceUpdated', icon: 'shield-check', tint: 'sky' };
			case 'perfil.seguro.eliminado':
				return { labelKey: 'profile.activity.insuranceDeleted', icon: 'shield-x', tint: 'orange' };
			case 'perfil.hobby.agregado':
				return { labelKey: 'profile.activity.hobbyAdded', icon: 'dumbbell', tint: 'green' };
			case 'perfil.hobby.modificado':
				return { labelKey: 'profile.activity.hobbyUpdated', icon: 'dumbbell', tint: 'sky' };
			case 'perfil.hobby.eliminado':
				return { labelKey: 'profile.activity.hobbyDeleted', icon: 'dumbbell', tint: 'orange' };
			case 'perfil.documento.agregado':
				return { labelKey: 'profile.activity.documentAdded', icon: 'id-card', tint: 'green' };
			case 'perfil.documento.modificado':
				return { labelKey: 'profile.activity.documentUpdated', icon: 'id-card', tint: 'sky' };
			case 'perfil.documento.eliminado':
				return { labelKey: 'profile.activity.documentDeleted', icon: 'id-card', tint: 'orange' };
			case 'perfil.telefono.agregado':
				return { labelKey: 'profile.activity.phoneAdded', icon: 'phone-call', tint: 'green' };
			case 'perfil.telefono.modificado':
				return { labelKey: 'profile.activity.phoneUpdated', icon: 'phone-call', tint: 'sky' };
			case 'perfil.telefono.eliminado':
				return { labelKey: 'profile.activity.phoneDeleted', icon: 'phone-call', tint: 'orange' };
			case 'perfil.estudio_realizado.agregado':
				return { labelKey: 'profile.activity.academicStudyAdded', icon: 'graduation-cap', tint: 'green' };
			case 'perfil.estudio_realizado.modificado':
				return { labelKey: 'profile.activity.academicStudyUpdated', icon: 'graduation-cap', tint: 'sky' };
			case 'perfil.estudio_realizado.eliminado':
				return { labelKey: 'profile.activity.academicStudyDeleted', icon: 'graduation-cap', tint: 'orange' };
			case 'perfil.estudio_complementario.agregado':
				return { labelKey: 'profile.activity.complementaryStudyAdded', icon: 'book-open-check', tint: 'green' };
			case 'perfil.estudio_complementario.modificado':
				return { labelKey: 'profile.activity.complementaryStudyUpdated', icon: 'book-open-check', tint: 'sky' };
			case 'perfil.estudio_complementario.eliminado':
				return { labelKey: 'profile.activity.complementaryStudyDeleted', icon: 'book-open-check', tint: 'orange' };
			case 'empresas.eliminada':
				return { labelKey: 'profile.activity.companyDeleted', icon: 'trash-2', tint: 'pink' };
			default:
				return { labelKey: 'profile.activity.other', icon: 'history', tint: 'neutral' };
		}
	}

	function dispositivo(agente: string | null): string {
		if (!agente) return i18n.t('profile.activity.unknownDevice');

		const navegador = agente.includes('Edg/')
			? 'Edge'
			: agente.includes('Firefox/')
				? 'Firefox'
				: agente.includes('Chrome/')
					? 'Chrome'
					: agente.includes('Safari/')
						? 'Safari'
						: i18n.t('profile.activity.unknownBrowser');
		const sistema = /iPhone|iPad|iPod/.test(agente)
			? 'iOS'
			: agente.includes('Android')
				? 'Android'
				: agente.includes('Mac OS X')
					? 'macOS'
					: agente.includes('Windows')
						? 'Windows'
						: agente.includes('Linux')
							? 'Linux'
							: i18n.t('profile.activity.unknownSystem');

		return `${navegador} · ${sistema}`;
	}

	// Scroll infinito: la carga SSR entrega la primera página; las siguientes se
	// piden al proxy same-origin y se agregan al final. Se conserva la agrupación
	// por día sobre el acumulado.
	// La página 1 llega por SSR (`data`); las siguientes se acumulan en `extras`.
	// La paginación vigente sale de la última respuesta cargada, o del SSR si aún
	// no se pidió ninguna página adicional.
	let extras = $state<Evento[]>([]);
	let ultimaPaginacion = $state<typeof data.paginacion | null>(null);
	let cargando = $state(false);
	let errorCarga = $state(false);
	let centinela = $state<HTMLElement | null>(null);

	const eventos = $derived<Evento[]>([...data.eventos, ...extras]);
	const pagina = $derived(ultimaPaginacion?.pagina ?? data.paginacion.pagina);
	const totalPaginas = $derived(
		ultimaPaginacion?.total_paginas ?? data.paginacion.total_paginas
	);
	const hayMas = $derived(pagina < totalPaginas);

	async function cargarMas() {
		if (cargando || errorCarga || !hayMas) return;
		cargando = true;
		try {
			const res = await fetch(`/profile/activity/eventos?pagina=${pagina + 1}`, {
				headers: { accept: 'application/json' }
			});
			if (!res.ok) throw new Error('load');
			const siguiente = (await res.json()) as typeof data;
			extras = [...extras, ...siguiente.eventos];
			ultimaPaginacion = siguiente.paginacion;
		} catch {
			errorCarga = true;
		} finally {
			cargando = false;
		}
	}

	function reintentar() {
		errorCarga = false;
		cargarMas();
	}

	$effect(() => {
		const nodo = centinela;
		if (!nodo) return;
		// rootMargin adelanta la carga antes de que el centinela sea visible, para
		// que el usuario no perciba el corte al final de la lista.
		const observador = new IntersectionObserver(
			(entradas) => {
				if (entradas[0]?.isIntersecting) cargarMas();
			},
			{ rootMargin: '240px' }
		);
		observador.observe(nodo);
		return () => observador.disconnect();
	});

	const grupos = $derived.by((): GrupoActividad[] => {
		const hoy = claveDia(data.ahora);
		const ayer = diaAnterior(hoy);
		const agrupados = new Map<string, Evento[]>();

		for (const evento of eventos) {
			const clave = claveDia(evento.ocurrido_en);
			const existentes = agrupados.get(clave) ?? [];
			existentes.push(evento);
			agrupados.set(clave, existentes);
		}

		return [...agrupados.entries()].map(([clave, eventos]) => ({
			clave,
			etiqueta:
				clave === hoy
					? i18n.t('profile.activity.today')
					: clave === ayer
						? i18n.t('profile.activity.yesterday')
						: formateadorDia.format(new Date(eventos[0].ocurrido_en)),
			eventos
		}));
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.activity')} · Sumaq System</title></svelte:head>

<Card padding="xl">
	<div class="mb-6">
		<h3 class="text-lg text-ink">{i18n.t('profile.activity.title')}</h3>
		<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.activity.subtitle')}</p>
	</div>

	{#if eventos.length === 0}
		<div class="flex flex-col items-center text-center py-12 px-4">
			<span class="grid place-items-center size-11 rounded-full bg-primary-soft text-primary mb-4">
				<Icon name="history" size={21} />
			</span>
			<h4 class="text-base font-semibold text-ink">{i18n.t('profile.activity.emptyTitle')}</h4>
			<p class="text-sm text-steel mt-1 max-w-[46ch]">{i18n.t('profile.activity.emptyDescription')}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-6">
			{#each grupos as grupo (grupo.clave)}
				<section aria-labelledby={`actividad-${grupo.clave}`}>
					<h4 id={`actividad-${grupo.clave}`} class="text-[11px] font-semibold uppercase tracking-wider text-stone mb-3">
						{grupo.etiqueta}
					</h4>
					<ul class="list-none p-0 flex flex-col">
						{#each grupo.eventos as evento, i (evento.id_eventos)}
							{@const vista = apariencia(evento.tipo_evento)}
							<li class="relative flex items-start gap-4 pb-5 last:pb-0">
								{#if i < grupo.eventos.length - 1}
									<span class="absolute left-5 top-11 bottom-0 w-px bg-hairline" aria-hidden="true"></span>
								{/if}
								<span class="grid place-items-center size-10 rounded-full text-charcoal dark:text-ink shrink-0 z-10 {tintBg[vista.tint]}">
									<Icon name={vista.icon} size={18} />
								</span>
								<div class="min-w-0 flex-1 pt-1.5">
									<div class="flex items-center justify-between gap-3">
										<p class="text-sm text-ink font-semibold">{i18n.t(vista.labelKey)}</p>
										<time class="text-xs text-stone whitespace-nowrap" datetime={evento.ocurrido_en}>
											{formateadorHora.format(new Date(evento.ocurrido_en))}
										</time>
									</div>
									<p class="text-[13px] text-steel flex items-center gap-1.5 flex-wrap mt-0.5">
										<span class="inline-flex items-center gap-1"><Icon name="monitor" size={13} /> {dispositivo(evento.agente_usuario)}</span>
									</p>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<div class="mt-6 pt-5 border-t border-hairline" aria-live="polite">
			{#if errorCarga}
				<div class="flex flex-col items-center gap-3 py-2 text-center">
					<p class="text-[13px] text-steel">{i18n.t('profile.activity.loadMoreError')}</p>
					<Button variant="secondary" size="sm" type="button" onclick={reintentar}>
						<Icon name="rotate-cw" size={16} /> {i18n.t('profile.activity.retry')}
					</Button>
				</div>
			{:else if cargando}
				<p class="flex items-center justify-center gap-2 py-2 text-[13px] text-steel">
					<Icon name="loader-circle" size={16} class="animate-spin" /> {i18n.t('profile.activity.loadingMore')}
				</p>
			{:else if !hayMas}
				<p class="text-center py-2 text-xs text-stone">{i18n.t('profile.activity.end')}</p>
			{/if}

			{#if hayMas && !errorCarga}
				<div bind:this={centinela} class="h-px w-full" aria-hidden="true"></div>
			{/if}
		</div>
	{/if}
</Card>
