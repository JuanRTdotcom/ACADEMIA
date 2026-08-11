<script lang="ts">
	import Icon from './Icon.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { i18n } from '$lib/i18n/index.svelte';

	type Option = { id_parametros: string; etiqueta: string; color_hex?: string | null };
	let { name, label, options, value = $bindable(''), required = false, placeholder }: {
		name: string; label: string; options: Option[]; value?: string; required?: boolean; placeholder: string;
	} = $props();
	let open = $state(false);
	let invalid = $state(false);
	const labelId = $props.id();
	const selected = $derived(options.find((option) => option.id_parametros === value));
</script>

<div class="relative flex flex-col gap-1.5">
	<span id={labelId} class="text-sm font-medium text-charcoal">{label}{#if required}<span class="ml-0.5 text-error" aria-hidden="true">*</span>{/if}</span>
	<input class="pointer-events-none absolute size-px opacity-0" tabindex="-1" {name} {value} {required} oninvalid={(event) => { event.preventDefault(); invalid = true; }} />
	<DropdownMenu.Root bind:open>
		<DropdownMenu.Trigger type="button" aria-labelledby={labelId} aria-invalid={invalid ? 'true' : undefined} class="flex h-11 w-full items-center gap-3 rounded-md border bg-canvas px-3.5 text-left text-base text-ink transition-all focus:outline-none focus:ring-[3px] focus:ring-primary/20 {invalid ? 'border-error' : 'border-hairline-strong focus:border-primary'}">
			{#if selected}<span class="size-4 shrink-0 rounded-full border border-hairline-strong" style:background-color={selected.color_hex ?? 'transparent'}></span>{/if}
			<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-muted'}">{selected?.etiqueta ?? placeholder}</span>
			<Icon name="chevron-down" size={18} class="shrink-0 text-steel transition-transform {open ? 'rotate-180' : ''}" />
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="start" class="max-h-72 min-w-[var(--bits-dropdown-menu-anchor-width)] overflow-y-auto p-1.5">
			{#each options as option (option.id_parametros)}
				<DropdownMenu.Item class="flex gap-3 px-3 py-2.5" onSelect={() => { value = option.id_parametros; invalid = false; }}>
					<span class="size-4 shrink-0 rounded-full border border-hairline-strong" style:background-color={option.color_hex ?? 'transparent'}></span>
					<span class="flex-1">{option.etiqueta}</span>
					{#if value === option.id_parametros}<Icon name="check" size={16} class="text-primary" />{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
	{#if invalid}<span class="text-[13px] text-error">{i18n.t('forms.required')}</span>{/if}
</div>
