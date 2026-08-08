<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { Badge, Breadcrumb, Button, Card, ConfirmationDialog, Icon, Input, Select, Switch, i18n, formatLocalDate } from '$lib';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';

	let { data }: PageProps = $props();
	type Company = (typeof data.empresas)[number];
	const zonaHoraria = $derived(data.usuario.preferencias.zona_horaria);
	let form = $state({
		nombre: '',
		razon_social: '',
		ruc_nif: '',
		slug: '',
		correo_contacto: '',
		telefono: ''
	});
	const planes = $derived(data.planes || []);
	let search = $state('');
	let target = $state<Company | null>(null);
	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let renewOpen = $state(false);
	let processing = $state(false);
	let statusForm: HTMLFormElement;
	let createForm: HTMLFormElement;
	let editForm: HTMLFormElement;
	let deleteForm: HTMLFormElement;
	let renewForm: HTMLFormElement;
	let pendingActive = $state(false);
	let resolveCreate: (() => void) | null = null;
	let rejectCreate: ((error: Error) => void) | null = null;
	let resolveDelete: (() => void) | null = null;
	let rejectDelete: ((error: Error) => void) | null = null;
	let resolveEdit: (() => void) | null = null;
	let rejectEdit: ((error: Error) => void) | null = null;
	let resolveRenew: (() => void) | null = null;
	let rejectRenew: ((error: Error) => void) | null = null;
	let editBaseline = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;
	type CompanyField = keyof typeof form;
	type FieldError = Partial<Record<CompanyField, string>>;
	let validationAttempted = $state(false);
	let renewData = $state({
		fid_planes: '',
		fecha_inicio: '',
		fecha_fin: '',
		monto: '',
		metodo_pago: ''
	});
	const fieldErrors = $derived.by(() => {
		const errors: FieldError = {};
		const nombre = form.nombre.trim().replace(/\s+/g, ' ');
		const razonSocial = form.razon_social.trim().replace(/\s+/g, ' ');
		const ruc = form.ruc_nif.trim().toUpperCase();
		const slug = form.slug.trim().toLowerCase();
		const email = form.correo_contacto.trim().toLowerCase();
		const phone = form.telefono.trim();
		const phoneDigits = phone.replace(/\D/g, '').length;
		const namePattern = /^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u;

		if (!nombre) errors.nombre = 'companies.validation.required';
		else if (nombre.length < 2 || nombre.length > 120 || !namePattern.test(nombre)) errors.nombre = 'companies.validation.name';
		if (!razonSocial) errors.razon_social = 'companies.validation.required';
		else if (razonSocial.length < 2 || razonSocial.length > 150 || !namePattern.test(razonSocial)) errors.razon_social = 'companies.validation.legalName';
		if (!ruc) errors.ruc_nif = 'companies.validation.required';
		else if (!/^[A-Z0-9.\-]{8,20}$/.test(ruc)) errors.ruc_nif = 'companies.validation.taxId';
		if (!slug) errors.slug = 'companies.validation.required';
		else if (slug.length < 3 || slug.length > 63 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.slug = 'companies.validation.slug';
		if (!email) errors.correo_contacto = 'companies.validation.required';
		else if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.correo_contacto = 'companies.validation.email';
		if (!phone) errors.telefono = 'companies.validation.required';
		else if (phone.length > 30 || phoneDigits < 7 || phoneDigits > 15 || !/^\+?[0-9][0-9\s-]*$/.test(phone)) errors.telefono = 'companies.validation.phone';
		return errors;
	});
	const valid = $derived(Object.keys(fieldErrors).length === 0);
	const editDirty = $derived(JSON.stringify(form) !== editBaseline);
	const breadcrumbItems = $derived([
		{ label: i18n.t('nav.dashboard'), href: '/dashboard' },
		{ label: i18n.t('nav.companies') }
	]);
	$effect(() => { search = data.q; });

	function searchNow() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const q = search.trim();
			goto(q ? `/superadmin/companies?q=${encodeURIComponent(q)}` : '/superadmin/companies', { keepFocus: true, noScroll: true, replaceState: true });
		}, 250);
	}
	function clearValidation() {
		validationAttempted = false;
	}
	function reset() {
		form = {
			nombre: '',
			razon_social: '',
			ruc_nif: '',
			slug: '',
			correo_contacto: '',
			telefono: ''
		};
		clearValidation();
	}
	function fieldError(field: CompanyField) {
		const key = fieldErrors[field];
		return key && validationAttempted ? i18n.t(key) : undefined;
	}
	function validateForm() {
		validationAttempted = true;
		if (valid) return true;
		toast.error(i18n.t('notifications.type.error'), { description: i18n.t('companies.invalidData') });
		return false;
	}
	function submitCreate() {
		if (!validateForm()) return Promise.reject(new Error('invalid-company-form'));
		return new Promise<void>((resolve, reject) => { resolveCreate = resolve; rejectCreate = reject; createForm.requestSubmit(); });
	}
	function submitEdit() {
		if (!validateForm()) return Promise.reject(new Error('invalid-company-form'));
		return new Promise<void>((resolve, reject) => { resolveEdit = resolve; rejectEdit = reject; editForm.requestSubmit(); });
	}
	function requestDelete() { return new Promise<void>((resolve, reject) => { resolveDelete = resolve; rejectDelete = reject; deleteForm.requestSubmit(); }); }
	async function changeStatus(company: Company, active: boolean) {
		if (processing) return;
		target = company;
		pendingActive = active;
		await tick();
		statusForm.requestSubmit();
	}
	function openEdit(company: Company) {
		target = company;
		clearValidation();
		form = {
			nombre: company.nombre,
			razon_social: company.perfil?.razon_social ?? '',
			ruc_nif: company.perfil?.ruc_nif ?? '',
			slug: company.slug,
			correo_contacto: company.perfil?.correo_contacto ?? '',
			telefono: company.perfil?.telefono ?? ''
		};
		editBaseline = JSON.stringify(form);
		editOpen = true;
	}
	function openRenew(company: Company) {
		target = company;
		renewData = {
			fid_planes: company.plan?.id_planes ?? '',
			fecha_inicio: company.suscripcion_expira_en ? company.suscripcion_expira_en.split('T')[0] : new Date().toISOString().split('T')[0],
			fecha_fin: '',
			monto: '',
			metodo_pago: ''
		};
		renewOpen = true;
	}
	function submitRenew() {
		if (!renewData.fid_planes || !renewData.fecha_inicio || !renewData.fecha_fin) {
			toast.error(i18n.t('notifications.type.error'), { description: i18n.t('companies.invalidData') });
			return Promise.reject(new Error('invalid-renew-form'));
		}
		return new Promise<void>((resolve, reject) => {
			resolveRenew = resolve;
			rejectRenew = reject;
			renewForm.requestSubmit();
		});
	}
	function companyShield(company: Company) {
		const light = company.perfil?.escudo_version;
		const dark = company.perfil?.escudo_oscuro_version;
		const version = light ?? dark;
		if (!version) return null;
		const type = light ? 'escudo' : 'escudo_oscuro';
		return `/media/company/list/${company.id_organizaciones}/${type}/${version}`;
	}
	function isExpired(expiraString?: string) {
		if (!expiraString) return false;
		const parts = expiraString.split('T')[0].split('-');
		const expDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
		return new Date() > expDate;
	}
	$effect(() => {
		if (!createOpen && !editOpen) clearValidation();
	});

	const create: SubmitFunction = () => {
		if (processing) return () => {};
		processing = true;
		return async ({ result, update }) => {
			const key = result.type === 'failure' && typeof result.data?.companyMessage === 'string' ? result.data.companyMessage : 'companies.saveError';
			if (result.type === 'success') {
				await update({ invalidateAll: true, reset: false });
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.created') });
				reset(); resolveCreate?.();
			} else { toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) }); rejectCreate?.(new Error(key)); }
			processing = false; resolveCreate = null; rejectCreate = null;
		};
	};

	const edit: SubmitFunction = () => {
		if (processing) return () => {};
		processing = true;
		return async ({ result, update }) => {
			const key = result.type === 'failure' && typeof result.data?.companyMessage === 'string' ? result.data.companyMessage : 'companies.saveError';
			if (result.type === 'success') {
				await update({ invalidateAll: true, reset: false });
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.updated') });
				resolveEdit?.();
			} else {
				toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
				rejectEdit?.(new Error(key));
			}
			processing = false; resolveEdit = null; rejectEdit = null;
		};
	};

	const status: SubmitFunction = () => {
		if (processing) return () => {};
		processing = true;
		return async ({ result, update }) => {
			const key = result.type === 'failure' && typeof result.data?.companyMessage === 'string' ? result.data.companyMessage : 'companies.saveError';
			if (result.type === 'success') {
				await update({ invalidateAll: true, reset: false });
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t(pendingActive ? 'companies.activated' : 'companies.deactivated') });
			} else {
				toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
			}
			processing = false;
		};
	};

	const remove: SubmitFunction = () => {
		if (processing) return () => {};
		processing = true;
		return async ({ result, update }) => {
			const key = result.type === 'failure' && typeof result.data?.companyMessage === 'string' ? result.data.companyMessage : 'companies.deleteError';
			if (result.type === 'success') {
				await update({ invalidateAll: true, reset: false });
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.deleted') }); resolveDelete?.();
			} else { toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) }); rejectDelete?.(new Error(key)); }
			processing = false; resolveDelete = null; rejectDelete = null;
		};
	};

	const renewSubmit: SubmitFunction = () => {
		if (processing) return () => {};
		processing = true;
		return async ({ result, update }) => {
			const key = result.type === 'failure' && typeof result.data?.companyMessage === 'string' ? result.data.companyMessage : 'companies.saveError';
			if (result.type === 'success') {
				await update({ invalidateAll: true, reset: false });
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.renewed') });
				resolveRenew?.();
			} else {
				toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
				rejectRenew?.(new Error(key));
			}
			processing = false; resolveRenew = null; rejectRenew = null;
		};
	};
