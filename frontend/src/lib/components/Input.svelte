<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';
	import Icon from './Icon.svelte';

	interface Props extends HTMLInputAttributes {
		label?: string;
		icon?: string;
		error?: string;
		value?: string;
		suffix?: string;
	}

	let {
		label,
		icon,
		error,
		id,
		type = 'text',
		value = $bindable(''),
		suffix,
		...rest
	}: Props = $props();

	const uid = `f-${Math.random().toString(36).slice(2, 8)}`;
	const fieldId = $derived(id ?? uid);

	let show = $state(false);
	const isPassword = $derived(type === 'password');
	const inputType = $derived(isPassword && show ? 'text' : type);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={fieldId} class="text-sm font-medium text-charcoal">{label}</label>
	{/if}
	<div
		class="relative flex items-center overflow-hidden bg-canvas border rounded-md transition-all duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20 {error
			? 'border-error'
			: 'border-hairline-strong'}"
	>
		{#if icon}
			<span class="flex pl-3 text-steel shrink-0"><Icon name={icon} size={18} /></span>
		{/if}
		<input
			id={fieldId}
			type={inputType}
			bind:value
			class="flex-1 w-full min-w-0 h-11 bg-transparent border-0 outline-none text-ink text-base placeholder:text-muted {icon
				? 'pl-2.5 pr-3.5'
				: 'px-3.5'}"
			{...rest}
		/>
		{#if isPassword}
			<button
				type="button"
				class="flex px-3 text-steel hover:text-ink shrink-0"
				onclick={() => (show = !show)}
				aria-label={show ? 'Ocultar' : 'Mostrar'}
			>
				<Icon name={show ? 'eye-off' : 'eye'} size={18} />
			</button>
		{/if}
		{#if suffix}
			<span
				class="flex items-center shrink-0 self-stretch border-l border-hairline bg-surface px-3.5 text-sm font-semibold font-mono text-steel select-none"
			>
				{suffix}
			</span>
		{/if}
	</div>
	{#if error}
		<span class="text-[13px] text-error" transition:slide={{ duration: 160 }}>{error}</span>
	{/if}
</div>
