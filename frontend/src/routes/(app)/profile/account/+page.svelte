<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { enhance as enhanceAction } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { untrack } from 'svelte';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import {
		LIMITES_CONTRASENIA,
		passwordSchema
	} from '$lib/schemas/password';
	import { Button, Card, Input, Icon, Switch, i18n } from '$lib';

	let { data }: PageProps = $props();

	const formularioInicial = untrack(() => data.form);
	const { form, errors, enhance: enhancePassword, submitting } = superForm(formularioInicial, {
		validators: valibot(passwordSchema),
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('profile.password.updated')
				});
				return;
			}
			if (result.type === 'failure') {
				const response = result.data as { form?: { message?: string } } | undefined;
				const description = i18n.t(response?.form?.message ?? 'profile.password.saveError');
				if (result.status === 429) {
					toast.warning(i18n.t('notifications.type.warning'), { description });
				} else {
					toast.error(i18n.t('notifications.type.error'), { description });
				}
			} else if (result.type === 'error') {
				toast.error(i18n.t('notifications.type.error'), {
					description: i18n.t('profile.password.saveError')
				});
			}
		}
	});

	const reglas = $derived([
		{
			clave: 'profile.password.rule.length',
			cumple: $form.contrasenia_nueva.length >= LIMITES_CONTRASENIA.minimo
		},
		{ clave: 'profile.password.rule.uppercase', cumple: /[A-Z]/.test($form.contrasenia_nueva) },
		{ clave: 'profile.password.rule.lowercase', cumple: /[a-z]/.test($form.contrasenia_nueva) },
		{ clave: 'profile.password.rule.number', cumple: /\d/.test($form.contrasenia_nueva) },
		{
			clave: 'profile.password.rule.special',
			cumple: /[^A-Za-z0-9\s]/.test($form.contrasenia_nueva)
		}
	]);
	const puntaje = $derived(reglas.filter((regla) => regla.cumple).length);
	const segura = $derived(puntaje === reglas.length);
	const coincide = $derived(
		$form.confirmacion_contrasenia.length > 0 &&
			$form.contrasenia_nueva === $form.confirmacion_contrasenia
	);
	const puedeGuardar = $derived(
		$form.contrasenia_actual.length > 0 && segura && coincide && !$submitting
	);
	const fuerza = $derived(
		puntaje === reglas.length
			? 'profile.password.strength.strong'
			: puntaje >= 3
				? 'profile.password.strength.medium'
				: 'profile.password.strength.weak'
	);
	const errorCampo = (campo: keyof typeof $errors) => {
		const mensaje = $errors[campo]?.[0];
		return mensaje ? i18n.t(mensaje) : undefined;
	};

	const segundoFactorInicial = untrack(
		() => data.usuario.seguridad.segundo_factor_habilitado
	);
	let segundoFactor = $state(segundoFactorInicial);
	let segundoFactorGuardado = $state(segundoFactorInicial);
	let guardandoSegundoFactor = $state(false);
	const puedeGuardarSegundoFactor = $derived(
		segundoFactor !== segundoFactorGuardado && !guardandoSegundoFactor
	);
	const guardarSegundoFactor: SubmitFunction = () => {
		guardandoSegundoFactor = true;
		return async ({ result, update }) => {
			guardandoSegundoFactor = false;
			if (result.type === 'success') {
				segundoFactorGuardado = segundoFactor;
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('profile.twoFactor.updated')
				});
				await update({ reset: false });
				return;
			}

			const response = result.type === 'failure'
				? (result.data as { message?: string } | undefined)
				: undefined;
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t(response?.message ?? 'profile.twoFactor.saveError')
			});
		};
	};
</script>

