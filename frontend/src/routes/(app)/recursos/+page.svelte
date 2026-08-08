<script lang="ts">
	import { Button, Card, Badge, Input, Select, Avatar, StatCard, i18n } from '$lib';
	import Icon from '$lib/components/Icon.svelte';
	import LucideIcon, { lucideIconNames } from '$lib/components/LucideIcon.svelte';

	const ICON_PAGE_SIZE = 160;

	const buttonVariants = ['primary', 'secondary', 'utility', 'dark', 'ghost', 'link'] as const;
	const badgeSolid = ['purple', 'pink', 'orange', 'green'] as const;
	const badgeTags = ['tag-purple', 'tag-orange', 'tag-green', 'tag-sky', 'neutral'] as const;
	const cardTints = ['sky', 'purple', 'pink', 'orange', 'teal', 'green'] as const;

	const swatches = [
		{ name: 'primary', cls: 'bg-primary' },
		{ name: 'navy', cls: 'bg-navy' },
		{ name: 'ink', cls: 'bg-ink' },
		{ name: 'canvas', cls: 'bg-canvas border border-hairline' },
		{ name: 'surface', cls: 'bg-surface border border-hairline' },
		{ name: 'accent-sky', cls: 'bg-accent-sky' },
		{ name: 'accent-purple', cls: 'bg-accent-purple' },
		{ name: 'accent-pink', cls: 'bg-accent-pink' },
		{ name: 'accent-orange', cls: 'bg-accent-orange' },
		{ name: 'accent-teal', cls: 'bg-accent-teal' },
		{ name: 'accent-green', cls: 'bg-accent-green' },
		{ name: 'success', cls: 'bg-success' }
	];

	const typeScale = [
		{ labelKey: 'resources.typeDisplay', cls: 'text-[40px] leading-[1.1]', textKey: 'resources.typeSample' },
		{ labelKey: 'resources.typeHeading', cls: 'text-[26px]', textKey: 'resources.typeSample' },
		{ labelKey: 'resources.typeTitle', cls: 'text-lg', textKey: 'resources.typeSample' },
		{ labelKey: 'resources.typeBody', cls: 'text-base font-normal', textKey: 'resources.typeBodySample' },
		{ labelKey: 'resources.typeSmall', cls: 'text-sm font-normal text-steel', textKey: 'resources.typeSmallSample' },
		{ labelKey: 'resources.typeCaption', cls: 'text-xs font-normal text-stone', textKey: 'resources.typeCaptionSample' }
	];

	let copied = $state('');
	let iconQuery = $state('');
	let selectExample = $state('students');
	let visibleIconCount = $state(ICON_PAGE_SIZE);
	const filteredIconNames = $derived.by(() => {
		const query = iconQuery.trim().toLocaleLowerCase();
		return query
			? lucideIconNames.filter((name) => name.toLocaleLowerCase().includes(query))
			: lucideIconNames;
	});
	const visibleIconNames = $derived(filteredIconNames.slice(0, visibleIconCount));

	function copy(name: string) {
		navigator.clipboard?.writeText(name);
		copied = name;
		setTimeout(() => (copied = ''), 1200);
	}
</script>

<svelte:head><title>{i18n.t('resources.title')} · Sumaq System</title></svelte:head>

