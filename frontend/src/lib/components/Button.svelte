<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'dark' | 'secondary' | 'utility' | 'ghost' | 'on-dark' | 'link';
	type Size = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		href?: string;
		full?: boolean;
		loading?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		full = false,
		loading = false,
		disabled = false,
		type = 'button',
		class: klass = '',
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex items-center justify-center gap-2 font-medium leading-tight border border-transparent whitespace-nowrap select-none rounded-full transition-all duration-150 active:scale-[0.97] disabled:opacity-55 disabled:cursor-not-allowed disabled:pointer-events-none aria-disabled:opacity-55 aria-disabled:pointer-events-none';

	const sizes: Record<Size, string> = {
		sm: 'px-3.5 py-1.5 text-[13px]',
		md: 'px-[18px] py-[9px] text-[15px]',
		lg: 'px-6 py-3 text-base'
	};

	const variants: Record<Variant, string> = {
		primary: 'bg-primary text-on-primary hover:bg-primary-pressed',
		secondary: 'bg-canvas text-ink border-hairline shadow-soft hover:border-hairline-strong',
		utility: 'bg-canvas text-ink border-hairline !rounded-md !px-3.5 !py-1.5 !text-sm hover:bg-surface',
		dark: 'bg-ink-deep text-canvas hover:opacity-90',
		ghost: 'bg-transparent text-ink !rounded-md !px-3.5 !py-2 hover:bg-surface',
		'on-dark': 'bg-on-dark text-[#191919] hover:opacity-90',
		link: 'bg-transparent text-link !rounded-none !p-0 !border-0 hover:text-link-pressed hover:underline'
	};

	const cls = $derived(
		[base, sizes[size], variants[variant], full && 'w-full', klass].filter(Boolean).join(' ')
	);
</script>

{#snippet inner()}
	{#if loading}
		<span
			class="size-3.5 rounded-full border-2 border-current border-r-transparent animate-spin"
			aria-hidden="true"
		></span>
	{/if}
	{@render children()}
{/snippet}

{#if href}
	<a class={cls} aria-disabled={disabled} {href} {...rest as any}>
		{@render inner()}
	</a>
{:else}
	<button class={cls} disabled={disabled || loading} {type} {...rest}>
		{@render inner()}
	</button>
{/if}