</script>

<svelte:head><title>{i18n.t('companies.title')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
	<div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
		<div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('companies.title')}</h1><p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('companies.description')}</p></div>
		<Button type="button" onclick={() => { reset(); createOpen = true; }}><Icon name="plus" size={18} />{i18n.t('companies.new')}</Button>
	</div>
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="w-full max-w-md"><Input label={i18n.t('companies.search')} icon="search" bind:value={search} oninput={searchNow} maxlength={120} placeholder={i18n.t('companies.searchPlaceholder')} /></div>
		<Badge variant="outline-sky">{i18n.t('companies.count', { count: data.empresas.length })}</Badge>
	</div>
	<Card padding="none" class="overflow-hidden">
		{#if data.empresas.length === 0}
			<div class="flex flex-col items-center px-4 py-16 text-center"><Icon name="building-2" size={32} class="mb-4 text-stone" /><h2 class="text-lg text-ink">{search ? i18n.t('companies.noResults') : i18n.t('companies.emptyTitle')}</h2><p class="mt-1 text-sm text-steel">{search ? i18n.t('companies.noResultsDescription') : i18n.t('companies.emptyDescription')}</p></div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[1080px] border-collapse text-left">
					<thead class="bg-surface/70"><tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone"><th class="px-5 py-3.5">{i18n.t('companies.company')}</th><th class="px-4 py-3.5">{i18n.t('companies.field.ruc')}</th><th class="px-4 py-3.5">{i18n.t('companies.field.razonSocial')}</th><th class="px-4 py-3.5">{i18n.t('companies.contact')}</th><th class="px-4 py-3.5">{i18n.t('companies.plan')}</th><th class="px-4 py-3.5">Suscripción</th><th class="px-4 py-3.5 text-center">{i18n.t('companies.active')}</th><th class="px-5 py-3.5 text-right">{i18n.t('companies.actions')}</th></tr></thead>
					<tbody class="divide-y divide-hairline">
						{#each data.empresas as company (company.id_organizaciones)}
							<tr class="transition-colors hover:bg-surface/55">
								<td class="px-5 py-4"><div class="flex min-w-0 items-center gap-3.5"><span class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline bg-primary-soft font-semibold text-primary">{company.nombre.slice(0, 1).toUpperCase()}{#if companyShield(company)}<img src={companyShield(company) ?? ''} alt="" class="absolute inset-0 size-full bg-white object-contain p-1" loading="lazy" decoding="async" onerror={(event) => { (event.currentTarget as HTMLImageElement).hidden = true; }} />{/if}</span><div class="min-w-0"><strong class="block max-w-[220px] truncate text-sm text-ink">{company.nombre}</strong><span class="mt-0.5 block font-mono text-xs text-stone">{company.slug}</span></div></div></td>
								<td class="px-4 py-4 text-sm text-slate">{company.perfil?.ruc_nif || '—'}</td>
								<td class="px-4 py-4"><p class="max-w-[220px] truncate text-sm text-slate">{company.perfil?.razon_social || '—'}</p></td>
								<td class="px-4 py-4"><p class="max-w-[220px] truncate text-sm text-slate">{company.perfil?.correo_contacto || '—'}</p><p class="mt-0.5 text-xs text-stone">{company.perfil?.telefono || '—'}</p></td>
								<td class="px-4 py-4">
									<Badge variant={company.plan?.codigo === 'FULL' ? 'outline-sky' : company.plan?.codigo === 'PREMIUM' ? 'tag-purple' : 'neutral'}>
										{company.plan?.nombre || '—'}
									</Badge>
								</td>
								<td class="px-4 py-4">
									{#if company.suscripcion_expira_en}
										<div class="flex flex-col gap-1">
											<span class="text-xs text-slate font-medium">
												{formatLocalDate(company.suscripcion_inicia_en, zonaHoraria)} al {formatLocalDate(company.suscripcion_expira_en, zonaHoraria)}
											</span>
											{#if isExpired(company.suscripcion_expira_en)}
												<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-error">
													<span class="size-1.5 rounded-full bg-error animate-pulse"></span>
													Vencida
												</span>
											{:else}
												<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
													<span class="size-1.5 rounded-full bg-emerald-500"></span>
													Activa
												</span>
											{/if}
										</div>
									{:else}
										<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-stone">
											<span class="size-1.5 rounded-full bg-stone"></span>
											Sin suscripción
										</span>
									{/if}
								</td>
								<td class="px-4 py-4 text-center"><Switch checked={company.estado === 1} disabled={processing} label={`${i18n.t('companies.status')}: ${company.nombre}`} onchange={(active) => changeStatus(company, active)} /></td>
								<td class="px-5 py-4">
									<div class="flex justify-end">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger
												disabled={processing}
												aria-label={`${i18n.t('companies.actions')}: ${company.nombre}`}
												class="grid size-8 place-items-center rounded-md border border-transparent text-stone transition-colors hover:border-hairline hover:bg-surface hover:text-ink disabled:pointer-events-none disabled:opacity-40"
											>
												<Icon name="ellipsis" size={18} />
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end" class="min-w-[200px]">
												<DropdownMenu.Item
													disabled={processing || company.estado !== 1}
													onSelect={() => openEdit(company)}
												>
													<Icon name="pencil" size={15} />
													<span>{i18n.t('companies.edit')}</span>
												</DropdownMenu.Item>
												<DropdownMenu.Item
													disabled={processing || company.estado !== 1}
													onSelect={() => openRenew(company)}
												>
													<Icon name="refresh-cw" size={15} />
													<span>Renovar suscripción</span>
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													disabled={processing || company.estado !== 1}
													class="text-error focus:bg-error/10 focus:text-error"
													onSelect={() => { target = company; deleteOpen = true; }}
												>
													<Icon name="trash-2" size={15} />
													<span>{i18n.t('companies.delete')}</span>
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</section>

<ConfirmationDialog bind:open={createOpen} size="wide" variant="info" icon="building-2" title={i18n.t('companies.createTitle')} description={i18n.t('companies.createDescription')} confirmLabel={i18n.t('companies.create')} cancelLabel={i18n.t('companies.cancel')} confirmDisabled={processing} onConfirm={submitCreate} onCancel={clearValidation}>
	<div class="grid grid-cols-12 gap-4 text-left">
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.name')} icon="building-2" bind:value={form.nombre} error={fieldError('nombre')} maxlength={120} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.slug')} icon="link" bind:value={form.slug} error={fieldError('slug')} maxlength={63} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.razonSocial')} icon="file-text" bind:value={form.razon_social} error={fieldError('razon_social')} maxlength={150} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.ruc')} icon="hash" bind:value={form.ruc_nif} error={fieldError('ruc_nif')} maxlength={20} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.correo')} icon="mail" type="email" bind:value={form.correo_contacto} error={fieldError('correo_contacto')} maxlength={120} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.telefono')} icon="phone" bind:value={form.telefono} error={fieldError('telefono')} maxlength={30} disabled={processing} required /></div>
	</div>
