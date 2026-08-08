<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { CompanySectionCard, Input, Switch, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section, horarios: data.section.horarios.map((item) => ({ ...item })) })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const days = $derived([1, 2, 3, 4, 5, 6, 7].map((day) => i18n.t(`companies.schedule.day.${day}`)));
	const invalidSchedules = $derived(values.horarios.filter((schedule) => !schedule.cerrado && !(schedule.hora_apertura && schedule.hora_cierre && schedule.hora_apertura < schedule.hora_cierre)));
	const valid = $derived(
		(!values.soporte_correo || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.soporte_correo)) &&
		invalidSchedules.length === 0
	);
	const dirty = $derived(JSON.stringify(values) !== baseline);
	function saved() { baseline = JSON.stringify(values); }
	function toggleDay(index: number, open: boolean) {
		values.horarios[index].cerrado = !open;
		values.horarios[index].hora_apertura = open ? '08:00' : null;
		values.horarios[index].hora_cierre = open ? '18:00' : null;
	}
</script>

<CompanySectionCard title={i18n.t('companies.section.communications')} subtitle={i18n.t('companies.section.communicationsDescription')} {valid} {dirty} onSaved={saved}>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_correo" label={i18n.t('companies.field.supportEmail')} icon="mail" type="email" bind:value={values.soporte_correo} maxlength={120} /></div>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_telefono" label={i18n.t('companies.field.supportPhone')} icon="phone-call" bind:value={values.soporte_telefono} maxlength={30} /></div>
	<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="soporte_whatsapp" label={i18n.t('companies.field.supportWhatsapp')} icon="message-circle" bind:value={values.soporte_whatsapp} maxlength={30} /></div>

	<input type="hidden" name="horarios" value={JSON.stringify(values.horarios)} />
	<section class="col-span-12 mt-3 overflow-hidden rounded-md border border-hairline" aria-labelledby="support-hours-title">
		<div class="border-b border-hairline bg-surface px-4 py-3">
			<h3 id="support-hours-title" class="text-sm font-semibold text-ink">{i18n.t('companies.schedule.title')}</h3>
			<p class="mt-0.5 text-xs text-steel">{i18n.t('companies.schedule.description')}</p>
		</div>
		<div class="grid grid-cols-[minmax(120px,1fr)_120px_140px_140px] gap-3 border-b border-hairline bg-canvas px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-steel max-[700px]:hidden" aria-hidden="true">
			<span>{i18n.t('companies.schedule.day')}</span>
			<span>{i18n.t('companies.schedule.status')}</span>
			<span>{i18n.t('companies.schedule.from')}</span>
			<span>{i18n.t('companies.schedule.to')}</span>
		</div>
		<div class="divide-y divide-hairline">
			{#each values.horarios as schedule, index (schedule.dia_semana)}
				<div class="grid grid-cols-[minmax(120px,1fr)_120px_140px_140px] items-center gap-3 px-4 py-2.5 max-[700px]:grid-cols-2 max-[700px]:gap-x-4 max-[700px]:gap-y-2.5">
					<span class="text-sm font-medium text-ink">{days[index]}</span>
					<div class="flex items-center justify-between gap-2 max-[700px]:justify-end"><span class="text-xs text-steel">{schedule.cerrado ? i18n.t('companies.schedule.closed') : i18n.t('companies.schedule.open')}</span><Switch checked={!schedule.cerrado} label={`${days[index]} ${i18n.t('companies.schedule.open')}`} onchange={(open) => toggleDay(index, open)} /></div>
					<label class="flex min-w-0 flex-col gap-1 text-xs text-steel"><span class="hidden max-[700px]:block">{i18n.t('companies.schedule.from')}</span><input type="time" aria-label={`${days[index]} ${i18n.t('companies.schedule.from')}`} aria-invalid={invalidSchedules.includes(schedule) ? 'true' : undefined} value={schedule.hora_apertura ?? ''} disabled={schedule.cerrado} onchange={(event) => (schedule.hora_apertura = event.currentTarget.value || null)} class="h-9 min-w-0 w-full rounded-md border bg-canvas px-2.5 text-sm text-ink outline-none transition-all duration-150 focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface disabled:text-stone {invalidSchedules.includes(schedule) ? 'border-error' : 'border-hairline-strong'}" /></label>
					<label class="flex min-w-0 flex-col gap-1 text-xs text-steel"><span class="hidden max-[700px]:block">{i18n.t('companies.schedule.to')}</span><input type="time" aria-label={`${days[index]} ${i18n.t('companies.schedule.to')}`} aria-invalid={invalidSchedules.includes(schedule) ? 'true' : undefined} value={schedule.hora_cierre ?? ''} disabled={schedule.cerrado} onchange={(event) => (schedule.hora_cierre = event.currentTarget.value || null)} class="h-9 min-w-0 w-full rounded-md border bg-canvas px-2.5 text-sm text-ink outline-none transition-all duration-150 focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface disabled:text-stone {invalidSchedules.includes(schedule) ? 'border-error' : 'border-hairline-strong'}" /></label>
				</div>
			{/each}
		</div>
		{#if invalidSchedules.length}<p class="border-t border-error/20 bg-error/5 px-4 py-2.5 text-xs text-error" role="alert">{i18n.t('companies.schedule.invalid')}</p>{/if}
	</section>
</CompanySectionCard>
