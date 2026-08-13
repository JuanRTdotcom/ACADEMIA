<script lang="ts">
  import { Button, ConfirmationDialog, Icon, i18n } from '$lib';
  import { Plus, Save, Trash2, X } from '@lucide/svelte';
  import AttachmentFileIcon from '$lib/components/AttachmentFileIcon.svelte';
  import { ATTENTION_ATTACHMENT_ACCEPT, attentionAttachmentExtension, attentionAttachmentFamily, attentionAttachmentIssue } from '$lib/config/attention-attachments';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';

  export type Field = { clave: string; etiqueta: string; etiqueta_es?: string; etiqueta_en?: string; tipo: 'text' | 'textarea' | 'date' | 'datetime' | 'boolean' | 'number' | 'uuid' | 'list'; requerido: boolean; min?: number; max?: number; max_items?: number; campos?: Field[]; valor_predeterminado?: string; opciones?: Array<{ id: string; etiqueta: string; descripcion?: string; grupo?: string; grupo_id?: string }>; precarga?: 'fecha_ultimo_registro'; ayuda_precarga_es?: string; ayuda_precarga_en?: string };
  export type RecordType = { id_tipos_registro_atencion: string; codigo: string; nombre: string; nombre_es?: string; nombre_en?: string; descripcion: string; descripcion_es?: string; descripcion_en?: string; icono: string; color_hex: string; acepta_adjuntos?: boolean; max_adjuntos?: number; permite_registro_raiz?: boolean; requiere_registro_origen?: boolean; campos: Field[] };
  export type ExistingAttachment = { id: string; name: string; mime: string; bytes: number; url: string; group: number };
  let { open = $bindable(false), type = null, saving = false, attachmentMaxBytes, attachmentMaxFiles, petId = null, petWeight = null, editing = false, initialDetail = null, initialAttachments = [], contextKey = '', canCreateVaccine = false, onCreateVaccine, canCreateConsultationReason = false, onCreateConsultationReason, canCreateHospitalizationType = false, onCreateHospitalizationType, canCreateProcedure = false, onCreateProcedure, canCreateLaboratoryTest = false, onCreateLaboratoryTest, canCreateDiagnosticStudy = false, onCreateDiagnosticStudy, canCreateGroomingService = false, onCreateGroomingService, onSave }: { open?: boolean; type?: RecordType | null; saving?: boolean; attachmentMaxBytes: number; attachmentMaxFiles: number; petId?: string | null; petWeight?: string | null; editing?: boolean; initialDetail?: Record<string, unknown> | null; initialAttachments?: ExistingAttachment[]; contextKey?: string; canCreateVaccine?: boolean; onCreateVaccine?: (name: string) => Promise<{ id_vacunas: string; nombre: string }>; canCreateConsultationReason?: boolean; onCreateConsultationReason?: (name: string, description: string) => Promise<{ id_motivos_consulta: string; nombre: string; descripcion: string | null }>; canCreateHospitalizationType?: boolean; onCreateHospitalizationType?: (name: string) => Promise<{ id_tipos_hospitalizacion: string; nombre: string }>; canCreateProcedure?: boolean; onCreateProcedure?: (name: string, description: string) => Promise<{ id_procedimientos_veterinarios: string; nombre: string; descripcion_guia: string }>; canCreateLaboratoryTest?: boolean; onCreateLaboratoryTest?: (category: string, name: string) => Promise<{ id_pruebas_laboratorio: string; nombre: string }>; canCreateDiagnosticStudy?: boolean; onCreateDiagnosticStudy?: (name: string) => Promise<{ id_estudios_diagnosticos: string; nombre: string }>; canCreateGroomingService?: boolean; onCreateGroomingService?: (name: string) => Promise<{ id_servicios_peluqueria_spa: string; nombre: string }>; onSave: (detail: Record<string, unknown>, attachments: File[], retainedAttachments: string[][]) => Promise<void> } = $props();
  let form = $state<HTMLFormElement>();
  let attachmentInput = $state<HTMLInputElement>();
  let attachmentPreviews = $state<Array<{ file: File; url: string | null }>>([]);
  let existingAttachmentPreviews = $state<ExistingAttachment[]>([]);
  let attachmentError = $state('');
  let confirmationOpen = $state(false);
  let pendingSave = $state<{ detail: Record<string, unknown>; attachments: File[]; retainedAttachments: string[][] } | null>(null);
  let selectedVaccine = $state('');
  let vaccineOptions = $state<Array<{ id: string; etiqueta: string }>>([]);
  let vaccineEditorOpen = $state(false);
  let vaccineConfirmationOpen = $state(false);
  let vaccineName = $state('');
  let vaccineSaving = $state(false);
  let vaccineForm = $state<HTMLFormElement>();
  let selectedConsultationReason = $state('');
  let consultationReasonOptions = $state<Array<{ id: string; etiqueta: string }>>([]);
  let consultationReasonEditorOpen = $state(false);
  let consultationReasonConfirmationOpen = $state(false);
  let consultationReasonName = $state('');
  let consultationReasonDescription = $state('');
  let consultationReasonSaving = $state(false);
  let consultationReasonForm = $state<HTMLFormElement>();
  let selectedHospitalizationType = $state('');
  let hospitalizationTypeOptions = $state<Array<{ id: string; etiqueta: string }>>([]);
  let hospitalizationTypeEditorOpen = $state(false);
  let hospitalizationTypeConfirmationOpen = $state(false);
  let hospitalizationTypeName = $state('');
  let hospitalizationTypeSaving = $state(false);
  let hospitalizationTypeForm = $state<HTMLFormElement>();
  let selectedProcedure = $state('');
  let procedureOptions = $state<Array<{ id: string; etiqueta: string; descripcion?: string }>>([]);
  let procedureEditorOpen = $state(false);
  let procedureConfirmationOpen = $state(false);
  let procedureName = $state('');
  let procedureDescription = $state('');
  let procedureSaving = $state(false);
  let procedureForm = $state<HTMLFormElement>();
  let appliedProcedureGuide = $state('');
  type LaboratoryRow = { professional: string; test: string; quantity: string; existing: ExistingAttachment[]; files: Array<{ file: File; url: string | null }> };
  let laboratoryRows = $state<LaboratoryRow[]>([]);
  let laboratoryOptions = $state<Array<{ id: string; etiqueta: string; grupo?: string; grupo_id?: string }>>([]);
  let laboratoryTestEditorOpen = $state(false); let laboratoryTestConfirmationOpen = $state(false); let laboratoryTestSaving = $state(false); let laboratoryTestName = $state(''); let laboratoryCategory = $state(''); let laboratoryTestForm = $state<HTMLFormElement>(); let laboratoryTargetIndex = $state(0);
  let selectedDiagnosticStudy = $state(''); let diagnosticStudyOptions = $state<Array<{ id: string; etiqueta: string }>>([]); let diagnosticStudyEditorOpen = $state(false); let diagnosticStudyConfirmationOpen = $state(false); let diagnosticStudySaving = $state(false); let diagnosticStudyName = $state(''); let diagnosticStudyForm = $state<HTMLFormElement>();
  let groomingServiceOptions = $state<Array<{ id: string; etiqueta: string }>>([]); let groomingServiceEditorOpen = $state(false); let groomingServiceConfirmationOpen = $state(false); let groomingServiceSaving = $state(false); let groomingServiceName = $state(''); let groomingServiceForm = $state<HTMLFormElement>(); let groomingTargetIndex = $state(0);
  type GroomingPhoto = { file: File; url: string };
  let groomingBeforePhotos = $state<GroomingPhoto[]>([]); let groomingAfterPhotos = $state<GroomingPhoto[]>([]);
  let listValues = $state<Record<string, Array<Record<string, string>>>>({});
  let listError = $state('');
  let fieldValues = $state<Record<string, string>>({});
  let prefillOriginals = $state<Record<string, string>>({});
  let prefillLoading = $state(false);
  let existingGroomingBefore = $state<ExistingAttachment[]>([]);
  let existingGroomingAfter = $state<ExistingAttachment[]>([]);
  let activeContextId = '';
  const effectiveAttachmentMaxFiles = $derived(Math.min(attachmentMaxFiles, type?.max_adjuntos ?? attachmentMaxFiles));

  $effect(() => {
    const contextId = open && type ? `${type.id_tipos_registro_atencion}:${petId ?? ''}:${contextKey}` : '';
    if (contextId === activeContextId) return;
    activeContextId = contextId;
    const initial = initialDetail ?? {};
    selectedVaccine = String(initial.fid_vacunas ?? '');
    const listField = type?.campos.find((field) => field.tipo === 'list');
    listValues = listField && Array.isArray(initial[listField.clave])
      ? { [listField.clave]: (initial[listField.clave] as Array<Record<string, unknown>>).map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value ?? '')]))) }
      : listField?.requerido ? { [listField.clave]: [emptyListItem(listField)] } : {};
    listError = '';
    fieldValues = Object.fromEntries(Object.entries(initial).filter(([, value]) => !Array.isArray(value) && value !== null && typeof value !== 'object').map(([key, value]) => [key, String(value)]));
    prefillOriginals = {};
    prefillLoading = false;
    vaccineOptions = type?.campos.find((field) => field.clave === 'fid_vacunas')?.opciones?.map((option) => ({ ...option })) ?? [];
    selectedConsultationReason = String(initial.fid_motivos_consulta ?? '');
    consultationReasonOptions = type?.campos.find((field) => field.clave === 'fid_motivos_consulta')?.opciones?.map((option) => ({ ...option })) ?? [];
    selectedHospitalizationType = String(initial.fid_tipos_hospitalizacion ?? '');
    hospitalizationTypeOptions = type?.campos.find((field) => field.clave === 'fid_tipos_hospitalizacion')?.opciones?.map((option) => ({ ...option })) ?? [];
    selectedProcedure = String(initial.fid_procedimientos_veterinarios ?? '');
    procedureOptions = type?.campos.find((field) => field.clave === 'fid_procedimientos_veterinarios')?.opciones?.map((option) => ({ ...option })) ?? [];
    appliedProcedureGuide = '';
    laboratoryRows = type?.codigo === 'laboratorio' && Array.isArray(initial.pruebas)
      ? (initial.pruebas as Array<Record<string, unknown>>).map((row, index) => ({ professional: String(row.fid_usuarios_profesional ?? ''), test: String(row.fid_pruebas_laboratorio ?? ''), quantity: String(row.cantidad ?? 1), existing: initialAttachments.filter((attachment) => attachment.group === index), files: [] }))
      : type?.codigo === 'laboratorio' ? [{ professional: '', test: '', quantity: '1', existing: [], files: [] }] : [];
    laboratoryOptions = type?.campos.find((field) => field.clave === 'pruebas')?.campos?.find((field) => field.clave === 'fid_pruebas_laboratorio')?.opciones?.map((option) => ({ ...option })) ?? [];
    selectedDiagnosticStudy = String(initial.fid_estudios_diagnosticos ?? '');
    diagnosticStudyOptions = type?.campos.find((field) => field.clave === 'fid_estudios_diagnosticos')?.opciones?.map((option) => ({ ...option })) ?? [];
    groomingServiceOptions = type?.campos.find((field) => field.clave === 'servicios')?.campos?.find((field) => field.clave === 'fid_servicios_peluqueria_spa')?.opciones?.map((option) => ({ ...option })) ?? [];
    groomingBeforePhotos.forEach((item) => URL.revokeObjectURL(item.url)); groomingAfterPhotos.forEach((item) => URL.revokeObjectURL(item.url)); groomingBeforePhotos = []; groomingAfterPhotos = [];
    attachmentPreviews.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); }); attachmentPreviews = [];
    existingAttachmentPreviews = type?.codigo === 'laboratorio' || type?.codigo === 'peluqueria_spa' ? [] : initialAttachments.map((attachment) => ({ ...attachment }));
    existingGroomingBefore = initialAttachments.filter((attachment) => attachment.group === 0);
    existingGroomingAfter = initialAttachments.filter((attachment) => attachment.group === 1);
    const prefilledField = type?.campos.find((field) => field.precarga === 'fecha_ultimo_registro');
    if (contextId && petId && type && prefilledField) void loadLatestRecord(contextId, petId, type.id_tipos_registro_atencion);
  });

  const evaluationKeys = new Set(['fid_motivos_consulta', 'subjetivo', 'objetivo']);
  const planKeys = new Set(['interpretacion', 'plan_terapeutico', 'plan_diagnostico', 'fecha_programada']);
  const vaccineApplicationKeys = new Set(['fid_vacunas', 'laboratorio', 'lote']);
  const vaccineFollowUpKeys = new Set(['observaciones', 'fecha_programada']);
  const dewormingApplicationKeys = new Set(['fecha_ultima_desparasitacion', 'fid_parametros_tipo_desparasitacion', 'producto', 'dosis']);
  const dewormingFollowUpKeys = new Set(['observaciones', 'fecha_programada']);
  const hospitalizationApplicationKeys = new Set(['fid_tipos_hospitalizacion', 'fecha_ingreso', 'razon_ingreso']);
  const hospitalizationFollowUpKeys = new Set(['fid_parametros_motivo_salida_hospitalizacion', 'fecha_salida', 'observaciones']);
  const daycareStayKeys = new Set(['fecha_ingreso', 'fecha_salida', 'fid_parametros_tipo_estancia_guarderia']);
  const daycareCareKeys = new Set(['tipo_comida', 'cantidad_comida', 'objetos_mascota', 'observaciones_recomendaciones']);
  const referralDestinationKeys = new Set(['fid_usuarios_remitente', 'clinica_veterinaria_destino']);
  const referralDetailKeys = new Set(['razon_procedimiento', 'observaciones']);
  const followUpIdentityKeys = new Set(['fid_parametros_tipo_seguimiento', 'motivo']);
  const followUpDetailKeys = new Set(['detalle_seguimiento', 'fecha_programada']);
  const procedureApplicationKeys = new Set(['fid_procedimientos_veterinarios', 'descripcion_quirurgica', 'preanestesico', 'anestesico']);
  const procedureFollowUpKeys = new Set(['otros_medicamentos', 'tratamiento', 'observaciones', 'complicaciones']);
  const diagnosticImagingApplicationKeys = new Set(['fid_estudios_diagnosticos', 'fid_parametros_sedacion_imagen', 'signos_clinicos', 'diagnosticos_presuntivos']);
  const diagnosticImagingFollowUpKeys = new Set(['tipo_estudio', 'observaciones']);
  const structuredCodes = new Set(['consulta', 'vacunacion', 'formula_medica', 'desparasitacion', 'hospitalizacion_ambulatorio', 'cirugia_procedimiento', 'laboratorio', 'imagen_diagnostica', 'peluqueria_spa', 'guarderia', 'remision', 'seguimiento']);
  const fieldLabel = (field: Field) => i18n.locale === 'en' ? (field.etiqueta_en ?? field.etiqueta) : (field.etiqueta_es ?? field.etiqueta);
  const typeName = (item: RecordType) => i18n.locale === 'en' ? (item.nombre_en ?? item.nombre) : (item.nombre_es ?? item.nombre);
  const typeDescription = (item: RecordType) => i18n.locale === 'en' ? (item.descripcion_en ?? item.descripcion) : (item.descripcion_es ?? item.descripcion);
  const prefillHelp = (field: Field) => i18n.locale === 'en' ? (field.ayuda_precarga_en ?? '') : (field.ayuda_precarga_es ?? '');
  const applicationKeys = (code: string) => code === 'consulta' ? evaluationKeys : code === 'seguimiento' ? followUpIdentityKeys : code === 'desparasitacion' ? dewormingApplicationKeys : code === 'hospitalizacion_ambulatorio' ? hospitalizationApplicationKeys : code === 'guarderia' ? daycareStayKeys : code === 'remision' ? referralDestinationKeys : code === 'cirugia_procedimiento' ? procedureApplicationKeys : code === 'imagen_diagnostica' ? diagnosticImagingApplicationKeys : vaccineApplicationKeys;
  const followUpKeys = (code: string) => code === 'consulta' ? planKeys : code === 'seguimiento' ? followUpDetailKeys : code === 'desparasitacion' ? dewormingFollowUpKeys : code === 'hospitalizacion_ambulatorio' ? hospitalizationFollowUpKeys : code === 'guarderia' ? daycareCareKeys : code === 'remision' ? referralDetailKeys : code === 'cirugia_procedimiento' ? procedureFollowUpKeys : code === 'imagen_diagnostica' ? diagnosticImagingFollowUpKeys : vaccineFollowUpKeys;
  const medicationFieldClass = (key: string) => key === 'medicamento' ? 'lg:col-span-3' : key === 'presentacion' ? 'lg:col-span-2' : key === 'cantidad' ? 'lg:col-span-2' : key === 'posologia' ? 'lg:col-span-4' : 'lg:col-span-3';

  function setAttachments(files: File[]) {
    attachmentPreviews.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); });
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    if (attachmentInput) attachmentInput.files = transfer.files;
    attachmentPreviews = files.map((file) => ({
      file,
      url: attentionAttachmentFamily(file.name) === 'image' ? URL.createObjectURL(file) : null
    }));
  }

  function chooseAttachments() {
    if (!attachmentInput) return;
    attachmentInput.value = '';
    attachmentInput.click();
  }

  function selectedAttachments() {
    const selected = Array.from(attachmentInput?.files ?? []);
    const current = attachmentPreviews.map(({ file }) => file);
    const files = [...current, ...selected];
    const error = attachmentValidationError(files, existingAttachmentPreviews.length);
    if (error) {
      attachmentError = error;
      setAttachments(current);
      return;
    }
    attachmentError = '';
    setAttachments(files);
  }

  function attachmentValidationError(files: File[], existingCount = 0): string {
    if (files.length + existingCount > effectiveAttachmentMaxFiles)
      return i18n.t('attentions.attachmentsTooMany', { max: effectiveAttachmentMaxFiles });
    for (const file of files) {
      const issue = attentionAttachmentIssue(file, attachmentMaxBytes);
      if (!issue) continue;
      if (issue === 'empty') return i18n.t('attentions.attachmentEmpty', { file: file.name });
      if (issue === 'tooLarge') return i18n.t('attentions.attachmentTooLargeDetailed', {
        file: file.name,
        size: (file.size / 1_048_576).toFixed(1),
        max: (attachmentMaxBytes / 1_048_576).toFixed(0),
      });
      return i18n.t(issue === 'mimeMismatch' ? 'attentions.attachmentTypeMismatch' : 'attentions.attachmentUnsupportedFormat', { file: file.name });
    }
    return '';
  }

  function removeAttachment(index: number) {
    setAttachments(attachmentPreviews.filter((_, current) => current !== index).map(({ file }) => file));
  }

  function removeExistingAttachment(index: number) {
    existingAttachmentPreviews = existingAttachmentPreviews.filter((_, current) => current !== index);
    attachmentError = '';
  }

  const laboratoryField = (key: string) => type?.campos.find((field) => field.clave === 'pruebas')?.campos?.find((field) => field.clave === key);
  const laboratoryProfessionals = () => laboratoryField('fid_usuarios_profesional')?.opciones ?? [];
  const laboratoryGroups = () => Array.from(new Map(laboratoryOptions.filter((option) => option.grupo && option.grupo_id).map((option) => [option.grupo_id!, option.grupo!])).entries()).map(([id, name]) => ({ id, name }));
  function addLaboratoryRow() { if (laboratoryRows.length < 20) laboratoryRows = [...laboratoryRows, { professional: '', test: '', quantity: '1', existing: [], files: [] }]; }
  function removeLaboratoryRow(index: number) { laboratoryRows[index]?.files.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); }); laboratoryRows = laboratoryRows.filter((_, current) => current !== index); }
  function updateLaboratoryRow(index: number, values: Partial<Omit<LaboratoryRow, 'files'>>) { laboratoryRows = laboratoryRows.map((row, current) => current === index ? { ...row, ...values } : row); }
  function addLaboratoryFiles(index: number, selected: File[]) {
    const row = laboratoryRows[index]; if (!row) return;
    const files = [...row.files.map((item) => item.file), ...selected];
    if (files.length + row.existing.length > 1) { attachmentError = i18n.t('laboratoryTests.resultLimit'); return; }
    const existingTotal = laboratoryRows.reduce((total, item) => total + item.existing.length, 0);
    if (laboratoryRows.reduce((total, item, current) => total + (current === index ? files.length : item.files.length), 0) + existingTotal > effectiveAttachmentMaxFiles) { attachmentError = i18n.t('attentions.attachmentsTooMany', { max: effectiveAttachmentMaxFiles }); return; }
    const error = attachmentValidationError(files, existingTotal); if (error) { attachmentError = error; return; }
    const next = files.map((file) => ({ file, url: attentionAttachmentFamily(file.name) === 'image' ? URL.createObjectURL(file) : null }));
    row.files.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); });
    laboratoryRows = laboratoryRows.map((item, current) => current === index ? { ...item, files: next } : item); attachmentError = '';
  }
  function removeLaboratoryFile(rowIndex: number, fileIndex: number) {
    const row = laboratoryRows[rowIndex]; if (!row) return; const removed = row.files[fileIndex]; if (removed?.url) URL.revokeObjectURL(removed.url);
    laboratoryRows = laboratoryRows.map((item, current) => current === rowIndex ? { ...item, files: item.files.filter((_, index) => index !== fileIndex) } : item);
  }
  function removeExistingLaboratoryFile(rowIndex: number, fileIndex: number) {
    laboratoryRows = laboratoryRows.map((item, current) => current === rowIndex ? { ...item, existing: item.existing.filter((_, index) => index !== fileIndex) } : item);
    attachmentError = '';
  }

  function addGroomingPhotos(stage: 'before' | 'after', selected: File[]) {
    const current = stage === 'before' ? groomingBeforePhotos : groomingAfterPhotos;
    const files = [...current.map((item) => item.file), ...selected];
    const existingStage = stage === 'before' ? existingGroomingBefore.length : existingGroomingAfter.length;
    if (files.length + existingStage > 5) { attachmentError = i18n.t('attentions.attachmentsTooMany', { max: 5 }); return; }
    if (files.some((file) => attentionAttachmentFamily(file.name) !== 'image')) { attachmentError = i18n.t('groomingServices.imageOnly'); return; }
    const existingTotal = existingGroomingBefore.length + existingGroomingAfter.length;
    const error = attachmentValidationError([...files, ...(stage === 'before' ? groomingAfterPhotos : groomingBeforePhotos).map((item) => item.file)], existingTotal); if (error) { attachmentError = error; return; }
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) })); current.forEach((item) => URL.revokeObjectURL(item.url));
    if (stage === 'before') groomingBeforePhotos = next; else groomingAfterPhotos = next; attachmentError = '';
  }
  function removeGroomingPhoto(stage: 'before' | 'after', index: number) { const current = stage === 'before' ? groomingBeforePhotos : groomingAfterPhotos; const removed = current[index]; if (removed) URL.revokeObjectURL(removed.url); const next = current.filter((_, currentIndex) => currentIndex !== index); if (stage === 'before') groomingBeforePhotos = next; else groomingAfterPhotos = next; }
  function removeExistingGroomingPhoto(stage: 'before' | 'after', index: number) { if (stage === 'before') existingGroomingBefore = existingGroomingBefore.filter((_, current) => current !== index); else existingGroomingAfter = existingGroomingAfter.filter((_, current) => current !== index); attachmentError = ''; }

  onDestroy(() => { attachmentPreviews.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); }); laboratoryRows.forEach((row) => row.files.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); })); groomingBeforePhotos.forEach((item) => URL.revokeObjectURL(item.url)); groomingAfterPhotos.forEach((item) => URL.revokeObjectURL(item.url)); });

  async function loadLatestRecord(contextId: string, currentPetId: string, typeId: string) {
    prefillLoading = true;
    try {
      const response = await fetch(`/clinic/attentions/pets/${currentPetId}/latest-record/${typeId}`);
      if (!response.ok) return;
      const result = await response.json() as { campo?: string; valor?: string | null };
      if (activeContextId !== contextId || !result.campo || !result.valor) return;
      fieldValues = { ...fieldValues, [result.campo]: result.valor };
      prefillOriginals = { ...prefillOriginals, [result.campo]: result.valor };
    } finally {
      if (activeContextId === contextId) prefillLoading = false;
    }
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const daycareDepartureInput = form?.elements.namedItem('fecha_salida') as HTMLInputElement | null;
    daycareDepartureInput?.setCustomValidity('');
    if (!form?.reportValidity() || !type) return;
    const source = new FormData(form);
    const detail: Record<string, unknown> = {};
    if (type.codigo === 'laboratorio') {
      if (!laboratoryRows.length) { listError = i18n.t('laboratoryTests.testRequired'); return; }
      detail.pruebas = laboratoryRows.map((row) => ({ fid_usuarios_profesional: row.professional, fid_pruebas_laboratorio: row.test, cantidad: Number(row.quantity), cantidad_adjuntos: row.existing.length + row.files.length }));
      const diagnosis = String(source.get('diagnostico_presuntivo') ?? '').trim(); if (diagnosis) detail.diagnostico_presuntivo = diagnosis;
      const attachments = laboratoryRows.flatMap((row) => row.files.map((item) => item.file));
      const retainedAttachments = laboratoryRows.map((row) => row.existing.map((attachment) => attachment.id));
      const error = attachmentValidationError(attachments, retainedAttachments.flat().length); if (error) { attachmentError = error; return; }
      pendingSave = { detail, attachments, retainedAttachments }; confirmationOpen = true; return;
    }
    if (type.codigo === 'peluqueria_spa') {
      const servicesField = type.campos.find((field) => field.clave === 'servicios');
      const services = (listValues.servicios ?? []).map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)));
      if (!servicesField || !services.length || services.some((item) => !item.fid_servicios_peluqueria_spa)) { listError = i18n.t('groomingServices.serviceRequired'); return; }
      detail.servicios = services;
      const notes = String(source.get('observaciones_generales') ?? '').trim(); if (notes) detail.observaciones_generales = notes;
      const nextDate = String(source.get('fecha_programada') ?? '').trim(); if (nextDate) detail.fecha_programada = nextDate;
      detail.cantidad_fotos_antes = existingGroomingBefore.length + groomingBeforePhotos.length; detail.cantidad_fotos_despues = existingGroomingAfter.length + groomingAfterPhotos.length;
      const retainedAttachments = [existingGroomingBefore.map((attachment) => attachment.id), existingGroomingAfter.map((attachment) => attachment.id)];
      const attachments = [...groomingBeforePhotos, ...groomingAfterPhotos].map((item) => item.file); const error = attachmentValidationError(attachments, retainedAttachments.flat().length); if (error) { attachmentError = error; return; }
      pendingSave = { detail, attachments, retainedAttachments }; confirmationOpen = true; return;
    }
    listError = '';
    for (const field of type.campos) {
      if (field.tipo === 'list') {
        const items = (listValues[field.clave] ?? []).map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value)));
        if (field.requerido && !items.length) {
          listError = i18n.t('medicalFormula.medicationRequired');
          return;
        }
        if (items.length) detail[field.clave] = items;
      } else if (field.tipo === 'boolean') detail[field.clave] = source.get(field.clave) === 'true';
      else { const value = String(source.get(field.clave) ?? '').trim(); if (value) detail[field.clave] = field.tipo === 'number' ? Number(value) : value; }
    }
    if (type.codigo === 'guarderia' && typeof detail.fecha_salida === 'string' && typeof detail.fecha_ingreso === 'string' && detail.fecha_salida < detail.fecha_ingreso) {
      daycareDepartureInput?.setCustomValidity(i18n.t('daycare.invalidDates'));
      daycareDepartureInput?.reportValidity();
      return;
    }
    const attachments = Array.from((form.elements.namedItem('adjuntos') as HTMLInputElement | null)?.files ?? []);
    const retainedAttachments = [existingAttachmentPreviews.map((attachment) => attachment.id)];
    const attachmentsError = attachmentValidationError(attachments, retainedAttachments[0].length);
    if (attachmentsError) {
      attachmentError = attachmentsError;
      return;
    }
    attachmentError = '';
    pendingSave = { detail, attachments, retainedAttachments };
    confirmationOpen = true;
  }

  async function confirmSave() {
    if (!pendingSave) return;
    await onSave(pendingSave.detail, pendingSave.attachments, pendingSave.retainedAttachments);
    pendingSave = null;
    form?.reset();
    const listField = type?.campos.find((field) => field.tipo === 'list');
    listValues = listField?.requerido ? { [listField.clave]: [emptyListItem(listField)] } : {};
    listError = '';
    setAttachments([]);
    laboratoryRows.forEach((row) => row.files.forEach(({ url }) => { if (url) URL.revokeObjectURL(url); })); laboratoryRows = [];
    groomingBeforePhotos.forEach((item) => URL.revokeObjectURL(item.url)); groomingAfterPhotos.forEach((item) => URL.revokeObjectURL(item.url)); groomingBeforePhotos = []; groomingAfterPhotos = [];
    open = false;
  }

  function emptyListItem(field: Field) {
    return Object.fromEntries((field.campos ?? []).map((item) => [item.clave, '']));
  }

  function addListItem(field: Field) {
    const current = listValues[field.clave] ?? [];
    if (current.length >= (field.max_items ?? 30)) return;
    listValues = { ...listValues, [field.clave]: [...current, emptyListItem(field)] };
    listError = '';
  }

  function updateListItem(field: Field, index: number, key: string, value: string) {
    const current = listValues[field.clave] ?? [];
    listValues = { ...listValues, [field.clave]: current.map((item, currentIndex) => currentIndex === index ? { ...item, [key]: value } : item) };
  }

  function removeListItem(field: Field, index: number) {
    listValues = { ...listValues, [field.clave]: (listValues[field.clave] ?? []).filter((_, currentIndex) => currentIndex !== index) };
  }

  function requestVaccineCreation(event: SubmitEvent) {
    event.preventDefault();
    if (!vaccineForm?.reportValidity()) return;
    vaccineConfirmationOpen = true;
  }

  async function createVaccine() {
    if (!onCreateVaccine) return;
    vaccineSaving = true;
    try {
      const vaccine = await onCreateVaccine(vaccineName.trim());
      vaccineOptions = [...vaccineOptions, { id: vaccine.id_vacunas, etiqueta: vaccine.nombre }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
      selectedVaccine = vaccine.id_vacunas;
      vaccineName = '';
      vaccineEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('vaccines.createdInline') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'vaccines.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      throw error;
    } finally {
      vaccineSaving = false;
    }
  }

  function requestConsultationReasonCreation(event: SubmitEvent) {
    event.preventDefault();
    if (!consultationReasonForm?.reportValidity()) return;
    consultationReasonConfirmationOpen = true;
  }

  async function createConsultationReason() {
    if (!onCreateConsultationReason) return;
    consultationReasonSaving = true;
    try {
      const created = await onCreateConsultationReason(consultationReasonName.trim(), consultationReasonDescription.trim());
      consultationReasonOptions = [...consultationReasonOptions, { id: created.id_motivos_consulta, etiqueta: created.nombre }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
      selectedConsultationReason = created.id_motivos_consulta;
      consultationReasonName = '';
      consultationReasonDescription = '';
      consultationReasonEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('consultationReasons.createdInline') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'consultationReasons.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      throw error;
    } finally {
      consultationReasonSaving = false;
    }
  }

  function requestHospitalizationTypeCreation(event: SubmitEvent) {
    event.preventDefault();
    if (!hospitalizationTypeForm?.reportValidity()) return;
    hospitalizationTypeConfirmationOpen = true;
  }

  async function createHospitalizationType() {
    if (!onCreateHospitalizationType) return;
    hospitalizationTypeSaving = true;
    try {
      const created = await onCreateHospitalizationType(hospitalizationTypeName.trim());
      hospitalizationTypeOptions = [...hospitalizationTypeOptions, { id: created.id_tipos_hospitalizacion, etiqueta: created.nombre }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
      selectedHospitalizationType = created.id_tipos_hospitalizacion;
      hospitalizationTypeName = '';
      hospitalizationTypeEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('hospitalizationTypes.createdInline') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'hospitalizationTypes.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      throw error;
    } finally {
      hospitalizationTypeSaving = false;
    }
  }

  function selectProcedure(id: string) {
    selectedProcedure = id;
    const guide = procedureOptions.find((option) => option.id === id)?.descripcion ?? '';
    const current = fieldValues.descripcion_quirurgica ?? '';
    if (!current || current === appliedProcedureGuide) {
      fieldValues = { ...fieldValues, descripcion_quirurgica: guide };
      appliedProcedureGuide = guide;
    }
  }

  function requestProcedureCreation(event: SubmitEvent) {
    event.preventDefault();
    if (!procedureForm?.reportValidity()) return;
    procedureConfirmationOpen = true;
  }

  async function createProcedure() {
    if (!onCreateProcedure) return;
    procedureSaving = true;
    try {
      const created = await onCreateProcedure(procedureName.trim(), procedureDescription.trim());
      procedureOptions = [...procedureOptions, { id: created.id_procedimientos_veterinarios, etiqueta: created.nombre, descripcion: created.descripcion_guia }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
      selectProcedure(created.id_procedimientos_veterinarios);
      procedureName = '';
      procedureDescription = '';
      procedureEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('procedures.createdInline') });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'procedures.saveError';
      toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
      throw error;
    } finally {
      procedureSaving = false;
    }
  }

  function requestLaboratoryTestCreation(event: SubmitEvent) { event.preventDefault(); if (laboratoryTestForm?.reportValidity()) laboratoryTestConfirmationOpen = true; }
  async function createLaboratoryTest() {
    if (!onCreateLaboratoryTest) return; laboratoryTestSaving = true;
    try {
      const created = await onCreateLaboratoryTest(laboratoryCategory, laboratoryTestName.trim());
      const group = laboratoryGroups().find((item) => item.id === laboratoryCategory)?.name;
      laboratoryOptions = [...laboratoryOptions, { id: created.id_pruebas_laboratorio, etiqueta: created.nombre, grupo: group, grupo_id: laboratoryCategory }].sort((a, b) => (a.grupo ?? '').localeCompare(b.grupo ?? '') || a.etiqueta.localeCompare(b.etiqueta));
      if (laboratoryRows[laboratoryTargetIndex]) updateLaboratoryRow(laboratoryTargetIndex, { test: created.id_pruebas_laboratorio });
      laboratoryTestName = ''; laboratoryTestEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('laboratoryTests.createdInline') });
    } catch (error) { const message = error instanceof Error ? error.message : 'laboratoryTests.saveError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); throw error; }
    finally { laboratoryTestSaving = false; }
  }

  function requestDiagnosticStudyCreation(event: SubmitEvent) { event.preventDefault(); if (diagnosticStudyForm?.reportValidity()) diagnosticStudyConfirmationOpen = true; }
  async function createDiagnosticStudy() {
    if (!onCreateDiagnosticStudy) return; diagnosticStudySaving = true;
    try {
      const created = await onCreateDiagnosticStudy(diagnosticStudyName.trim());
      diagnosticStudyOptions = [...diagnosticStudyOptions, { id: created.id_estudios_diagnosticos, etiqueta: created.nombre }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
      selectedDiagnosticStudy = created.id_estudios_diagnosticos; diagnosticStudyName = ''; diagnosticStudyEditorOpen = false;
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('diagnosticStudies.createdInline') });
    } catch (error) { const message = error instanceof Error ? error.message : 'diagnosticStudies.saveError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); throw error; }
    finally { diagnosticStudySaving = false; }
  }
  function requestGroomingServiceCreation(event: SubmitEvent) { event.preventDefault(); if (groomingServiceForm?.reportValidity()) groomingServiceConfirmationOpen = true; }
  async function createGroomingService() {
    if (!onCreateGroomingService) return; groomingServiceSaving = true;
    try { const created = await onCreateGroomingService(groomingServiceName.trim()); groomingServiceOptions = [...groomingServiceOptions, { id: created.id_servicios_peluqueria_spa, etiqueta: created.nombre }].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)); const field = type?.campos.find((item) => item.clave === 'servicios'); if (field) updateListItem(field, groomingTargetIndex, 'fid_servicios_peluqueria_spa', created.id_servicios_peluqueria_spa); groomingServiceName = ''; groomingServiceEditorOpen = false; toast.success(i18n.t('notifications.type.success'), { description: i18n.t('groomingServices.createdInline') }); }
    catch (error) { const message = error instanceof Error ? error.message : 'groomingServices.saveError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); throw error; }
    finally { groomingServiceSaving = false; }
  }
