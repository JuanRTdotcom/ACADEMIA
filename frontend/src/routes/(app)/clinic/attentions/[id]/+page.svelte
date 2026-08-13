<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import RecordDialog, { type Field, type RecordType } from '../_components/RecordDialog.svelte';
  import AttentionActionButton from '../_components/AttentionActionButton.svelte';
  import AttachmentFileIcon from '$lib/components/AttachmentFileIcon.svelte';
  import OwnerBadge from '../_components/OwnerBadge.svelte';
  import { attentionAttachmentExtension } from '$lib/config/attention-attachments';

  let { data }: PageProps = $props();
  type ClinicalRecord = (typeof data.atencion.registros)[number];
  type ClinicalAttachment = ClinicalRecord['adjuntos'][number];
  let selectedType = $state<RecordType | null>(null); let recordOpen = $state(false); let petDetailsOpen = $state(false); let detail = $state('{}'); let retainedAttachments = $state('[]'); let saving = $state(false); let recordForm = $state<HTMLFormElement>(); let deleteForm = $state<HTMLFormElement>(); let deleteOpen = $state(false); let deleteId = $state(''); let editingRecord = $state<ClinicalRecord | null>(null); let originRecordId = $state('');
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.update'));
  const canEditPet = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.read') && tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
  const canCreateVaccine = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.create'));
  const canCreateConsultationReason = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.create'));
  const canCreateHospitalizationType = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.create'));
  const canCreateProcedure = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.create'));
  const canCreateLaboratoryTest = $derived(tienePermiso(data.usuario.permisos, 'administrator.laboratory_tests.create'));
  const canCreateDiagnosticStudy = $derived(tienePermiso(data.usuario.permisos, 'administrator.diagnostic_studies.create'));
  const canCreateGroomingService = $derived(tienePermiso(data.usuario.permisos, 'administrator.grooming_services.create'));
  const closed = $derived(['finalizada', 'cancelada'].includes(data.atencion.estado_atencion.codigo));
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('attentions.title'), href: '/clinic/attentions' }, { label: data.atencion.mascota.nombre }]);
  const userTimeZone = $derived(data.usuario.preferencias.zona_horaria);
  function formatDate(value: string | Date, timeZone = 'UTC') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'long', timeZone }).format(date);
  }
  function formatDateTime(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'long', timeStyle: 'short', timeZone: userTimeZone }).format(date);
  }
  function timelineDay(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: userTimeZone }).formatToParts(date);
    const number = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const year = number('year'); const month = number('month'); const day = number('day');
    return { key: `${year}-${month}-${day}`, ordinal: Date.UTC(year, month - 1, day) / 86_400_000 };
  }
  function timelineTime(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(i18n.locale, { timeStyle: 'short', timeZone: userTimeZone }).format(date);
  }
  function timelineShortDate(value: string | Date) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const parts = new Intl.DateTimeFormat(i18n.locale, { day: '2-digit', month: 'short', timeZone: userTimeZone }).formatToParts(date);
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '');
    return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`.trim();
  }
  function timelineDayLabel(value: string | Date) {
    const day = timelineDay(value); const today = timelineDay(new Date());
    if (!day || !today || day.ordinal === today.ordinal) return null;
    return day.ordinal === today.ordinal - 1 ? i18n.t('attentions.yesterday') : formatDate(value, userTimeZone);
  }
  const formatBirthDate = (value: string | Date | null) => value ? formatDate(value) : '—';
  function start(type: RecordType) { selectedType = type; editingRecord = null; originRecordId = ''; recordOpen = true; }
  function startEdit(record: ClinicalRecord) { selectedType = data.opciones.tipos.find((item: RecordType) => item.id_tipos_registro_atencion === record.tipo.id_tipos_registro_atencion) ?? null; editingRecord = record; originRecordId = record.fid_registros_atencion_origen ?? ''; recordOpen = Boolean(selectedType); }
  function startFollowUp(record: ClinicalRecord) { selectedType = data.opciones.tipos.find((item: RecordType) => item.requiere_registro_origen) ?? null; editingRecord = null; originRecordId = record.id_registros_atencion; recordOpen = Boolean(selectedType); }
  let pendingRecord: { resolve: () => void; reject: (error: Error) => void } | null = null;
  function saveDetail(value: Record<string, unknown>, attachments: File[], retained: string[][]) {
    return new Promise<void>((resolve, reject) => {
      pendingRecord = { resolve, reject };
      detail = JSON.stringify(value);
      retainedAttachments = JSON.stringify(retained);
      const transfer = new DataTransfer();
      attachments.forEach((file) => transfer.items.add(file));
      attachmentInput.files = transfer.files;
      requestAnimationFrame(() => recordForm?.requestSubmit());
    });
  }
  let attachmentInput: HTMLInputElement;
  let vaccineForm: HTMLFormElement;
  let vaccineName = $state('');
  let pendingVaccine: { resolve: (vaccine: { id_vacunas: string; nombre: string }) => void; reject: (error: Error) => void } | null = null;
  function createVaccine(name: string) {
    return new Promise<{ id_vacunas: string; nombre: string }>((resolve, reject) => {
      pendingVaccine = { resolve, reject };
      vaccineName = name;
      requestAnimationFrame(() => vaccineForm.requestSubmit());
    });
  }
  const vaccineSubmit: SubmitFunction = () => async ({ result }) => {
    if (result.type === 'success' && result.data && 'vaccine' in result.data) pendingVaccine?.resolve(result.data.vaccine as { id_vacunas: string; nombre: string });
    else {
      const message = result.type === 'failure' && typeof result.data?.vaccineMessage === 'string' ? result.data.vaccineMessage : 'vaccines.saveError';
      pendingVaccine?.reject(new Error(message));
    }
    pendingVaccine = null;
  };
  let consultationReasonForm: HTMLFormElement;
  let consultationReasonName = $state('');
  let consultationReasonDescription = $state('');
  let pendingConsultationReason: { resolve: (value: { id_motivos_consulta: string; nombre: string; descripcion: string | null }) => void; reject: (error: Error) => void } | null = null;
  function createConsultationReason(name: string, description: string) {
    return new Promise<{ id_motivos_consulta: string; nombre: string; descripcion: string | null }>((resolve, reject) => {
      pendingConsultationReason = { resolve, reject }; consultationReasonName = name; consultationReasonDescription = description;
      requestAnimationFrame(() => consultationReasonForm.requestSubmit());
    });
  }
  const consultationReasonSubmit: SubmitFunction = () => async ({ result }) => {
    if (result.type === 'success' && result.data && 'consultationReason' in result.data) pendingConsultationReason?.resolve(result.data.consultationReason as { id_motivos_consulta: string; nombre: string; descripcion: string | null });
    else { const message = result.type === 'failure' && typeof result.data?.reasonMessage === 'string' ? result.data.reasonMessage : 'consultationReasons.saveError'; pendingConsultationReason?.reject(new Error(message)); }
    pendingConsultationReason = null;
  };
  let hospitalizationTypeForm: HTMLFormElement;
  let hospitalizationTypeName = $state('');
  let pendingHospitalizationType: { resolve: (value: { id_tipos_hospitalizacion: string; nombre: string }) => void; reject: (error: Error) => void } | null = null;
  function createHospitalizationType(name: string) {
    return new Promise<{ id_tipos_hospitalizacion: string; nombre: string }>((resolve, reject) => {
      pendingHospitalizationType = { resolve, reject };
      hospitalizationTypeName = name;
      requestAnimationFrame(() => hospitalizationTypeForm.requestSubmit());
    });
  }
  const hospitalizationTypeSubmit: SubmitFunction = () => async ({ result }) => {
    if (result.type === 'success' && result.data && 'hospitalizationType' in result.data) pendingHospitalizationType?.resolve(result.data.hospitalizationType as { id_tipos_hospitalizacion: string; nombre: string });
    else {
      const message = result.type === 'failure' && typeof result.data?.hospitalizationTypeMessage === 'string' ? result.data.hospitalizationTypeMessage : 'hospitalizationTypes.saveError';
      pendingHospitalizationType?.reject(new Error(message));
    }
    pendingHospitalizationType = null;
  };
  let procedureForm: HTMLFormElement;
  let procedureName = $state('');
  let procedureDescription = $state('');
  let pendingProcedure: { resolve: (value: { id_procedimientos_veterinarios: string; nombre: string; descripcion_guia: string }) => void; reject: (error: Error) => void } | null = null;
  function createProcedure(name: string, description: string) {
    return new Promise<{ id_procedimientos_veterinarios: string; nombre: string; descripcion_guia: string }>((resolve, reject) => {
      pendingProcedure = { resolve, reject }; procedureName = name; procedureDescription = description;
      requestAnimationFrame(() => procedureForm.requestSubmit());
    });
  }
  const procedureSubmit: SubmitFunction = () => async ({ result }) => {
    if (result.type === 'success' && result.data && 'procedure' in result.data) pendingProcedure?.resolve(result.data.procedure as { id_procedimientos_veterinarios: string; nombre: string; descripcion_guia: string });
    else { const message = result.type === 'failure' && typeof result.data?.procedureMessage === 'string' ? result.data.procedureMessage : 'procedures.saveError'; pendingProcedure?.reject(new Error(message)); }
    pendingProcedure = null;
  };
  let laboratoryTestForm: HTMLFormElement; let laboratoryTestName = $state(''); let laboratoryTestCategory = $state('');
  let pendingLaboratoryTest: { resolve: (value: { id_pruebas_laboratorio: string; nombre: string }) => void; reject: (error: Error) => void } | null = null;
  function createLaboratoryTest(category: string, name: string) { return new Promise<{ id_pruebas_laboratorio: string; nombre: string }>((resolve, reject) => { pendingLaboratoryTest = { resolve, reject }; laboratoryTestCategory = category; laboratoryTestName = name; requestAnimationFrame(() => laboratoryTestForm.requestSubmit()); }); }
  const laboratoryTestSubmit: SubmitFunction = () => async ({ result }) => { if (result.type === 'success' && result.data && 'laboratoryTest' in result.data) pendingLaboratoryTest?.resolve(result.data.laboratoryTest as { id_pruebas_laboratorio: string; nombre: string }); else { const message = result.type === 'failure' && typeof result.data?.laboratoryTestMessage === 'string' ? result.data.laboratoryTestMessage : 'laboratoryTests.saveError'; pendingLaboratoryTest?.reject(new Error(message)); } pendingLaboratoryTest = null; };
  let diagnosticStudyForm: HTMLFormElement; let diagnosticStudyName = $state(''); let pendingDiagnosticStudy: { resolve: (value: { id_estudios_diagnosticos: string; nombre: string }) => void; reject: (error: Error) => void } | null = null;
  function createDiagnosticStudy(name: string) { return new Promise<{ id_estudios_diagnosticos: string; nombre: string }>((resolve, reject) => { pendingDiagnosticStudy = { resolve, reject }; diagnosticStudyName = name; requestAnimationFrame(() => diagnosticStudyForm.requestSubmit()); }); }
  const diagnosticStudySubmit: SubmitFunction = () => async ({ result }) => { if (result.type === 'success' && result.data && 'diagnosticStudy' in result.data) pendingDiagnosticStudy?.resolve(result.data.diagnosticStudy as { id_estudios_diagnosticos: string; nombre: string }); else { const message = result.type === 'failure' && typeof result.data?.diagnosticStudyMessage === 'string' ? result.data.diagnosticStudyMessage : 'diagnosticStudies.saveError'; pendingDiagnosticStudy?.reject(new Error(message)); } pendingDiagnosticStudy = null; };
  let groomingServiceForm: HTMLFormElement; let groomingServiceName = $state(''); let pendingGroomingService: { resolve: (value: { id_servicios_peluqueria_spa: string; nombre: string }) => void; reject: (error: Error) => void } | null = null;
  function createGroomingService(name: string) { return new Promise<{ id_servicios_peluqueria_spa: string; nombre: string }>((resolve, reject) => { pendingGroomingService = { resolve, reject }; groomingServiceName = name; requestAnimationFrame(() => groomingServiceForm.requestSubmit()); }); }
  const groomingServiceSubmit: SubmitFunction = () => async ({ result }) => { if (result.type === 'success' && result.data && 'groomingService' in result.data) pendingGroomingService?.resolve(result.data.groomingService as { id_servicios_peluqueria_spa: string; nombre: string }); else { const message = result.type === 'failure' && typeof result.data?.groomingServiceMessage === 'string' ? result.data.groomingServiceMessage : 'groomingServices.saveError'; pendingGroomingService?.reject(new Error(message)); } pendingGroomingService = null; };
  const saveRecord: SubmitFunction = () => { saving = true; return async ({ result, update }) => {
    if (result.type === 'success') {
      await update({ invalidateAll: true, reset: false });
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t(editingRecord ? 'attentions.recordUpdated' : 'attentions.recordSaved') });
      pendingRecord?.resolve();
    } else {
      const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      pendingRecord?.reject(new Error(message));
    }
    pendingRecord = null; saving = false;
  }; };
  const removeRecord: SubmitFunction = () => async ({ result, update }) => { if (result.type === 'success') { await update({ invalidateAll: true, reset: false }); toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.recordDeleted') }); deleteOpen = false; } else { const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.deleteError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); } };
  const typeName = (type: RecordType) => i18n.locale === 'en' ? (type.nombre_en ?? type.nombre) : (type.nombre_es ?? type.nombre);
  function field(typeId: string, key: string) { return data.opciones.tipos.find((item: RecordType) => item.id_tipos_registro_atencion === typeId)?.campos.find((item: Field) => item.clave === key); }
  function label(typeId: string, key: string) { const definition = field(typeId, key); return (i18n.locale === 'en' ? definition?.etiqueta_en : definition?.etiqueta_es) ?? definition?.etiqueta ?? key.replaceAll('_', ' '); }
  function value(typeId: string, key: string, item: unknown) {
    if (typeof item === 'boolean') return i18n.t(item ? 'attentions.yes' : 'attentions.no');
    const fieldType = field(typeId, key)?.tipo;
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
</script>

{#snippet detailValue(typeId: string, key: string, item: unknown)}
  {#if Array.isArray(item)}
    <dd class="mt-1 text-sm leading-5 text-ink">{listSummary(item)}</dd>
  {:else}
    <dd class="mt-1 whitespace-pre-wrap text-sm leading-5 text-ink">{value(typeId, key, item)}</dd>
  {/if}
{/snippet}

{#snippet petDatum(label: string, content: string, color: string | null = null)}
  <div class="min-w-0 border-t border-hairline pt-2"><dt class="text-[11px] font-medium text-stone">{label}</dt><dd class="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink">{#if color}<span class="size-2.5 shrink-0 rounded-full border border-hairline" style:background-color={color}></span>{/if}<span class="truncate" title={content}>{content}</span></dd></div>
{/snippet}

<svelte:head><title>{data.atencion.mascota.nombre} · {i18n.t('attentions.title')}</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-5">
  <div class="grid items-stretch gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
    <OwnerBadge owner={data.atencion.propietario} compact />
    <Card padding="none" class="flex min-h-[280px] flex-col overflow-visible">
      <div class="grid min-w-0 flex-1 gap-5 p-5 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-6">
        {#if data.atencion.mascota.foto_version}<img src={`/media/pets/${data.atencion.mascota.id_mascotas}/${data.atencion.mascota.foto_version}`} alt="" class="size-40 shrink-0 rounded-2xl border border-hairline object-cover" />{:else}<span class="grid size-40 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name="paw-print" size={60} /></span>{/if}
        <div class="min-w-0">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><h1 class="truncate text-[28px] tracking-[-0.02em] text-ink">{data.atencion.mascota.nombre}</h1><Badge variant="outline-sky">{data.atencion.estado_atencion.etiqueta}</Badge></div><p class="mt-1 text-sm text-steel">{data.atencion.mascota.especie.nombre}{data.atencion.mascota.clasificacion ? ` · ${data.atencion.mascota.clasificacion}` : ''}</p>{#if data.atencion.mascota.codigo_chip}<p class="mt-1 text-xs text-stone">{data.atencion.mascota.codigo_chip}</p>{/if}</div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              {#if canUpdate && !closed}<DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.addAttention')} class="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white shadow-soft hover:bg-primary-hover"><Icon name="plus" size={17} />{i18n.t('attentions.addAttention')}</DropdownMenu.Trigger><DropdownMenu.Content align="end" class="grid w-[min(34rem,calc(100vw-1rem))] grid-cols-2 gap-0.5 p-1">{#each data.opciones.tipos.filter((item: RecordType) => item.permite_registro_raiz !== false) as type (type.id_tipos_registro_atencion)}<DropdownMenu.Item class="min-w-0 gap-3 px-2 py-2 text-sm focus:bg-primary-soft focus:text-ink" onSelect={() => start(type)}><span class="clinical-menu-icon grid size-8 shrink-0 place-items-center rounded-[5px]" style:background-color={type.color_hex}><Icon name={type.icono} size={16} /></span><span class="min-w-0 truncate font-medium text-ink">{typeName(type)}</span></DropdownMenu.Item>{/each}</DropdownMenu.Content></DropdownMenu.Root>{/if}
              {#if canEditPet}<Button href={`/clinic/pets/${data.atencion.mascota.id_mascotas}/edit`} variant="secondary"><Icon name="pencil" size={16} />{i18n.t('pets.edit')}</Button>{/if}
              <button type="button" class="grid size-10 place-items-center rounded-full border border-hairline bg-canvas text-ink shadow-soft transition-colors hover:border-hairline-strong" aria-label={i18n.t(petDetailsOpen ? 'attentions.hidePetDetails' : 'attentions.showPetDetails')} aria-expanded={petDetailsOpen} aria-controls="attention-pet-details" onclick={() => (petDetailsOpen = !petDetailsOpen)}><Icon name="chevron-down" size={18} class="transition-transform duration-200 {petDetailsOpen ? 'rotate-180' : ''}" /></button>
            </div>
          </div>
          <div id="attention-pet-details" class="grid transition-[grid-template-rows,opacity] duration-200 {petDetailsOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}">
            <dl class="grid min-h-0 overflow-hidden gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {@render petDatum(i18n.t('pets.gender'), data.atencion.mascota.genero.etiqueta)}
            {@render petDatum(i18n.t('pets.color'), data.atencion.mascota.color?.etiqueta ?? '—', data.atencion.mascota.color?.color_hex ?? null)}
            {@render petDatum(i18n.t('pets.birthDate'), formatBirthDate(data.atencion.mascota.fecha_nacimiento))}
            {@render petDatum(i18n.t('pets.weight'), data.atencion.mascota.peso ? `${data.atencion.mascota.peso} ${data.atencion.mascota.unidad_peso?.etiqueta ?? ''}`.trim() : '—')}
            {@render petDatum(i18n.t('pets.size'), data.atencion.mascota.talla?.etiqueta ?? '—')}
            {@render petDatum(i18n.t('pets.reproductiveStatus'), data.atencion.mascota.estado_reproductivo?.etiqueta ?? '—')}
            {@render petDatum(i18n.t('pets.temperament'), data.atencion.mascota.temperamento?.etiqueta ?? '—', data.atencion.mascota.temperamento?.color_hex ?? null)}
            {@render petDatum(i18n.t('pets.food'), data.atencion.mascota.alimento ?? '—')}
            {@render petDatum(i18n.t('pets.serviceAnimal'), i18n.t(data.atencion.mascota.animal_servicio ? 'common.yes' : 'common.no'))}
            {@render petDatum(i18n.t('pets.emotionalSupport'), i18n.t(data.atencion.mascota.apoyo_emocional ? 'common.yes' : 'common.no'))}
            </dl>
          </div>
        </div>
      </div>
      <div class="border-t border-hairline px-5 py-3 sm:px-6"><span class="text-sm text-steel">{i18n.t('attentions.arrivedAt', { time: formatDateTime(data.atencion.llegada_en) })}</span></div>
    </Card>
  </div>
  <div><h2 class="text-lg font-semibold text-ink">{i18n.t('attentions.clinicalRecords')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('attentions.recordsHelp')}</p></div>
  {#if data.atencion.registros.length}
    <ol class="w-full">
      {#each data.atencion.registros as record, index (record.id_registros_atencion)}
        {@const future = futureOf(record)}
        {@const dayLabel = timelineDayLabel(record.realizado_en)}
        {@const startsDay = index === 0 || timelineDay(record.realizado_en)?.key !== timelineDay(data.atencion.registros[index - 1].realizado_en)?.key}
        {#if startsDay && dayLabel}
          <li class="mb-4 grid grid-cols-[46px_38px_minmax(0,1fr)] gap-2 sm:grid-cols-[64px_44px_minmax(0,1fr)] sm:gap-3" role="separator" aria-label={dayLabel}>
            <div class="col-span-3 flex items-center gap-3 text-xs font-semibold text-stone"><span class="h-px flex-1 border-t border-dashed border-hairline-strong"></span><span>{dayLabel}</span><span class="h-px flex-1 border-t border-dashed border-hairline-strong"></span></div>
          </li>
        {/if}
        <li class="grid grid-cols-[46px_38px_minmax(0,1fr)] gap-2 sm:grid-cols-[64px_44px_minmax(0,1fr)] sm:gap-3">
          <time datetime={String(record.realizado_en)} class="flex flex-col pt-2 text-right text-[11px] tabular-nums leading-4 text-steel sm:pt-2.5 sm:text-xs"><span class="font-bold text-ink">{timelineShortDate(record.realizado_en)}</span><span class="font-medium">{timelineTime(record.realizado_en)}</span></time>
          <div class="relative flex justify-center">
            {#if index < data.atencion.registros.length - 1}<span class="absolute bottom-0 top-9 w-0.5 bg-hairline-strong sm:top-10" aria-hidden="true"></span>{/if}
            <span class="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-[3px] border-canvas text-white shadow-soft sm:size-10" style:background-color={record.tipo.color_hex}><Icon name={record.tipo.icono} size={18} /></span>
          </div>
          <Card padding="none" class="mb-4 overflow-hidden border-hairline-strong shadow-[0_2px_8px_rgb(15_23_42/0.05)] sm:mb-5">
            <div class="grid lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]">
              <div class="flex min-h-14 flex-col items-stretch border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5 lg:border-b-0 lg:border-r">{#if canUpdate && !closed}<div class="mb-1 flex shrink-0 items-center justify-start gap-1"><AttentionActionButton label={i18n.t('attentions.addFollowUp')} icon="message-circle" onclick={() => startFollowUp(record)} /><AttentionActionButton label={i18n.t('attentions.editRecord')} icon="pencil" onclick={() => startEdit(record)} /><AttentionActionButton label={i18n.t('attentions.deleteRecord')} icon="trash-2" danger onclick={() => { deleteId = record.id_registros_atencion; deleteOpen = true; }} /></div>{/if}<h3 class="text-[15px] font-bold leading-5 text-ink">{typeName(record.tipo)}</h3></div>
              <div class="grid min-w-0 {future ? 'xl:grid-cols-[minmax(0,1fr)_190px]' : ''}"><div class="min-w-0"><dl class="grid content-start gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">{#each detailEntries(record) as [key, item]}<div class={Array.isArray(item) || String(item).length > 60 ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}><dt class="text-xs font-medium text-stone">{label(record.tipo.id_tipos_registro_atencion, key)}</dt>{@render detailValue(record.tipo.id_tipos_registro_atencion, key, item)}</div>{/each}</dl>{#if record.adjuntos?.length}<div class="flex flex-wrap gap-3 border-t border-hairline px-4 py-3 sm:px-5">{#each record.adjuntos as attachment (attachment.id_adjuntos_registro_atencion)}{@const href = `/media/attentions/${data.atencion.id_atenciones}/records/${record.id_registros_atencion}/attachments/${attachment.id_adjuntos_registro_atencion}`}<a {href} target="_blank" rel="noreferrer" title={attachment.nombre_original} class="relative overflow-hidden rounded-md border border-hairline bg-surface">{#if attachment.tipo_mime.startsWith('image/')}<img src={href} alt={attachment.nombre_original} class="size-28 object-cover" />{#if attachment.etapa_foto}<span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{attachment.etapa_foto}</span>{/if}{:else}<span class="flex h-28 w-56 min-w-0 items-center gap-3 px-4"><span class="grid size-14 shrink-0 place-items-center"><AttachmentFileIcon name={attachment.nombre_original} size={44} /></span><span class="min-w-0"><strong class="block text-xs uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(attachment.nombre_original)}</strong><span class="mt-1 block truncate text-xs font-medium text-ink">{attachment.nombre_original}</span></span></span>{/if}</a>{/each}</div>{/if}</div>{#if future}<div class="flex items-center gap-3 border-t border-hairline px-4 py-3 sm:px-5 xl:border-l xl:border-t-0"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="calendar-clock" size={17} /></span><div class="min-w-0"><span class="block text-xs font-medium text-stone">{label(record.tipo.id_tipos_registro_atencion, future.key)}</span><strong class="mt-1 block text-sm leading-5 text-ink">{future.value}</strong></div></div>{/if}</div>
            </div>
            {#if record.seguimientos?.length}
              <div class="border-t border-hairline bg-surface/40 px-4 py-3 sm:px-5">
                <div class="mb-2.5 flex items-center gap-2 text-sm font-semibold leading-none text-ink"><Icon name="message-circle" size={16} class="text-primary" />{i18n.t('attentions.followUps')}<span class="rounded-full bg-primary-soft px-2 py-1 text-[11px] leading-none text-primary">{record.seguimientos.length}</span></div>
                <div class="ml-3 space-y-2.5 border-l-2 border-primary/25 pl-5">
                  {#each record.seguimientos as followUp (followUp.id_registros_atencion)}
                    {@const followUpFuture = futureOf(followUp)}
                    <article class="relative rounded-lg border border-hairline-strong border-l-2 border-l-primary/40 bg-canvas shadow-[0_1px_2px_rgb(15_23_42/0.04)] before:absolute before:-left-[23px] before:top-6 before:h-0.5 before:w-5 before:bg-primary/25">
                      <div class="grid lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]">
                        <div class="flex flex-col items-stretch border-b border-hairline px-3.5 py-3 lg:border-b-0 lg:border-r">{#if canUpdate && !closed}<div class="mb-1 flex shrink-0 items-center justify-start gap-1.5"><AttentionActionButton label={i18n.t('attentions.editRecord')} icon="pencil" size={15} onclick={() => startEdit(followUp)} /><AttentionActionButton label={i18n.t('attentions.deleteRecord')} icon="trash-2" size={15} danger onclick={() => { deleteId = followUp.id_registros_atencion; deleteOpen = true; }} /></div>{/if}<div class="min-w-0"><strong class="block truncate text-sm font-semibold leading-5 text-ink" title={typeName(followUp.tipo)}>{typeName(followUp.tipo)}</strong><span class="mt-0.5 block text-xs leading-4 text-steel"><span class="block font-bold text-ink">{timelineShortDate(followUp.created_at)}</span><span class="block font-medium">{timelineTime(followUp.created_at)}</span></span></div></div>
                        <div class="grid min-w-0 {followUpFuture ? 'xl:grid-cols-[minmax(0,1fr)_180px]' : ''}">
                          <div class="min-w-0"><dl class="grid content-start gap-x-5 gap-y-2 px-3.5 py-3 sm:grid-cols-2">{#each detailEntries(followUp) as [key, item]}<div class={String(item).length > 80 ? 'sm:col-span-2' : ''}><dt class="text-[11px] font-medium leading-4 text-stone">{label(followUp.tipo.id_tipos_registro_atencion, key)}</dt>{@render detailValue(followUp.tipo.id_tipos_registro_atencion, key, item)}</div>{/each}</dl>{#if followUp.adjuntos?.length}<div class="flex flex-wrap gap-2.5 border-t border-hairline px-3.5 py-3">{#each followUp.adjuntos as attachment (attachment.id_adjuntos_registro_atencion)}{@const href = `/media/attentions/${data.atencion.id_atenciones}/records/${followUp.id_registros_atencion}/attachments/${attachment.id_adjuntos_registro_atencion}`}<a {href} target="_blank" rel="noreferrer" title={attachment.nombre_original} class="relative overflow-hidden rounded-md border border-hairline bg-surface">{#if attachment.tipo_mime.startsWith('image/')}<img src={href} alt={attachment.nombre_original} class="size-20 object-cover" />{:else}<span class="flex h-20 w-48 min-w-0 items-center gap-2.5 px-3"><AttachmentFileIcon name={attachment.nombre_original} size={34} /><span class="min-w-0"><strong class="block text-[11px] uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(attachment.nombre_original)}</strong><span class="mt-0.5 block truncate text-xs font-medium text-ink">{attachment.nombre_original}</span></span></span>{/if}</a>{/each}</div>{/if}</div>
                          {#if followUpFuture}<div class="flex items-center gap-2.5 border-t border-hairline px-3.5 py-3 xl:border-l xl:border-t-0"><span class="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="calendar-clock" size={16} /></span><div class="min-w-0"><span class="block text-[11px] font-medium leading-4 text-stone">{label(followUp.tipo.id_tipos_registro_atencion, followUpFuture.key)}</span><strong class="mt-0.5 block text-sm leading-5 text-ink">{followUpFuture.value}</strong></div></div>{/if}
                        </div>
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}
          </Card>
        </li>
      {/each}
    </ol>
  {:else}<Card><div class="py-10 text-center text-sm text-steel">{i18n.t('attentions.noRecords')}</div></Card>{/if}
</section>

<form bind:this={recordForm} method="POST" action={editingRecord ? '?/editRecord' : '?/record'} enctype="multipart/form-data" use:enhance={saveRecord} class="hidden"><input name="id_registros_atencion" value={editingRecord?.id_registros_atencion ?? ''} /><input name="fid_tipos_registro_atencion" value={selectedType?.id_tipos_registro_atencion ?? ''} /><input name="fid_registros_atencion_origen" value={originRecordId} /><input name="detalle" value={detail} /><input name="adjuntos_conservados" value={retainedAttachments} /><input bind:this={attachmentInput} name="adjuntos" type="file" multiple /></form>
<form bind:this={vaccineForm} method="POST" action="?/vaccine" use:enhance={vaccineSubmit} class="hidden"><input name="nombre" value={vaccineName} /></form>
<form bind:this={consultationReasonForm} method="POST" action="?/consultationReason" use:enhance={consultationReasonSubmit} class="hidden"><input name="nombre" value={consultationReasonName} /><input name="descripcion" value={consultationReasonDescription} /></form>
<form bind:this={hospitalizationTypeForm} method="POST" action="?/hospitalizationType" use:enhance={hospitalizationTypeSubmit} class="hidden"><input name="nombre" value={hospitalizationTypeName} /></form>
<form bind:this={procedureForm} method="POST" action="?/procedure" use:enhance={procedureSubmit} class="hidden"><input name="nombre" value={procedureName} /><input name="descripcion_guia" value={procedureDescription} /></form>
<form bind:this={laboratoryTestForm} method="POST" action="?/laboratoryTest" use:enhance={laboratoryTestSubmit} class="hidden"><input name="nombre" value={laboratoryTestName} /><input name="fid_categorias_pruebas_laboratorio" value={laboratoryTestCategory} /></form>
<form bind:this={diagnosticStudyForm} method="POST" action="?/diagnosticStudy" use:enhance={diagnosticStudySubmit} class="hidden"><input name="nombre" value={diagnosticStudyName} /></form>
<form bind:this={groomingServiceForm} method="POST" action="?/groomingService" use:enhance={groomingServiceSubmit} class="hidden"><input name="nombre" value={groomingServiceName} /></form>
<RecordDialog bind:open={recordOpen} type={selectedType} {saving} editing={Boolean(editingRecord)} initialDetail={editingRecord?.detalle_edicion ?? null} initialAttachments={editingRecord?.adjuntos.map((attachment: ClinicalAttachment) => ({ id: attachment.id_adjuntos_registro_atencion, name: attachment.nombre_original, mime: attachment.tipo_mime, bytes: attachment.bytes, group: attachment.grupo_adjunto ?? 0, url: `/media/attentions/${data.atencion.id_atenciones}/records/${editingRecord.id_registros_atencion}/attachments/${attachment.id_adjuntos_registro_atencion}` })) ?? []} contextKey={editingRecord?.id_registros_atencion ?? originRecordId} petId={data.atencion.mascota.id_mascotas} petWeight={data.atencion.mascota.peso ? `${data.atencion.mascota.peso} ${data.atencion.mascota.unidad_peso?.etiqueta ?? ''}`.trim() : null} attachmentMaxBytes={data.opciones.adjunto_max_bytes} attachmentMaxFiles={data.opciones.adjunto_max_archivos} {canCreateVaccine} onCreateVaccine={createVaccine} {canCreateConsultationReason} onCreateConsultationReason={createConsultationReason} {canCreateHospitalizationType} onCreateHospitalizationType={createHospitalizationType} {canCreateProcedure} onCreateProcedure={createProcedure} {canCreateLaboratoryTest} onCreateLaboratoryTest={createLaboratoryTest} {canCreateDiagnosticStudy} onCreateDiagnosticStudy={createDiagnosticStudy} {canCreateGroomingService} onCreateGroomingService={createGroomingService} onSave={saveDetail} />
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('attentions.deleteRecord')} description={i18n.t('attentions.deleteRecordHelp')} confirmLabel={i18n.t('attentions.delete')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={() => { deleteForm?.requestSubmit(); return Promise.resolve(); }}><form bind:this={deleteForm} method="POST" action="?/deleteRecord" use:enhance={removeRecord}><input type="hidden" name="id_registros_atencion" value={deleteId} /></form></ConfirmationDialog>

<style>
  .clinical-menu-icon :global(svg) { color: var(--on-dark) !important; stroke: var(--on-dark) !important; }
</style>
