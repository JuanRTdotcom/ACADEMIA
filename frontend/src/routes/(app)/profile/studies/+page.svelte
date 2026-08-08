<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Button, ConfirmationDialog, Icon, Input, ProfileCollectionShell, Select, Switch, i18n, parameterLabel } from '$lib';

	let { data }: PageProps = $props();
	type Realizado = (typeof data.realizados)[number];
	type Complementario = (typeof data.complementarios)[number];
	type Modo = 'academicAdd' | 'academicEdit' | 'academicDelete' | 'complementaryAdd' | 'complementaryEdit' | 'complementaryDelete' | null;

	let realizados = $derived<Realizado[]>(data.realizados);
	let complementarios = $derived<Complementario[]>(data.complementarios);
	let modo = $state<Modo>(null);
	let dialogAcademic = $state(false);
	let dialogComplementary = $state(false);
	let dialogDelete = $state(false);
	let objetivoRealizado = $state<Realizado | null>(null);
	let objetivoComplementario = $state<Complementario | null>(null);
	let operando = $state(false);
	let formularioAcademic: HTMLFormElement;
	let formularioComplementary: HTMLFormElement;
	let formularioDelete: HTMLFormElement;
	let resolver: (() => void) | null = null;
	let rechazar: ((error: Error) => void) | null = null;

	let nivel = $state(''); let grado = $state(''); let gradoOtro = $state('');
	let profesion = $state(''); let profesionOtra = $state('');
	let inicioAcademic = $state(''); let finAcademic = $state(''); let cursoAcademic = $state(false);
	let tipoComplementario = $state(''); let tipoComplementarioOtro = $state('');
	let nombreComplementario = $state(''); let institucion = $state(''); let inicioComplementario = $state('');
	let finComplementario = $state(''); let cursoComplementario = $state(false);

	const otro = 'otro';
	const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
	const localeFechas = $derived(i18n.locale === 'en' ? 'en-US' : 'es-PE');
	const nombreMes = $derived(new Intl.DateTimeFormat(localeFechas, { month: 'long', timeZone: 'UTC' }));
	function fechaValida(valor: string) {
		const partes = FECHA.exec(valor);
		if (!partes) return false;
		const anio = Number(partes[1]); const mes = Number(partes[2]); const dia = Number(partes[3]);
		const fecha = new Date(Date.UTC(anio, mes - 1, dia));
		return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
	}
	const periodoValido = (inicio: string, fin: string, enCurso: boolean) => fechaValida(inicio) && (enCurso ? !fin : fechaValida(fin) && fin > inicio);
	const academicValido = $derived(Boolean(nivel && grado && profesion) && (grado !== otro || gradoOtro.trim().length >= 2) && (profesion !== otro || profesionOtra.trim().length >= 2) && periodoValido(inicioAcademic, finAcademic, cursoAcademic));
	const complementaryValido = $derived(Boolean(tipoComplementario && nombreComplementario.trim().length >= 2 && institucion.trim().length >= 2) && (tipoComplementario !== otro || tipoComplementarioOtro.trim().length >= 2) && periodoValido(inicioComplementario, finComplementario, cursoComplementario));
	const academicCambiado = $derived(!objetivoRealizado || nivel !== objetivoRealizado.codigo_nivel_instruccion || grado !== objetivoRealizado.codigo_grado_obtenido || gradoOtro.trim() !== (objetivoRealizado.grado_obtenido_otro ?? '') || profesion !== objetivoRealizado.codigo_profesion || profesionOtra.trim() !== (objetivoRealizado.profesion_otro ?? '') || inicioAcademic !== objetivoRealizado.fecha_inicio || finAcademic !== (objetivoRealizado.fecha_fin ?? '') || cursoAcademic !== objetivoRealizado.en_curso);
	const complementaryCambiado = $derived(!objetivoComplementario || tipoComplementario !== objetivoComplementario.codigo_tipo_estudio || tipoComplementarioOtro.trim() !== (objetivoComplementario.tipo_estudio_otro ?? '') || nombreComplementario.trim() !== objetivoComplementario.nombre_estudio || institucion.trim() !== objetivoComplementario.institucion || inicioComplementario !== objetivoComplementario.fecha_inicio || finComplementario !== (objetivoComplementario.fecha_fin ?? '') || cursoComplementario !== objetivoComplementario.en_curso);

	function limpiarAcademic() {
		nivel = ''; grado = ''; gradoOtro = ''; profesion = ''; profesionOtra = '';
		inicioAcademic = ''; finAcademic = ''; cursoAcademic = false; objetivoRealizado = null;
	}
	function limpiarComplementary() {
		tipoComplementario = ''; tipoComplementarioOtro = ''; nombreComplementario = ''; institucion = '';
		inicioComplementario = ''; finComplementario = ''; cursoComplementario = false; objetivoComplementario = null;
	}
	function abrirAcademic(item?: Realizado) {
		limpiarAcademic();
		if (item) {
			objetivoRealizado = item; nivel = item.codigo_nivel_instruccion;
			grado = item.codigo_grado_obtenido; gradoOtro = item.grado_obtenido_otro ?? '';
			profesion = item.codigo_profesion; profesionOtra = item.profesion_otro ?? '';
			inicioAcademic = item.fecha_inicio; finAcademic = item.fecha_fin ?? ''; cursoAcademic = item.en_curso;
		}
		modo = item ? 'academicEdit' : 'academicAdd'; dialogAcademic = true;
	}
	function abrirComplementary(item?: Complementario) {
		limpiarComplementary();
		if (item) {
			objetivoComplementario = item; tipoComplementario = item.codigo_tipo_estudio;
			tipoComplementarioOtro = item.tipo_estudio_otro ?? ''; nombreComplementario = item.nombre_estudio; institucion = item.institucion;
			inicioComplementario = item.fecha_inicio; finComplementario = item.fecha_fin ?? ''; cursoComplementario = item.en_curso;
		}
		modo = item ? 'complementaryEdit' : 'complementaryAdd'; dialogComplementary = true;
	}
	function eliminarAcademic(item: Realizado) { objetivoRealizado = item; objetivoComplementario = null; modo = 'academicDelete'; dialogDelete = true; }
	function eliminarComplementary(item: Complementario) { objetivoComplementario = item; objetivoRealizado = null; modo = 'complementaryDelete'; dialogDelete = true; }

	function nombreParametro(parametro: { etiqueta: string; traducciones: Record<string, string> }, personalizado: string | null) {
		return personalizado || parameterLabel(parametro);
	}
	function rango(inicio: string, fin: string | null, enCurso: boolean) {
		return `${formatearFecha(inicio)} — ${enCurso ? i18n.t('profile.studies.current') : formatearFecha(fin ?? '')}`;
	}
	function formatearFecha(valor: string) {
		if (!fechaValida(valor)) return valor;
		const [anio, mes, dia] = valor.split('-').map(Number);
		// Es un DATE de calendario: se formatea en UTC para no desplazar el día según zona horaria.
		const mesTexto = nombreMes.format(new Date(Date.UTC(anio, mes - 1, dia)));
		return `${dia}, ${mesTexto.charAt(0).toLocaleUpperCase(localeFechas)}${mesTexto.slice(1)} ${anio}`;
	}
	function diaSiguiente(valor: string) {
		if (!fechaValida(valor)) return undefined;
		const [anio, mes, dia] = valor.split('-').map(Number);
		const fecha = new Date(Date.UTC(anio, mes - 1, dia + 1));
		return fecha.toISOString().slice(0, 10);
	}
	function procesarResultado(result: { type: string; status?: number; data?: Record<string, unknown> }) {
		const respuesta = result.data as { studiesMessage?: string; realizados?: Realizado[]; complementarios?: Complementario[] } | undefined;
		if (result.type === 'success' && respuesta?.realizados && respuesta.complementarios) {
			realizados = respuesta.realizados; complementarios = respuesta.complementarios;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t(respuesta.studiesMessage ?? 'profile.studies.saved') });
			resolver?.(); return true;
		}
		const description = i18n.t(respuesta?.studiesMessage ?? 'profile.studies.saveError');
		if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description });
		else toast.error(i18n.t('notifications.type.error'), { description });
		rechazar?.(new Error('studies-request-failed')); return false;
	}
	const mejorar: SubmitFunction = () => {
		operando = true;
		return async ({ result }) => {
			const exito = procesarResultado(result);
			if (exito && (modo === 'academicAdd' || modo === 'academicDelete')) limpiarAcademic();
			if (exito && (modo === 'complementaryAdd' || modo === 'complementaryDelete')) limpiarComplementary();
			operando = false; resolver = null; rechazar = null;
		};
	};
	function enviar(formulario: HTMLFormElement) {
		return new Promise<void>((resolve, reject) => { resolver = resolve; rechazar = reject; formulario.requestSubmit(); });
	}
	$effect(() => {
		if (cursoAcademic) finAcademic = '';
		if (cursoComplementario) finComplementario = '';
	});
	$effect(() => {
		if (!dialogAcademic && !dialogComplementary && !dialogDelete && !operando) modo = null;
	});
