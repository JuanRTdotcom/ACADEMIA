<script lang="ts">
	import type { Snippet } from 'svelte';

	type Variant =
		| 'eyebrow'
		| 'purple'
		| 'pink'
		| 'orange'
		| 'danger'
		| 'green'
		| 'tag-purple'
		| 'tag-orange'
		| 'tag-danger'
		| 'tag-green'
		| 'tag-sky'
		| 'outline-green'
		| 'outline-sky'
		| 'outline-danger'
		| 'neutral';

	interface Props {
		variant?: Variant;
		class?: string;
		children: Snippet;
	}
	let { variant = 'tag-purple', class: className = '', children }: Props = $props();

	const base =
		'inline-flex items-center gap-1 text-xs font-semibold leading-[1.33] tracking-[0.01em] whitespace-nowrap';

	const variants: Record<Variant, string> = {
		eyebrow: 'bg-canvas text-primary rounded-full px-2.5 py-1 shadow-soft',
		purple: 'bg-accent-purple text-white rounded-full px-2.5 py-[3px]',
		pink: 'bg-accent-pink text-white rounded-full px-2.5 py-[3px]',
		orange: 'bg-accent-orange text-white rounded-full px-2.5 py-[3px]',
		danger: 'bg-destructive text-white rounded-full px-2.5 py-[3px]',
		green: 'bg-accent-green text-white rounded-full px-2.5 py-[3px]',
		'tag-purple': 'bg-tint-purple text-accent-purple-deep dark:text-accent-purple-soft rounded-sm px-2 py-0.5',
		'tag-orange': 'bg-tint-orange text-accent-orange-deep dark:text-[#f0a875] rounded-sm px-2 py-0.5',
		'tag-danger': 'bg-destructive/10 text-destructive rounded-sm px-2 py-0.5',
		'tag-green': 'bg-tint-green text-accent-green dark:text-[#5fd47d] rounded-sm px-2 py-0.5',
		'tag-sky': 'bg-tint-sky text-link-pressed dark:text-accent-sky rounded-sm px-2 py-0.5',
		'outline-green':
			'border border-accent-green/60 bg-transparent text-accent-green dark:border-[#5fd47d]/60 dark:text-[#5fd47d] rounded-sm px-2 py-0.5',
		'outline-sky':
			'border border-primary/60 bg-transparent text-primary dark:border-accent-sky/60 dark:text-accent-sky rounded-sm px-2 py-0.5',
		'outline-danger':
			'border border-destructive/60 bg-transparent text-destructive rounded-sm px-2 py-0.5',
		neutral: 'bg-surface text-steel rounded-sm px-2 py-0.5'
	};
</script>

<span class="{base} {variants[variant]} {className}">{@render children()}</span>
