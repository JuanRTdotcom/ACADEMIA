<script lang="ts">
  import type { PageProps } from './$types';
  import { Card, Icon, i18n } from '$lib';
  let { data }: PageProps = $props();
  const pet = $derived(data.mascota);
  const rows = $derived([
    [i18n.t('pets.birthDate'), pet.fecha_nacimiento ? new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(pet.fecha_nacimiento)) : '—'],
    [i18n.t('pets.color'), pet.color?.etiqueta ?? '—'], [i18n.t('pets.size'), pet.talla?.etiqueta ?? '—'], [i18n.t('pets.reproductiveStatus'), pet.estado_reproductivo?.etiqueta ?? '—'],
    [i18n.t('pets.food'), pet.alimento ?? '—'], [i18n.t('pets.serviceAnimal'), i18n.t(pet.animal_servicio ? 'common.yes' : 'common.no')], [i18n.t('pets.emotionalSupport'), i18n.t(pet.apoyo_emocional ? 'common.yes' : 'common.no')]
  ]);
</script>
<Card><div class="flex items-center gap-2"><Icon name="paw-print" size={19} class="text-primary" /><h2 class="text-lg font-semibold text-ink">{i18n.t('pets.generalInformation')}</h2></div><dl class="mt-5 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">{#each rows as row}<div class="grid grid-cols-[minmax(130px,0.8fr)_minmax(0,1fr)] gap-3 border-b border-hairline py-3"><dt class="text-sm text-stone">{row[0]}</dt><dd class="min-w-0 text-sm font-medium text-ink">{row[1]}</dd></div>{/each}</dl></Card>
{#if pet.propietario}<Card><h2 class="text-lg font-semibold text-ink">{i18n.t('pets.owner')}</h2><div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div><span class="text-xs text-stone">{i18n.t('owners.fullName')}</span><strong class="mt-1 block text-sm text-ink">{pet.propietario.nombre_completo}</strong></div><div><span class="text-xs text-stone">{i18n.t('owners.mobile')}</span><strong class="mt-1 block text-sm text-ink">{pet.propietario.celular ?? '—'}</strong></div><div><span class="text-xs text-stone">{i18n.t('owners.email')}</span><strong class="mt-1 block truncate text-sm text-ink">{pet.propietario.correo ?? '—'}</strong></div><div><span class="text-xs text-stone">{i18n.t('owners.address')}</span><strong class="mt-1 block text-sm text-ink">{pet.propietario.direccion ?? '—'}</strong></div></div></Card>{/if}
