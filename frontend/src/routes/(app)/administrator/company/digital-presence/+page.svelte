<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { CompanySectionCard, Input, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	const valid = $derived(Object.values(values).every((value) => !value || /^https?:\/\/[^\s]+$/.test(value)));
	const dirty = $derived(JSON.stringify(values) !== baseline);
	function saved() { baseline = JSON.stringify(values); }
</script>

<CompanySectionCard title={i18n.t('companies.section.digital')} subtitle={i18n.t('companies.section.digitalDescription')} {valid} {dirty} onSaved={saved}>
	<div class="col-span-12"><Input name="sitio_web" label={i18n.t('companies.field.web')} icon="globe" bind:value={values.sitio_web} maxlength={150} placeholder="https://" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="facebook_url" label="Facebook" icon="facebook" bind:value={values.facebook_url} maxlength={200} placeholder="https://facebook.com/" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="instagram_url" label="Instagram" icon="instagram" bind:value={values.instagram_url} maxlength={200} placeholder="https://instagram.com/" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="tiktok_url" label="TikTok" icon="music-2" bind:value={values.tiktok_url} maxlength={200} placeholder="https://tiktok.com/@" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="youtube_url" label="YouTube" icon="youtube" bind:value={values.youtube_url} maxlength={200} placeholder="https://youtube.com/" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="linkedin_url" label="LinkedIn" icon="linkedin" bind:value={values.linkedin_url} maxlength={200} placeholder="https://linkedin.com/" /></div>
	<div class="col-span-6 max-[620px]:col-span-12"><Input name="x_url" label="X" icon="at-sign" bind:value={values.x_url} maxlength={200} placeholder="https://x.com/" /></div>
</CompanySectionCard>
