<script lang="ts">
	import type { PageProps } from './$types';
	import { Breadcrumb, i18n } from '$lib';
	import OwnerForm from '../_components/OwnerForm.svelte';
	let { data, form }: PageProps = $props();
</script>
<svelte:head><title>{i18n.t('owners.new')} · Sumaq System</title></svelte:head>
<Breadcrumb items={[{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('owners.title'), href: '/clinic/owners' }, { label: i18n.t('owners.new') }]} />
<section class="flex w-full flex-col gap-6"><div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('owners.new')}</h1><p class="mt-1.5 text-steel">{i18n.t('owners.newDescription')}</p></div><OwnerForm opciones={data.opciones} {form} /></section>
