<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { CompanyBranding } from '$lib/server/companies';
	import Card from './Card.svelte';
	import ConfirmationDialog from './ConfirmationDialog.svelte';
	import Icon from './Icon.svelte';
	import Switch from './Switch.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	type Cover = CompanyBranding['portadas'][number];

	let {
		covers,
		filterEnabled = $bindable(true),
		filterDisabled = false,
		onFilterChange
	}: {
		covers: Cover[];
		filterEnabled?: boolean;
		filterDisabled?: boolean;
		onFilterChange?: (checked: boolean) => void | Promise<void>;
	} = $props();
	let currentCovers = $state<Cover[]>(untrack(() => [...covers]));
	let selector: HTMLInputElement;
	let operation = $state<'uploading' | 'deleting' | null>(null);
	let progress = $state(0);
	let target = $state<Cover | null>(null);
	let confirmDelete = $state(false);

	$effect(() => {
		if (!operation) currentCovers = [...covers];
	});

	const coverUrl = (cover: Cover) => `/media/tenant/portada/${cover.version}`;
	const message = (body: unknown, fallback: string) =>
		body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string'
			? i18n.t((body as { message: string }).message)
			: i18n.t(fallback);

	function chooseFile() {
		if (!operation && currentCovers.length < 4) selector?.click();
	}

	function selected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || operation || currentCovers.length >= 4) return;

		const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
		if (file.size <= 0 || file.type !== 'image/jpeg' || !['.jpg', '.jpeg'].includes(extension)) {
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('companies.media.invalidFile')
			});
			return;
		}
		if (file.size > 3 * 1024 * 1024) {
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('companies.media.tooLarge')
			});
			return;
		}

		operation = 'uploading';
		progress = 0;
		const form = new FormData();
		form.set('image', file, file.name);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/media/company/portada');
		xhr.timeout = 60_000;
		xhr.upload.onprogress = (upload) => {
			if (upload.lengthComputable) progress = Math.min(100, Math.round((upload.loaded / upload.total) * 100));
		};
		xhr.onload = async () => {
			let body: unknown = null;
			try { body = JSON.parse(xhr.responseText); } catch { /* respuesta inválida */ }
			if (xhr.status >= 200 && xhr.status < 300) {
				const branding = body as Partial<CompanyBranding>;
				if (Array.isArray(branding.portadas)) currentCovers = [...branding.portadas];
				progress = 100;
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.media.updated') });
				await invalidateAll();
			} else {
				toast.error(i18n.t('notifications.type.error'), { description: message(body, 'companies.media.saveError') });
			}
			operation = null;
			progress = 0;
		};
		const failed = () => {
			operation = null;
			progress = 0;
			toast.error(i18n.t('notifications.type.error'), { description: i18n.t('companies.media.saveError') });
		};
		xhr.onerror = failed;
		xhr.ontimeout = failed;
		xhr.send(form);
	}

	async function removeCover() {
		if (!target || operation) return;
		operation = 'deleting';
		try {
			const response = await fetch(`/media/company/portada?coverId=${encodeURIComponent(target.id)}`, { method: 'DELETE' });
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(message(body, 'companies.media.deleteError'));
			const branding = body as Partial<CompanyBranding>;
			currentCovers = Array.isArray(branding.portadas)
				? [...branding.portadas]
				: currentCovers.filter((cover) => cover.id !== target?.id);
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.media.deleted') });
			target = null;
			await invalidateAll();
		} catch (error) {
			toast.error(i18n.t('notifications.type.error'), {
				description: error instanceof Error ? error.message : i18n.t('companies.media.deleteError')
			});
			throw error;
		} finally {
			operation = null;
		}
	}
</script>

<Card padding="xl">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-lg text-ink">{i18n.t('companies.media.covers')}</h2>
			<p class="mt-1 text-[13px] leading-relaxed text-steel">{i18n.t('companies.media.coversHint')}</p>
		</div>
		<span class="shrink-0 text-xs font-medium text-stone">{currentCovers.length}/4</span>
	</div>

	<label class="mt-5 flex items-center justify-between gap-5 rounded-md border border-hairline px-4 py-3">
		<span class="min-w-0">
			<span class="block text-sm text-ink">{i18n.t('companies.media.useColorFilter')}</span>
			<span class="mt-0.5 block text-xs leading-relaxed text-steel">{i18n.t('companies.media.useColorFilterHint')}</span>
		</span>
		<span class="flex shrink-0 items-center gap-2">
			{#if filterDisabled}<Icon name="loader-circle" size={16} class="animate-spin text-primary" />{/if}
			<Switch
				name="login_usar_filtro_color"
				bind:checked={filterEnabled}
				disabled={filterDisabled || Boolean(operation)}
				label={i18n.t('companies.media.useColorFilter')}
				onchange={onFilterChange}
			/>
		</span>
	</label>

	<div class="mt-6 grid grid-cols-4 gap-3 max-[860px]:grid-cols-2 max-[480px]:grid-cols-1">
		{#each currentCovers as cover (cover.id)}
			<div class="group relative aspect-[2/3] overflow-hidden rounded-md border border-hairline bg-surface">
				<img src={coverUrl(cover)} alt={cover.texto_alternativo || i18n.t('companies.media.cover')} class="size-full object-cover" />
				{#if filterEnabled}<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand-navy)_82%,transparent),color-mix(in_srgb,var(--brand-navy-deep)_90%,transparent))]" aria-hidden="true"></div>{/if}
				<button
					type="button"
					class="absolute right-2 top-2 grid size-7 place-items-center rounded-full border border-white/30 bg-black/65 text-white shadow-soft transition-colors hover:bg-error disabled:cursor-not-allowed disabled:opacity-60"
					aria-label={i18n.t('companies.media.delete')}
					disabled={Boolean(operation)}
					onclick={() => { target = cover; confirmDelete = true; }}
				>
					<Icon name="x" size={15} />
				</button>
				{#if operation === 'deleting' && target?.id === cover.id}
					<div class="absolute inset-0 grid place-items-center bg-ink-deep/70 text-white"><Icon name="loader-circle" size={22} class="animate-spin" /></div>
				{/if}
			</div>
		{/each}

		{#if currentCovers.length < 4}
			<button
				type="button"
				class="relative grid aspect-[2/3] place-items-center overflow-hidden rounded-md border border-dashed border-hairline-strong bg-surface/50 text-primary transition-colors hover:border-primary hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
				disabled={Boolean(operation)}
				aria-label={i18n.t('companies.media.upload')}
				onclick={chooseFile}
			>
				<div class="flex flex-col items-center gap-2"><Icon name="plus" size={25} /><span class="text-xs font-semibold">{i18n.t('companies.media.add')}</span></div>
				{#if operation === 'uploading'}
					<div class="absolute inset-0 grid place-items-center bg-ink-deep/75 text-sm font-semibold text-white">{progress}%</div>
				{/if}
			</button>
		{/if}
	</div>

	<input bind:this={selector} class="sr-only" type="file" accept=".jpg,.jpeg,image/jpeg" onchange={selected} />
	<p class="mt-3 text-xs text-stone">{i18n.t('companies.media.coverLimits')}</p>
</Card>

<ConfirmationDialog
	bind:open={confirmDelete}
	variant="danger"
	icon="trash-2"
	title={i18n.t('companies.media.deleteCoverTitle')}
	description={i18n.t('companies.media.deleteCoverDescription')}
	confirmLabel={i18n.t('companies.media.delete')}
	cancelLabel={i18n.t('companies.cancel')}
	confirmDisabled={!target || Boolean(operation)}
	onConfirm={removeCover}
/>
