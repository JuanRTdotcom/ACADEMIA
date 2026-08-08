<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { i18n } from '$lib/i18n/index.svelte';
	import Icon from './Icon.svelte';
	interface Props { tone?: 'default' | 'light' | 'dark'; }
	let { tone = 'default' }: Props = $props();
	const toneClass = $derived(tone === 'light' ? 'border-white/25 text-white hover:bg-white/15 hover:text-white' : tone === 'dark' ? 'border-black/15 text-slate-950 hover:bg-black/10 hover:text-slate-950' : 'border-hairline text-slate hover:bg-surface hover:text-ink hover:border-hairline-strong');
</script>

<button
	class="grid place-items-center size-[38px] bg-transparent border rounded-md transition-all duration-150 {toneClass}"
	onclick={() => theme.toggle()}
	aria-label={i18n.t('accessibility.changeTheme')}
	title={i18n.t('accessibility.changeTheme')}
>
	<span class="block dark:hidden"><Icon name="moon" size={19} /></span>
	<span class="hidden dark:block"><Icon name="sun" size={19} /></span>
</button>
