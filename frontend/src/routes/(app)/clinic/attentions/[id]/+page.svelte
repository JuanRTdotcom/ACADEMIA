<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, i18n, tienePermiso } from '$lib';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import RecordDialog, { type Field, type RecordType } from '../_components/RecordDialog.svelte';
  import AttachmentFileIcon from '$lib/components/AttachmentFileIcon.svelte';
  import OwnerBadge from '../_components/OwnerBadge.svelte';
  import { attentionAttachmentExtension } from '$lib/config/attention-attachments';

  let { data }: PageProps = $props();
  type ClinicalRecord = (typeof data.atencion.registros)[number];
  let selectedType = $state<RecordType | null>(null); let recordOpen = $state(false); let petDetailsOpen = $state(false); let detail = $state('{}'); let saving = $state(false); let recordForm = $state<HTMLFormElement>(); let deleteForm = $state<HTMLFormElement>(); let deleteOpen = $state(false); let deleteId = $state('');
  const canUpdate = $derived(tienePermiso(data.usuario.permisos, 'clinic.attentions.update'));
  const canEditPet = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.read') && tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
  const canCreateVaccine = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.create'));
  const canCreateConsultationReason = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.create'));
  const canCreateHospitalizationType = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.create'));
  const canCreateProcedure = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.create'));
  const canCreateLaboratoryTest = $derived(tienePermiso(data.usuario.permisos, 'administrator.laboratory_tests.create'));
  const closed = $derived(['finalizada', 'cancelada'].includes(data.atencion.estado_atencion.codigo));
  const breadcrumbs = $derived([{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('attentions.title'), href: '/clinic/attentions' }, { label: data.atencion.mascota.nombre }]);
  const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const formatBirthDate = (value: string | Date | null) => value ? new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : '—';
  function start(type: RecordType) { selectedType = type; recordOpen = true; }
  let pendingRecord: { resolve: () => void; reject: (error: Error) => void } | null = null;
  function saveDetail(value: Record<string, unknown>, attachments: File[]) {
    return new Promise<void>((resolve, reject) => {
      pendingRecord = { resolve, reject };
      detail = JSON.stringify(value);
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
  const saveRecord: SubmitFunction = () => { saving = true; return async ({ result, update }) => {
    if (result.type === 'success') {
      await update({ invalidateAll: true, reset: false });
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.recordSaved') });
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
  function label(typeId: string, key: string) { const type = data.opciones.tipos.find((item: RecordType) => item.id_tipos_registro_atencion === typeId); const field = type?.campos.find((item: Field) => item.clave === key); return (i18n.locale === 'en' ? field?.etiqueta_en : field?.etiqueta_es) ?? field?.etiqueta ?? key.replaceAll('_', ' '); }
  function value(value: unknown) { if (typeof value === 'boolean') return i18n.t(value ? 'attentions.yes' : 'attentions.no'); return String(value); }
  function listSummary(items: unknown[]) { return items.map((item) => { if (!item || typeof item !== 'object' || Array.isArray(item)) return ''; const row = item as Record<string, unknown>; const name = String(row.medicamento ?? row.prueba ?? '').trim(); const quantity = String(row.cantidad ?? '').trim(); const professional = String(row.profesional ?? '').trim(); const category = String(row.categoria ?? '').trim(); return [quantity ? `${name} (${quantity})` : name, category, professional].filter(Boolean).join(' · '); }).filter(Boolean).join(', '); }
  function detailEntries(record: ClinicalRecord) { return Object.entries(record.detalle).filter(([key]) => !['fecha_programada', 'programado_para'].includes(key)); }
  function futureOf(record: ClinicalRecord) {
    if (record.fecha_programada) return { key: 'fecha_programada', value: new Intl.DateTimeFormat(i18n.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(record.fecha_programada)) };
    if (record.programado_para) return { key: 'programado_para', value: formatDateTime(record.programado_para) };
    return null;
  }
</script>

{#snippet detailValue(item: unknown)}
  {#if Array.isArray(item)}
    <dd class="mt-1 text-sm leading-5 text-ink">{listSummary(item)}</dd>
  {:else}
    <dd class="mt-1 whitespace-pre-wrap text-sm leading-5 text-ink">{value(item)}</dd>
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
              {#if canUpdate && !closed}<DropdownMenu.Root><DropdownMenu.Trigger aria-label={i18n.t('attentions.addAttention')} class="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white shadow-soft hover:bg-primary-hover"><Icon name="plus" size={17} />{i18n.t('attentions.addAttention')}</DropdownMenu.Trigger><DropdownMenu.Content align="end" class="max-h-[min(70dvh,540px)] min-w-[240px] overflow-y-auto p-1">{#each data.opciones.tipos as type (type.id_tipos_registro_atencion)}<DropdownMenu.Item class="gap-3 px-2 py-2 text-sm focus:bg-primary-soft focus:text-ink" onSelect={() => start(type)}><span class="clinical-menu-icon grid size-8 shrink-0 place-items-center rounded-[5px]" style:background-color={type.color_hex}><Icon name={type.icono} size={16} /></span><span class="min-w-0 truncate font-medium text-ink">{typeName(type)}</span></DropdownMenu.Item>{/each}</DropdownMenu.Content></DropdownMenu.Root>{/if}
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
        <li class="grid grid-cols-[42px_minmax(0,1fr)] gap-3 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-4">
          <div class="relative flex justify-center">
            {#if index < data.atencion.registros.length - 1}<span class="absolute bottom-0 top-10 w-px bg-hairline-strong" aria-hidden="true"></span>{/if}
            <span class="relative z-10 grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-soft sm:size-10" style:background-color={record.tipo.color_hex}><Icon name={record.tipo.icono} size={19} /></span>
          </div>
          <Card padding="none" class="mb-4 overflow-hidden sm:mb-5">
            <div class="grid lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)]">
              <div class="flex items-start gap-3 border-b border-hairline px-4 py-3.5 sm:px-5 lg:border-b-0 lg:border-r lg:py-4"><div class="min-w-0 flex-1"><h3 class="font-semibold text-ink">{typeName(record.tipo)}</h3><p class="mt-1 text-xs leading-5 text-steel">{formatDateTime(record.created_at)}</p></div>{#if canUpdate && !closed}<button type="button" aria-label={i18n.t('attentions.deleteRecord')} class="grid size-8 shrink-0 place-items-center rounded-md text-stone hover:bg-error/10 hover:text-error" onclick={() => { deleteId = record.id_registros_atencion; deleteOpen = true; }}><Icon name="trash-2" size={16} /></button>{/if}</div>
              <div class="grid min-w-0 {future ? 'xl:grid-cols-[minmax(0,1fr)_190px]' : ''}"><div class="min-w-0"><dl class="grid content-start gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 xl:grid-cols-4">{#each detailEntries(record) as [key, item]}<div class={Array.isArray(item) || String(item).length > 60 ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}><dt class="text-xs font-medium text-stone">{label(record.tipo.id_tipos_registro_atencion, key)}</dt>{@render detailValue(item)}</div>{/each}</dl>{#if record.adjuntos?.length}<div class="flex flex-wrap gap-3 border-t border-hairline px-4 py-3 sm:px-5">{#each record.adjuntos as attachment (attachment.id_adjuntos_registro_atencion)}{@const href = `/media/attentions/${data.atencion.id_atenciones}/records/${record.id_registros_atencion}/attachments/${attachment.id_adjuntos_registro_atencion}`}<a {href} target="_blank" rel="noreferrer" title={attachment.nombre_original} class="overflow-hidden rounded-md border border-hairline bg-surface">{#if attachment.tipo_mime.startsWith('image/')}<img src={href} alt={attachment.nombre_original} class="size-28 object-cover" />{:else}<span class="flex h-28 w-56 min-w-0 items-center gap-3 px-4"><span class="grid size-14 shrink-0 place-items-center"><AttachmentFileIcon name={attachment.nombre_original} size={44} /></span><span class="min-w-0"><strong class="block text-xs uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(attachment.nombre_original)}</strong><span class="mt-1 block truncate text-xs font-medium text-ink">{attachment.nombre_original}</span></span></span>{/if}</a>{/each}</div>{/if}</div>{#if future}<div class="flex items-center gap-3 border-t border-hairline px-4 py-3 sm:px-5 xl:border-l xl:border-t-0"><span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Icon name="calendar-clock" size={17} /></span><div class="min-w-0"><span class="block text-xs font-medium text-stone">{label(record.tipo.id_tipos_registro_atencion, future.key)}</span><strong class="mt-1 block text-sm leading-5 text-ink">{future.value}</strong></div></div>{/if}</div>
            </div>
          </Card>
        </li>
      {/each}
    </ol>
  {:else}<Card><div class="py-10 text-center text-sm text-steel">{i18n.t('attentions.noRecords')}</div></Card>{/if}
</section>

<form bind:this={recordForm} method="POST" action="?/record" enctype="multipart/form-data" use:enhance={saveRecord} class="hidden"><input name="fid_tipos_registro_atencion" value={selectedType?.id_tipos_registro_atencion ?? ''} /><input name="detalle" value={detail} /><input bind:this={attachmentInput} name="adjuntos" type="file" multiple /></form>
<form bind:this={vaccineForm} method="POST" action="?/vaccine" use:enhance={vaccineSubmit} class="hidden"><input name="nombre" value={vaccineName} /></form>
<form bind:this={consultationReasonForm} method="POST" action="?/consultationReason" use:enhance={consultationReasonSubmit} class="hidden"><input name="nombre" value={consultationReasonName} /><input name="descripcion" value={consultationReasonDescription} /></form>
<form bind:this={hospitalizationTypeForm} method="POST" action="?/hospitalizationType" use:enhance={hospitalizationTypeSubmit} class="hidden"><input name="nombre" value={hospitalizationTypeName} /></form>
<form bind:this={procedureForm} method="POST" action="?/procedure" use:enhance={procedureSubmit} class="hidden"><input name="nombre" value={procedureName} /><input name="descripcion_guia" value={procedureDescription} /></form>
<form bind:this={laboratoryTestForm} method="POST" action="?/laboratoryTest" use:enhance={laboratoryTestSubmit} class="hidden"><input name="nombre" value={laboratoryTestName} /><input name="fid_categorias_pruebas_laboratorio" value={laboratoryTestCategory} /></form>
<RecordDialog bind:open={recordOpen} type={selectedType} {saving} petId={data.atencion.mascota.id_mascotas} petWeight={data.atencion.mascota.peso ? `${data.atencion.mascota.peso} ${data.atencion.mascota.unidad_peso?.etiqueta ?? ''}`.trim() : null} attachmentMaxBytes={data.opciones.adjunto_max_bytes} attachmentMaxFiles={data.opciones.adjunto_max_archivos} {canCreateVaccine} onCreateVaccine={createVaccine} {canCreateConsultationReason} onCreateConsultationReason={createConsultationReason} {canCreateHospitalizationType} onCreateHospitalizationType={createHospitalizationType} {canCreateProcedure} onCreateProcedure={createProcedure} {canCreateLaboratoryTest} onCreateLaboratoryTest={createLaboratoryTest} onSave={saveDetail} />
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('attentions.deleteRecord')} description={i18n.t('attentions.deleteRecordHelp')} confirmLabel={i18n.t('attentions.delete')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={() => { deleteForm?.requestSubmit(); return Promise.resolve(); }}><form bind:this={deleteForm} method="POST" action="?/deleteRecord" use:enhance={removeRecord}><input type="hidden" name="id_registros_atencion" value={deleteId} /></form></ConfirmationDialog>

<style>
  .clinical-menu-icon :global(svg) { color: var(--on-dark) !important; stroke: var(--on-dark) !important; }
</style>
