<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Breadcrumb, Button, Card, Icon, i18n, tienePermiso } from '$lib';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
  import RecordDialog, { type RecordType } from '../_components/RecordDialog.svelte';
  import OwnerForm from '../../owners/_components/OwnerForm.svelte';
  import PetForm from '../../pets/_components/PetForm.svelte';
  import OwnerBadge from '../_components/OwnerBadge.svelte';

  let { data }: PageProps = $props();
  type Owner = { id_propietarios: string; nombre_completo: string; numero_documento: string; celular: string | null; correo: string | null; sin_correo: boolean; telefono_fijo: string | null; direccion: string | null; contacto_alternativo_nombre: string | null; contacto_alternativo_telefono: string | null; organizacion: { id_organizaciones: string; nombre: string }; tipo_documento: { etiqueta: string }; admin_level_3: { nombre: string; admin_level_1: { nombre: string }; admin_level_2: { nombre: string } | null } | null };
  type Pet = { id_mascotas: string; nombre: string; foto_version: string | null; codigo_chip: string | null; peso: string | null; unidad_peso: { etiqueta: string } | null; especie: { nombre: string }; clasificacion: string | null; genero: { etiqueta: string }; temperamento: { etiqueta: string; color_hex: string | null } | null };
  type OwnerEdit = Owner & Partial<Record<'fid_parametros_tipo_documento' | 'fid_admin_level_0' | 'fid_admin_level_3' | 'fid_parametros_como_conocio' | 'como_conocio_otro', string | null>> & { celular_verificado?: boolean; correo_verificado?: boolean };
  type PetEdit = Pet & Partial<Record<'fid_propietarios' | 'fid_especies_animales' | 'fid_subespecies_animales' | 'fid_razas_animales' | 'fid_parametros_genero' | 'fid_parametros_color' | 'fecha_nacimiento' | 'peso' | 'fid_parametros_unidad_peso' | 'fid_parametros_talla' | 'fid_parametros_estado_reproductivo' | 'fid_parametros_temperamento' | 'alimento', string | null>> & { animal_servicio?: boolean; apoyo_emocional?: boolean; propietario?: { id_propietarios: string; nombre_completo: string; numero_documento: string; celular: string | null; tipo_documento: { etiqueta: string } } | null; subespecie?: { nombre: string } | null };
  let owner = $state<Owner | null>(null); let pets = $state<Pet[]>([]); let query = $state(''); let results = $state<Owner[]>([]); let searched = $state(false); let searching = $state(false);
  let ownerSearchOpen = $state(false); let ownerCreateOpen = $state(false); let petCreateOpen = $state(false); let recordOpen = $state(false); let selectedType = $state<RecordType | null>(null); let selectedPet = $state<Pet | null>(null); let detail = $state('{}'); let saving = $state(false);
  let ownerEditOpen = $state(false); let petEditOpen = $state(false); let editingOwner = $state<OwnerEdit | null>(null); let editingPet = $state<PetEdit | null>(null); let loadingOwnerEdit = $state(false); let loadingPetId = $state<string | null>(null);
  const canCreateOwner = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.create'));
  const canCreatePet = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.create'));
  const canEditOwner = $derived(tienePermiso(data.usuario.permisos, 'clinic.owners.read') && tienePermiso(data.usuario.permisos, 'clinic.owners.update'));
  const canEditPet = $derived(tienePermiso(data.usuario.permisos, 'clinic.pets.read') && tienePermiso(data.usuario.permisos, 'clinic.pets.update'));
  const canCreateVaccine = $derived(tienePermiso(data.usuario.permisos, 'administrator.vaccines.create'));
  const canCreateConsultationReason = $derived(tienePermiso(data.usuario.permisos, 'administrator.consultation_reasons.create'));
  const canCreateHospitalizationType = $derived(tienePermiso(data.usuario.permisos, 'administrator.hospitalization_types.create'));
  const canCreateProcedure = $derived(tienePermiso(data.usuario.permisos, 'administrator.procedures.create'));
  const canCreateLaboratoryTest = $derived(tienePermiso(data.usuario.permisos, 'administrator.laboratory_tests.create'));
  const canCreateDiagnosticStudy = $derived(tienePermiso(data.usuario.permisos, 'administrator.diagnostic_studies.create'));
  const canCreateGroomingService = $derived(tienePermiso(data.usuario.permisos, 'administrator.grooming_services.create'));
  const breadcrumbs = [{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('attentions.title'), href: '/clinic/attentions' }, { label: i18n.t('attentions.new') }];
  const typeName = (type: RecordType) => i18n.locale === 'en' ? (type.nombre_en ?? type.nombre) : (type.nombre_es ?? type.nombre);

  async function search() { if (query.trim().length < 2 || searching) return; searching = true; try { const response = await fetch(`/clinic/attentions/owners-search?q=${encodeURIComponent(query.trim())}`); results = response.ok ? ((await response.json()).propietarios ?? []) : []; searched = true; } finally { searching = false; } }
  async function selectOwner(value: Owner) { owner = value; ownerSearchOpen = false; const response = await fetch(`/clinic/attentions/owner-pets?owner=${value.id_propietarios}`); pets = response.ok ? ((await response.json()).mascotas ?? []) : []; }
  function ownerLocation(value: Owner) { return [value.admin_level_3?.nombre, value.admin_level_3?.admin_level_2?.nombre, value.admin_level_3?.admin_level_1.nombre].filter(Boolean).join(', '); }
  function ownerAddress(value: Owner) { return [value.direccion, ownerLocation(value)].filter(Boolean).join(' · ') || '—'; }
  function ownerAlternateContact(value: Owner) { return [value.contacto_alternativo_nombre, value.contacto_alternativo_telefono].filter(Boolean).join(' · ') || '—'; }
  async function loadOwnerForEdit(id: string) {
    const response = await fetch(`/clinic/attentions/owners/${id}`);
    if (!response.ok) { toast.error(i18n.t('notifications.type.error'), { description: i18n.t('owners.loadError') }); return null; }
    const result = await response.json() as { propietario: OwnerEdit };
    return owner ? { ...owner, ...result.propietario, organizacion: owner.organizacion } : result.propietario;
  }
  async function openOwnerEdit() {
    if (!owner || loadingOwnerEdit) return;
    loadingOwnerEdit = true;
    editingOwner = await loadOwnerForEdit(owner.id_propietarios);
    loadingOwnerEdit = false;
    if (editingOwner) ownerEditOpen = true;
  }
  async function ownerEdited() {
    if (!owner) return;
    const updated = await loadOwnerForEdit(owner.id_propietarios);
    if (updated) { owner = updated; editingOwner = updated; ownerEditOpen = false; }
  }
  async function loadPetForEdit(id: string) {
    const response = await fetch(`/clinic/attentions/pets/${id}`);
    if (!response.ok) { toast.error(i18n.t('notifications.type.error'), { description: i18n.t('pets.loadError') }); return null; }
    return (await response.json() as { mascota: PetEdit }).mascota;
  }
  async function openPetEdit(pet: Pet) {
    if (loadingPetId) return;
    loadingPetId = pet.id_mascotas;
    editingPet = await loadPetForEdit(pet.id_mascotas);
    loadingPetId = null;
    if (editingPet) petEditOpen = true;
  }
  async function petEdited() {
    if (!editingPet || !owner) return;
    const updated = await loadPetForEdit(editingPet.id_mascotas);
    if (!updated) return;
    if (updated.propietario?.id_propietarios !== owner.id_propietarios) pets = pets.filter((item) => item.id_mascotas !== updated.id_mascotas);
    else pets = pets.map((item) => item.id_mascotas === updated.id_mascotas ? { ...item, nombre: updated.nombre, foto_version: updated.foto_version, codigo_chip: updated.codigo_chip, peso: updated.peso ?? null, unidad_peso: updated.unidad_peso ?? null, especie: updated.especie, clasificacion: updated.subespecie?.nombre ?? null, genero: updated.genero, temperamento: updated.temperamento } : item);
    editingPet = updated;
    petEditOpen = false;
  }
  function start(type: RecordType, pet: Pet) { selectedType = type; selectedPet = pet; recordOpen = true; }
  let pendingAttention: { resolve: () => void; reject: (error: Error) => void } | null = null;
  function saveDetail(value: Record<string, unknown>, attachments: File[]) {
    return new Promise<void>((resolve, reject) => {
      pendingAttention = { resolve, reject };
      detail = JSON.stringify(value);
      const transfer = new DataTransfer();
      attachments.forEach((file) => transfer.items.add(file));
      attachmentInput.files = transfer.files;
      requestAnimationFrame(() => attentionForm.requestSubmit());
    });
  }
  let attentionForm: HTMLFormElement;
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
      pendingProcedure = { resolve, reject };
      procedureName = name;
      procedureDescription = description;
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
  const attentionSubmit: SubmitFunction = () => { saving = true; return async ({ result, update }) => {
    if (result.type === 'redirect') {
      toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.created') });
      pendingAttention?.resolve(); pendingAttention = null; saving = false;
      await update();
      return;
    }
    const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.saveError';
    toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
    pendingAttention?.reject(new Error(message)); pendingAttention = null; saving = false;
  }; };
  const ownerSubmit: SubmitFunction = () => async ({ result, update }) => { if (result.type === 'success' && result.data?.createdOwner) { const created = result.data.createdOwner as { id_propietarios: string }; const form = document.querySelector<HTMLFormElement>('#minimal-owner-form'); const value: Owner = { id_propietarios: created.id_propietarios, nombre_completo: String(new FormData(form!).get('nombre_completo')), numero_documento: String(new FormData(form!).get('numero_documento')), celular: null, correo: null, sin_correo: true, telefono_fijo: null, direccion: null, contacto_alternativo_nombre: null, contacto_alternativo_telefono: null, organizacion: { id_organizaciones: data.usuario.fid_organizaciones, nombre: data.usuario.organizacion.nombre }, admin_level_3: null, tipo_documento: { etiqueta: data.propietarios.tipos_documento.find((item: { id_parametros: string }) => item.id_parametros === String(new FormData(form!).get('fid_parametros_tipo_documento')))?.etiqueta ?? '' } }; await selectOwner(value); ownerCreateOpen = false; toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.ownerSaved') }); await update({ reset: true }); } else { const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.ownerSaveError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); } };
  const petSubmit: SubmitFunction = () => async ({ result, update }) => { if (result.type === 'success' && result.data?.createdPet && owner) { const created = result.data.createdPet as { id_mascotas: string }; const form = document.querySelector<HTMLFormElement>('#minimal-pet-form'); const speciesId = String(new FormData(form!).get('fid_especies_animales')); const genderId = String(new FormData(form!).get('fid_parametros_genero')); pets = [{ id_mascotas: created.id_mascotas, nombre: String(new FormData(form!).get('nombre')), foto_version: null, codigo_chip: null, peso: null, unidad_peso: null, especie: { nombre: data.mascotas.especies.find((item: { id_especies_animales: string }) => item.id_especies_animales === speciesId)?.nombre ?? '' }, clasificacion: null, genero: { etiqueta: data.mascotas.generos.find((item: { id_parametros: string }) => item.id_parametros === genderId)?.etiqueta ?? '' }, temperamento: null }, ...pets]; petCreateOpen = false; toast.success(i18n.t('notifications.type.success'), { description: i18n.t('attentions.petSaved') }); await update({ reset: true }); } else { const message = result.type === 'failure' && typeof result.data?.attentionMessage === 'string' ? result.data.attentionMessage : 'attentions.petSaveError'; toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) }); } };
