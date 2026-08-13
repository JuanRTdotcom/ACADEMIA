<script lang="ts">
  import { page } from '$app/state';
  import type { LayoutProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, Icon, i18n, tienePermiso } from '$lib';

  let { data, children }: LayoutProps = $props();
  const pet = $derived(data.mascota);
  const canEdit = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
  const tabs = $derived([
    { href: `/clinic/pets/${pet.id_mascotas}/summary`, label: i18n.t('pets.tabSummary'), icon: 'layout-dashboard' },
    { href: `/clinic/pets/${pet.id_mascotas}/history`, label: i18n.t('pets.clinicalHistory'), icon: 'stethoscope', count: pet._count.atenciones },
    { href: `/clinic/pets/${pet.id_mascotas}/purchases`, label: i18n.t('pets.tabPurchases'), icon: 'shopping-bag', count: pet._count.ventas },
    { href: `/clinic/pets/${pet.id_mascotas}/documents`, label: i18n.t('pets.tabDocuments'), icon: 'files', count: pet._count.documentos },
    { href: `/clinic/pets/${pet.id_mascotas}/reminders`, label: i18n.t('pets.tabReminders'), icon: 'bell-ring', count: pet._count.recordatorios }
  ]);
  const active = (href: string) => page.url.pathname === href;
  const isEditing = $derived(page.url.pathname === `/clinic/pets/${pet.id_mascotas}/edit`);
</script>

{#if isEditing}
  {@render children()}
{:else}
  <Breadcrumb items={[{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('pets.title'), href: '/clinic/pets' }, { label: pet.nombre }]} />

  <section class="space-y-5">
    <Card padding="none" class="overflow-hidden border-hairline-strong">
      <div class="grid gap-5 p-5 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:p-6">
        {#if pet.foto_version}
          <img src={`/media/pets/${pet.id_mascotas}/${pet.foto_version}`} alt={pet.nombre} class="size-28 rounded-2xl border-[3px] border-hairline object-cover" style:border-color={pet.temperamento?.color_hex ?? undefined} />
        {:else}
          <span class="grid size-28 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name="paw-print" size={42} /></span>
        {/if}
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2"><h1 class="truncate text-[28px] font-semibold tracking-[-0.02em] text-ink">{pet.nombre}</h1>{#if pet.temperamento}<Badge variant="outline-sky">{pet.temperamento.etiqueta}</Badge>{/if}</div>
          <p class="mt-1 text-sm text-steel">{pet.especie}{pet.clasificacion ? ` · ${pet.clasificacion}` : ''}{pet.propietario ? ` · ${pet.propietario.nombre_completo}` : ` · ${i18n.t('pets.noOwner')}`}</p>
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-stone"><span>{i18n.t('pets.weight')}: <strong class="text-ink">{pet.peso ? `${pet.peso} ${pet.unidad_peso?.etiqueta ?? ''}` : '—'}</strong></span><span>{i18n.t('pets.gender')}: <strong class="text-ink">{pet.genero.etiqueta}</strong></span>{#if pet.codigo_chip}<span>{i18n.t('pets.chip')}: <strong class="text-ink">{pet.codigo_chip}</strong></span>{/if}</div>
        </div>
        {#if canEdit}<Button href={`/clinic/pets/${pet.id_mascotas}/edit`} variant="secondary"><Icon name="pencil" size={17} />{i18n.t('pets.edit')}</Button>{/if}
      </div>
      <nav class="flex gap-1 overflow-x-auto border-t border-hairline px-3 pt-2" aria-label={i18n.t('pets.profileTabs')}>
        {#each tabs as tab (tab.href)}
          <a href={tab.href} aria-current={active(tab.href) ? 'page' : undefined} class="inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors {active(tab.href) ? 'border-primary text-primary' : 'border-transparent text-steel hover:text-ink'}"><Icon name={tab.icon} size={17} />{tab.label}{#if tab.count !== undefined}<span class="rounded-full bg-surface px-2 py-0.5 text-[11px] text-stone">{tab.count}</span>{/if}</a>
        {/each}
      </nav>
    </Card>
    {@render children()}
  </section>
{/if}
