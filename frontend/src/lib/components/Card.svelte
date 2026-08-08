<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tint = 'sky' | 'purple' | 'pink' | 'orange' | 'teal' | 'green';

	interface Props {
		tint?: Tint | null;
		padding?: 'none' | 'md' | 'lg' | 'xl';
		elevated?: boolean;
		hoverable?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		tint = null,
		padding = 'xl',
		elevated = false,
		hoverable = false,
		class: klass = '',
		children
	}: Props = $props();

	const pads = { none: 'p-0', md: 'p-4', lg: 'p-6', xl: 'p-7' };
	const tints: Record<Tint, string> = {
		sky: 'bg-tint-sky',
		purple: 'bg-tint-purple',
		pink: 'bg-tint-pink',
		orange: 'bg-tint-orange',
		teal: 'bg-tint-teal',
		green: 'bg-tint-green'
	};

	const cls = $derived(
		[
			'border rounded-lg transition-all duration-150',
			pads[padding],
			tint ? `${tints[tint]} border-transparent text-on-tint` : 'bg-canvas border-hairline',
			elevated && 'shadow-soft',
			hoverable && 'cursor-pointer hover:shadow-soft hover:-translate-y-0.5 hover:border-hairline-strong',
			klass
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={cls}>
	{@render children()}
</div>
