<script lang="ts">
	import Card from './Card.svelte';
	import Icon from './Icon.svelte';

	interface Props {
		label: string;
		value: string;
		icon: string;
		tint?: 'sky' | 'purple' | 'pink' | 'orange' | 'teal' | 'green';
		delta?: string;
		trend?: 'up' | 'down';
	}
	let { label, value, icon, tint = 'sky', delta, trend = 'up' }: Props = $props();

	const tints = {
		sky: 'bg-tint-sky',
		purple: 'bg-tint-purple',
		pink: 'bg-tint-pink',
		orange: 'bg-tint-orange',
		teal: 'bg-tint-teal',
		green: 'bg-tint-green'
	};
</script>

<Card padding="lg" hoverable>
	<div class="flex gap-4 items-start">
		<span
			class="grid place-items-center size-11 rounded-md text-charcoal dark:text-ink shrink-0 {tints[tint]}"
		>
			<Icon name={icon} size={20} />
		</span>
		<div class="flex flex-col gap-0.5 min-w-0">
			<span class="text-[13px] text-steel">{label}</span>
			<span class="text-[26px] font-semibold tracking-[-0.02em] text-ink leading-[1.15]">{value}</span>
			{#if delta}
				<span
					class="inline-flex items-center gap-[3px] text-xs font-medium mt-0.5 {trend === 'up'
						? 'text-success'
						: 'text-error'}"
				>
					<Icon name="trending-up" size={14} class={trend === 'down' ? 'scale-y-[-1]' : ''} />
					{delta}
				</span>
			{/if}
		</div>
	</div>
</Card>
