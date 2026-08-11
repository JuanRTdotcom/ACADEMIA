<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { AdministrativeLocation, Button, Card, ConfirmationDialog, Icon, Input, Select, Switch, i18n } from '$lib';
	import { untrack } from 'svelte';

	type Option = { id_parametros: string; codigo: string; etiqueta: string };
	type Locations = {
		admin_level_0: Array<{ id_admin_level_0: string; codigo_iso2: string; nombre: string; etiqueta_admin_level_1: string; etiqueta_admin_level_2: string | null; etiqueta_admin_level_3: string }>;
		admin_level_1: Array<{ id_admin_level_1: string; fid_admin_level_0: string; codigo: string; nombre: string }>;
		admin_level_2: Array<{ id_admin_level_2: string; fid_admin_level_1: string; codigo: string; nombre: string }>;
		admin_level_3: Array<{ id_admin_level_3: string; fid_admin_level_1: string; fid_admin_level_2: string | null; codigo: string; nombre: string }>;
	};
	type Options = { tipos_documento: Option[]; como_conocio: Option[]; ubicacion_predeterminada: { fid_admin_level_0: string | null; fid_admin_level_3: string | null }; ubicaciones: Locations };
	type Owner = Partial<Record<'fid_parametros_tipo_documento' | 'numero_documento' | 'nombre_completo' | 'celular' | 'correo' | 'telefono_fijo' | 'direccion' | 'fid_admin_level_0' | 'fid_admin_level_3' | 'contacto_alternativo_nombre' | 'contacto_alternativo_telefono' | 'fid_parametros_como_conocio' | 'como_conocio_otro', string | null>> & { celular_verificado?: boolean; sin_correo?: boolean; correo_verificado?: boolean };
	type FormState = { ownerMessage?: string; values?: Owner } | null;

	let { opciones, propietario = {}, form = null, editing = false, embedded = false, action = undefined, onSaved = () => {}, onCancel = () => {} }: { opciones: Options; propietario?: Owner; form?: FormState; editing?: boolean; embedded?: boolean; action?: string; onSaved?: () => void | Promise<void>; onCancel?: () => void } = $props();
	const source = untrack(() => form?.values ?? propietario);
	const defaults = untrack(() => opciones.ubicacion_predeterminada);
	let country = $state(source.fid_admin_level_0 ?? defaults.fid_admin_level_0 ?? '');
	let level3 = $state(source.fid_admin_level_3 ?? defaults.fid_admin_level_3 ?? '');
	let phoneVerified = $state(source.celular_verificado ?? false);
	let noEmail = $state(source.sin_correo ?? false);
	let emailVerified = $state(source.correo_verificado ?? false);
	let sourceId = $state(source.fid_parametros_como_conocio ?? '');
	let confirmSave = $state(false);
	let saving = $state(false);
	let ownerForm: HTMLFormElement;
	let resolveSave: (() => void) | null = null;
	const otherId = $derived(opciones.como_conocio.find((item) => item.codigo === 'otro')?.id_parametros ?? '');

	function askToSave() {
		if (saving || !ownerForm.reportValidity()) return;
		confirmSave = true;
	}

	function submitOwner(): Promise<void> {
		return new Promise((resolve) => {
			resolveSave = resolve;
			ownerForm.requestSubmit();
		});
	}

	const save: SubmitFunction = () => {
		if (saving) return () => {};
		saving = true;
		return async ({ result, update }) => {
			if (embedded && result.type === 'success') {
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t(editing ? 'owners.updated' : 'owners.created') });
				resolveSave?.();
				resolveSave = null;
				saving = false;
				await onSaved();
				return;
			}
			if (result.type === 'redirect') {
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t(editing ? 'owners.updated' : 'owners.created')
				});
				resolveSave?.();
				resolveSave = null;
				saving = false;
				await goto(result.location);
				return;
			}

			await update({ reset: false, invalidateAll: false });
			const message = result.type === 'failure' && typeof result.data?.ownerMessage === 'string'
				? result.data.ownerMessage
				: 'owners.saveError';
			if (result.status === 429) toast.warning(i18n.t('notifications.type.warning'), { description: i18n.t(message) });
			else toast.error(i18n.t('notifications.type.error'), { description: i18n.t(message) });
			resolveSave?.();
			resolveSave = null;
			saving = false;
		};
	};
</script>

