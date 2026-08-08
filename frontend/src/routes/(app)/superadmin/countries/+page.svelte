<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { tick } from 'svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { toast } from 'svelte-sonner';
  import type { PageProps } from './$types';
  import { Badge, Breadcrumb, Card, Icon, Input, Switch, i18n } from '$lib';

  let { data }: PageProps = $props();
  type Country = (typeof data.paises)[number];
  let search = $state('');
  let target = $state<Country | null>(null);
  let processing = $state(false);
  let pendingActive = $state(false);
  let statusForm: HTMLFormElement;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const breadcrumbItems = $derived([
    { label: i18n.t('nav.dashboard'), href: '/dashboard' },
    { label: i18n.t('nav.countries') }
  ]);

  $effect(() => {
    search = data.q;
  });

  function searchNow() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = search.trim();
      goto(q ? `/superadmin/countries?q=${encodeURIComponent(q)}` : '/superadmin/countries', {
        keepFocus: true,
        noScroll: true,
        replaceState: true
      });
    }, 250);
  }

  async function toggleStatus(country: Country, active: boolean) {
    if (processing) return;
    target = country;
    pendingActive = active;
    await tick();
    statusForm.requestSubmit();
  }

  const changeStatus: SubmitFunction = () => {
    if (processing) return () => {};
    processing = true;
    return async ({ result, update }) => {
      const key =
        result.type === 'failure' && typeof result.data?.countryMessage === 'string'
          ? result.data.countryMessage
          : 'countries.saveError';
      if (result.type === 'success') {
        await update({ invalidateAll: true, reset: false });
        toast.success(i18n.t('notifications.type.success'), {
          description: i18n.t('countries.updated')
        });
      } else {
        toast.error(i18n.t('notifications.type.error'), { description: i18n.t(key) });
      }
      processing = false;
    };
  };

  // Convert country code to emoji flag
  function getFlagEmoji(countryCode: string) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
</script>

<svelte:head>
  <title>{i18n.t('countries.title')} · Sumaq System</title>
</svelte:head>

<Breadcrumb items={breadcrumbItems} />

<section class="flex flex-col gap-6">
  <div class="flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
    <div>
      <h1 class="text-[28px] tracking-[-0.02em] text-ink">{i18n.t('countries.title')}</h1>
      <p class="mt-1.5 max-w-[62ch] text-steel">{i18n.t('countries.description')}</p>
    </div>
  </div>

  <div class="flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch">
    <div class="w-full max-w-md">
      <Input
        name="q"
        bind:value={search}
        oninput={searchNow}
        icon="search"
        aria-label={i18n.t('countries.search')}
        placeholder={i18n.t('countries.searchPlaceholder')}
        maxlength={120}
      />
    </div>
    <Badge variant="outline-sky">{i18n.t('countries.count', { count: data.paises.length })}</Badge>
  </div>

  <Card padding="none" class="overflow-hidden">
    {#if data.paises.length === 0}
      <div class="flex flex-col items-center px-4 py-16 text-center">
        <Icon name="globe" size={34} class="mb-4 text-stone" />
        <h2 class="text-lg text-ink">{i18n.t('countries.loadError')}</h2>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full min-w-[640px] border-collapse text-left">
          <thead class="bg-surface/70">
            <tr class="border-b border-hairline text-[11px] font-semibold uppercase tracking-[0.05em] text-stone">
              <th class="px-5 py-3.5">{i18n.t('countries.country')}</th>
              <th class="px-4 py-3.5">{i18n.t('countries.iso2')}</th>
              <th class="px-5 py-3.5 text-right">{i18n.t('countries.status')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline">
            {#each data.paises as country (country.id_admin_level_0)}
              <tr class="transition-colors hover:bg-surface/55">
                <!-- Bandera + Nombre -->
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3.5">
                    <span class="text-2xl select-none" role="img" aria-label={country.nombre_es}>
                      {getFlagEmoji(country.codigo_iso2)}
                    </span>
                    <div class="min-w-0">
                      <strong class="block truncate text-sm text-ink">{country.nombre_es}</strong>
                      <span class="block text-xs text-steel">{country.nombre_en}</span>
                    </div>
                  </div>
                </td>
                <!-- Código ISO2 -->
                <td class="px-4 py-4">
                  <code class="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-slate font-mono">
                    {country.codigo_iso2}
                  </code>
                </td>
                <!-- Switch Estado -->
                <td class="px-5 py-4">
                  <div class="flex items-center justify-end gap-2">
                    <Switch
                      checked={country.estado === 1}
                      disabled={processing}
                      label={`${i18n.t('countries.status')}: ${country.nombre_es}`}
                      onchange={(active) => toggleStatus(country, active)}
                    />
                    <span class="text-xs text-steel min-w-[50px] text-right">
                      {i18n.t(country.estado === 1 ? 'countries.active' : 'countries.inactive')}
                    </span>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </Card>
</section>

<!-- Formulario oculto para mutación de estado -->
<form bind:this={statusForm} method="POST" action="?/status" use:enhance={changeStatus} class="hidden">
  <input name="id" value={target?.id_admin_level_0 ?? ''} />
  <input name="activo" value={pendingActive ? 'true' : 'false'} />
</form>
