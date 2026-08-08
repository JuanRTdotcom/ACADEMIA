<script lang="ts" module>
	import { icons as catalog } from '@lucide/svelte';

	export const lucideIconNames = Object.keys(catalog).sort((a, b) => a.localeCompare(b));
</script>

<script lang="ts">
	interface Props {
		name: string;
		size?: number;
		strokeWidth?: number;
		class?: string;
	}

	let { name, size = 20, strokeWidth = 1.75, class: klass = '' }: Props = $props();
	const SelectedIcon = $derived(catalog[name as keyof typeof catalog]);
</script>

{#if SelectedIcon}
	<SelectedIcon {size} {strokeWidth} class={klass} aria-hidden="true" />
{/if}
