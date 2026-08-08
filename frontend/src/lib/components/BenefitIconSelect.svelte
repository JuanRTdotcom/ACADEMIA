<script lang="ts">
	import Icon from './Icon.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { i18n } from '$lib/i18n/index.svelte';

	interface Props {
		name: string;
		label: string;
		value?: string;
		disabled?: boolean;
	}

	let { name, label, value = $bindable('book'), disabled = false }: Props = $props();
	let open = $state(false);
	const labelId = $props.id();

	const options = [
		{ value: 'book', label: 'companies.login.icons.book' },
		{ value: 'book-open', label: 'companies.login.icons.bookOpen' },
		{ value: 'graduation-cap', label: 'companies.login.icons.graduation' },
		{ value: 'users', label: 'companies.login.icons.users' },
		{ value: 'award', label: 'companies.login.icons.award' },
		{ value: 'badge-check', label: 'companies.login.icons.badge' },
		{ value: 'library', label: 'companies.login.icons.library' },
		{ value: 'presentation', label: 'companies.login.icons.presentation' },
		{ value: 'calendar', label: 'companies.login.icons.calendar' },
		{ value: 'clipboard-check', label: 'companies.login.icons.checklist' },
		{ value: 'play', label: 'companies.login.icons.play' },
		{ value: 'sparkles', label: 'companies.login.icons.sparkles' }
	] as const;

	const selected = $derived(options.find((option) => option.value === value) ?? options[0]);
</script>

<div class="flex flex-col gap-1.5">
	<span id={labelId} class="text-sm font-medium text-charcoal">{label}</span>
	<input type="hidden" {name} {value} />
	<DropdownMenu.Root bind:open>
		<DropdownMenu.Trigger
			type="button"
			{disabled}
			class="flex h-11 w-full items-center gap-3 rounded-md border border-hairline-strong bg-canvas px-3.5 text-left text-sm text-ink transition-all duration-150 hover:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
			aria-labelledby={labelId}
		>
			<span class="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
				<Icon name={selected.value} size={17} />
			</span>
			<span class="min-w-0 flex-1 truncate">{i18n.t(selected.label)}</span>
			<Icon name="chevron-down" size={17} class="shrink-0 text-steel transition-transform duration-150 {open ? 'rotate-180' : ''}" />
		</DropdownMenu.Trigger>

		<DropdownMenu.Content class="min-w-[280px] p-2" align="start">
			<div class="grid grid-cols-4 gap-1">
				{#each options as option (option.value)}
					<DropdownMenu.Item
						class="min-h-14 flex-col justify-center gap-1.5 px-2 py-2 {value === option.value ? 'bg-primary-soft text-primary' : ''}"
						onSelect={() => (value = option.value)}
						title={i18n.t(option.label)}
						aria-label={i18n.t(option.label)}
					>
						<Icon name={option.value} size={19} />
						<span class="max-w-full truncate text-[10px]">{i18n.t(option.label)}</span>
					</DropdownMenu.Item>
				{/each}
			</div>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