</script>

{#snippet fieldControl(field: Field, compact = false)}
  {#if field.tipo === 'boolean'}
    <label class="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-hairline bg-surface/45 px-4 py-3"><span class="text-sm font-medium text-ink">{fieldLabel(field)}</span><input type="checkbox" name={field.clave} value="true" checked={fieldValues[field.clave] === 'true'} class="size-4 accent-primary" /></label>
  {:else}
    <div class="block"><div class="flex items-center gap-1.5 font-medium text-charcoal {compact ? 'mb-1 text-xs' : 'mb-1.5 text-sm'}"><label for={`record-${field.clave}`}>{fieldLabel(field)}{#if field.requerido}<span class="ml-0.5 text-error">*</span>{/if}</label>{#if field.clave === 'fid_motivos_consulta' && canCreateConsultationReason}<button type="button" class="ml-auto inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => (consultationReasonEditorOpen = true)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{i18n.t('consultationReasons.add')}</button>{:else if field.clave === 'fid_vacunas' && canCreateVaccine}<button type="button" class="ml-auto inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => (vaccineEditorOpen = true)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{i18n.t('vaccines.add')}</button>{:else if field.clave === 'fid_tipos_hospitalizacion' && canCreateHospitalizationType}<button type="button" class="ml-auto inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => (hospitalizationTypeEditorOpen = true)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{i18n.t('hospitalizationTypes.add')}</button>{:else if field.clave === 'fid_procedimientos_veterinarios' && canCreateProcedure}<button type="button" class="ml-auto inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => (procedureEditorOpen = true)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{i18n.t('procedures.add')}</button>{:else if field.clave === 'fid_estudios_diagnosticos' && canCreateDiagnosticStudy}<button type="button" class="ml-auto inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => (diagnosticStudyEditorOpen = true)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{i18n.t('diagnosticStudies.add')}</button>{/if}{#if field.precarga && prefillOriginals[field.clave] && fieldValues[field.clave] === prefillOriginals[field.clave]}<button type="button" class="group relative inline-grid shrink-0 place-items-center" aria-label={prefillHelp(field)}><Icon name="circle-check" size={16} class="text-success" /><span role="tooltip" class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-hairline-strong bg-ink px-2.5 py-1.5 text-xs font-medium text-canvas opacity-0 shadow-soft transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{prefillHelp(field)}</span></button>{:else if field.precarga && prefillLoading}<span class="size-3.5 animate-spin rounded-full border-2 border-stone border-r-transparent" aria-hidden="true"></span>{/if}</div>
      {#if field.tipo === 'textarea'}<textarea id={`record-${field.clave}`} name={field.clave} required={field.requerido} maxlength={field.max ?? 4000} rows={compact ? 3 : 4} value={fieldValues[field.clave] ?? ''} oninput={(event) => (fieldValues = { ...fieldValues, [field.clave]: event.currentTarget.value })} class="w-full resize-y rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'px-3 py-2 text-sm leading-5' : 'px-3.5 py-3 text-base'}"></textarea>
      {:else if field.tipo === 'uuid'}
        {#if field.clave === 'fid_motivos_consulta'}
          <select id={`record-${field.clave}`} name={field.clave} bind:value={selectedConsultationReason} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each consultationReasonOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {:else if field.clave === 'fid_vacunas'}
          <select id={`record-${field.clave}`} name={field.clave} bind:value={selectedVaccine} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each vaccineOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {:else if field.clave === 'fid_tipos_hospitalizacion'}
          <select id={`record-${field.clave}`} name={field.clave} bind:value={selectedHospitalizationType} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each hospitalizationTypeOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {:else if field.clave === 'fid_procedimientos_veterinarios'}
          <select id={`record-${field.clave}`} name={field.clave} value={selectedProcedure} onchange={(event) => selectProcedure(event.currentTarget.value)} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each procedureOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {:else if field.clave === 'fid_estudios_diagnosticos'}
          <select id={`record-${field.clave}`} name={field.clave} bind:value={selectedDiagnosticStudy} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each diagnosticStudyOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {:else}
          <select id={`record-${field.clave}`} name={field.clave} value={fieldValues[field.clave] ?? ''} onchange={(event) => (fieldValues = { ...fieldValues, [field.clave]: event.currentTarget.value })} required={field.requerido} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}"><option value="">{i18n.t('attentions.selectOption')}</option>{#each field.opciones ?? [] as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select>
        {/if}
      {:else}<input id={`record-${field.clave}`} name={field.clave} value={fieldValues[field.clave] ?? field.valor_predeterminado ?? ''} type={field.tipo === 'datetime' ? 'datetime-local' : field.tipo} required={field.requerido} maxlength={field.tipo === 'text' ? field.max : undefined} min={field.tipo === 'number' ? field.min : field.tipo === 'date' ? '1900-01-01' : undefined} max={field.tipo === 'number' ? field.max : field.tipo === 'date' ? field.valor_predeterminado : undefined} step={field.tipo === 'number' ? 'any' : undefined} class="w-full rounded-md border border-hairline-strong bg-canvas text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 {compact ? 'h-10 px-3 text-sm' : 'h-11 px-3.5 text-base'}" oninput={(event) => (fieldValues = { ...fieldValues, [field.clave]: event.currentTarget.value })} />{/if}
    </div>
  {/if}
{/snippet}

{#snippet listControl(field: Field)}
  <div class="min-w-0">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="min-w-0"><h3 class="text-base font-semibold text-ink">{fieldLabel(field)}<span class="ml-0.5 text-error">*</span></h3><p class="mt-0.5 text-xs leading-5 text-steel">{i18n.t('medicalFormula.medicationsRequired')}</p></div>
      <Button type="button" class="h-9 shrink-0" onclick={() => addListItem(field)} disabled={(listValues[field.clave]?.length ?? 0) >= (field.max_items ?? 30)}><Plus size={16} strokeWidth={1.9} aria-hidden="true" />{i18n.t('medicalFormula.addMedication')}</Button>
    </div>
    {#if !(listValues[field.clave]?.length)}
      <div class="border-y border-hairline py-5 text-sm text-steel">{i18n.t('medicalFormula.noMedications')}</div>
    {:else}
      <div class="border-y border-hairline">
        {#each listValues[field.clave] as item, index (index)}
          <section class="py-4 {index ? 'border-t border-hairline' : ''}">
            <div class="grid items-end gap-3 lg:grid-cols-12">
              {#each field.campos ?? [] as subfield (subfield.clave)}
                <label class="block {medicationFieldClass(subfield.clave)}"><span class="mb-1 block text-xs font-medium text-charcoal">{fieldLabel(subfield)}{#if subfield.requerido}<span class="ml-0.5 text-error">*</span>{/if}</span>
                  <input value={item[subfield.clave] ?? ''} required={subfield.requerido} maxlength={subfield.max} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" oninput={(event) => updateListItem(field, index, subfield.clave, event.currentTarget.value)} />
                </label>
              {/each}
              <button type="button" class="grid size-10 place-items-center rounded-md border border-error text-error transition-colors hover:bg-error/10 lg:col-span-1" aria-label={i18n.t('medicalFormula.removeMedication')} onclick={() => removeListItem(field, index)}><Trash2 size={17} strokeWidth={1.9} aria-hidden="true" /></button>
            </div>
          </section>
        {/each}
      </div>
    {/if}
    {#if listError}<span class="mt-2 block text-xs font-medium text-error">{listError}</span>{/if}
  </div>
{/snippet}

{#snippet attachments()}
  <div class="block">
    <span class="block text-sm font-semibold text-ink">{i18n.t('attentions.attachments')}</span>
    <span class="mt-0.5 block text-xs text-steel">{i18n.t('attentions.attachmentsHelp', { max: effectiveAttachmentMaxFiles })}</span>
    <div class="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {#each existingAttachmentPreviews as attachment, index (attachment.id)}
        <div class="group relative aspect-square overflow-hidden rounded-md border border-hairline bg-surface">
          {#if attachment.mime.startsWith('image/')}
            <img src={attachment.url} alt={attachment.name} class="size-full object-cover" />
          {:else}
            <div class="flex size-full min-w-0 flex-col items-center justify-center gap-2.5 px-3 py-4">
              <span class="grid size-16 place-items-center"><AttachmentFileIcon name={attachment.name} size={56} /></span>
              <span class="text-xs font-bold uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(attachment.name)}</span>
              <span class="w-full truncate text-center text-xs font-medium text-ink" title={attachment.name}>{attachment.name}</span>
            </div>
          {/if}
          <button type="button" class="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full border border-white/30 bg-black/65 text-white transition-colors hover:bg-error" aria-label={i18n.t('attentions.delete')} onclick={() => removeExistingAttachment(index)}><X size={15} strokeWidth={2} aria-hidden="true" /></button>
        </div>
      {/each}
      {#each attachmentPreviews as preview, index (preview.file)}
        <div class="group relative aspect-square overflow-hidden rounded-md border border-hairline bg-surface">
          {#if preview.url}
            <img src={preview.url} alt={preview.file.name} class="size-full object-cover" />
          {:else}
            <div class="flex size-full min-w-0 flex-col items-center justify-center gap-2.5 px-3 py-4">
              <span class="grid size-16 place-items-center"><AttachmentFileIcon name={preview.file.name} size={56} /></span>
              <span class="text-xs font-bold uppercase tracking-[0.08em] text-charcoal">{attentionAttachmentExtension(preview.file.name)}</span>
              <span class="w-full truncate text-center text-xs font-medium text-ink" title={preview.file.name}>{preview.file.name}</span>
            </div>
          {/if}
          <button type="button" class="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full border border-white/30 bg-black/65 text-white transition-colors hover:bg-error" aria-label={i18n.t('attentions.delete')} onclick={() => removeAttachment(index)}><X size={15} strokeWidth={2} aria-hidden="true" /></button>
        </div>
      {/each}
      {#if existingAttachmentPreviews.length + attachmentPreviews.length < effectiveAttachmentMaxFiles}
        <button type="button" class="grid aspect-square place-items-center rounded-md border border-dashed border-hairline-strong bg-surface/50 text-primary transition-colors hover:border-primary hover:bg-primary-soft" aria-label={i18n.t('attentions.attachments')} onclick={chooseAttachments}><Plus size={32} strokeWidth={1.8} aria-hidden="true" /></button>
      {/if}
    </div>
    <input bind:this={attachmentInput} name="adjuntos" type="file" multiple accept={ATTENTION_ATTACHMENT_ACCEPT} onchange={selectedAttachments} class="sr-only" />
    {#if attachmentError}<span class="mt-2 block text-xs font-medium text-error">{attachmentError}</span>{/if}
  </div>
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content class={structuredCodes.has(type?.codigo ?? '') ? 'flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[90dvh] sm:w-[calc(100vw-5rem)] sm:max-w-[1240px] [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:size-10 [&_[data-slot=dialog-close]_svg]:size-5' : 'max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none overflow-y-auto p-0 sm:max-h-[88dvh] sm:w-[calc(100vw-4rem)] sm:max-w-[960px]'}>
    {#if type}
      <Dialog.Header class="border-b border-hairline px-5 {structuredCodes.has(type.codigo) ? 'shrink-0 py-3.5 pr-12' : 'py-5'} sm:px-6">
        <div class="flex min-w-0 gap-3 {structuredCodes.has(type.codigo) ? 'items-center' : 'items-start'}"><span class="grid shrink-0 place-items-center rounded-lg text-white {structuredCodes.has(type.codigo) ? 'size-11' : 'size-10'}" style:background-color={type.color_hex}><Icon name={type.icono} size={structuredCodes.has(type.codigo) ? 22 : 20} /></span><div class="min-w-0"><Dialog.Title class="text-lg font-semibold text-ink">{editing ? i18n.t('attentions.editRecordTitle', { type: typeName(type) }) : typeName(type)}{#if type.codigo === 'vacunacion' || type.codigo === 'desparasitacion'} <span class="font-normal text-steel">· {petWeight ?? i18n.t(type.codigo === 'desparasitacion' ? 'deworming.weightMissingShort' : 'vaccines.weightMissingShort')}</span>{/if}</Dialog.Title>{#if !structuredCodes.has(type.codigo)}<Dialog.Description class="mt-0.5 line-clamp-1 text-sm leading-5 text-steel">{typeDescription(type)}</Dialog.Description>{/if}</div></div>
      </Dialog.Header>
      <form id="record-detail-form" bind:this={form} onsubmit={submit} class={structuredCodes.has(type.codigo) ? 'flex min-h-0 flex-1 flex-col' : 'grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6'}>
        {#if structuredCodes.has(type.codigo)}
          {#if type.codigo === 'laboratorio'}
            <div class="min-h-0 flex-1 overflow-y-auto">
              <section class="grid gap-5 px-5 py-5 sm:px-6">
                <div>
                  {#each type.campos.filter((field) => field.clave === 'diagnostico_presuntivo') as field (field.clave)}{@render fieldControl(field, true)}{/each}
                </div>
                <div class="border-t border-hairline pt-4">
                  <div class="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 class="text-base font-semibold text-ink">{i18n.t('laboratoryTests.tests')}</h3><p class="mt-0.5 text-xs text-steel">{i18n.t('laboratoryTests.multipleHelp')}</p></div><Button type="button" class="h-9" onclick={addLaboratoryRow} disabled={laboratoryRows.length >= 20}><Plus size={16} />{i18n.t('laboratoryTests.addRow')}</Button></div>
                  <div class="divide-y divide-hairline border-y border-hairline">
                    {#each laboratoryRows as row, index (index)}
                      <article class="grid gap-3 py-4 lg:grid-cols-12 lg:items-end">
                        <label class="block lg:col-span-3"><span class="mb-1 block text-xs font-medium text-charcoal">{i18n.t('laboratoryTests.professional')}<span class="text-error">*</span></span><select required value={row.professional} onchange={(event) => updateLaboratoryRow(index, { professional: event.currentTarget.value })} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"><option value="">{i18n.t('attentions.selectOption')}</option>{#each laboratoryProfessionals() as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select></label>
                        <div class="block lg:col-span-4"><span class="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-charcoal"><label for={`laboratory-test-${index}`}>{i18n.t('laboratoryTests.test')}<span class="text-error">*</span></label>{#if canCreateLaboratoryTest}<button type="button" class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" onclick={() => { laboratoryTargetIndex = index; laboratoryTestEditorOpen = true; }}><Plus size={14} />{i18n.t('laboratoryTests.add')}</button>{/if}</span><select id={`laboratory-test-${index}`} required value={row.test} onchange={(event) => updateLaboratoryRow(index, { test: event.currentTarget.value })} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"><option value="">{i18n.t('attentions.selectOption')}</option>{#each laboratoryGroups() as group (group.id)}<optgroup label={group.name}>{#each laboratoryOptions.filter((option) => option.grupo_id === group.id) as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</optgroup>{/each}</select></div>
                        <label class="block lg:col-span-1"><span class="mb-1 block text-xs font-medium text-charcoal">{i18n.t('laboratoryTests.quantity')}<span class="text-error">*</span></span><input type="number" required min="1" max="999" step="1" value={row.quantity} oninput={(event) => updateLaboratoryRow(index, { quantity: event.currentTarget.value })} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
                        <div class="min-w-0 lg:col-span-3"><span class="mb-1 block text-xs font-medium text-charcoal">{i18n.t('laboratoryTests.results')}</span><div class="flex min-h-10 flex-wrap items-center gap-2">{#each row.existing as result, fileIndex (result.id)}<span class="group flex h-10 min-w-0 max-w-40 items-center gap-2 rounded-md border border-hairline px-2">{#if result.mime.startsWith('image/')}<img src={result.url} alt={result.name} class="size-7 shrink-0 rounded object-cover" />{:else}<AttachmentFileIcon name={result.name} size={22} />{/if}<span class="truncate text-xs text-ink" title={result.name}>{result.name}</span><button type="button" class="shrink-0 text-error" aria-label={i18n.t('attentions.delete')} onclick={() => removeExistingLaboratoryFile(index, fileIndex)}><X size={14} /></button></span>{/each}{#each row.files as result, fileIndex (result.file)}<span class="group flex h-10 min-w-0 max-w-40 items-center gap-2 rounded-md border border-hairline px-2">{#if result.url}<img src={result.url} alt={result.file.name} class="size-7 shrink-0 rounded object-cover" />{:else}<AttachmentFileIcon name={result.file.name} size={22} />{/if}<span class="truncate text-xs text-ink" title={result.file.name}>{result.file.name}</span><button type="button" class="shrink-0 text-error" aria-label={i18n.t('attentions.delete')} onclick={() => removeLaboratoryFile(index, fileIndex)}><X size={14} /></button></span>{/each}{#if row.existing.length + row.files.length < 1}<label for={`laboratory-results-${index}`} class="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-hairline-strong px-3 text-xs font-medium text-primary hover:bg-primary-soft"><Plus size={15} />{i18n.t('laboratoryTests.attach')}<input id={`laboratory-results-${index}`} type="file" accept={ATTENTION_ATTACHMENT_ACCEPT} class="sr-only" onchange={(event) => { addLaboratoryFiles(index, Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} /></label>{/if}</div></div>
                        <button type="button" disabled={laboratoryRows.length === 1} class="grid size-10 place-items-center rounded-md border border-error text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40 lg:col-span-1" aria-label={i18n.t('laboratoryTests.removeRow')} onclick={() => removeLaboratoryRow(index)}><Trash2 size={17} /></button>
                      </article>
                    {/each}
                  </div>
                  {#if listError}<span class="mt-2 block text-xs font-medium text-error">{listError}</span>{/if}{#if attachmentError}<span class="mt-2 block text-xs font-medium text-error">{attachmentError}</span>{/if}
                </div>
              </section>
            </div>
          {:else if type.codigo === 'peluqueria_spa'}
            <div class="min-h-0 flex-1 overflow-y-auto">
              <section class="space-y-7 px-5 py-6 sm:px-8 sm:py-7">
                {#each type.campos.filter((field) => field.clave === 'servicios') as field (field.clave)}
                  <div>
                    <div class="mb-4 flex flex-wrap items-center justify-between gap-4"><div><h3 class="text-base font-semibold text-ink">{i18n.t('groomingServices.services')}</h3><p class="mt-1 text-xs leading-5 text-steel">{i18n.t('groomingServices.multipleHelp')}</p></div><Button type="button" class="h-9 shrink-0" onclick={() => addListItem(field)} disabled={(listValues.servicios?.length ?? 0) >= (field.max_items ?? 30)}><Plus size={16} />{i18n.t('groomingServices.addService')}</Button></div>
                    <div class="space-y-4">
                      {#each listValues.servicios ?? [] as item, index (index)}
                        <article class="grid gap-x-4 gap-y-4 rounded-lg border border-hairline bg-surface/30 p-4 sm:p-5 lg:grid-cols-12">
                          <div class="flex items-center justify-between gap-3 lg:col-span-12"><strong class="text-sm font-semibold text-ink">{i18n.t('groomingServices.service')} {index + 1}</strong><button type="button" disabled={(listValues.servicios?.length ?? 0) === 1} class="grid size-9 place-items-center rounded-md border border-error text-error hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-40" aria-label={i18n.t('groomingServices.removeService')} onclick={() => removeListItem(field, index)}><Trash2 size={16} /></button></div>
                          <div class="lg:col-span-4"><span class="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-charcoal"><label for={`grooming-service-${index}`}>{i18n.t('groomingServices.name')}<span class="text-error">*</span></label>{#if canCreateGroomingService}<button type="button" class="inline-flex items-center gap-1 font-semibold text-primary hover:underline" onclick={() => { groomingTargetIndex = index; groomingServiceEditorOpen = true; }}><Plus size={14} />{i18n.t('groomingServices.add')}</button>{/if}</span><select id={`grooming-service-${index}`} required value={item.fid_servicios_peluqueria_spa ?? ''} onchange={(event) => updateListItem(field, index, 'fid_servicios_peluqueria_spa', event.currentTarget.value)} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"><option value="">{i18n.t('attentions.selectOption')}</option>{#each groomingServiceOptions as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select></div>
                          <label class="block lg:col-span-4"><span class="mb-1.5 block text-xs font-medium text-charcoal">{i18n.t('groomingServices.reason')}</span><input maxlength="500" value={item.motivo ?? ''} oninput={(event) => updateListItem(field, index, 'motivo', event.currentTarget.value)} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
                          <label class="block lg:col-span-4"><span class="mb-1.5 block text-xs font-medium text-charcoal">{i18n.t('groomingServices.staff')}</span><select value={item.fid_usuarios_encargado ?? ''} onchange={(event) => updateListItem(field, index, 'fid_usuarios_encargado', event.currentTarget.value)} class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"><option value="">{i18n.t('attentions.selectOption')}</option>{#each field.campos?.find((subfield) => subfield.clave === 'fid_usuarios_encargado')?.opciones ?? [] as option (option.id)}<option value={option.id}>{option.etiqueta}</option>{/each}</select></label>
                          <label class="block lg:col-span-12"><span class="mb-1.5 block text-xs font-medium text-charcoal">{i18n.t('groomingServices.details')}</span><textarea rows="3" maxlength="2000" value={item.detalle_observaciones ?? ''} oninput={(event) => updateListItem(field, index, 'detalle_observaciones', event.currentTarget.value)} class="w-full resize-y rounded-md border border-hairline-strong bg-canvas px-3 py-2.5 text-sm leading-5 text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"></textarea></label>
                        </article>
                      {/each}
                    </div>
                    {#if listError}<span class="mt-2 block text-xs font-medium text-error">{listError}</span>{/if}
                  </div>
                {/each}
                <div class="grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-0">
                  <div class="order-2 space-y-5 border-t border-hairline pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h3 class="text-base font-semibold text-ink">{i18n.t('groomingServices.generalInformation')}</h3>{#each type.campos.filter((field) => field.clave === 'observaciones_generales') as field (field.clave)}{@render fieldControl(field, true)}{/each}<div class="max-w-[260px]">{#each type.campos.filter((field) => field.clave === 'fecha_programada') as field (field.clave)}{@render fieldControl(field, true)}{/each}</div></div>
                  <div class="order-1 space-y-6 lg:pr-8">
                    <h3 class="text-base font-semibold text-ink">{i18n.t('groomingServices.photoRecord')}</h3>
                    <div><span class="block text-sm font-semibold text-ink">{i18n.t('groomingServices.beforePhotos')}</span><span class="mt-0.5 block text-xs text-steel">{i18n.t('groomingServices.photoHelp')}</span><div class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{#each existingGroomingBefore as photo, index (photo.id)}<div class="relative aspect-square overflow-hidden rounded-md border border-hairline"><img src={photo.url} alt={photo.name} class="size-full object-cover" /><span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{i18n.t('groomingServices.beforeTag')}</span><button type="button" class="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white hover:bg-error" onclick={() => removeExistingGroomingPhoto('before', index)} aria-label={i18n.t('attentions.delete')}><X size={14} /></button></div>{/each}{#each groomingBeforePhotos as photo, index (photo.file)}<div class="relative aspect-square overflow-hidden rounded-md border border-hairline"><img src={photo.url} alt={photo.file.name} class="size-full object-cover" /><span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{i18n.t('groomingServices.beforeTag')}</span><button type="button" class="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white hover:bg-error" onclick={() => removeGroomingPhoto('before', index)} aria-label={i18n.t('attentions.delete')}><X size={14} /></button></div>{/each}{#if existingGroomingBefore.length + groomingBeforePhotos.length < 5}<label class="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-hairline-strong bg-surface/50 text-primary hover:border-primary hover:bg-primary-soft"><Plus size={28} /><input type="file" multiple accept="image/jpeg,image/png,image/webp" class="sr-only" onchange={(event) => { addGroomingPhotos('before', Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} /></label>{/if}</div></div>
                    <div class="border-t border-hairline pt-5"><span class="block text-sm font-semibold text-ink">{i18n.t('groomingServices.afterPhotos')}</span><span class="mt-0.5 block text-xs text-steel">{i18n.t('groomingServices.photoHelp')}</span><div class="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{#each existingGroomingAfter as photo, index (photo.id)}<div class="relative aspect-square overflow-hidden rounded-md border border-hairline"><img src={photo.url} alt={photo.name} class="size-full object-cover" /><span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{i18n.t('groomingServices.nowTag')}</span><button type="button" class="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white hover:bg-error" onclick={() => removeExistingGroomingPhoto('after', index)} aria-label={i18n.t('attentions.delete')}><X size={14} /></button></div>{/each}{#each groomingAfterPhotos as photo, index (photo.file)}<div class="relative aspect-square overflow-hidden rounded-md border border-hairline"><img src={photo.url} alt={photo.file.name} class="size-full object-cover" /><span class="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold leading-none text-white">{i18n.t('groomingServices.nowTag')}</span><button type="button" class="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/65 text-white hover:bg-error" onclick={() => removeGroomingPhoto('after', index)} aria-label={i18n.t('attentions.delete')}><X size={14} /></button></div>{/each}{#if existingGroomingAfter.length + groomingAfterPhotos.length < 5}<label class="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-hairline-strong bg-surface/50 text-primary hover:border-primary hover:bg-primary-soft"><Plus size={28} /><input type="file" multiple accept="image/jpeg,image/png,image/webp" class="sr-only" onchange={(event) => { addGroomingPhotos('after', Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} /></label>{/if}</div></div>
                    {#if attachmentError}<span class="block text-xs font-medium text-error">{attachmentError}</span>{/if}
                  </div>
                </div>
              </section>
            </div>
          {:else if type.codigo === 'formula_medica'}
            <div class="min-h-0 flex-1 overflow-y-auto">
              <section class="grid gap-5 px-5 py-5 sm:px-6">
                {#each type.campos.filter((field) => field.clave === 'diagnostico_presuntivo') as field (field.clave)}
                  {@render fieldControl(field, true)}
                {/each}
                {#each type.campos.filter((field) => field.tipo === 'list') as field (field.clave)}
                  {@render listControl(field)}
                {/each}
                {#each type.campos.filter((field) => field.clave === 'observaciones') as field (field.clave)}
                  {@render fieldControl(field, true)}
                {/each}
              </section>
            </div>
          {:else}
            <div class="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2">
              <section class="px-5 py-4 sm:px-6 lg:pr-7">
                {#if (type.codigo === 'vacunacion' || type.codigo === 'desparasitacion') && !petWeight}
                  <div role="status" class="mb-4 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-3.5 py-3">
                    <Icon name="circle-info" size={18} class="mt-0.5 shrink-0 text-warning" />
                    <div class="min-w-0"><strong class="block text-sm text-ink">{i18n.t(type.codigo === 'desparasitacion' ? 'deworming.weightNotRegistered' : 'vaccines.weightNotRegistered')}</strong><p class="mt-0.5 text-xs leading-5 text-steel">{i18n.t(type.codigo === 'desparasitacion' ? 'deworming.weightNotRegisteredHelp' : 'vaccines.weightNotRegisteredHelp')}</p></div>
                  </div>
                {/if}
                <h3 class="mb-3 text-base font-semibold text-ink">{i18n.t(type.codigo === 'consulta' ? 'attentions.evaluation' : type.codigo === 'seguimiento' ? 'attentions.followUpInformation' : type.codigo === 'desparasitacion' ? 'deworming.applicationData' : type.codigo === 'hospitalizacion_ambulatorio' ? 'hospitalization.admissionData' : type.codigo === 'guarderia' ? 'daycare.stayData' : type.codigo === 'remision' ? 'referrals.destinationData' : type.codigo === 'cirugia_procedimiento' ? 'procedures.procedureData' : type.codigo === 'imagen_diagnostica' ? 'diagnosticStudies.requestData' : 'vaccines.applicationData')}</h3>
                <div class="flex flex-col gap-3">
                  {#each type.campos.filter((field) => applicationKeys(type.codigo).has(field.clave)) as field (field.clave)}
                    {@render fieldControl(field, true)}
                  {/each}
                  {#if type.codigo === 'consulta' && type.acepta_adjuntos}{@render attachments()}{/if}
                </div>
              </section>
              <section class="border-t border-hairline px-5 py-4 sm:px-6 lg:border-l lg:border-t-0 lg:pl-7">
                <h3 class="mb-3 text-base font-semibold text-ink">{i18n.t(type.codigo === 'consulta' ? 'attentions.assessmentAndPlan' : type.codigo === 'seguimiento' ? 'attentions.followUpDetail' : type.codigo === 'desparasitacion' ? 'deworming.notesAndFollowUp' : type.codigo === 'hospitalizacion_ambulatorio' ? 'hospitalization.dischargeData' : type.codigo === 'guarderia' ? 'daycare.careData' : type.codigo === 'remision' ? 'referrals.reasonData' : type.codigo === 'cirugia_procedimiento' ? 'procedures.treatmentOutcome' : type.codigo === 'imagen_diagnostica' ? 'diagnosticStudies.studyData' : 'vaccines.notesAndFollowUp')}</h3>
                <div class="flex flex-col gap-3">
                  {#each type.campos.filter((field) => followUpKeys(type.codigo).has(field.clave)) as field (field.clave)}
                    <div class={field.clave === 'fecha_programada' ? 'w-full sm:w-1/2' : ''}>{@render fieldControl(field, true)}</div>
                  {/each}
                  {#if type.codigo === 'desparasitacion' && type.acepta_adjuntos}{@render attachments()}{/if}
                  {#if type.codigo === 'cirugia_procedimiento' && type.acepta_adjuntos}{@render attachments()}{/if}
                  {#if type.codigo === 'imagen_diagnostica' && type.acepta_adjuntos}{@render attachments()}{/if}
                  {#if type.codigo === 'seguimiento' && type.acepta_adjuntos}{@render attachments()}{/if}
                </div>
              </section>
            </div>
          {/if}
          <div class="flex shrink-0 justify-end gap-2 border-t border-hairline bg-canvas px-5 py-3.5 sm:px-6"><Button type="button" variant="secondary" onclick={() => (open = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={saving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('attentions.saveRecord')}</Button></div>
        {:else}
          {#each type.campos as field (field.clave)}
            <div class={field.tipo === 'textarea' ? 'sm:col-span-2' : ''}>{@render fieldControl(field)}</div>
          {/each}
          {#if type.acepta_adjuntos}<div class="sm:col-span-2">{@render attachments()}</div>{/if}
          <div class="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onclick={() => (open = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={saving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('attentions.saveRecord')}</Button></div>
        {/if}
      </form>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={hospitalizationTypeEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[520px]">
    <Dialog.Header><Dialog.Title>{i18n.t('hospitalizationTypes.new')}</Dialog.Title><Dialog.Description>{i18n.t('hospitalizationTypes.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={hospitalizationTypeForm} onsubmit={requestHospitalizationTypeCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('hospitalizationTypes.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={hospitalizationTypeName} required minlength="2" maxlength="120" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (hospitalizationTypeEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={hospitalizationTypeSaving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('hospitalizationTypes.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={procedureEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[620px]">
    <Dialog.Header><Dialog.Title>{i18n.t('procedures.new')}</Dialog.Title><Dialog.Description>{i18n.t('procedures.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={procedureForm} onsubmit={requestProcedureCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('procedures.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={procedureName} required minlength="2" maxlength="160" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('procedures.guideDescription')}<span class="ml-0.5 text-error">*</span></span><textarea bind:value={procedureDescription} required minlength="5" maxlength="1000" rows="5" class="w-full resize-y rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-sm leading-5 text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"></textarea></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (procedureEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={procedureSaving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('procedures.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={laboratoryTestEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[560px]">
    <Dialog.Header><Dialog.Title>{i18n.t('laboratoryTests.new')}</Dialog.Title><Dialog.Description>{i18n.t('laboratoryTests.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={laboratoryTestForm} onsubmit={requestLaboratoryTestCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('laboratoryTests.category')}<span class="text-error">*</span></span><select bind:value={laboratoryCategory} required class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"><option value="">{i18n.t('attentions.selectOption')}</option>{#each laboratoryGroups() as group (group.id)}<option value={group.id}>{group.name}</option>{/each}</select></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('laboratoryTests.name')}<span class="text-error">*</span></span><input bind:value={laboratoryTestName} required minlength="2" maxlength="220" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (laboratoryTestEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={laboratoryTestSaving}><Save size={17} />{i18n.t('laboratoryTests.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={consultationReasonEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[560px]">
    <Dialog.Header><Dialog.Title>{i18n.t('consultationReasons.new')}</Dialog.Title><Dialog.Description>{i18n.t('consultationReasons.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={consultationReasonForm} onsubmit={requestConsultationReasonCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('consultationReasons.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={consultationReasonName} required minlength="2" maxlength="120" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('consultationReasons.reasonDescription')}</span><textarea bind:value={consultationReasonDescription} maxlength="500" rows="3" class="w-full resize-y rounded-md border border-hairline-strong bg-canvas px-3 py-2 text-sm leading-5 text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"></textarea></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (consultationReasonEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={consultationReasonSaving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('consultationReasons.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={diagnosticStudyEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[520px]">
    <Dialog.Header><Dialog.Title>{i18n.t('diagnosticStudies.new')}</Dialog.Title><Dialog.Description>{i18n.t('diagnosticStudies.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={diagnosticStudyForm} onsubmit={requestDiagnosticStudyCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('diagnosticStudies.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={diagnosticStudyName} required minlength="2" maxlength="160" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (diagnosticStudyEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={diagnosticStudySaving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('diagnosticStudies.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={groomingServiceEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[520px]">
    <Dialog.Header><Dialog.Title>{i18n.t('groomingServices.new')}</Dialog.Title><Dialog.Description>{i18n.t('groomingServices.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={groomingServiceForm} onsubmit={requestGroomingServiceCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('groomingServices.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={groomingServiceName} required minlength="2" maxlength="160" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (groomingServiceEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={groomingServiceSaving}><Save size={17} />{i18n.t('groomingServices.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={vaccineEditorOpen}>
  <Dialog.Content class="w-[calc(100vw-1rem)] sm:max-w-[520px]">
    <Dialog.Header><Dialog.Title>{i18n.t('vaccines.new')}</Dialog.Title><Dialog.Description>{i18n.t('vaccines.inlineHelp')}</Dialog.Description></Dialog.Header>
    <form bind:this={vaccineForm} onsubmit={requestVaccineCreation} class="grid gap-4">
      <label class="block"><span class="mb-1.5 block text-sm font-medium text-charcoal">{i18n.t('vaccines.name')}<span class="ml-0.5 text-error">*</span></span><input bind:value={vaccineName} required minlength="2" maxlength="120" class="h-10 w-full rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" /></label>
      <Dialog.Footer><Button type="button" variant="secondary" onclick={() => (vaccineEditorOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit" loading={vaccineSaving}><Save size={17} strokeWidth={1.9} aria-hidden="true" />{i18n.t('vaccines.save')}</Button></Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<ConfirmationDialog bind:open={confirmationOpen} variant="info" icon="save" title={i18n.t('attentions.confirmRecordTitle')} description={i18n.t('attentions.confirmRecordDescription')} confirmLabel={i18n.t('attentions.confirmRecord')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={confirmSave} onCancel={() => (pendingSave = null)} />
<ConfirmationDialog bind:open={vaccineConfirmationOpen} variant="info" icon="save" title={i18n.t('vaccines.confirmCreateTitle')} description={i18n.t('vaccines.confirmCreateHelp')} confirmLabel={i18n.t('vaccines.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createVaccine} />
<ConfirmationDialog bind:open={hospitalizationTypeConfirmationOpen} variant="info" icon="save" title={i18n.t('hospitalizationTypes.confirmCreateTitle')} description={i18n.t('hospitalizationTypes.confirmCreateHelp')} confirmLabel={i18n.t('hospitalizationTypes.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createHospitalizationType} />
<ConfirmationDialog bind:open={procedureConfirmationOpen} variant="info" icon="save" title={i18n.t('procedures.confirmCreateTitle')} description={i18n.t('procedures.confirmCreateHelp')} confirmLabel={i18n.t('procedures.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createProcedure} />
<ConfirmationDialog bind:open={laboratoryTestConfirmationOpen} variant="info" icon="save" title={i18n.t('laboratoryTests.confirmCreateTitle')} description={i18n.t('laboratoryTests.confirmCreateHelp')} confirmLabel={i18n.t('laboratoryTests.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createLaboratoryTest} />
<ConfirmationDialog bind:open={consultationReasonConfirmationOpen} variant="info" icon="save" title={i18n.t('consultationReasons.confirmCreateTitle')} description={i18n.t('consultationReasons.confirmCreateHelp')} confirmLabel={i18n.t('consultationReasons.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createConsultationReason} />
<ConfirmationDialog bind:open={diagnosticStudyConfirmationOpen} variant="info" icon="save" title={i18n.t('diagnosticStudies.confirmCreateTitle')} description={i18n.t('diagnosticStudies.confirmCreateHelp')} confirmLabel={i18n.t('diagnosticStudies.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createDiagnosticStudy} />
<ConfirmationDialog bind:open={groomingServiceConfirmationOpen} variant="info" icon="save" title={i18n.t('groomingServices.confirmCreateTitle')} description={i18n.t('groomingServices.confirmCreateHelp')} confirmLabel={i18n.t('groomingServices.save')} cancelLabel={i18n.t('attentions.cancel')} onConfirm={createGroomingService} />
