<script lang="ts">
	import { Button, Card, Icon, Input, Select, i18n } from '$lib';
</script>
<svelte:head><title>{i18n.t('profile.tab.family')} · Sumaq System</title></svelte:head>
<Card padding="xl">
	<div class="mb-6">
		<h2 class="text-lg text-ink">{i18n.t('profile.tab.family')}</h2><p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.professional.familyHint')}</p>
	</div>
	<div class="grid grid-cols-12 gap-4 border-b border-hairline pb-6">
		<div class="col-span-7 max-[760px]:col-span-12"><Input label="Buscar persona por usuario o nombre" icon="search" placeholder="Ej. JRUIZT" /></div>
		<div class="col-span-3 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select label="Relación" icon="users"><option value="">Selecciona</option><option>Padre</option><option>Madre</option><option>Hijo(a)</option><option>Apoderado(a)</option><option>Alumno(a)</option></Select></div>
		<div class="col-span-2 flex items-end justify-end max-[760px]:col-span-6 max-[560px]:col-span-12"><Button><Icon name="plus" size={18} />Relacionar</Button></div>
	</div>
	<div class="mt-6 grid min-h-44 place-items-center rounded-md border border-dashed border-hairline-strong bg-surface/60 px-6 text-center">
		<div><Icon name="users-round" size={30} class="mx-auto text-stone" /><p class="mt-3 text-sm font-semibold text-ink">Aún no hay familiares relacionados</p><p class="mt-1 max-w-md text-[13px] leading-relaxed text-steel">Aquí aparecerán hijos, padres, alumnos o apoderados cuando definamos permisos y aprobación de la relación.</p></div>
	</div>
</Card>
