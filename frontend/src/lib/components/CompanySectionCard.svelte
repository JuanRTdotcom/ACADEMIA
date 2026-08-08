<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import Icon from './Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let {
		title,
		subtitle,
		valid = true,
		dirty = false,
		protectedCompany = false,
		invalidateAfterSave = false,
		children,
		onSaved
	}: {
		title: string;
		subtitle: string;
		valid?: boolean;
		dirty?: boolean;
		protectedCompany?: boolean;
		invalidateAfterSave?: boolean;
		children: Snippet;
		onSaved?: () => void;
	} = $props();

	let saving = $state(false);
	const submit: SubmitFunction = ({ cancel }) => {
		if (!valid || !dirty || protectedCompany || saving) {
			cancel();
			return;
		}
		saving = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				await update({ invalidateAll: invalidateAfterSave, reset: false });
				onSaved?.();
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('companies.updated')
				});
			} else {
				const key =
					(result.type === 'failure' ? result.data?.companyMessage : undefined) ??
					'companies.saveError';
				toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
			}
			saving = false;
		};
	};
</script>

<form method="POST" use:enhance={submit} aria-busy={saving}>
	<Card padding="xl">
		<div class="mb-6">
			<h2 class="text-lg text-ink">{title}</h2>
			<p class="mt-0.5 text-[13px] leading-relaxed text-steel">{subtitle}</p>
		</div>
		<div class="grid grid-cols-12 gap-4">
			{@render children()}
		</div>
		<div class="mt-7 flex items-center justify-end border-t border-hairline pt-5">
			<Button type="submit" loading={saving} disabled={!valid || !dirty || protectedCompany || saving}>
				{#if !saving}<Icon name="save" size={18} />{/if}
				{i18n.t('companies.save')}
			</Button>
		</div>
	</Card>
</form>
