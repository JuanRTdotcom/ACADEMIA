<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';
	import { slide } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import { i18n } from '../i18n/index.svelte';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		icon?: string;
		error?: string;
		value?: string;
		children?: Snippet;
	}

	let {
		label,
		icon,
		error,
		id,
		value = $bindable(''),
		disabled = false,
		required = false,
		onchange,
		oninvalid,
		children,
		class: className = '',
		...rest
	}: Props = $props();

	const generatedId = $props.id();
	const fieldId = $derived(id ?? generatedId);
	const errorId = $derived(`${fieldId}-error`);
	let nativeError = $state('');
	const visibleError = $derived(error ?? nativeError);
</script>

<div class="flex flex-col gap-1.5">
	{#if label}
		<label for={fieldId} class="text-sm font-medium text-charcoal">{label}{#if required}<span class="ml-0.5 text-error" aria-hidden="true">*</span>{/if}</label>
	{/if}

	<div
		class="relative flex items-center bg-canvas border rounded-md transition-all duration-150 focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary/20 {visibleError
			? 'border-error'
			: 'border-hairline-strong'} {disabled ? 'opacity-50' : ''}"
	>
		{#if icon}
			<span class="absolute left-3 z-20 flex text-steel pointer-events-none">
				<Icon name={icon} size={18} />
			</span>
		{/if}

		<!-- El select nativo ocupa todo el campo: texto, icono y flecha son clicables. -->
		<select
			id={fieldId}
			bind:value
			{disabled}
			{required}
			aria-invalid={visibleError ? 'true' : undefined}
			aria-describedby={visibleError ? errorId : undefined}
			oninvalid={(event) => { const select = event.currentTarget; nativeError = select.validity.valueMissing ? i18n.t('forms.required') : select.validationMessage; oninvalid?.(event); }}
			onchange={(event) => { nativeError = ''; onchange?.(event); }}
			class="relative z-10 w-full h-11 bg-transparent border-0 outline-none text-ink text-base appearance-none cursor-pointer disabled:cursor-not-allowed {icon
				? 'pl-10'
				: 'pl-3.5'} pr-10 {className}"
			{...rest}
		>
			{@render children?.()}
		</select>

		<span class="absolute right-3 z-20 flex text-steel pointer-events-none">
			<Icon name="chevron-down" size={18} />
		</span>
	</div>

	{#if visibleError}
		<span id={errorId} class="text-[13px] text-error" transition:slide={{ duration: 160 }}>{visibleError}</span>
	{/if}
</div>
