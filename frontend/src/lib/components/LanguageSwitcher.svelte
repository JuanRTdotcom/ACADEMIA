<script lang="ts">
	import { i18n, locales } from '$lib/i18n/index.svelte';
	interface Props { tone?: 'default' | 'light' | 'dark'; }
	let { tone = 'default' }: Props = $props();
	const toneClass = $derived(tone === 'light' ? 'border-white/25 text-white hover:bg-white/15 hover:text-white' : tone === 'dark' ? 'border-black/15 text-slate-950 hover:bg-black/10 hover:text-slate-950' : 'border-hairline text-slate hover:bg-surface hover:text-ink hover:border-hairline-strong');

	function cycle() {
		const next = locales[(locales.indexOf(i18n.locale) + 1) % locales.length];
		i18n.set(next);
	}
</script>

<button
	class="grid place-items-center h-[38px] min-w-[38px] px-2.5 bg-transparent border rounded-md text-[13px] font-semibold uppercase transition-all duration-150 {toneClass}"
	onclick={cycle}
	aria-label={i18n.t('accessibility.changeLanguage')}
	title={i18n.t('accessibility.changeLanguage')}
>
	{i18n.locale}
</button>
