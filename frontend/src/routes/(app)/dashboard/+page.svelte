<script lang="ts">
	import { Button, Card, Badge, Icon, Avatar, StatCard, i18n } from '$lib';

	const tintBg: Record<string, string> = {
		sky: 'bg-tint-sky',
		purple: 'bg-tint-purple',
		green: 'bg-tint-green',
		orange: 'bg-tint-orange',
		pink: 'bg-tint-pink',
		teal: 'bg-tint-teal'
	};

	const stats = [
		{ labelKey: 'dashboard.stats.activeStudents', value: '2.418', icon: 'users', tint: 'purple', delta: '+12.5%' },
		{ labelKey: 'dashboard.stats.publishedCourses', value: '48', icon: 'book', tint: 'sky', deltaKey: 'dashboard.stats.coursesDelta' },
		{ labelKey: 'dashboard.stats.monthlyRevenue', value: 'S/ 38.9k', icon: 'credit-card', tint: 'green', delta: '+8.2%' },
		{ labelKey: 'dashboard.stats.certificates', value: '312', icon: 'award', tint: 'orange', delta: '+24' }
	] as const;

	const courses = [
		{ titleKey: 'dashboard.course.pharmacology', teacher: 'Dr. Ramírez', progress: 78, students: 320, tint: 'purple', tagKey: 'dashboard.course.tag.health' },
		{ titleKey: 'dashboard.course.primaryCare', teacher: 'Dra. Chávez', progress: 54, students: 512, tint: 'green', tagKey: 'dashboard.course.tag.clinical' },
		{ titleKey: 'dashboard.course.biosecurity', teacher: 'Lic. Ponce', progress: 92, students: 190, tint: 'sky', tagKey: 'dashboard.course.tag.practical' },
		{ titleKey: 'dashboard.course.publicHealth', teacher: 'Dr. Salas', progress: 31, students: 274, tint: 'orange', tagKey: 'dashboard.course.tag.community' }
	];

	const schedule = [
		{ time: '09:00', titleKey: 'dashboard.schedule.liveClass', tagKey: 'dashboard.schedule.tag.live', variant: 'pink' },
		{ time: '11:30', titleKey: 'dashboard.schedule.caseReview', tagKey: 'dashboard.schedule.tag.workshop', variant: 'tag-purple' },
		{ time: '15:00', titleKey: 'dashboard.schedule.assessment', tagKey: 'dashboard.schedule.tag.exam', variant: 'orange' },
		{ time: '17:00', titleKey: 'dashboard.schedule.tutoring', tagKey: 'dashboard.schedule.tag.tutoring', variant: 'tag-green' }
	];

	const activity = [
		{ who: 'Lucía Fernández', actionKey: 'dashboard.activity.completed', targetKey: 'dashboard.activity.target.biosecurity', timeKey: 'dashboard.time.fiveMinutes', tint: 'var(--tint-green)' },
		{ who: 'Carlos Díaz', actionKey: 'dashboard.activity.enrolled', targetKey: 'dashboard.activity.target.publicHealth', timeKey: 'dashboard.time.twentyTwoMinutes', tint: 'var(--tint-sky)' },
		{ who: 'Ana Quispe', actionKey: 'dashboard.activity.earned', targetKey: 'dashboard.activity.target.primaryCare', timeKey: 'dashboard.time.oneHour', tint: 'var(--tint-orange)' },
		{ who: 'Jorge Mendoza', actionKey: 'dashboard.activity.submitted', targetKey: 'dashboard.activity.target.assignment', timeKey: 'dashboard.time.twoHours', tint: 'var(--tint-purple)' }
	];
</script>

<svelte:head><title>{i18n.t('dashboard.title')} · Sumaq System</title></svelte:head>

<!-- Page header -->
<div class="flex items-end justify-between gap-4 flex-wrap mb-7">
	<div>
		<h2 class="text-[26px]">{i18n.t('dashboard.greeting')}</h2>
		<p class="text-steel mt-1">{i18n.t('dashboard.subtitle')}</p>
	</div>
	<div class="flex gap-3 max-[560px]:w-full [&>*]:max-[560px]:flex-1">
		<Button variant="utility"><Icon name="calendar" size={18} /> {i18n.t('dashboard.date')}</Button>
		<Button><Icon name="plus" size={18} /> {i18n.t('dashboard.newCourse')}</Button>
	</div>
</div>

