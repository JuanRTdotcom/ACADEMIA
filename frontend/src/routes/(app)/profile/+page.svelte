<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { untrack } from 'svelte';
	import { valibot } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';
	import { LIMITES_PERSONALES, personalSchema } from '$lib/schemas/personal';
	import { Button, Card, Badge, Input, Select, Switch, Icon, Avatar, i18n, parameterLabel } from '$lib';
	import AdministrativeLocation from '$lib/components/AdministrativeLocation.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { emitirActualizacionPerfil } from '$lib/user-profile-channel';

	let { data }: PageProps = $props();

	const formularioInicial = untrack(() => data.form);
	const avatarInicial = untrack(() => data.perfil.avatar);
	const serializar = (valor: typeof formularioInicial.data) => JSON.stringify(valor);
	let referenciaGuardada = $state(serializar(formularioInicial.data));
	let identidadGuardada = $state({
		nombres: formularioInicial.data.nombres,
		apellido_paterno: formularioInicial.data.apellido_paterno,
		apellido_materno: formularioInicial.data.apellido_materno
	});
	let versionAvatar = $state(avatarInicial.version);
	let avatarDisponible = $state(avatarInicial.disponible);
	let operacionAvatar = $state<'subiendo' | 'eliminando' | null>(null);
	let progresoAvatar = $state(0);
	let selectorAvatar: HTMLInputElement;

	const { form, errors, enhance, submitting } = superForm(formularioInicial, {
		validators: valibot(personalSchema),
		resetForm: false,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				const respuesta = result.data as { form?: { data?: typeof formularioInicial.data } };
				const guardado = respuesta.form?.data ?? $form;
				referenciaGuardada = serializar(guardado);
				identidadGuardada = {
					nombres: guardado.nombres,
					apellido_paterno: guardado.apellido_paterno,
					apellido_materno: guardado.apellido_materno
				};
				emitirActualizacionPerfil({
					id_usuarios: data.usuario.id_usuarios,
					persona: { ...identidadGuardada }
				});
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('profile.personal.saved')
				});
				return;
			}
			if (result.type === 'failure') {
				const respuesta = result.data as { form?: { message?: string } } | undefined;
				const descripcion = i18n.t(respuesta?.form?.message ?? 'profile.personal.saveError');
				if (result.status === 429) {
					toast.warning(i18n.t('notifications.type.warning'), { description: descripcion });
				} else {
					toast.error(i18n.t('notifications.type.error'), { description: descripcion });
				}
			} else if (result.type === 'error') {
				toast.error(i18n.t('notifications.type.error'), {
					description: i18n.t('profile.personal.saveError')
				});
			}
		}
	});

	const hayCambios = $derived(serializar($form) !== referenciaGuardada);
	const nombreCompleto = $derived(
		`${identidadGuardada.nombres} ${identidadGuardada.apellido_paterno} ${identidadGuardada.apellido_materno}`.trim()
	);
	const avatarSrc = $derived(
		avatarDisponible && versionAvatar
			? `/media/avatar?v=${encodeURIComponent(versionAvatar)}`
			: undefined
	);
	const errorCampo = (campo: keyof typeof $errors) => {
		const mensaje = $errors[campo]?.[0];
		return mensaje ? i18n.t(mensaje) : undefined;
	};

	function mensajeRespuesta(cuerpo: unknown, fallback: string): string {
		if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
			const mensaje = (cuerpo as { message?: unknown }).message;
			if (typeof mensaje === 'string' && mensaje.trim()) return i18n.t(mensaje);
		}
		return i18n.t(fallback);
	}

	function seleccionarAvatar() {
		if (!operacionAvatar) selectorAvatar?.click();
	}

	function archivoAvatarSeleccionado(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const archivo = input.files?.[0];
		input.value = '';
		if (!archivo || operacionAvatar) return;

		const extension = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();
		const permitido =
			['image/png', 'image/jpeg'].includes(archivo.type) &&
			['.png', '.jpg', '.jpeg'].includes(extension);
		if (!permitido) {
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('profile.avatar.invalidFile')
			});
			return;
		}
		if (archivo.size <= 0 || archivo.size > data.avatarMaxBytes) {
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('profile.avatar.tooLarge')
			});
			return;
		}

		operacionAvatar = 'subiendo';
		progresoAvatar = 0;
		const datos = new FormData();
		datos.append('avatar', archivo, archivo.name);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', '/media/avatar');
		xhr.upload.onprogress = (progreso) => {
			if (progreso.lengthComputable) {
				progresoAvatar = Math.min(100, Math.round((progreso.loaded / progreso.total) * 100));
			}
		};
		xhr.onload = () => {
			let cuerpo: unknown = null;
			try {
				cuerpo = JSON.parse(xhr.responseText);
			} catch {
				// El fallback traducido se usa si la respuesta no contiene JSON.
			}
			if (xhr.status >= 200 && xhr.status < 300) {
				const version = (cuerpo as { avatar?: { version?: unknown } } | null)?.avatar?.version;
				versionAvatar = typeof version === 'string' ? version : String(Date.now());
				avatarDisponible = true;
				emitirActualizacionPerfil({
					id_usuarios: data.usuario.id_usuarios,
					avatar: { disponible: true, version: versionAvatar }
				});
				toast.success(i18n.t('notifications.type.success'), {
					description: i18n.t('profile.avatar.updated')
				});
			} else {
				const description = mensajeRespuesta(cuerpo, 'profile.avatar.saveError');
				if (xhr.status === 429) {
					toast.warning(i18n.t('notifications.type.warning'), { description });
				} else {
					toast.error(i18n.t('notifications.type.error'), { description });
				}
			}
			operacionAvatar = null;
			progresoAvatar = 0;
		};
		xhr.onerror = () => {
			operacionAvatar = null;
			progresoAvatar = 0;
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('profile.avatar.saveError')
			});
		};
		xhr.send(datos);
	}

	async function eliminarAvatar() {
		if (!avatarDisponible || operacionAvatar) return;
		operacionAvatar = 'eliminando';
		try {
			const response = await fetch('/media/avatar', { method: 'DELETE' });
			const cuerpo = await response.json().catch(() => null);
			if (!response.ok) {
				const description = mensajeRespuesta(cuerpo, 'profile.avatar.deleteError');
				if (response.status === 429) {
					toast.warning(i18n.t('notifications.type.warning'), { description });
				} else {
					toast.error(i18n.t('notifications.type.error'), { description });
				}
				return;
			}
			avatarDisponible = false;
			versionAvatar = null;
			emitirActualizacionPerfil({
				id_usuarios: data.usuario.id_usuarios,
				avatar: { disponible: false, version: null }
			});
			toast.success(i18n.t('notifications.type.success'), {
				description: i18n.t('profile.avatar.deleted')
			});
		} catch {
			toast.error(i18n.t('notifications.type.error'), {
				description: i18n.t('profile.avatar.deleteError')
			});
		} finally {
			operacionAvatar = null;
		}
	}
