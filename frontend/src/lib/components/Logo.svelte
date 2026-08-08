<script lang="ts">
	interface Props {
		size?: number;
		showText?: boolean;
		tone?: 'default' | 'on-dark';
	}
	let { size = 34, showText = true, tone = 'default' }: Props = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<img
		src="/logo-mark.png"
		alt="Sumaq System"
		class="shrink-0 object-contain"
		style="height:{size}px;width:auto"
		width="87"
		height="128"
	/>
	{#if showText}
		<span
			class="font-semibold text-lg tracking-[-0.02em] whitespace-nowrap {tone === 'on-dark'
				? 'text-white'
				: 'text-ink'}"
		>
			Sumaq
			<span class="font-medium {tone === 'on-dark' ? 'text-on-dark-muted' : 'text-steel'}">
				System
			</span>
		</span>
	{/if}
</span>