</script>

<svelte:head><title>{i18n.t('attentions.new')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex flex-col gap-5">
  <div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('attentions.new')}</h1><p class="mt-1.5 max-w-[70ch] text-steel">{i18n.t('attentions.newDescription')}</p></div>
  <Card padding="none" class="overflow-hidden">
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-hairline px-5 py-4">
      <div><h2 class="font-semibold text-ink">{i18n.t('attentions.owner')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('attentions.ownerHelp')}</p></div>
      <div class="flex flex-wrap gap-2">{#if canCreateOwner}<Button type="button" variant="secondary" onclick={() => (ownerCreateOpen = true)}><Icon name="user-plus" size={17} />{i18n.t('attentions.createOwner')}</Button>{/if}<Button type="button" onclick={() => (ownerSearchOpen = true)}><Icon name="search" size={17} />{i18n.t(owner ? 'attentions.changeOwner' : 'attentions.searchOwner')}</Button></div>
    </div>
    <div class="grid items-stretch gap-7 p-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:p-6">
      <OwnerBadge {owner} />
      <div class="min-w-0 py-1 lg:px-2">
        {#if owner}
          <div class="flex items-center justify-between gap-3"><h3 class="text-base font-semibold text-ink">{i18n.t('attentions.ownerDetails')}</h3>{#if canEditOwner}<Button type="button" size="sm" variant="secondary" loading={loadingOwnerEdit} onclick={openOwnerEdit}><Icon name="pencil" size={15} />{i18n.t('owners.edit')}</Button>{/if}</div>
          <dl class="mt-3 border-y border-hairline-strong">
            <div class="grid grid-cols-[170px_minmax(0,1fr)] border-b border-hairline sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="building-2" size={15} class="shrink-0 text-primary" />{i18n.t('attentions.registeredAt')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-semibold leading-5 text-ink" title={owner.organizacion.nombre}>{owner.organizacion.nombre}</dd></div>
            <div class="grid grid-cols-[170px_minmax(0,1fr)] border-b border-hairline sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="smartphone" size={15} class="shrink-0 text-primary" />{i18n.t('owners.mobile')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-medium leading-5 text-ink" title={owner.celular ?? '—'}>{owner.celular ?? '—'}</dd></div>
            <div class="grid grid-cols-[170px_minmax(0,1fr)] border-b border-hairline sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="mail" size={15} class="shrink-0 text-primary" />{i18n.t('owners.email')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-medium leading-5 text-ink" title={owner.sin_correo ? i18n.t('owners.noEmailShort') : (owner.correo ?? '—')}>{owner.sin_correo ? i18n.t('owners.noEmailShort') : (owner.correo ?? '—')}</dd></div>
            <div class="grid grid-cols-[170px_minmax(0,1fr)] border-b border-hairline sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="phone" size={15} class="shrink-0 text-primary" />{i18n.t('owners.landline')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-medium leading-5 text-ink" title={owner.telefono_fijo ?? '—'}>{owner.telefono_fijo ?? '—'}</dd></div>
            <div class="grid grid-cols-[170px_minmax(0,1fr)] border-b border-hairline sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="map-pin" size={15} class="shrink-0 text-primary" />{i18n.t('owners.address')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-medium leading-5 text-ink" title={ownerAddress(owner)}>{ownerAddress(owner)}</dd></div>
            <div class="grid grid-cols-[170px_minmax(0,1fr)] sm:grid-cols-[240px_minmax(0,1fr)]"><dt class="flex items-center gap-2 border-r border-hairline px-3 py-2.5 text-xs font-semibold text-stone sm:whitespace-nowrap"><Icon name="users" size={15} class="shrink-0 text-primary" />{i18n.t('owners.alternateContact')}</dt><dd class="min-w-0 truncate whitespace-nowrap px-3 py-2.5 text-sm font-medium leading-5 text-ink" title={ownerAlternateContact(owner)}>{ownerAlternateContact(owner)}</dd></div>
          </dl>
        {:else}
          <div class="grid min-h-[350px] place-items-center rounded-xl border border-dashed border-hairline-strong px-6 text-center"><div><Icon name="circle-info" size={24} class="mx-auto text-stone" /><h3 class="mt-3 font-semibold text-ink">{i18n.t('attentions.ownerDetails')}</h3><p class="mx-auto mt-2 max-w-sm text-sm leading-5 text-steel">{i18n.t('attentions.ownerDetailsPending')}</p></div></div>
        {/if}
      </div>
    </div>
  </Card>
  {#if owner}
    <Card padding="none" class="overflow-visible">
      <div class="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4"><div><h2 class="font-semibold text-ink">{i18n.t('attentions.petsOfOwner')}</h2><p class="mt-1 text-sm text-steel">{i18n.t('attentions.choosePetHelp')}</p></div>{#if canCreatePet}<Button type="button" variant="secondary" onclick={() => (petCreateOpen = true)}><Icon name="plus" size={17} />{i18n.t('attentions.addPet')}</Button>{/if}</div>
      {#if pets.length}
        <div class="grid grid-cols-[226px] justify-center p-5 sm:grid-cols-[repeat(2,226px)] sm:justify-start lg:grid-cols-[repeat(3,226px)] xl:grid-cols-[repeat(4,226px)]">
          {#each pets as pet (pet.id_mascotas)}
            <div class="pet-cell p-2">
              <article class="flex aspect-square w-[210px] flex-col items-center overflow-hidden rounded-xl bg-canvas p-3 text-center">
                {#if pet.foto_version}<img src={`/media/pets/${pet.id_mascotas}/${pet.foto_version}`} alt="" title={pet.temperamento?.etiqueta} class="size-[84px] shrink-0 rounded-full border-[3px] border-hairline object-cover" style:border-color={pet.temperamento?.color_hex ?? undefined} />{:else}<span class="grid size-[84px] shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name="paw-print" size={30} /></span>{/if}
                <div class="mt-2 w-full min-w-0"><strong class="block truncate text-sm leading-5 text-ink">{pet.nombre}</strong><p class="truncate text-xs leading-4 text-steel">{pet.especie.nombre}{pet.clasificacion ? ` · ${pet.clasificacion}` : ''}</p>{#if pet.genero.etiqueta}<p class="truncate text-[11px] leading-4 text-stone">{pet.genero.etiqueta}{pet.codigo_chip ? ` · ${pet.codigo_chip}` : ''}</p>{/if}</div>
                <div class="mt-auto flex w-full items-center justify-center gap-2 pt-2">
                  {#if canEditPet}<button type="button" class="grid size-8 place-items-center rounded-full border border-hairline bg-canvas text-ink shadow-soft transition-colors hover:border-hairline-strong disabled:pointer-events-none disabled:opacity-55" aria-label={`${i18n.t('pets.edit')}: ${pet.nombre}`} title={i18n.t('pets.edit')} disabled={loadingPetId === pet.id_mascotas} onclick={() => openPetEdit(pet)}>{#if loadingPetId === pet.id_mascotas}<span class="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"></span>{:else}<Icon name="pencil" size={14} />{/if}</button>{/if}
                  <DropdownMenu.Root><DropdownMenu.Trigger aria-label={`${i18n.t('attentions.addTo')} ${pet.nombre}`} class="grid size-8 place-items-center rounded-full border border-primary bg-primary text-on-primary shadow-soft transition-colors hover:bg-primary-pressed"><Icon name="ellipsis" size={16} /></DropdownMenu.Trigger><DropdownMenu.Content align="end" class="grid w-[min(34rem,calc(100vw-1rem))] grid-cols-2 gap-0.5 p-1">{#each data.opciones.tipos.filter((item: RecordType) => item.permite_registro_raiz !== false) as type (type.id_tipos_registro_atencion)}<DropdownMenu.Item class="min-w-0 gap-3 px-2 py-2 text-sm focus:bg-primary-soft focus:text-ink" onSelect={() => start(type, pet)}><span class="clinical-menu-icon grid size-8 shrink-0 place-items-center rounded-[5px]" style:background-color={type.color_hex}><Icon name={type.icono} size={16} /></span><span class="min-w-0 truncate font-medium text-ink">{typeName(type)}</span></DropdownMenu.Item>{/each}</DropdownMenu.Content></DropdownMenu.Root>
                </div>
              </article>
            </div>
          {/each}
        </div>
      {:else}
        <div class="flex flex-col items-center px-5 py-10 text-center"><Icon name="paw-print" size={28} class="text-stone" /><p class="mt-3 text-sm text-steel">{i18n.t('attentions.noPets')}</p>{#if canCreatePet}<Button type="button" class="mt-4" onclick={() => (petCreateOpen = true)}><Icon name="plus" size={17} />{i18n.t('attentions.addPet')}</Button>{/if}</div>
      {/if}
    </Card>
  {/if}
</section>

<form bind:this={attentionForm} method="POST" action="?/attention" enctype="multipart/form-data" use:enhance={attentionSubmit} class="hidden"><input name="fid_mascotas" value={selectedPet?.id_mascotas ?? ''} /><input name="fid_tipos_registro_atencion" value={selectedType?.id_tipos_registro_atencion ?? ''} /><input name="detalle" value={detail} /><input bind:this={attachmentInput} name="adjuntos" type="file" multiple /></form>
<form bind:this={vaccineForm} method="POST" action="?/vaccine" use:enhance={vaccineSubmit} class="hidden"><input name="nombre" value={vaccineName} /></form>
<form bind:this={consultationReasonForm} method="POST" action="?/consultationReason" use:enhance={consultationReasonSubmit} class="hidden"><input name="nombre" value={consultationReasonName} /><input name="descripcion" value={consultationReasonDescription} /></form>
<form bind:this={hospitalizationTypeForm} method="POST" action="?/hospitalizationType" use:enhance={hospitalizationTypeSubmit} class="hidden"><input name="nombre" value={hospitalizationTypeName} /></form>
<form bind:this={procedureForm} method="POST" action="?/procedure" use:enhance={procedureSubmit} class="hidden"><input name="nombre" value={procedureName} /><input name="descripcion_guia" value={procedureDescription} /></form>
<form bind:this={laboratoryTestForm} method="POST" action="?/laboratoryTest" use:enhance={laboratoryTestSubmit} class="hidden"><input name="nombre" value={laboratoryTestName} /><input name="fid_categorias_pruebas_laboratorio" value={laboratoryTestCategory} /></form>
<form bind:this={diagnosticStudyForm} method="POST" action="?/diagnosticStudy" use:enhance={diagnosticStudySubmit} class="hidden"><input name="nombre" value={diagnosticStudyName} /></form>
<form bind:this={groomingServiceForm} method="POST" action="?/groomingService" use:enhance={groomingServiceSubmit} class="hidden"><input name="nombre" value={groomingServiceName} /></form>
<RecordDialog bind:open={recordOpen} type={selectedType} {saving} petId={selectedPet?.id_mascotas ?? null} petWeight={selectedPet?.peso ? `${selectedPet.peso} ${selectedPet.unidad_peso?.etiqueta ?? ''}`.trim() : null} attachmentMaxBytes={data.opciones.adjunto_max_bytes} attachmentMaxFiles={data.opciones.adjunto_max_archivos} {canCreateVaccine} onCreateVaccine={createVaccine} {canCreateConsultationReason} onCreateConsultationReason={createConsultationReason} {canCreateHospitalizationType} onCreateHospitalizationType={createHospitalizationType} {canCreateProcedure} onCreateProcedure={createProcedure} {canCreateLaboratoryTest} onCreateLaboratoryTest={createLaboratoryTest} {canCreateDiagnosticStudy} onCreateDiagnosticStudy={createDiagnosticStudy} {canCreateGroomingService} onCreateGroomingService={createGroomingService} onSave={saveDetail} />

<Dialog.Root bind:open={ownerEditOpen}>
  <Dialog.Content class="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-0 sm:h-[min(92dvh,900px)] sm:w-[calc(100vw-3rem)] sm:max-w-[1280px]">
    <Dialog.Header class="shrink-0 border-b border-hairline px-5 py-4"><Dialog.Title>{i18n.t('owners.edit')}</Dialog.Title><Dialog.Description class="mt-1">{i18n.t('owners.editDescription')}</Dialog.Description></Dialog.Header>
    <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {#if editingOwner}{#key editingOwner.id_propietarios}<OwnerForm opciones={data.propietarios} propietario={editingOwner} editing embedded action={`?/editOwner&owner=${editingOwner.id_propietarios}`} onSaved={ownerEdited} onCancel={() => (ownerEditOpen = false)} />{/key}{/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={petEditOpen}>
  <Dialog.Content class="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-0 sm:h-[min(92dvh,900px)] sm:w-[calc(100vw-3rem)] sm:max-w-[1280px]">
    <Dialog.Header class="shrink-0 border-b border-hairline px-5 py-4"><Dialog.Title>{i18n.t('pets.edit')}</Dialog.Title><Dialog.Description class="mt-1">{i18n.t('pets.editDescription')}</Dialog.Description></Dialog.Header>
    <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {#if editingPet}{#key editingPet.id_mascotas}<PetForm opciones={data.mascotas} mascota={editingPet} editing embedded action={`?/editPet&pet=${editingPet.id_mascotas}`} onSaved={petEdited} onCancel={() => (petEditOpen = false)} />{/key}{/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={ownerSearchOpen}><Dialog.Content class="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col overflow-hidden p-0 sm:h-[min(88dvh,760px)] sm:w-[calc(100vw-4rem)] sm:max-w-[1152px]"><Dialog.Header class="border-b border-hairline px-5 py-4"><Dialog.Title>{i18n.t('attentions.searchOwner')}</Dialog.Title><Dialog.Description class="mt-1">{i18n.t('attentions.searchOwnerHelp')}</Dialog.Description></Dialog.Header><div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5"><div class="flex gap-2 max-sm:flex-col"><div class="relative flex-1"><Icon name="search" size={17} class="pointer-events-none absolute left-3 top-3.5 text-steel" /><input bind:value={query} minlength="2" maxlength="80" placeholder={i18n.t('attentions.searchOwnerPlaceholder')} class="h-11 w-full rounded-md border border-hairline-strong bg-canvas pl-10 pr-3 text-sm text-ink outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20" onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} /></div><Button type="button" loading={searching} onclick={search}>{i18n.t('attentions.search')}</Button></div><div class="min-h-[260px] flex-1 overflow-auto rounded-lg border border-hairline">{#if results.length}<table class="w-full min-w-[680px] text-left"><thead class="sticky top-0 bg-surface"><tr class="border-b border-hairline text-xs text-stone"><th class="px-4 py-3">{i18n.t('attentions.owner')}</th><th class="px-4 py-3">{i18n.t('owners.documentNumber')}</th><th class="px-4 py-3">{i18n.t('owners.mobile')}</th><th class="px-4 py-3"></th></tr></thead><tbody class="divide-y divide-hairline">{#each results as item (item.id_propietarios)}<tr><td class="px-4 py-3 font-medium text-ink">{item.nombre_completo}</td><td class="px-4 py-3 text-sm text-steel">{item.tipo_documento.etiqueta} · {item.numero_documento}</td><td class="px-4 py-3 text-sm text-steel">{item.celular ?? '—'}</td><td class="px-4 py-3 text-right"><Button type="button" size="sm" onclick={() => selectOwner(item)}>{i18n.t('attentions.select')}</Button></td></tr>{/each}</tbody></table>{:else}<div class="grid min-h-[260px] place-items-center px-5 text-center text-sm text-steel">{i18n.t(searched ? 'attentions.noOwners' : 'attentions.searchOwnerHelp')}</div>{/if}</div></div></Dialog.Content></Dialog.Root>

<Dialog.Root bind:open={ownerCreateOpen}><Dialog.Content class="w-[calc(100vw-1rem)] max-w-[560px]"><Dialog.Header><Dialog.Title>{i18n.t('attentions.createOwner')}</Dialog.Title><Dialog.Description>{i18n.t('attentions.minimalOwnerHelp')}</Dialog.Description></Dialog.Header><form id="minimal-owner-form" method="POST" action="?/owner" use:enhance={ownerSubmit} class="mt-5 space-y-4"><label class="block text-sm font-medium text-ink">{i18n.t('owners.documentType')}<span class="text-error">*</span><select name="fid_parametros_tipo_documento" required class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3"><option value="">{i18n.t('attentions.select')}</option>{#each data.propietarios.tipos_documento as item}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</select></label><label class="block text-sm font-medium text-ink">{i18n.t('owners.documentNumber')}<span class="text-error">*</span><input name="numero_documento" required minlength="3" maxlength="40" class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3" /></label><label class="block text-sm font-medium text-ink">{i18n.t('owners.fullName')}<span class="text-error">*</span><input name="nombre_completo" required minlength="2" maxlength="150" class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3" /></label><div class="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onclick={() => (ownerCreateOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit">{i18n.t('attentions.createAndSelect')}</Button></div></form></Dialog.Content></Dialog.Root>

<Dialog.Root bind:open={petCreateOpen}><Dialog.Content class="w-[calc(100vw-1rem)] max-w-[560px]"><Dialog.Header><Dialog.Title>{i18n.t('attentions.addPet')}</Dialog.Title><Dialog.Description>{i18n.t('attentions.minimalPetHelp')}</Dialog.Description></Dialog.Header><form id="minimal-pet-form" method="POST" action="?/pet" use:enhance={petSubmit} class="mt-5 space-y-4"><input type="hidden" name="fid_propietarios" value={owner?.id_propietarios ?? ''} /><label class="block text-sm font-medium text-ink">{i18n.t('pets.name')}<span class="text-error">*</span><input name="nombre" required maxlength="120" class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3" /></label><div class="grid gap-4 sm:grid-cols-2"><label class="block text-sm font-medium text-ink">{i18n.t('pets.species')}<span class="text-error">*</span><select name="fid_especies_animales" required class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3"><option value="">{i18n.t('attentions.select')}</option>{#each data.mascotas.especies as item}<option value={item.id_especies_animales}>{item.nombre}</option>{/each}</select></label><label class="block text-sm font-medium text-ink">{i18n.t('pets.gender')}<span class="text-error">*</span><select name="fid_parametros_genero" required class="mt-1.5 h-11 w-full rounded-md border border-hairline-strong bg-canvas px-3"><option value="">{i18n.t('attentions.select')}</option>{#each data.mascotas.generos as item}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</select></label></div><div class="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onclick={() => (petCreateOpen = false)}>{i18n.t('attentions.cancel')}</Button><Button type="submit">{i18n.t('pets.create')}</Button></div></form></Dialog.Content></Dialog.Root>

<style>
  .clinical-menu-icon :global(svg) { color: var(--on-dark) !important; stroke: var(--on-dark) !important; }
  .pet-cell { position: relative; }
  .pet-cell::before, .pet-cell::after { pointer-events: none; position: absolute; background: color-mix(in srgb, var(--hairline) 45%, transparent); }
  @media (max-width: 639px) {
    .pet-cell + .pet-cell::after { content: ''; top: 0; right: 16px; left: 16px; height: 1px; }
  }
  @media (min-width: 640px) and (max-width: 1023px) {
    .pet-cell:nth-child(n + 3)::after { content: ''; top: 0; right: 16px; left: 16px; height: 1px; }
    .pet-cell:nth-child(2n)::before { content: ''; top: 16px; bottom: 16px; left: 0; width: 1px; }
  }
  @media (min-width: 1024px) and (max-width: 1279px) {
    .pet-cell:nth-child(n + 4)::after { content: ''; top: 0; right: 16px; left: 16px; height: 1px; }
    .pet-cell:nth-child(3n + 2)::before, .pet-cell:nth-child(3n + 3)::before { content: ''; top: 16px; bottom: 16px; left: 0; width: 1px; }
  }
  @media (min-width: 1280px) {
    .pet-cell:nth-child(n + 5)::after { content: ''; top: 0; right: 16px; left: 16px; height: 1px; }
    .pet-cell:nth-child(4n + 2)::before, .pet-cell:nth-child(4n + 3)::before, .pet-cell:nth-child(4n + 4)::before { content: ''; top: 16px; bottom: 16px; left: 0; width: 1px; }
  }
</style>