</ConfirmationDialog>
<ConfirmationDialog bind:open={editOpen} size="wide" variant="info" icon="pencil" title={i18n.t('companies.editTitle')} description={i18n.t('companies.editDescription')} confirmLabel={i18n.t('companies.save')} cancelLabel={i18n.t('companies.cancel')} confirmDisabled={!editDirty || processing} onConfirm={submitEdit} onCancel={clearValidation}>
	<div class="grid grid-cols-12 gap-4 text-left">
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.name')} icon="building-2" bind:value={form.nombre} error={fieldError('nombre')} maxlength={120} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.slug')} icon="link" bind:value={form.slug} error={fieldError('slug')} maxlength={63} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.razonSocial')} icon="file-text" bind:value={form.razon_social} error={fieldError('razon_social')} maxlength={150} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.ruc')} icon="hash" bind:value={form.ruc_nif} error={fieldError('ruc_nif')} maxlength={20} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.correo')} icon="mail" type="email" bind:value={form.correo_contacto} error={fieldError('correo_contacto')} maxlength={120} disabled={processing} required /></div>
		<div class="col-span-6 max-sm:col-span-12"><Input label={i18n.t('companies.field.telefono')} icon="phone" bind:value={form.telefono} error={fieldError('telefono')} maxlength={30} disabled={processing} required /></div>
	</div>
