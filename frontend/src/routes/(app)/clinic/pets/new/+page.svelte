<script lang="ts">
	import type { PageProps } from './$types';
	import { Breadcrumb, i18n } from '$lib';
	import PetForm from '../_components/PetForm.svelte';
	let { data, form }: PageProps = $props();
	const breadcrumbs = [{ label: i18n.t('nav.dashboard'), href: '/dashboard' }, { label: i18n.t('pets.title'), href: '/clinic/pets' }, { label: i18n.t('pets.new') }];
</script>
<svelte:head><title>{i18n.t('pets.new')} · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbs} />
<section class="flex w-full flex-col gap-5"><div><h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('pets.new')}</h1><p class="mt-1.5 max-w-[70ch] text-steel">{i18n.t('pets.newDescription')}</p></div><PetForm opciones={data.opciones} {form} /></section>
