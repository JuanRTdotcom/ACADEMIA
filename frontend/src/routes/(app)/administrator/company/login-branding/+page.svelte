<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { BenefitIconSelect, Button, Card, CompanyBrandMediaGroup, CompanyCoverGallery, Icon, Input, Switch, i18n } from '$lib';
	let { data }: PageProps = $props();
	let values = $state(untrack(() => ({ ...data.section })));
	let baseline = $state(untrack(() => JSON.stringify(data.section)));
	let saving = $state(false);
	let savingFilter = $state(false);
	const dirty = $derived(JSON.stringify(values) !== baseline);
	const valid = $derived(values.login_etiqueta.length <= 60 && values.login_titulo.length <= 120 && values.login_subtitulo.length <= 240);

	const saveAccess: SubmitFunction = ({ cancel }) => {
		if (!valid || !dirty || saving || savingFilter) { cancel(); return; }
		saving = true;
		return async ({ result, update }) => {
			if (result.type === 'success') {
				await update({ invalidateAll: false, reset: false });
				baseline = JSON.stringify(values);
				toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.updated') });
			} else {
				const key = (result.type === 'failure' ? result.data?.companyMessage : undefined) ?? 'companies.saveError';
				toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
			}
			saving = false;
		};
	};

	async function saveColorFilter(enabled: boolean) {
		if (savingFilter) return;
		const previous = !enabled;
		savingFilter = true;
		try {
			const response = await fetch('/company/login-color-filter', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ login_usar_filtro_color: enabled })
			});
			const body = await response.json().catch(() => null) as { message?: unknown } | null;
			if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'companies.saveError');
			const saved = JSON.parse(baseline) as typeof values;
			saved.login_usar_filtro_color = enabled;
			baseline = JSON.stringify(saved);
			toast.success(i18n.t('notifications.type.success'), { description: i18n.t('companies.updated') });
		} catch (error) {
			values.login_usar_filtro_color = previous;
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t(
					error instanceof Error && (error.message.startsWith('companies.') || error.message.startsWith('auth.'))
						? error.message
						: 'companies.saveError'
				)
			});
		} finally {
			savingFilter = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<form method="POST" use:enhance={saveAccess} aria-busy={saving || savingFilter} class="flex flex-col gap-6">
		<CompanyCoverGallery
			covers={data.branding.portadas}
			bind:filterEnabled={values.login_usar_filtro_color}
			filterDisabled={savingFilter}
			onFilterChange={saveColorFilter}
		/>

		<CompanyBrandMediaGroup
			kind="login_escudo"
			title={i18n.t('companies.login.logoTitle')}
			hint={i18n.t('companies.login.logoHint')}
			dimensions={i18n.t('companies.media.shieldLimits')}
			lightVersion={data.branding.login_escudo_version}
			darkVersion={data.branding.login_escudo_oscuro_version}
			same={data.branding.login_escudo_misma_imagen}
		/>

		<Card padding="xl">
			<div class="mb-6"><h2 class="text-lg text-ink">{i18n.t('companies.access.visualPanel')}</h2><p class="mt-0.5 text-[13px] text-steel">{i18n.t('companies.access.visualPanelDescription')}</p></div>
			<div class="grid grid-cols-12 gap-4">
				<div class="col-span-6 max-[760px]:col-span-12"><Input name="login_etiqueta" label={i18n.t('companies.login.badge')} icon="badge-check" bind:value={values.login_etiqueta} maxlength={60} /></div>
				<label class="col-span-6 flex min-h-11 self-end items-center justify-between gap-4 rounded-md border border-hairline px-4 py-3 text-sm text-ink max-[760px]:col-span-12"><span>{i18n.t('companies.login.showBadge')}</span><Switch name="login_mostrar_etiqueta" bind:checked={values.login_mostrar_etiqueta} label={i18n.t('companies.login.showBadge')} /></label>
				<div class="col-span-12"><Input name="login_titulo" label={i18n.t('companies.login.title')} icon="file-text" bind:value={values.login_titulo} maxlength={120} /></div>
				<div class="col-span-12"><Input name="login_subtitulo" label={i18n.t('companies.login.subtitle')} icon="file-text" bind:value={values.login_subtitulo} maxlength={240} /></div>
				<label class="col-span-12 flex items-center justify-between gap-4 rounded-md border border-hairline px-4 py-3 text-sm text-ink"><span>{i18n.t('companies.login.showHighlights')}</span><Switch name="login_mostrar_destacados" bind:checked={values.login_mostrar_destacados} label={i18n.t('companies.login.showHighlights')} /></label>
				{#each [1, 2, 3] as number}<div class="col-span-4 flex flex-col gap-3 max-[760px]:col-span-12"><Input name={`login_destacado_${number}`} label={`${i18n.t('companies.login.highlight')} ${number}`} icon={values[`login_destacado_icono_${number}` as keyof typeof values] as string} bind:value={values[`login_destacado_${number}` as keyof typeof values] as string} maxlength={120} /><BenefitIconSelect name={`login_destacado_icono_${number}`} label={i18n.t('companies.login.benefitIcon')} bind:value={values[`login_destacado_icono_${number}` as keyof typeof values] as string} /></div>{/each}
				<div class="col-span-6 max-[760px]:col-span-12"><Input name="login_texto_comunidad" label={i18n.t('companies.login.community')} icon="users" bind:value={values.login_texto_comunidad} maxlength={120} /></div>
				<label class="col-span-6 flex min-h-11 self-end items-center justify-between gap-4 rounded-md border border-hairline px-4 py-3 text-sm text-ink max-[760px]:col-span-12"><span>{i18n.t('companies.login.showCommunity')}</span><Switch name="login_mostrar_comunidad" bind:checked={values.login_mostrar_comunidad} label={i18n.t('companies.login.showCommunity')} /></label>
			</div>
			<div class="mt-6 flex justify-end border-t border-hairline pt-6"><Button type="submit" loading={saving} disabled={!valid || !dirty || saving || savingFilter}>{#if !saving}<Icon name="save" size={18} />{/if}{i18n.t('companies.save')}</Button></div>
		</Card>
	</form>
</div>
