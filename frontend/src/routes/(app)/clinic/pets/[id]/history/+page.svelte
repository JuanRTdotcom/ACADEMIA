<script lang="ts">
  import type { PageProps } from './$types';
  import { slide } from 'svelte/transition';
  import { Badge, Button, Card, Icon, i18n } from '$lib';
  import AttachmentFileIcon from '$lib/components/AttachmentFileIcon.svelte';
  import { attentionAttachmentExtension } from '$lib/config/attention-attachments';

  let { data }: PageProps = $props();
  type Attention = (typeof data.atenciones)[number];
  type ClinicalRecord = Attention['registros'][number];
  type RecordType = ClinicalRecord['tipo'];
  type Field = { clave: string; tipo?: string; etiqueta?: string; etiqueta_es?: string; etiqueta_en?: string };
  let openAttentionId = $state<string | null>(null);
  const userTimeZone = $derived(data.usuario.preferencias.zona_horaria);

  function formatDate(value: string | Date, timeZone = 'UTC') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'long', timeZone }).format(date);
  }
  function formatDateTime(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'long', timeStyle: 'short', timeZone: userTimeZone }).format(date);
  }
  function formatTime(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { timeStyle: 'short', timeZone: userTimeZone }).format(date);
  }
  function formatRecordDay(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const parts = new Intl.DateTimeFormat(i18n.locale, { day: '2-digit', month: 'short', timeZone: userTimeZone }).formatToParts(date);
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '');
    return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`.trim();
  }
  function fields(type: RecordType) { return Array.isArray(type.campos) ? type.campos as Field[] : []; }
  function field(type: RecordType, key: string) { return fields(type).find((item) => item.clave === key); }
  function label(type: RecordType, key: string) { const definition = field(type, key); return (i18n.locale === 'en' ? definition?.etiqueta_en : definition?.etiqueta_es) ?? definition?.etiqueta ?? key.replaceAll('_', ' '); }
  function typeName(type: RecordType) { return i18n.locale === 'en' ? (type.nombre_en ?? type.nombre) : (type.nombre_es ?? type.nombre); }
  function value(type: RecordType, key: string, item: unknown) {
    if (typeof item === 'boolean') return i18n.t(item ? 'common.yes' : 'common.no');
    const fieldType = field(type, key)?.tipo;
    if (typeof item === 'string' && fieldType === 'date') return formatDate(item);
    if (typeof item === 'string' && fieldType === 'datetime') return formatDateTime(item);
    return String(item);
  }
  function listSummary(items: unknown[]) { return items.map((item) => { if (!item || typeof item !== 'object' || Array.isArray(item)) return ''; const row = item as Record<string, unknown>; const name = String(row.medicamento ?? row.prueba ?? row.servicio ?? '').trim(); const quantity = String(row.cantidad ?? '').trim(); const professional = String(row.profesional ?? row.encargado ?? '').trim(); const category = String(row.categoria ?? row.motivo ?? '').trim(); const details = String(row.detalle_observaciones ?? '').trim(); return [quantity ? `${name} (${quantity})` : name, category, professional, details].filter(Boolean).join(' · '); }).filter(Boolean).join(', '); }
  function detailEntries(record: ClinicalRecord) { return Object.entries(record.detalle).filter(([key]) => !['fecha_programada', 'programado_para'].includes(key)); }
  function futureOf(record: ClinicalRecord) {
    if (record.fecha_programada) return { key: 'fecha_programada', value: formatDate(record.fecha_programada) };
    if (record.programado_para) return { key: 'programado_para', value: formatDateTime(record.programado_para) };
    return null;
  }
  function ownerLocation(attention: Attention) {
    const level = attention.propietario?.admin_level_3;
    return [level?.admin_level_1?.nombre, level?.admin_level_2?.nombre, level?.nombre].filter(Boolean).join(', ');
  }
</script>

{#snippet detailValue(type: RecordType, key: string, item: unknown)}
  {#if Array.isArray(item)}
    <dd class="mt-1 text-sm leading-5 text-ink">{listSummary(item)}</dd>
  {:else}
    <dd class="mt-1 whitespace-pre-wrap text-sm leading-5 text-ink">{value(type, key, item)}</dd>
  {/if}
{/snippet}

{#snippet attachments(attention: Attention, record: ClinicalRecord, compact = false)}
  {#if record.adjuntos?.length}
    <div class="flex flex-wrap gap-3 border-t border-hairline px-4 py-3 sm:px-5">
      {#each record.adjuntos as attachment (attachment.id_adjuntos_registro_atencion)}
        {@const href = `/media/attentions/${attention.id_atenciones}/records/${record.id_registros_atencion}/attachments/${attachment.id_adjuntos_registro_atencion}`}
        <a {href} target="_blank" rel="noreferrer" title={attachment.nombre_original} class="relative overflow-hidden rounded-md border border-hairline bg-surface">
          {#if attachment.tipo_mime.startsWith('image/')}
            <img src={href} alt={attachment.nombre_original} class={compact ? 'size-20 object-cover' : 'size-28 object-cover'} />
            {#if attachment.etapa_foto}<span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{attachment.etapa_foto}</span>{/if}
          {:else}
            <span class={compact ? 'flex h-20 w-48 min-w-0 items-center gap-2.5 px-3' : 'flex h-28 w-56 min-w-0 items-center gap-3 px-4'}><AttachmentFileIcon name={attachment.nombre_original} size={compact ? 34 : 44} /><span class="min-w-0"><strong class="block text-[11px] uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(attachment.nombre_original)}</strong><span class="mt-0.5 block truncate text-xs font-medium text-ink">{attachment.nombre_original}</span></span></span>
          {/if}
        </a>
      {/each}
    </div>
  {/if}
{/snippet}

<svelte:head><title>{i18n.t('pets.clinicalHistory')} · {data.mascota.nombre}</title></svelte:head>
<section class="flex flex-col gap-6">
  {#if data.atenciones.length === 0}
    <Card><div class="flex flex-col items-center py-12 text-center"><span class="grid size-12 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="history" size={23} /></span><h2 class="mt-4 text-lg font-semibold text-ink">{i18n.t('pets.historyEmpty')}</h2><p class="mt-1 max-w-md text-sm text-steel">{i18n.t('pets.historyEmptyHelp')}</p></div></Card>
  {:else}
    <div class="space-y-8">
      {#each data.atenciones as attention (attention.id_atenciones)}
        <section aria-labelledby={`attention-${attention.id_atenciones}`}>
          <Card padding="none" class="mb-4 overflow-hidden border-hairline-strong">
            <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
              <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 id={`attention-${attention.id_atenciones}`} class="text-base font-bold text-ink">{formatDate(attention.fecha_atencion)}</h2><Badge variant="outline-sky">{attention.estado_atencion.etiqueta}</Badge></div><div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-steel"><span class="inline-flex items-center gap-1.5"><Icon name="clock" size={14} />{formatTime(attention.llegada_en)}</span><span class="inline-flex items-center gap-1.5"><Icon name="contact" size={14} />{attention.propietario?.nombre_completo ?? i18n.t('pets.noOwner')}</span>{#if attention.propietario?.celular}<span class="inline-flex items-center gap-1.5"><Icon name="phone" size={14} />{attention.propietario.celular}</span>{/if}<span>{i18n.t('pets.historyRecords', { count: attention.registros.length })}</span></div>{#if attention.propietario?.direccion}<p class="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-steel"><Icon name="map-pin" size={14} class="shrink-0" /><span class="truncate">{attention.propietario.direccion}{ownerLocation(attention) ? ` · ${ownerLocation(attention)}` : ''}</span></p>{/if}</div>
              <Button type="button" variant={openAttentionId === attention.id_atenciones ? 'secondary' : 'primary'} aria-expanded={openAttentionId === attention.id_atenciones} aria-controls={`attention-records-${attention.id_atenciones}`} onclick={() => (openAttentionId = openAttentionId === attention.id_atenciones ? null : attention.id_atenciones)}><Icon name={openAttentionId === attention.id_atenciones ? 'chevron-up' : 'eye'} size={17} />{i18n.t(openAttentionId === attention.id_atenciones ? 'pets.historyHide' : 'pets.historyView')}</Button>
            </div>
          </Card>

          {#if openAttentionId === attention.id_atenciones}
            <div id={`attention-records-${attention.id_atenciones}`} transition:slide={{ duration: 200 }}>
            {#if attention.registros.length}
            <ol aria-label={formatDate(attention.fecha_atencion)}>
              {#each attention.registros as record, index (record.id_registros_atencion)}
                {@const future = futureOf(record)}
                <li class="grid grid-cols-[46px_38px_minmax(0,1fr)] gap-2 sm:grid-cols-[64px_44px_minmax(0,1fr)] sm:gap-3">
                  <time datetime={String(record.realizado_en)} class="pt-1 text-right tabular-nums text-steel sm:pt-1.5"><span class="block text-[10px] font-bold uppercase leading-4 tracking-[0.02em] text-stone sm:text-[11px]">{formatRecordDay(record.realizado_en)}</span><span class="block text-[11px] font-semibold leading-4 sm:text-xs">{formatTime(record.realizado_en)}</span></time>
                  <div class="relative flex justify-center">{#if index < attention.registros.length - 1}<span class="absolute bottom-0 top-9 w-0.5 bg-hairline-strong sm:top-10" aria-hidden="true"></span>{/if}<span class="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-[3px] border-canvas text-white shadow-soft sm:size-10" style:background-color={record.tipo.color_hex}><Icon name={record.tipo.icono} size={18} /></span></div>
                  <Card padding="none" class="mb-4 overflow-hidden border-hairline-strong shadow-[0_2px_8px_rgb(15_23_42/0.05)] sm:mb-5">
                    <div class="grid lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]"><div class="min-h-14 border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5 lg:border-b-0 lg:border-r"><h3 class="text-[15px] font-bold leading-5 text-ink">{typeName(record.tipo)}</h3></div><div class="grid min-w-0 {future ? 'xl:grid-cols-[minmax(0,1fr)_190px]' : ''}"><div class="min-w-0"><dl class="grid content-start gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">{#each detailEntries(record) as [key, item]}<div class={Array.isArray(item) || String(item).length > 60 ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}><dt class="text-xs font-medium text-stone">{label(record.tipo, key)}</dt>{@render detailValue(record.tipo, key, item)}</div>{/each}</dl>{@render attachments(attention, record)}</div>{#if future}<div class="flex items-center gap-3 border-t border-hairline px-4 py-3 sm:px-5 xl:border-l xl:border-t-0"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="calendar-clock" size={17} /></span><div class="min-w-0"><span class="block text-xs font-medium text-stone">{label(record.tipo, future.key)}</span><strong class="mt-1 block text-sm leading-5 text-ink">{future.value}</strong></div></div>{/if}</div></div>
                    {#if record.seguimientos?.length}<div class="border-t border-hairline bg-surface/40 px-4 py-3 sm:px-5"><div class="mb-2.5 flex items-center gap-2 text-sm font-semibold leading-none text-ink"><Icon name="message-circle" size={16} class="text-primary" />{i18n.t('attentions.followUps')}<span class="rounded-full bg-primary-soft px-2 py-1 text-[11px] leading-none text-primary">{record.seguimientos.length}</span></div><div class="ml-3 space-y-2.5 border-l-2 border-primary/25 pl-5">{#each record.seguimientos as followUp (followUp.id_registros_atencion)}{@const followUpFuture = futureOf(followUp)}<article class="relative rounded-lg border border-hairline-strong border-l-2 border-l-primary/40 bg-canvas before:absolute before:-left-[23px] before:top-6 before:h-0.5 before:w-5 before:bg-primary/25"><div class="grid lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]"><div class="border-b border-hairline px-3.5 py-3 lg:border-b-0 lg:border-r"><strong class="block text-sm font-bold leading-5 text-ink">{typeName(followUp.tipo)}</strong><span class="mt-1 block text-[11px] font-semibold text-stone">{formatRecordDay(followUp.created_at)}</span><span class="block text-xs text-steel">{formatTime(followUp.created_at)}</span></div><div class="grid min-w-0 {followUpFuture ? 'xl:grid-cols-[minmax(0,1fr)_180px]' : ''}"><div class="min-w-0"><dl class="grid gap-x-5 gap-y-2 px-3.5 py-3 sm:grid-cols-2">{#each detailEntries(followUp) as [key, item]}<div class={String(item).length > 80 ? 'sm:col-span-2' : ''}><dt class="text-[11px] font-medium text-stone">{label(followUp.tipo, key)}</dt>{@render detailValue(followUp.tipo, key, item)}</div>{/each}</dl>{@render attachments(attention, followUp, true)}</div>{#if followUpFuture}<div class="flex items-center gap-2.5 border-t border-hairline px-3.5 py-3 xl:border-l xl:border-t-0"><Icon name="calendar-clock" size={16} class="text-primary" /><div><span class="block text-[11px] text-stone">{label(followUp.tipo, followUpFuture.key)}</span><strong class="text-sm text-ink">{followUpFuture.value}</strong></div></div>{/if}</div></div></article>{/each}</div></div>{/if}
                  </Card>
                </li>
              {/each}
            </ol>
            {:else}<Card><p class="py-6 text-center text-sm text-steel">{i18n.t('pets.historyNoRecords')}</p></Card>{/if}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</section>
