<script lang="ts">
	interface Props {
		name: string;
		src?: string;
		size?: number;
		tint?: string;
		/** Si ya conocemos una URL de foto, evita mostrar iniciales antes de cargarla. */
		fallbackWhileLoading?: boolean;
	}
	let { name, src, size = 36, tint = 'var(--tint-purple)', fallbackWhileLoading = true }: Props = $props();
	let imageError = $state(false);
	$effect(() => {
		src;
		imageError = false;
	});

	const initials = $derived(
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
</script>

<span
	class="grid place-items-center rounded-full font-semibold text-charcoal dark:text-ink shrink-0 select-none"
	style="width:{size}px;height:{size}px;font-size:{size * 0.4}px;background:{!fallbackWhileLoading && src && !imageError ? 'transparent' : tint}"
	title={name}
>
	{#if src && !imageError}
		<img src={src} alt={name} class="size-full rounded-full object-cover" onerror={() => (imageError = true)} />
	{:else}
		{initials}
	{/if}
</span>