<form bind:this={ownerForm} method="POST" {action} use:enhance={save} aria-busy={saving} class="flex w-full flex-col gap-4">
	{#if form?.ownerMessage}
		<div role="alert" class="flex gap-3 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error"><Icon name="circle-alert" size={18} />{i18n.t(form.ownerMessage)}</div>
	{/if}

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('owners.identification')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('owners.identificationHelp')}</p></div>
		<div class="grid grid-cols-12 gap-3">
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Select name="fid_parametros_tipo_documento" label={i18n.t('owners.documentType')} icon="id-card" value={source.fid_parametros_tipo_documento ?? ''} required><option value="">{i18n.t('owners.select')}</option>{#each opciones.tipos_documento as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select></div>
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12"><Input name="numero_documento" label={i18n.t('owners.documentNumber')} icon="hash" value={source.numero_documento ?? ''} minlength={3} maxlength={40} required /></div>
			<div class="col-span-4 max-[760px]:col-span-12"><Input name="nombre_completo" label={i18n.t('owners.fullName')} icon="user" value={source.nombre_completo ?? ''} minlength={2} maxlength={150} required /></div>
		</div>
	</Card>

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('owners.contact')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('owners.contactHelp')}</p></div>
		<div class="grid grid-cols-12 gap-3">
			<div class={!noEmail ? 'col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12' : 'col-span-6 max-[560px]:col-span-12'}><Input name="celular" label={i18n.t('owners.mobile')} icon="phone" value={source.celular ?? ''} maxlength={30} /></div>
			<div class={!noEmail ? 'col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12' : 'col-span-6 max-[560px]:col-span-12'}><Input name="telefono_fijo" label={i18n.t('owners.landline')} icon="phone-call" value={source.telefono_fijo ?? ''} maxlength={30} /></div>
			{#if !noEmail}
				<div class="col-span-4 max-[760px]:col-span-12"><Input name="correo" type="email" label={i18n.t('owners.email')} icon="mail" value={source.correo ?? ''} maxlength={254} /></div>
			{:else}<input type="hidden" name="correo" value="" /><input type="hidden" name="correo_verificado" value="false" />{/if}
			<div class="col-span-12 flex flex-wrap gap-2 pt-1">
				<div class="inline-flex min-h-10 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2"><span class="text-xs font-medium text-ink">{i18n.t('owners.phoneVerified')}</span><Switch name="celular_verificado" bind:checked={phoneVerified} label={i18n.t('owners.phoneVerified')} /></div>
				<div class="inline-flex min-h-10 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2"><span class="text-xs font-medium text-ink">{i18n.t('owners.noEmail')}</span><Switch name="sin_correo" bind:checked={noEmail} label={i18n.t('owners.noEmail')} onchange={(checked) => { if (checked) emailVerified = false; }} /></div>
				{#if !noEmail}<div class="inline-flex min-h-10 items-center gap-3 rounded-md border border-hairline bg-surface/45 px-3 py-2"><span class="text-xs font-medium text-ink">{i18n.t('owners.emailVerified')}</span><Switch name="correo_verificado" bind:checked={emailVerified} label={i18n.t('owners.emailVerified')} /></div>{/if}
			</div>
		</div>
	</Card>

	<Card padding="md">
		<div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('owners.address')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('owners.addressHelp')}</p></div>
		<div class="grid grid-cols-12 gap-3">
			<AdministrativeLocation idPrefix="owner-location" countryName="fid_admin_level_0" level3Name="fid_admin_level_3" countries={opciones.ubicaciones.admin_level_0} levels1={opciones.ubicaciones.admin_level_1} levels2={opciones.ubicaciones.admin_level_2} levels3={opciones.ubicaciones.admin_level_3} level3Value="id" bind:country bind:level3 />
			<div class="col-span-12"><Input name="direccion" label={i18n.t('owners.streetAddress')} icon="map-pin" value={source.direccion ?? ''} minlength={3} maxlength={200} /></div>
		</div>
	</Card>

	<div class="grid grid-cols-2 gap-4 max-[760px]:grid-cols-1">
		<Card padding="md"><div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('owners.alternateContact')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('owners.optionalBoth')}</p></div><div class="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1"><Input name="contacto_alternativo_nombre" label={i18n.t('owners.alternateName')} icon="user" value={source.contacto_alternativo_nombre ?? ''} maxlength={150} /><Input name="contacto_alternativo_telefono" label={i18n.t('owners.alternatePhone')} icon="phone" value={source.contacto_alternativo_telefono ?? ''} maxlength={30} /></div></Card>
		<Card padding="md"><div class="mb-4"><h2 class="font-semibold text-ink">{i18n.t('owners.origin')}</h2><p class="mt-0.5 text-sm text-steel">{i18n.t('owners.originHelp')}</p></div><div class="flex flex-col gap-3"><Select name="fid_parametros_como_conocio" label={i18n.t('owners.howKnown')} icon="megaphone" bind:value={sourceId}><option value="">{i18n.t('owners.select')}</option>{#each opciones.como_conocio as item (item.id_parametros)}<option value={item.id_parametros}>{item.etiqueta}</option>{/each}</Select>{#if sourceId === otherId}<Input name="como_conocio_otro" label={i18n.t('owners.specify')} value={source.como_conocio_otro ?? ''} maxlength={150} />{:else}<input type="hidden" name="como_conocio_otro" value="" />{/if}</div></Card>
	</div>

	<div class="flex justify-end gap-3 border-t border-hairline pt-4 max-[480px]:flex-col-reverse">{#if embedded}<Button type="button" variant="secondary" disabled={saving} onclick={onCancel}>{i18n.t('owners.cancel')}</Button>{:else}<Button href="/clinic/owners" variant="secondary" disabled={saving}>{i18n.t('owners.cancel')}</Button>{/if}<Button type="button" loading={saving} onclick={askToSave}><Icon name="save" size={17} />{i18n.t(editing ? 'owners.saveChanges' : 'owners.create')}</Button></div>
</form>

<ConfirmationDialog
	bind:open={confirmSave}
	variant="info"
	icon="save"
	title={i18n.t(editing ? 'owners.confirmEditTitle' : 'owners.confirmCreateTitle')}
	description={i18n.t(editing ? 'owners.confirmEditDescription' : 'owners.confirmCreateDescription')}
	confirmLabel={i18n.t(editing ? 'owners.saveChanges' : 'owners.create')}
	cancelLabel={i18n.t('owners.cancel')}
	confirmDisabled={saving}
	onConfirm={submitOwner}
/>
