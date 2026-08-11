<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import { i18n } from '../i18n/index.svelte';

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
		required = false,
		oninput,
		oninvalid,
		...rest
	}: Props = $props();

	const uid = `f-${Math.random().toString(36).slice(2, 8)}`;
	const fieldId = $derived(id ?? uid);

	let show = $state(false);
	let nativeError = $state('');
	const isPassword = $derived(type === 'password');
	const inputType = $derived(isPassword && show ? 'text' : type);
	const visibleError = $derived(error ?? nativeError);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={fieldId} class="text-sm font-medium text-charcoal">{label}{#if required}<span class="ml-0.5 text-error" aria-hidden="true">*</span>{/if}</label>
	{/if}
	<div
		class="relative flex items-center overflow-hidden bg-canvas border rounded-md transition-all duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20 {visibleError
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
			{required}
			aria-invalid={visibleError ? 'true' : undefined}
			oninvalid={(event) => { const input = event.currentTarget; nativeError = input.validity.valueMissing ? i18n.t('forms.required') : input.validationMessage; oninvalid?.(event); }}
			oninput={(event) => { nativeError = ''; oninput?.(event); }}
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
	{#if visibleError}
		<span class="text-[13px] text-error" transition:slide={{ duration: 160 }}>{visibleError}</span>
	{/if}
</div>
