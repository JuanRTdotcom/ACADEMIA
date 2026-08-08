<script lang="ts">
	interface Props {
		checked?: boolean;
		disabled?: boolean;
		label?: string;
		name?: string;
		onchange?: (checked: boolean) => void;
	}
	// Toggle on/off accesible. `checked` es bindable para usarlo como control de estado.
	let { checked = $bindable(false), disabled = false, label, name, onchange }: Props = $props();

	function alternar() {
		checked = !checked;
		onchange?.(checked);
	}
</script>

{#if name}
	<input type="hidden" {name} value={checked ? 'true' : 'false'} />
{/if}

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	onclick={alternar}
	class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed {checked
		? 'bg-primary'
		: 'bg-hairline-strong'}"
>
	<span
		class="inline-block size-5 rounded-full bg-white shadow-soft transition-transform duration-150 {checked
			? 'translate-x-[22px]'
			: 'translate-x-0.5'}"
	></span>
</button>