</ConfirmationDialog>
<ConfirmationDialog bind:open={deleteOpen} variant="danger" icon="trash-2" title={i18n.t('companies.deleteTitle')} description={i18n.t('companies.deletePermanentDescription')} confirmLabel={i18n.t('companies.delete')} cancelLabel={i18n.t('companies.cancel')} confirmDisabled={!target || processing} onConfirm={requestDelete} />

<ConfirmationDialog bind:open={renewOpen} size="wide" variant="info" icon="refresh-cw" title="Renovar Suscripción" description="Extiende o modifica la suscripción temporal de esta empresa" confirmLabel="Renovar" cancelLabel="Cancelar" confirmDisabled={processing} onConfirm={submitRenew}>
	<div class="grid grid-cols-12 gap-4 text-left">
		<div class="col-span-12 font-medium text-ink mb-1">
			Empresa a renovar: <span class="font-bold text-primary">{target?.nombre}</span>
		</div>
		<div class="col-span-12">
			<Select label="Plan a asignar" icon="package" bind:value={renewData.fid_planes} disabled={processing} required>
				<option value="">Selecciona un plan</option>
				{#each planes as plan (plan.id_planes)}
					<option value={plan.id_planes}>{plan.nombre}</option>
				{/each}
			</Select>
		</div>
		<div class="col-span-6 max-sm:col-span-12">
			<Input label="Inicio de Renovación" icon="calendar" type="date" bind:value={renewData.fecha_inicio} disabled={processing} required />
		</div>
		<div class="col-span-6 max-sm:col-span-12">
			<Input label="Fin de Renovación" icon="calendar" type="date" bind:value={renewData.fecha_fin} disabled={processing} required />
		</div>
		<div class="col-span-6 max-sm:col-span-12">
			<Input label="Monto Cobrado (Opcional)" icon="dollar-sign" type="number" step="0.01" bind:value={renewData.monto} disabled={processing} />
		</div>
		<div class="col-span-6 max-sm:col-span-12">
			<Select label="Método de Pago (Opcional)" icon="credit-card" bind:value={renewData.metodo_pago} disabled={processing}>
				<option value="">Seleccione método</option>
				<option value="transferencia">Transferencia Bancaria</option>
				<option value="tarjeta">Tarjeta de Crédito/Débito</option>
				<option value="efectivo">Efectivo</option>
				<option value="paypal">PayPal</option>
			</Select>
		</div>
	</div>
</ConfirmationDialog>

<form bind:this={createForm} method="POST" action="?/create" use:enhance={create} class="hidden"><input name="nombre" value={form.nombre} /><input name="razon_social" value={form.razon_social} /><input name="ruc_nif" value={form.ruc_nif} /><input name="slug" value={form.slug} /><input name="correo_contacto" value={form.correo_contacto} /><input name="telefono" value={form.telefono} /></form>
<form bind:this={editForm} method="POST" action="?/edit" use:enhance={edit} class="hidden"><input name="id" value={target?.id_organizaciones ?? ''} /><input name="nombre" value={form.nombre} /><input name="razon_social" value={form.razon_social} /><input name="ruc_nif" value={form.ruc_nif} /><input name="slug" value={form.slug} /><input name="correo_contacto" value={form.correo_contacto} /><input name="telefono" value={form.telefono} /></form>
<form bind:this={statusForm} method="POST" action="?/status" use:enhance={status} class="hidden"><input name="id" value={target?.id_organizaciones ?? ''} /><input name="activo" value={pendingActive ? 'true' : 'false'} /></form>
<form bind:this={deleteForm} method="POST" action="?/delete" use:enhance={remove} class="hidden"><input name="id" value={target?.id_organizaciones ?? ''} /></form>
<form bind:this={renewForm} method="POST" action="?/renew" use:enhance={renewSubmit} class="hidden"><input name="id" value={target?.id_organizaciones ?? ''} /><input name="fid_planes" value={renewData.fid_planes} /><input name="fecha_inicio" value={renewData.fecha_inicio} /><input name="fecha_fin" value={renewData.fecha_fin} /><input name="monto" value={renewData.monto} /><input name="metodo_pago" value={renewData.metodo_pago} /></form>