</script>

<svelte:head><title>{i18n.t('profile.tab.studies')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<ProfileCollectionShell title={i18n.t('profile.studies.academic.title')} subtitle={i18n.t('profile.studies.academic.subtitle')} icon="graduation-cap" hasItems={realizados.length > 0} emptyTitle={i18n.t('profile.studies.academic.empty')} emptyHint={i18n.t('profile.studies.academic.emptyHint')}>
		{#snippet actions()}<Button type="button" disabled={operando} onclick={() => abrirAcademic()}><Icon name="plus" size={18} />{i18n.t('profile.studies.add')}</Button>{/snippet}
		{#snippet content()}
			<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
				{#each realizados as item (item.id_personas_estudios_realizados)}
					<li class="flex items-center gap-4 px-4 py-3.5 max-[680px]:items-start">
						<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="graduation-cap" size={19} /></span>
						<div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-ink">{nombreParametro(item.profesion, item.profesion_otro)}</p><p class="mt-0.5 text-[13px] text-steel">{parameterLabel(item.nivel_instruccion)} · {nombreParametro(item.grado_obtenido, item.grado_obtenido_otro)}</p><p class="mt-1 text-xs text-stone">{rango(item.fecha_inicio, item.fecha_fin, item.en_curso)}</p></div>
						<div class="flex shrink-0 gap-2 max-[680px]:flex-col"><Button size="sm" disabled={operando} onclick={() => abrirAcademic(item)}><Icon name="pencil" size={16} />{i18n.t('profile.studies.edit')}</Button><Button variant="secondary" size="sm" class="!border-error !bg-transparent !text-error" disabled={operando} onclick={() => eliminarAcademic(item)}><Icon name="trash-2" size={16} />{i18n.t('profile.studies.delete')}</Button></div>
					</li>
				{/each}
			</ul>
		{/snippet}
	</ProfileCollectionShell>

	<ProfileCollectionShell title={i18n.t('profile.studies.complementary.title')} subtitle={i18n.t('profile.studies.complementary.subtitle')} icon="book-open-check" hasItems={complementarios.length > 0} emptyTitle={i18n.t('profile.studies.complementary.empty')} emptyHint={i18n.t('profile.studies.complementary.emptyHint')}>
		{#snippet actions()}<Button type="button" disabled={operando} onclick={() => abrirComplementary()}><Icon name="plus" size={18} />{i18n.t('profile.studies.add')}</Button>{/snippet}
		{#snippet content()}
			<ul class="m-0 flex list-none flex-col divide-y divide-hairline rounded-md border border-hairline p-0">
				{#each complementarios as item (item.id_personas_estudios_complementarios)}
					<li class="flex items-center gap-4 px-4 py-3.5 max-[680px]:items-start">
						<span class="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="book-open-check" size={19} /></span>
						<div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold text-ink">{item.nombre_estudio}</p><p class="mt-0.5 text-[13px] text-steel">{nombreParametro(item.tipo_estudio, item.tipo_estudio_otro)} · {item.institucion}</p><p class="mt-1 text-xs text-stone">{rango(item.fecha_inicio, item.fecha_fin, item.en_curso)}</p></div>
						<div class="flex shrink-0 gap-2 max-[680px]:flex-col"><Button size="sm" disabled={operando} onclick={() => abrirComplementary(item)}><Icon name="pencil" size={16} />{i18n.t('profile.studies.edit')}</Button><Button variant="secondary" size="sm" class="!border-error !bg-transparent !text-error" disabled={operando} onclick={() => eliminarComplementary(item)}><Icon name="trash-2" size={16} />{i18n.t('profile.studies.delete')}</Button></div>
					</li>
				{/each}
			</ul>
		{/snippet}
	</ProfileCollectionShell>
</div>

<ConfirmationDialog bind:open={dialogAcademic} size="wide" variant="info" icon="graduation-cap" title={i18n.t(modo === 'academicEdit' ? 'profile.studies.academic.editTitle' : 'profile.studies.academic.addTitle')} description={i18n.t('profile.studies.academic.dialogHint')} confirmLabel={i18n.t(modo === 'academicEdit' ? 'profile.studies.save' : 'profile.studies.add')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!academicValido || !academicCambiado || operando} onConfirm={() => enviar(formularioAcademic)}>
	<div class="grid grid-cols-12 gap-4 text-left">
		<div class="col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('profile.studies.level')} icon="graduation-cap" bind:value={nivel} disabled={operando} required><option value="">{i18n.t('profile.studies.select')}</option>{#each data.catalogos.niveles_instruccion as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select></div>
		<div class="col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('profile.studies.degree')} icon="award" bind:value={grado} disabled={operando} required><option value="">{i18n.t('profile.studies.select')}</option>{#each data.catalogos.grados_obtenidos as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select></div>
		{#if grado === otro}<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.otherDegree')} icon="pencil" bind:value={gradoOtro} minlength={2} maxlength={120} disabled={operando} required /></div>{/if}
		<div class="col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('profile.studies.profession')} icon="briefcase-business" bind:value={profesion} disabled={operando} required><option value="">{i18n.t('profile.studies.select')}</option>{#each data.catalogos.profesiones as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select></div>
		{#if profesion === otro}<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.otherProfession')} icon="pencil" bind:value={profesionOtra} minlength={2} maxlength={120} disabled={operando} required /></div>{/if}
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.start')} type="date" icon="calendar" bind:value={inicioAcademic} disabled={operando} required /></div>
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.end')} type="date" icon="calendar" bind:value={finAcademic} min={diaSiguiente(inicioAcademic)} disabled={cursoAcademic || operando} required={!cursoAcademic} /></div>
		<label class="col-span-12 flex items-center justify-between gap-4 rounded-md border border-hairline p-3 text-sm text-charcoal"><span>{i18n.t('profile.studies.inProgress')}</span><Switch bind:checked={cursoAcademic} disabled={operando} label={i18n.t('profile.studies.inProgress')} /></label>
	</div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={dialogComplementary} size="wide" variant="info" icon="book-open-check" title={i18n.t(modo === 'complementaryEdit' ? 'profile.studies.complementary.editTitle' : 'profile.studies.complementary.addTitle')} description={i18n.t('profile.studies.complementary.dialogHint')} confirmLabel={i18n.t(modo === 'complementaryEdit' ? 'profile.studies.save' : 'profile.studies.add')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={!complementaryValido || !complementaryCambiado || operando} onConfirm={() => enviar(formularioComplementary)}>
	<div class="grid grid-cols-12 gap-4 text-left">
		<div class="col-span-6 max-[560px]:col-span-12"><Select label={i18n.t('profile.studies.type')} icon="book" bind:value={tipoComplementario} disabled={operando} required><option value="">{i18n.t('profile.studies.select')}</option>{#each data.catalogos.tipos_estudio_complementario as item (item.codigo)}<option value={item.codigo}>{parameterLabel(item)}</option>{/each}</Select></div>
		{#if tipoComplementario === otro}<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.otherType')} icon="pencil" bind:value={tipoComplementarioOtro} minlength={2} maxlength={120} disabled={operando} required /></div>{/if}
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.name')} icon="book-open" bind:value={nombreComplementario} minlength={2} maxlength={150} disabled={operando} required /></div>
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.institution')} icon="building-2" bind:value={institucion} minlength={2} maxlength={150} disabled={operando} required /></div>
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.start')} type="date" icon="calendar" bind:value={inicioComplementario} disabled={operando} required /></div>
		<div class="col-span-6 max-[560px]:col-span-12"><Input label={i18n.t('profile.studies.end')} type="date" icon="calendar" bind:value={finComplementario} min={diaSiguiente(inicioComplementario)} disabled={cursoComplementario || operando} required={!cursoComplementario} /></div>
		<label class="col-span-12 flex items-center justify-between gap-4 rounded-md border border-hairline p-3 text-sm text-charcoal"><span>{i18n.t('profile.studies.inProgress')}</span><Switch bind:checked={cursoComplementario} disabled={operando} label={i18n.t('profile.studies.inProgress')} /></label>
	</div>
</ConfirmationDialog>

<ConfirmationDialog bind:open={dialogDelete} variant="danger" icon="trash-2" title={i18n.t('profile.studies.deleteTitle')} description={i18n.t('profile.studies.deleteHint')} confirmLabel={i18n.t('profile.studies.delete')} cancelLabel={i18n.t('profile.cancel')} confirmDisabled={operando} onConfirm={() => enviar(formularioDelete)} />

<form bind:this={formularioAcademic} method="POST" action={modo === 'academicEdit' ? '?/academicEdit' : '?/academicAdd'} use:enhance={mejorar} class="hidden">
	<input name="id" value={objetivoRealizado?.id_personas_estudios_realizados ?? ''} /><input name="codigo_nivel_instruccion" value={nivel} /><input name="codigo_grado_obtenido" value={grado} /><input name="grado_obtenido_otro" value={gradoOtro} /><input name="codigo_profesion" value={profesion} /><input name="profesion_otro" value={profesionOtra} /><input name="fecha_inicio" value={inicioAcademic} /><input name="fecha_fin" value={finAcademic} /><input name="en_curso" value={String(cursoAcademic)} />
</form>
<form bind:this={formularioComplementary} method="POST" action={modo === 'complementaryEdit' ? '?/complementaryEdit' : '?/complementaryAdd'} use:enhance={mejorar} class="hidden">
	<input name="id" value={objetivoComplementario?.id_personas_estudios_complementarios ?? ''} /><input name="codigo_tipo_estudio" value={tipoComplementario} /><input name="tipo_estudio_otro" value={tipoComplementarioOtro} /><input name="nombre_estudio" value={nombreComplementario} /><input name="institucion" value={institucion} /><input name="fecha_inicio" value={inicioComplementario} /><input name="fecha_fin" value={finComplementario} /><input name="en_curso" value={String(cursoComplementario)} />
</form>
<form bind:this={formularioDelete} method="POST" action={modo === 'academicDelete' ? '?/academicDelete' : '?/complementaryDelete'} use:enhance={mejorar} class="hidden"><input name="id" value={objetivoRealizado?.id_personas_estudios_realizados ?? objetivoComplementario?.id_personas_estudios_complementarios ?? ''} /></form>