</script>

<svelte:head><title>{i18n.t('profile.title')} · Sumaq System</title></svelte:head>

<Card padding="xl">
	<div class="flex items-center gap-5 max-[560px]:flex-col max-[560px]:text-center">
		<div class="relative shrink-0">
			<Avatar name={nombreCompleto} src={avatarSrc} size={80} tint="var(--tint-green)" />
			{#if operacionAvatar}
				<span class="absolute inset-0 z-10 grid place-items-center rounded-full bg-ink-deep/70 text-white text-sm font-semibold" aria-live="polite">
					{#if operacionAvatar === 'subiendo'}
						{progresoAvatar}%
					{:else}
						<Icon name="loader-circle" size={21} class="animate-spin" />
					{/if}
				</span>
			{/if}

			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					class="absolute -bottom-0.5 -right-0.5 z-20 grid place-items-center size-8 rounded-full bg-primary text-white border-[3px] border-canvas shadow-soft transition-colors duration-150 hover:bg-primary-pressed disabled:opacity-60"
					aria-label={i18n.t('profile.changePhoto')}
					disabled={Boolean(operacionAvatar)}
				>
					<Icon name="pencil" size={14} />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content side="right" align="start" class="w-44">
					<DropdownMenu.Item onSelect={seleccionarAvatar}>
						<Icon name="upload" size={17} />
						{i18n.t('profile.avatar.upload')}
					</DropdownMenu.Item>
					<DropdownMenu.Item variant="destructive" disabled={!avatarDisponible} onSelect={() => void eliminarAvatar()}>
						<Icon name="trash-2" size={17} />
						{i18n.t('profile.avatar.delete')}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<input bind:this={selectorAvatar} type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" class="sr-only" onchange={archivoAvatarSeleccionado} />
		</div>
		<div class="min-w-0">
			<h3 class="text-xl text-ink">{nombreCompleto}</h3>
			<p class="text-[13px] text-steel mt-0.5">@{data.usuario.usuario}</p>
			<div class="mt-2 flex flex-wrap gap-2 max-[560px]:justify-center">
				{#each data.perfil.roles as rol (rol.codigo)}
					<Badge variant="tag-sky">{rol.nombre}</Badge>
				{/each}
			</div>
		</div>
	</div>
</Card>


<form class="mt-6 flex flex-col gap-6" method="POST" use:enhance aria-busy={$submitting}>
	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.personal.basicTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.personal.basicSubtitle')}</p>
		</div>

		<div class="grid grid-cols-12 gap-4">
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Input id="nombres" name="nombres" label={i18n.t('profile.field.firstName')} bind:value={$form.nombres} error={errorCampo('nombres')} icon="user" maxlength={LIMITES_PERSONALES.nombres} required />
			</div>
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Input id="apellido-paterno" name="apellido_paterno" label={i18n.t('profile.field.lastNameP')} bind:value={$form.apellido_paterno} error={errorCampo('apellido_paterno')} icon="user" maxlength={LIMITES_PERSONALES.apellido_paterno} required />
			</div>
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Input id="apellido-materno" name="apellido_materno" label={i18n.t('profile.field.lastNameM')} bind:value={$form.apellido_materno} error={errorCampo('apellido_materno')} icon="user" maxlength={LIMITES_PERSONALES.apellido_materno} required />
			</div>

			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Select id="sexo" name="codigo_sexo" label={i18n.t('profile.field.sex')} bind:value={$form.codigo_sexo} error={errorCampo('codigo_sexo')} icon="venus-and-mars">
					<option value="">{i18n.t('profile.personal.selectSex')}</option>
					{#each data.perfil.catalogos.sexos as opcion (opcion.codigo)}
						<option value={opcion.codigo}>{parameterLabel(opcion)}</option>
					{/each}
				</Select>
			</div>
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Select id="estado-civil" name="codigo_estado_civil" label={i18n.t('profile.field.civilStatus')} bind:value={$form.codigo_estado_civil} error={errorCampo('codigo_estado_civil')} icon="heart">
					<option value="">{i18n.t('profile.personal.selectCivilStatus')}</option>
					{#each data.perfil.catalogos.estados_civiles as opcion (opcion.codigo)}
						<option value={opcion.codigo}>{parameterLabel(opcion)}</option>
					{/each}
				</Select>
			</div>
			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Select id="nivel-instruccion" name="codigo_nivel_instruccion" label={i18n.t('profile.field.education')} bind:value={$form.codigo_nivel_instruccion} error={errorCampo('codigo_nivel_instruccion')} icon="graduation-cap">
					<option value="">{i18n.t('profile.personal.selectEducation')}</option>
					{#each data.perfil.catalogos.niveles_instruccion as opcion (opcion.codigo)}
						<option value={opcion.codigo}>{parameterLabel(opcion)}</option>
					{/each}
				</Select>
			</div>

			<div class="col-span-4 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<Input id="fecha-nacimiento" name="fecha_nacimiento" label={i18n.t('profile.field.birthDate')} type="date" bind:value={$form.fecha_nacimiento} error={errorCampo('fecha_nacimiento')} icon="calendar" />
			</div>
			<div class="col-span-4 flex flex-col justify-end gap-1.5 max-[760px]:col-span-6 max-[560px]:col-span-12">
				<span class="text-sm font-medium text-charcoal">{i18n.t('profile.field.disability')}</span>
				<label class="flex h-11 items-center gap-3 rounded-md border border-hairline-strong bg-canvas px-3.5 text-sm text-ink">
					<Switch name="discapacidad" bind:checked={$form.discapacidad} label={i18n.t('profile.field.disability')} />
					{i18n.t($form.discapacidad ? 'common.yes' : 'common.no')}
				</label>
			</div>
		</div>
		<div class="flex items-center justify-end mt-7 pt-5 border-t border-hairline">
			<Button type="submit" loading={$submitting} disabled={$submitting || !hayCambios}>
				{#if !$submitting}<Icon name="save" size={18} />{/if}
				{i18n.t('profile.save')}
			</Button>
		</div>
	</Card>

	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.personal.locationTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.personal.locationSubtitle')}</p>
		</div>
		<div class="grid grid-cols-12 gap-4">
			<AdministrativeLocation
				idPrefix="origin"
				countryName="fid_admin_level_0_procedencia"
				level3Name="codigo_admin_level_3_procedencia"
				countries={data.perfil.catalogos.admin_level_0}
				levels1={data.perfil.catalogos.admin_level_1}
				levels2={data.perfil.catalogos.admin_level_2}
				levels3={data.perfil.catalogos.admin_level_3}
				bind:country={$form.fid_admin_level_0_procedencia}
				bind:level3={$form.codigo_admin_level_3_procedencia}
				countryError={errorCampo('fid_admin_level_0_procedencia')}
				level3Error={errorCampo('codigo_admin_level_3_procedencia')}
			/>
		</div>
		<div class="flex items-center justify-end mt-7 pt-5 border-t border-hairline">
			<Button type="submit" loading={$submitting} disabled={$submitting || !hayCambios}>
				{#if !$submitting}<Icon name="save" size={18} />{/if}
				{i18n.t('profile.save')}
			</Button>
		</div>
	</Card>

	<Card padding="xl">
		<div class="mb-5">
			<h3 class="text-lg text-ink">{i18n.t('profile.personal.contactTitle')}</h3>
			<p class="text-[13px] text-steel mt-0.5">{i18n.t('profile.personal.contactSubtitle')}</p>
		</div>
		<div class="grid grid-cols-12 gap-4">
			<AdministrativeLocation
				idPrefix="residence"
				countryName="fid_admin_level_0_residencia"
				level3Name="codigo_admin_level_3_residencia"
				countries={data.perfil.catalogos.admin_level_0}
				levels1={data.perfil.catalogos.admin_level_1}
				levels2={data.perfil.catalogos.admin_level_2}
				levels3={data.perfil.catalogos.admin_level_3}
				bind:country={$form.fid_admin_level_0_residencia}
				bind:level3={$form.codigo_admin_level_3_residencia}
				countryError={errorCampo('fid_admin_level_0_residencia')}
				level3Error={errorCampo('codigo_admin_level_3_residencia')}
			/>
			<div class="col-span-12">
				<Input id="direccion" name="direccion" label={i18n.t('profile.field.address')} bind:value={$form.direccion} error={errorCampo('direccion')} icon="house" maxlength={LIMITES_PERSONALES.direccion} />
			</div>
			<div class="col-span-12">
				<Input id="referencia" name="referencia" label={i18n.t('profile.field.reference')} bind:value={$form.referencia} error={errorCampo('referencia')} icon="map-pin" maxlength={LIMITES_PERSONALES.referencia} />
			</div>
		</div>

		<div class="flex items-center justify-end mt-7 pt-5 border-t border-hairline">
			<Button type="submit" loading={$submitting} disabled={$submitting || !hayCambios}>
				{#if !$submitting}<Icon name="save" size={18} />{/if}
				{i18n.t('profile.save')}
			</Button>
		</div>
	</Card>
</form>