<!-- Stats -->
<section class="grid grid-cols-4 gap-4 mb-7 max-[900px]:grid-cols-2 max-[420px]:grid-cols-1">
	{#each stats as s (s.labelKey)}
		<StatCard label={i18n.t(s.labelKey)} value={s.value} icon={s.icon} tint={s.tint} delta={'deltaKey' in s ? i18n.t(s.deltaKey) : s.delta} />
	{/each}
</section>

<!-- Main grid -->
<div class="grid grid-cols-[minmax(0,1fr)_340px] gap-7 items-start max-[1100px]:grid-cols-1">
	<div class="flex flex-col gap-6 min-w-0">
		<!-- Featured banner -->
		<Card padding="xl" elevated>
			<div class="flex items-center gap-6 justify-between max-md:flex-col max-md:items-start">
				<div>
					<Badge variant="eyebrow">{i18n.t('dashboard.feature.badge')}</Badge>
					<h3 class="mt-3 mb-1.5 text-[22px] text-ink">{i18n.t('dashboard.feature.title')}</h3>
					<p class="text-steel max-w-[46ch]">
						{i18n.t('dashboard.feature.description')}
					</p>
					<div class="flex items-center gap-2 mt-6">
						<Button>{i18n.t('dashboard.feature.activate')}</Button>
						<Button variant="ghost">{i18n.t('dashboard.feature.learnMore')}</Button>
					</div>
				</div>
				<span
					class="grid place-items-center size-[72px] rounded-lg bg-primary-soft text-primary shrink-0 max-md:hidden"
				>
					<Icon name="sparkles" size={40} strokeWidth={1.5} />
				</span>
			</div>
		</Card>

		<!-- Courses -->
		<div class="flex items-center justify-between mt-1">
			<h3 class="text-lg">{i18n.t('dashboard.popularCourses')}</h3>
			<a href="/dashboard" class="inline-flex items-center gap-0.5 text-sm font-medium text-link hover:underline">
				{i18n.t('dashboard.viewAll')} <Icon name="chevron-right" size={16} />
			</a>
		</div>
		<div class="grid grid-cols-2 gap-4 max-[560px]:grid-cols-1">
			{#each courses as c (c.titleKey)}
				<Card padding="lg" hoverable>
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between">
							<span class="grid place-items-center size-[42px] rounded-md text-charcoal dark:text-ink {tintBg[c.tint]}">
								<Icon name="graduation-cap" size={22} />
							</span>
							<Badge variant="neutral">{i18n.t(c.tagKey)}</Badge>
						</div>
						<h4 class="text-base mt-1">{i18n.t(c.titleKey)}</h4>
						<p class="text-[13px] text-steel -mt-0.5">{c.teacher}</p>
						<div class="h-1.5 bg-surface rounded-full overflow-hidden mt-1.5">
							<span class="block h-full bg-primary rounded-full" style="width:{c.progress}%"></span>
						</div>
						<div class="flex justify-between text-xs text-steel">
							<span>{i18n.t('dashboard.course.completed', { progress: c.progress })}</span>
							<span class="inline-flex items-center gap-1"><Icon name="users" size={14} /> {c.students}</span>
						</div>
					</div>
				</Card>
			{/each}
		</div>

		<!-- Activity -->
		<div class="flex items-center justify-between mt-1">
			<h3 class="text-lg">{i18n.t('dashboard.recentActivity')}</h3>
		</div>
		<Card padding="md">
			<ul class="list-none p-0 flex flex-col">
				{#each activity as a (a.who + a.targetKey)}
					<li class="flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-surface">
						<Avatar name={a.who} size={38} tint={a.tint} />
						<p class="flex-1 text-sm text-slate min-w-0">
							<strong class="text-ink font-semibold">{a.who}</strong>
							{' '}{i18n.t(a.actionKey)}{' '}
							<span class="text-primary font-medium">{i18n.t(a.targetKey)}</span>
						</p>
						<span class="text-xs text-stone whitespace-nowrap">{i18n.t(a.timeKey)}</span>
					</li>
				{/each}
			</ul>
		</Card>
	</div>

	<!-- Side column -->
	<aside class="flex flex-col gap-6 lg:sticky lg:top-20 max-[1100px]:static">
		<Card padding="lg">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-lg">{i18n.t('dashboard.todayAgenda')}</h3>
				<Badge variant="tag-purple">{i18n.t('dashboard.eventsCount')}</Badge>
			</div>
			<ul class="list-none p-0 flex flex-col gap-4 mb-4">
				{#each schedule as ev (ev.titleKey)}
					<li class="grid grid-cols-[44px_2px_1fr] gap-2.5 items-start">
						<span class="text-[13px] font-semibold text-steel pt-px">{ev.time}</span>
						<span class="bg-hairline rounded-full self-stretch"></span>
						<div class="flex flex-col gap-1.5 items-start">
							<p class="text-sm font-medium text-ink leading-snug">{i18n.t(ev.titleKey)}</p>
							<Badge variant={ev.variant as any}>{i18n.t(ev.tagKey)}</Badge>
						</div>
					</li>
				{/each}
			</ul>
			<Button variant="secondary" full>{i18n.t('dashboard.fullCalendar')}</Button>
		</Card>

		<Card padding="lg">
			<div class="flex items-center justify-between mb-4"><h3 class="text-lg">{i18n.t('dashboard.overallProgress')}</h3></div>
			<div class="flex items-center gap-6">
				<div
					class="size-24 rounded-full grid place-items-center shrink-0"
					style="background:conic-gradient(var(--primary) 72%, var(--surface) 0)"
				>
					<span class="grid place-items-center size-[72px] rounded-full bg-canvas text-xl font-semibold">72%</span>
				</div>
				<div>
					<p class="mb-2 font-semibold">{i18n.t('dashboard.monthlyGoal')}</p>
					<span class="flex items-center gap-2 text-[13px] text-slate mt-1">
						<i class="size-2.5 rounded-full bg-accent-green"></i> {i18n.t('dashboard.certificatesCount')}
					</span>
					<span class="flex items-center gap-2 text-[13px] text-slate mt-1">
						<i class="size-2.5 rounded-full bg-hairline-strong"></i> {i18n.t('dashboard.pendingCount')}
					</span>
				</div>
			</div>
		</Card>

		<Card tint="sky" padding="lg">
			<div class="flex gap-3 text-on-tint">
				<span class="text-primary shrink-0"><Icon name="help-circle" size={20} /></span>
				<div>
					<h4 class="text-[15px] text-on-tint">{i18n.t('dashboard.help.title')}</h4>
					<p class="text-[13px] my-1 mb-3 opacity-80">{i18n.t('dashboard.help.description')}</p>
					<Button size="sm">{i18n.t('dashboard.help.action')}</Button>
				</div>
			</div>
		</Card>
	</aside>
</div>