{#snippet section(title: string, desc: string, body: any)}
	<section class="mb-9">
		<div class="mb-4">
			<h3 class="text-lg">{title}</h3>
			<p class="text-sm text-steel mt-0.5">{desc}</p>
		</div>
		{@render body()}
	</section>
{/snippet}

{#snippet cell(label: string, body: any)}
	<div class="flex flex-col gap-2">
		<span class="text-[11px] font-semibold uppercase tracking-wide text-stone">{label}</span>
		<div class="flex flex-wrap items-center gap-3">{@render body()}</div>
	</div>
{/snippet}

<!-- Header -->
<div class="mb-8">
	<Badge variant="eyebrow">{i18n.t('resources.eyebrow')}</Badge>
	<h2 class="text-[28px] mt-3">{i18n.t('resources.title')}</h2>
	<p class="text-steel mt-1 max-w-[60ch]">
		{i18n.t('resources.intro')}
	</p>
</div>

<!-- Buttons -->
{#snippet buttonsBody()}
	<Card padding="lg">
		<div class="flex flex-col gap-6">
			{@render cell(i18n.t('resources.variants'), variantsRow)}
			{@render cell(i18n.t('resources.sizes'), sizesRow)}
			{@render cell(i18n.t('resources.states'), statesRow)}
		</div>
	</Card>
{/snippet}
{#snippet variantsRow()}
	{#each buttonVariants as v (v)}
		<Button variant={v}>{v}</Button>
	{/each}
{/snippet}
{#snippet sizesRow()}
	<Button size="sm">{i18n.t('resources.small')}</Button>
	<Button size="md">{i18n.t('resources.medium')}</Button>
	<Button size="lg">{i18n.t('resources.large')}</Button>
{/snippet}
{#snippet statesRow()}
	<Button>{i18n.t('resources.normal')}</Button>
	<Button loading>{i18n.t('resources.loading')}</Button>
	<Button disabled>{i18n.t('resources.disabled')}</Button>
	<Button><Icon name="plus" size={18} /> {i18n.t('resources.withIcon')}</Button>
{/snippet}
{@render section(i18n.t('resources.buttons'), i18n.t('resources.buttonsDescription'), buttonsBody)}

<!-- Badges -->
{#snippet badgesBody()}
	<Card padding="lg">
		<div class="flex flex-col gap-6">
			{@render cell('Eyebrow', eyebrowRow)}
			{@render cell(i18n.t('resources.solidDecorative'), solidRow)}
			{@render cell(i18n.t('resources.tags'), tagsRow)}
		</div>
	</Card>
{/snippet}
{#snippet eyebrowRow()}<Badge variant="eyebrow">{i18n.t('resources.educationalPlatform')}</Badge>{/snippet}
{#snippet solidRow()}
	{#each badgeSolid as b (b)}<Badge variant={b}>{b}</Badge>{/each}
{/snippet}
{#snippet tagsRow()}
	{#each badgeTags as b (b)}<Badge variant={b}>{b}</Badge>{/each}
{/snippet}
{@render section(i18n.t('resources.badges'), i18n.t('resources.badgesDescription'), badgesBody)}

<!-- Inputs -->
{#snippet inputsBody()}
	<Card padding="lg">
		<div class="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1 max-w-[720px]">
			<Input label={i18n.t('resources.text')} placeholder={i18n.t('resources.writeSomething')} />
			<Input label={i18n.t('resources.withIconLabel')} icon="mail" placeholder={i18n.t('resources.emailPlaceholder')} />
			<Input label={i18n.t('resources.password')} type="password" icon="lock" placeholder="••••••••" />
			<Input label={i18n.t('resources.withError')} icon="user" error={i18n.t('resources.requiredError')} placeholder={i18n.t('resources.user')} />
			<Select label={i18n.t('resources.select')} icon="users" bind:value={selectExample}>
				<option value="students">{i18n.t('resources.students')}</option>
				<option value="courses">{i18n.t('resources.courses')}</option>
			</Select>
		</div>
	</Card>
{/snippet}
{@render section(i18n.t('resources.inputs'), i18n.t('resources.inputsDescription'), inputsBody)}

<!-- Cards -->
{#snippet cardsBody()}
	<div class="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
		<Card padding="lg">
			<h4 class="text-base mb-1">{i18n.t('resources.cardBase')}</h4>
			<p class="text-sm text-steel">{i18n.t('resources.cardBaseDescription')}</p>
		</Card>
		<Card padding="lg" elevated>
			<h4 class="text-base mb-1">{i18n.t('resources.cardElevated')}</h4>
			<p class="text-sm text-steel">{i18n.t('resources.cardElevatedDescription')}</p>
		</Card>
		<Card padding="lg" hoverable>
			<h4 class="text-base mb-1">{i18n.t('resources.cardHoverable')}</h4>
			<p class="text-sm text-steel">{i18n.t('resources.cardHoverableDescription')}</p>
		</Card>
	</div>
	<div class="grid grid-cols-6 gap-3 mt-4 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2">
		{#each cardTints as t (t)}
			<Card tint={t} padding="md">
				<span class="text-[13px] font-medium capitalize">{t}</span>
			</Card>
		{/each}
	</div>
{/snippet}
{@render section(i18n.t('resources.cards'), i18n.t('resources.cardsDescription'), cardsBody)}

<!-- Stat cards -->
{#snippet statsBody()}
	<div class="grid grid-cols-4 gap-4 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
		<StatCard label={i18n.t('resources.students')} value="2.418" icon="users" tint="purple" delta="+12.5%" />
		<StatCard label={i18n.t('resources.courses')} value="48" icon="book" tint="sky" delta="+3" />
		<StatCard label={i18n.t('resources.revenue')} value="S/ 38.9k" icon="credit-card" tint="green" delta="+8.2%" />
		<StatCard label={i18n.t('resources.dropouts')} value="12" icon="award" tint="orange" delta="-2.1%" trend="down" />
	</div>
{/snippet}
{@render section(i18n.t('resources.statCards'), i18n.t('resources.statCardsDescription'), statsBody)}

<!-- Avatars -->
{#snippet avatarsBody()}
	<Card padding="lg">
		<div class="flex items-center gap-4">
			<Avatar name="María Torres" size={48} tint="var(--tint-green)" />
			<Avatar name="Carlos Díaz" size={40} tint="var(--tint-sky)" />
			<Avatar name="Ana Quispe" size={36} tint="var(--tint-orange)" />
			<Avatar name="Jorge Mendoza" size={30} tint="var(--tint-purple)" />
		</div>
	</Card>
{/snippet}
{@render section(i18n.t('resources.avatars'), i18n.t('resources.avatarsDescription'), avatarsBody)}

<!-- Colors -->
{#snippet colorsBody()}
	<Card padding="lg">
		<div class="grid grid-cols-6 gap-4 max-[900px]:grid-cols-4 max-[560px]:grid-cols-3">
			{#each swatches as s (s.name)}
				<div class="flex flex-col gap-1.5">
					<div class="h-14 rounded-lg {s.cls}"></div>
					<span class="text-[11px] text-steel">{s.name}</span>
				</div>
			{/each}
		</div>
	</Card>
{/snippet}
{@render section(i18n.t('resources.colors'), i18n.t('resources.colorsDescription'), colorsBody)}

<!-- Typography -->
{#snippet typoBody()}
	<Card padding="lg">
		<div class="flex flex-col gap-4">
			{#each typeScale as t (t.labelKey)}
				<div class="flex items-baseline gap-4 border-b border-hairline-soft pb-3 last:border-0 last:pb-0">
					<span class="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-stone">{i18n.t(t.labelKey)}</span>
					<span class={t.cls}>{i18n.t(t.textKey)}</span>
				</div>
			{/each}
		</div>
	</Card>
{/snippet}
{@render section(i18n.t('resources.typography'), i18n.t('resources.typographyDescription'), typoBody)}

<!-- Icons -->
{#snippet iconsBody()}
	<Card padding="lg">
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-[minmax(220px,360px)_1fr] items-end gap-4 max-[700px]:grid-cols-1">
				<Input
					label={i18n.t('resources.searchIcons')}
					icon="search"
					placeholder={i18n.t('resources.searchIconsPlaceholder')}
					bind:value={iconQuery}
					oninput={() => (visibleIconCount = ICON_PAGE_SIZE)}
				/>
				<p class="text-sm text-steel pb-3 max-[700px]:pb-0">
					{i18n.t('resources.showingIcons', {
						visible: Math.min(visibleIconCount, filteredIconNames.length),
						total: filteredIconNames.length
					})}
				</p>
			</div>

			<div class="grid grid-cols-8 gap-2 max-[1100px]:grid-cols-6 max-[700px]:grid-cols-4 max-[420px]:grid-cols-3">
			{#each visibleIconNames as name (name)}
				<button
					class="flex min-h-20 flex-col items-center justify-center gap-1.5 p-2.5 rounded-md text-slate hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-colors"
					onclick={() => copy(name)}
					title={i18n.t('resources.copyIcon', { name })}
				>
					<LucideIcon {name} size={22} />
					<span class="text-[10px] text-stone truncate w-full text-center">
						{copied === name ? i18n.t('resources.copied') : name}
					</span>
				</button>
			{/each}
			</div>

			{#if filteredIconNames.length === 0}
				<p class="py-8 text-center text-sm text-steel">{i18n.t('resources.noIconsFound')}</p>
			{:else if visibleIconCount < filteredIconNames.length}
				<div class="flex justify-center pt-2">
					<Button variant="secondary" onclick={() => (visibleIconCount += ICON_PAGE_SIZE)}>
						{i18n.t('resources.loadMoreIcons')}
					</Button>
				</div>
			{/if}
		</div>
	</Card>
{/snippet}
{@render section(i18n.t('resources.icons', { count: lucideIconNames.length }), i18n.t('resources.iconsDescription'), iconsBody)}
