<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from './Card.svelte';
	import Icon from './Icon.svelte';
	import { i18n } from '$lib/i18n/index.svelte';

	let {
		title,
		subtitle,
		icon,
		columns,
		emptyTitle,
		emptyHint,
		children,
		actions,
		content,
		hasItems = false
	}: {
		title: string;
		subtitle: string;
		icon: string;
		/** Reservado para cuando haya tabla con datos; hoy la vista vacía no lo usa. */
		columns?: string[];
		emptyTitle?: string;
		emptyHint?: string;
		children?: Snippet;
		actions?: Snippet;
		content?: Snippet;
		hasItems?: boolean;
	} = $props();
</script>

<Card padding="xl">
	<div class="mb-6 flex items-start justify-between gap-4 max-[520px]:flex-col">
		<div class="min-w-0">
			<h2 class="text-lg text-ink">{title}</h2>
			<p class="mt-0.5 text-[13px] leading-relaxed text-steel">{subtitle}</p>
		</div>
		{#if actions}<div class="shrink-0 max-[520px]:self-end">{@render actions()}</div>{/if}
	</div>

	{#if children}
		<div class="grid grid-cols-12 gap-4 border-b border-hairline pb-6">
			{@render children()}
		</div>
	{/if}

	{#if hasItems && content}
		<div class="mt-6">{@render content()}</div>
	{:else}
		<!-- Estado vacío compartido por las colecciones de perfil. -->
		<div class="mt-6 grid min-h-44 place-items-center rounded-md border border-dashed border-hairline-strong bg-surface/60 px-6 text-center">
			<div>
				<Icon name={icon} size={30} class="mx-auto text-stone" />
				<p class="mt-3 text-sm font-semibold text-ink">
					{emptyTitle ?? i18n.t('profile.collection.emptyTitle')}
				</p>
				<p class="mt-1 max-w-md text-[13px] leading-relaxed text-steel">
					{emptyHint ?? i18n.t('profile.collection.emptyHint')}
				</p>
			</div>
		</div>
	{/if}
</Card>
