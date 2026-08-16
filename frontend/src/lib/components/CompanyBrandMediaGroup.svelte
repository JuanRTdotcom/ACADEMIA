<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import CompanyMediaUploader from './CompanyMediaUploader.svelte';
	import Switch from './Switch.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let { kind, title, hint, dimensions, lightVersion, darkVersion, same, horizontal = false } = $props<{
		kind: 'escudo' | 'imagotipo' | 'login_escudo';
		title: string;
		hint: string;
		dimensions: string;
		lightVersion: string | null;
		darkVersion: string | null;
		same: boolean;
		horizontal?: boolean;
	}>();
	let sameImage = $state(untrack(() => same));
	let saving = $state(false);

	$effect(() => {
		const incoming = same;
		if (!saving) sameImage = incoming;
	});

	const mediaUrl = (type: string, version: string | null) =>
		version ? `/media/company/view/${type}/${version}` : null;

	async function changeReuse(value: boolean) {
		if (saving || value === same) return;
		const previous = sameImage;
		sameImage = value;
		saving = true;
		try {
			const response = await fetch(`/media/company/${kind}/reuse`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ usar_misma_imagen: value })
			});
			const body = (await response.json().catch(() => null)) as { message?: string } | null;
			if (!response.ok) throw new Error(body?.message ? i18n.t(body.message) : i18n.t('companies.media.saveError'));
			await invalidateAll();
			toast.success(i18n.t('notifications.type.success'), {
				description: i18n.t(value ? 'companies.media.reuseEnabled' : 'companies.media.reuseDisabled')
			});
		} catch (error) {
			sameImage = previous;
			toast.error(i18n.t('notifications.type.error'), {
				description: error instanceof Error ? error.message : i18n.t('companies.media.saveError')
			});
		} finally {
			saving = false;
		}
	}
</script>

<section class="flex flex-col gap-4" aria-label={title}>
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h2 class="text-lg font-semibold text-ink">{title}</h2>
			<p class="mt-1 text-[13px] text-steel">{hint}</p>
		</div>
		<label class="flex items-center gap-3 text-sm font-medium text-charcoal">
			<span>{i18n.t('companies.media.useSame')}</span>
			<Switch checked={sameImage} disabled={saving} label={i18n.t('companies.media.useSame')} onchange={changeReuse} />
		</label>
	</div>
	<div class="grid grid-cols-2 gap-6 max-[760px]:grid-cols-1">
		<CompanyMediaUploader
			title={i18n.t('companies.media.lightBackground')}
			description={i18n.t('companies.media.lightBackgroundHint')}
			{dimensions}
			src={mediaUrl(kind, lightVersion)}
			type={kind}
			{horizontal}
			previewTone="light"
		/>
		<CompanyMediaUploader
			title={i18n.t('companies.media.darkBackground')}
			description={sameImage ? i18n.t('companies.media.sameImageHint') : i18n.t('companies.media.darkBackgroundHint')}
			{dimensions}
			src={mediaUrl(`${kind}_oscuro`, darkVersion)}
			type={`${kind}_oscuro` as any}
			horizontal={horizontal}
			disabled={sameImage || saving}
			shared={sameImage}
			previewTone="dark"
		/>
	</div>
</section>
