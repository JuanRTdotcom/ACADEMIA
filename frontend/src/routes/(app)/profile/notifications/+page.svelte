<script lang="ts">
	import { Card, Badge, Switch, Icon, i18n } from '$lib';

	// Preferencias de ejemplo — a futuro persistidas por usuario/dispositivo.
	const groups = [
		{
			titleKey: 'profile.notifications.coursesTitle',
			icon: 'book',
			tint: 'purple',
			items: [
				{ id: 'newContent', on: true },
				{ id: 'reminders', on: true },
				{ id: 'grades', on: true }
			]
		},
		{
			titleKey: 'profile.notifications.accountTitle',
			icon: 'shield',
			tint: 'green',
			items: [
				{ id: 'security', on: true, locked: true },
				{ id: 'news', on: false }
			]
		}
	];

	const tintBg: Record<string, string> = {
		purple: 'bg-tint-purple',
		green: 'bg-tint-green'
	};

	// Un interruptor por preferencia.
	let prefs = $state<Record<string, boolean>>(
		Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.id, i.on])))
	);

	// Estado del canal push en este dispositivo (maqueta).
	let pushEnabled = $state(true);
</script>

<svelte:head><title>{i18n.t('profile.tab.notifications')} · Sumaq System</title></svelte:head>

<div class="flex flex-col gap-6">
	<!-- Encabezado -->
	<div>
		<h2 class="text-[22px] text-ink">{i18n.t('profile.notifications.title')}</h2>
		<p class="text-steel mt-1">{i18n.t('profile.notifications.subtitle')}</p>
	</div>

	<!-- Estado del canal push (este dispositivo) -->
	<Card tint="sky" padding="lg">
		<div class="flex items-center gap-4 text-on-tint max-[560px]:flex-wrap">
			<span class="grid place-items-center size-11 rounded-lg bg-canvas/70 text-primary shrink-0">
				<Icon name="bell" size={22} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-[15px] font-semibold text-on-tint">{i18n.t('profile.notifications.pushTitle')}</p>
				<p class="text-[13px] opacity-80">{i18n.t('profile.notifications.pushHint')}</p>
			</div>
			<Switch bind:checked={pushEnabled} label={i18n.t('profile.notifications.pushTitle')} />
		</div>
	</Card>

	<!-- Grupos de preferencias -->
	{#each groups as group (group.titleKey)}
		<Card padding="xl" class={pushEnabled ? '' : 'opacity-60 pointer-events-none'}>
			<div class="flex items-center gap-3 mb-4">
				<span class="grid place-items-center size-9 rounded-md text-charcoal dark:text-ink shrink-0 {tintBg[group.tint]}">
					<Icon name={group.icon} size={18} />
				</span>
				<h3 class="text-base text-ink">{i18n.t(group.titleKey)}</h3>
			</div>
			<ul class="list-none p-0 flex flex-col divide-y divide-hairline">
				{#each group.items as item (item.id)}
					<li class="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
						<div class="min-w-0 flex-1">
							<p class="text-sm text-ink font-medium flex items-center gap-2">
								{i18n.t(`profile.notifications.${item.id}`)}
								{#if item.locked}<Badge variant="neutral">{i18n.t('profile.notifications.required')}</Badge>{/if}
							</p>
							<p class="text-[13px] text-steel mt-0.5">{i18n.t(`profile.notifications.${item.id}Hint`)}</p>
						</div>
						<Switch
							bind:checked={prefs[item.id]}
							disabled={item.locked}
							label={i18n.t(`profile.notifications.${item.id}`)}
						/>
					</li>
				{/each}
			</ul>
		</Card>
	{/each}
</div>