<svelte:head><title>{i18n.t('profile.tab.authentication')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
<Card padding="xl">
	<div class="mb-6">
		<h3 class="text-lg text-ink">{i18n.t('profile.password.title')}</h3>
		<p class="mt-0.5 text-[13px] text-steel">{i18n.t('profile.password.subtitle')}</p>
		{#if (data.usuario.acciones_requeridas?.por_seccion?.authentication ?? 0) > 0}
			<div class="mt-5 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
				<span class="mt-0.5 text-destructive"><Icon name="alert-triangle" size={18} /></span>
				<p class="text-[13px] leading-relaxed text-ink">
					{i18n.t('profile.password.requiredActionAlert')}
				</p>
			</div>
		{/if}
	</div>

	<form method="POST" action="?/password" use:enhancePassword aria-busy={$submitting}>
		<div class="grid grid-cols-12 gap-5">
			<div class="col-span-6 col-start-1 max-[760px]:col-span-12">
				<Input
					id="contrasenia-actual"
					name="contrasenia_actual"
					label={i18n.t('profile.password.current')}
					type="password"
					autocomplete="current-password"
					bind:value={$form.contrasenia_actual}
					error={errorCampo('contrasenia_actual')}
					icon="key-round"
					maxlength={LIMITES_CONTRASENIA.maximo}
					required
				/>
			</div>

			<div class="col-span-6 col-start-1 max-[760px]:col-span-12">
				<Input
					id="contrasenia-nueva"
					name="contrasenia_nueva"
					label={i18n.t('profile.password.new')}
					type="password"
					autocomplete="new-password"
					bind:value={$form.contrasenia_nueva}
					error={errorCampo('contrasenia_nueva')}
					icon="key-round"
					minlength={LIMITES_CONTRASENIA.minimo}
					maxlength={LIMITES_CONTRASENIA.maximo}
					required
				/>
			</div>

			<div class="col-span-6 col-start-1 max-[760px]:col-span-12">
				<Input
					id="confirmacion-contrasenia"
					name="confirmacion_contrasenia"
					label={i18n.t('profile.password.confirm')}
					type="password"
					autocomplete="new-password"
					bind:value={$form.confirmacion_contrasenia}
					error={errorCampo('confirmacion_contrasenia')}
					icon="shield-check"
					minlength={LIMITES_CONTRASENIA.minimo}
					maxlength={LIMITES_CONTRASENIA.maximo}
					required
				/>
			</div>

		<div class="col-span-6 col-start-1 rounded-md border border-hairline bg-soft-grey/50 p-4 max-[760px]:col-span-12">
			<div class="flex items-center justify-between gap-4">
				<p class="text-sm font-semibold text-ink">{i18n.t('profile.password.strength')}</p>
				<span class:text-accent-green={segura} class:text-warning={!segura && puntaje >= 3} class:text-error={puntaje < 3} class="text-xs font-semibold">
					{i18n.t(fuerza)}
				</span>
			</div>
			<div class="mt-3 grid grid-cols-5 gap-1.5" aria-hidden="true">
				{#each reglas as regla, indice (regla.clave)}
					<span class="h-1.5 rounded-full transition-colors duration-200 {indice < puntaje ? (segura ? 'bg-accent-green' : puntaje >= 3 ? 'bg-warning' : 'bg-error') : 'bg-hairline'}"></span>
				{/each}
			</div>
			<ul class="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 text-[13px] max-[620px]:grid-cols-1">
				{#each reglas as regla (regla.clave)}
					<li class="flex items-center gap-2 {regla.cumple ? 'text-accent-green' : 'text-steel'}">
						<span class="grid size-4 shrink-0 place-items-center rounded-full {regla.cumple ? 'bg-accent-green/15' : 'bg-hairline'}">
							<Icon name={regla.cumple ? 'check' : 'minus'} size={11} />
						</span>
						{i18n.t(regla.clave)}
					</li>
				{/each}
				<li class="flex items-center gap-2 text-steel">
					<span class="grid size-4 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon name="history" size={11} /></span>
					{i18n.t('profile.password.rule.reuse')}
				</li>
			</ul>
		</div>
		</div>

		<div class="mt-7 flex items-center justify-end border-t border-hairline pt-5">
			<Button type="submit" loading={$submitting} disabled={!puedeGuardar}>
				{#if !$submitting}<Icon name="save" size={18} />{/if}
				{i18n.t('profile.password.update')}
			</Button>
		</div>
	</form>
</Card>

<Card padding="xl">
	<div class="flex items-start justify-between gap-6 max-[620px]:flex-col">
		<div>
			<h3 class="text-lg text-ink">{i18n.t('profile.twoFactor.title')}</h3>
			<p class="mt-0.5 max-w-2xl text-[13px] text-steel">
				{i18n.t('profile.twoFactor.subtitle')}
			</p>
		</div>
		<form method="POST" action="?/twoFactor" use:enhanceAction={guardarSegundoFactor}>
			<div class="flex items-center gap-4">
				<span class="text-sm font-medium text-ink">
					{i18n.t(segundoFactor ? 'common.enabled' : 'common.disabled')}
				</span>
				<Switch
					name="habilitado"
					bind:checked={segundoFactor}
					disabled={guardandoSegundoFactor}
					label={i18n.t('profile.twoFactor.title')}
				/>
			</div>
			<Button
				type="submit"
				class="mt-5 w-full"
				loading={guardandoSegundoFactor}
				disabled={!puedeGuardarSegundoFactor}
			>
				{#if !guardandoSegundoFactor}<Icon name="save" size={18} />{/if}
				{i18n.t('profile.twoFactor.save')}
			</Button>
		</form>
	</div>
	<p class="mt-5 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-steel">
		{i18n.t('profile.twoFactor.pending')}
	</p>
</Card>
</div>
