<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import { Badge, Breadcrumb, Card, Icon, Input, formatLocalDate, formatLocalDateTime } from '$lib';

	let { data }: PageProps = $props();
	let search = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const zonaHoraria = $derived(data.usuario.preferencias.zona_horaria);

	const breadcrumbItems = [
		{ label: 'Inicio', href: '/dashboard' },
		{ label: 'Empresas', href: '/superadmin/companies' },
		{ label: 'Control de Suscripciones' }
	];

	$effect(() => { search = data.q; });

	function companyShield(renewal: any) {
		const light = renewal.escudo_version;
		const dark = renewal.escudo_oscuro_version;
		const version = light ?? dark;
		if (!version) return null;
		const type = light ? 'escudo' : 'escudo_oscuro';
		return `/media/company/list/${renewal.fid_organizaciones}/${type}/${version}`;
	}

	function searchNow() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			const q = search.trim();
			goto(q ? `/superadmin/subscriptions?q=${encodeURIComponent(q)}` : '/superadmin/subscriptions', { keepFocus: true, noScroll: true, replaceState: true });
		}, 250);
	}

	function formatCurrency(amount?: number | null) {
		if (amount === undefined || amount === null) return '—';
		return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
	}
</script>

<svelte:head><title>Control de Suscripciones · Sumaq System</title></svelte:head>
<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
	<div>
		<h1 class="text-[28px] tracking-[-0.02em] text-ink">Historial de Renovaciones</h1>
		<p class="mt-1.5 max-w-[62ch] text-steel">
			Control de pagos, renovaciones y cambios de plan realizados en Sumaq System (últimos 20 registros).
		</p>
	</div>

	<div class="flex flex-wrap items-end justify-between gap-3">
		<div class="w-full max-w-md">
			<Input label="Buscar por empresa o plan" icon="search" bind:value={search} oninput={searchNow} placeholder="Escribe el nombre de la empresa o plan..." />
		</div>
		<Badge variant="outline-sky">Total mostrados: {data.renewals.length}</Badge>
	</div>

	<Card padding="none" class="overflow-hidden">
		{#if data.renewals.length === 0}
			<div class="flex flex-col items-center px-4 py-16 text-center">
				<Icon name="refresh-cw" size={32} class="mb-4 text-stone" />
				<h2 class="text-lg text-ink">No hay renovaciones registradas</h2>
				<p class="mt-1 text-sm text-steel">Las renovaciones realizadas aparecerán en este historial.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px] border-collapse text-left">
					<thead class="bg-surface/70">
						<tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone">
							<th class="px-5 py-3.5">Empresa</th>
							<th class="px-4 py-3.5">Plan</th>
							<th class="px-4 py-3.5">Vigencia contratada</th>
							<th class="px-4 py-3.5">Monto</th>
							<th class="px-4 py-3.5">Método de Pago</th>
							<th class="px-5 py-3.5 text-right">Fecha de registro</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-hairline">
						{#each data.renewals as renewal (renewal.id_renovaciones)}
							<tr class="transition-colors hover:bg-surface/55">
								<td class="px-5 py-4">
									<div class="flex min-w-0 items-center gap-3.5">
										<span class="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline bg-primary-soft text-sm font-semibold text-primary">
											{renewal.nombre_empresa.slice(0, 1).toUpperCase()}
											{#if companyShield(renewal)}
												<img src={companyShield(renewal) ?? ''} alt="" class="absolute inset-0 size-full bg-canvas object-contain p-1" loading="lazy" decoding="async" onerror={(event) => { (event.currentTarget as HTMLImageElement).hidden = true; }} />
											{/if}
										</span>
										<div class="min-w-0">
											<strong class="block truncate text-sm text-ink">{renewal.nombre_empresa}</strong>
											<span class="mt-0.5 block font-mono text-xs text-stone">{renewal.slug_empresa}</span>
										</div>
									</div>
								</td>
								<td class="px-4 py-4 text-sm font-medium text-slate">
									<Badge variant={renewal.codigo_plan === 'EMPRESARIAL' ? 'outline-sky' : renewal.codigo_plan === 'PROFESIONAL' ? 'tag-purple' : 'neutral'}>
										{renewal.nombre_plan}
									</Badge>
								</td>
								<td class="px-4 py-4 text-sm text-slate">
									{formatLocalDate(renewal.fecha_inicio, zonaHoraria)} al {formatLocalDate(renewal.fecha_fin, zonaHoraria)}
								</td>
								<td class="px-4 py-4 text-sm font-semibold text-slate">
									{formatCurrency(renewal.monto)}
								</td>
								<td class="px-4 py-4 text-sm text-slate capitalize">
									{renewal.metodo_pago || '—'}
								</td>
								<td class="px-5 py-4 text-right text-xs font-mono text-stone">
									{formatLocalDateTime(renewal.created_at, zonaHoraria)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
</section>
