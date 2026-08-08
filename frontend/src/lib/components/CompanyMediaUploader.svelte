<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Card from './Card.svelte';
	import ConfirmationDialog from './ConfirmationDialog.svelte';
	import Icon from './Icon.svelte';
	import * as DropdownMenu from './ui/dropdown-menu/index.js';
	import { i18n } from '$lib/i18n/index.svelte';

	let { title, description, dimensions, src, type, horizontal = false, disabled = false, shared = false, previewTone = 'light' } = $props<{
		title: string;
		description: string;
		dimensions: string;
		src: string | null;
		type: 'escudo' | 'escudo_oscuro' | 'imagotipo' | 'imagotipo_oscuro' | 'login_escudo' | 'login_escudo_oscuro';
		horizontal?: boolean;
		disabled?: boolean;
		shared?: boolean;
		previewTone?: 'light' | 'dark';
	}>();
	let currentSrc = $state<string | null>(untrack(() => src));
	let operation = $state<'uploading' | 'deleting' | null>(null);
	let progress = $state(0);
	let selector: HTMLInputElement;
	let confirmDelete = $state(false);
	const accept = '.png,image/png';

	$effect(() => {
		const incoming = src;
		if (!operation) currentSrc = incoming;
	});

	function message(body: unknown, fallback: string) {
		if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') return i18n.t((body as { message: string }).message);
		return i18n.t(fallback);
	}

	function choose() { if (!operation && !disabled) selector?.click(); }
	function selected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || operation || disabled) return;
		const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
		const formatMessage = (type.startsWith('escudo') || type.startsWith('login_escudo')) ? 'companies.media.invalidShieldFile' : 'companies.media.invalidLogotypeFile';
		const validFormat = file.type === 'image/png' && extension === '.png';
		if (!validFormat || file.size <= 0) {
			toast.error(i18n.t('notifications.type.error'), { description: i18n.t(formatMessage) });
			return;
		}
		if (file.size > 3 * 1024 * 1024) {
			toast.error(i18n.t('notifications.type.error'), { description: i18n.t('companies.media.tooLarge') });
			return;
		}
		operation = 'uploading'; progress = 0;
		const form = new FormData(); form.set('image', file, file.name);
		const xhr = new XMLHttpRequest(); xhr.open('POST', `/media/company/${type}`);
		xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress = Math.min(100, Math.round(event.loaded / event.total * 100)); };
		xhr.onload = async () => {
			let body: unknown = null; try { body = JSON.parse(xhr.responseText); } catch { /* fallback */ }
			if (xhr.status >= 200 && xhr.status < 300) {
				const branding = body as Record<string, unknown>;
				const version = branding[`${type}_version`];
				currentSrc = typeof version === 'string' ? `/media/tenant/${type}/${version}` : null;
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.media.updated') });
				await invalidateAll();
			} else toast.error(i18n.t('notifications.type.error'), { description: message(body, 'companies.media.saveError') });
			operation = null; progress = 0;
		};
		xhr.onerror = () => { operation = null; progress = 0; toast.error(i18n.t('notifications.type.error'), { description: i18n.t('companies.media.saveError') }); };
		xhr.send(form);
	}

	async function remove() {
		if (!currentSrc || operation || disabled) return;
		operation = 'deleting';
		try {
			const response = await fetch(`/media/company/${type}`, { method: 'DELETE' });
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(message(body, 'companies.media.deleteError'));
			currentSrc = null;
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.media.deleted') });
			await invalidateAll();
		} catch (error) {
			toast.error(i18n.t('notifications.type.error'), { description: error instanceof Error ? error.message : i18n.t('companies.media.deleteError') });
			throw error;
		} finally { operation = null; }
	}
</script>

<Card padding="xl">
	<div class="flex flex-col gap-5">
		<div class="flex items-start justify-between gap-3"><div><h3 class="text-base font-semibold text-ink">{title}</h3><p class="mt-1 text-[13px] leading-relaxed text-steel">{description}</p></div>{#if shared}<span class="shrink-0 rounded-full border border-primary px-2 py-0.5 text-[11px] font-semibold text-primary">{i18n.t('companies.media.sameImageBadge')}</span>{/if}</div>
		<div class="relative mx-auto shrink-0">
			<div class={`grid place-items-center overflow-hidden rounded-md border border-dashed ${previewTone === 'dark' ? 'border-slate-700 bg-[#111827]' : 'border-slate-300 bg-[#f8fafc]'} ${horizontal ? 'h-32 w-full min-w-72 px-6 max-[420px]:min-w-0' : 'size-40'}`}>
				{#if currentSrc}<img src={currentSrc} alt={title} class={horizontal ? 'max-h-20 max-w-full object-contain' : 'size-full object-contain p-3'} />{:else}<div class={`flex flex-col items-center gap-2 ${previewTone === 'dark' ? 'text-slate-400' : 'text-stone'}`}><Icon name="image" size={28} /><span class="text-xs">{i18n.t('companies.media.empty')}</span></div>{/if}
				{#if operation}<span class="absolute inset-0 z-10 grid place-items-center rounded-md bg-ink-deep/70 text-sm font-semibold text-white">{#if operation === 'uploading'}{progress}%{:else}<Icon name="loader-circle" size={22} class="animate-spin" />{/if}</span>{/if}
			</div>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger class="absolute -bottom-2 -right-2 z-20 grid size-9 place-items-center rounded-full border-[3px] border-canvas bg-primary text-white shadow-soft hover:bg-primary-pressed disabled:opacity-60" aria-label={i18n.t('companies.media.edit')} disabled={Boolean(operation) || disabled}><Icon name="pencil" size={15} /></DropdownMenu.Trigger>
				<DropdownMenu.Content side="right" align="start" class="w-44">
					<DropdownMenu.Item onSelect={choose}><Icon name="upload" size={17} />{i18n.t('companies.media.upload')}</DropdownMenu.Item>
					<DropdownMenu.Item variant="destructive" disabled={!currentSrc} onSelect={() => (confirmDelete = true)}><Icon name="trash-2" size={17} />{i18n.t('companies.media.delete')}</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<input bind:this={selector} class="sr-only" type="file" {accept} {disabled} onchange={selected} />
		</div>
		<p class="text-center text-xs text-stone">{dimensions}</p>
	</div>
</Card>

<ConfirmationDialog bind:open={confirmDelete} variant="danger" icon="trash-2" title={i18n.t('companies.media.deleteTitle')} description={i18n.t('companies.media.deleteDescription')} confirmLabel={i18n.t('companies.media.delete')} cancelLabel={i18n.t('companies.cancel')} confirmDisabled={Boolean(operation)} onConfirm={remove} />
