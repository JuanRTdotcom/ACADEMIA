<script lang="ts">
	import type { PageProps } from './$types';
	import { Badge, Card, Icon, formatLocalDate, formatLocalDateTime } from '$lib';

	let { data }: PageProps = $props();
	const general = $derived(data.general);
	const renewals = $derived(data.renewals);
	const zonaHoraria = $derived(data.usuario.preferencias.zona_horaria);

	function formatCurrency(amount?: number | null) {
		if (amount === undefined || amount === null) return '—';
		return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
	}

	function isExpired(expiraString?: string) {
		if (!expiraString) return false;
		const parts = expiraString.split('T')[0].split('-');
		const expDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59);
		return new Date() > expDate;
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Resumen del Estado de Suscripción -->
	<Card class="relative overflow-hidden bg-gradient-to-r from-primary-soft/10 via-transparent to-transparent">
		<div class="flex flex-col gap-4">
			<div>
				<h2 class="text-lg font-semibold text-ink">Estado de la Suscripción</h2>
				<p class="text-sm text-steel mt-0.5">Detalles de tu membresía activa y vencimiento.</p>
			</div>

			<div class="grid grid-cols-12 gap-5 mt-2">
				<div class="col-span-4 max-md:col-span-6 max-sm:col-span-12">
					<div class="text-xs font-semibold text-stone uppercase tracking-wider">Plan Contratado</div>
					<div class="mt-1 text-lg font-bold text-ink">
						{general.plan_nombre || '—'}
					</div>
				</div>

				<div class="col-span-4 max-md:col-span-6 max-sm:col-span-12">
					<div class="text-xs font-semibold text-stone uppercase tracking-wider">Vigencia de Membresía</div>
					<div class="mt-1 text-sm text-slate">
						{#if general.suscripcion_expira_en}
							{formatLocalDate(general.suscripcion_inicia_en, zonaHoraria)} al {formatLocalDate(general.suscripcion_expira_en, zonaHoraria)}
						{:else}
							<span class="font-medium text-emerald-600">Suscripción Ilimitada (Sin límite)</span>
						{/if}
					</div>
				</div>

				<div class="col-span-4 max-md:col-span-12 max-sm:col-span-12">
					<div class="text-xs font-semibold text-stone uppercase tracking-wider">Estado Actual</div>
					<div class="mt-1">
						{#if general.suscripcion_expira_en}
							{#if isExpired(general.suscripcion_expira_en)}
								<Badge variant="outline-danger" class="uppercase font-bold tracking-wider">
									Vencida / Expirada
								</Badge>
							{:else}
								<Badge variant="outline-green" class="uppercase font-bold tracking-wider">
									Activa / Al día
								</Badge>
							{/if}
						{:else}
							<Badge variant="outline-sky" class="uppercase font-bold tracking-wider">
								Sin límite
							</Badge>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</Card>

	<!-- Historial de Pagos y Renovaciones -->
	<Card padding="none" class="overflow-hidden">
		<div class="px-5 py-4 border-b border-hairline">
			<h3 class="text-base font-semibold text-ink">Historial de Pagos y Renovaciones</h3>
			<p class="text-xs text-steel mt-0.5">Historial cronológico de todos los desembolsos y periodos renovados.</p>
		</div>

		{#if renewals.length === 0}
			<div class="flex flex-col items-center px-4 py-12 text-center">
				<Icon name="credit-card" size={28} class="mb-3 text-stone" />
				<h4 class="text-sm font-medium text-ink">Aún no registras renovaciones</h4>
				<p class="mt-1 text-xs text-steel">Cualquier renovación o pago facturado en Sumaq System aparecerá listado aquí.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead class="bg-surface/70">
						<tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone">
							<th class="px-5 py-3.5">Plan</th>
							<th class="px-4 py-3.5">Período de Cobertura</th>
							<th class="px-4 py-3.5">Costo / Monto</th>
							<th class="px-4 py-3.5">Método de Pago</th>
							<th class="px-5 py-3.5 text-right">Fecha de Transacción</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-hairline">
						{#each renewals as renewal (renewal.id_renovaciones)}
							<tr class="transition-colors hover:bg-surface/55">
								<td class="px-5 py-4 text-sm font-medium text-ink">
									{renewal.nombre_plan}
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
</div>
