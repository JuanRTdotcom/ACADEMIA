<script lang="ts">
  import { Button, Icon, Input, i18n } from '$lib';
  let { value = '', route, maxLength = 220, parameters = {} }: { value?: string; route: string; maxLength?: number; parameters?: Record<string, string> } = $props();
</script>

<form method="GET" autocomplete="off" class="flex max-w-2xl items-end gap-2 max-sm:max-w-none max-sm:flex-col max-sm:items-stretch">
  {#each Object.entries(parameters) as [name, parameter] (name)}{#if parameter}<input type="hidden" {name} value={parameter} />{/if}{/each}
  <div class="min-w-0 flex-1">
    <Input name="q" value={value} autocomplete="off" label={i18n.t('tables.searchLabel')} icon="search" placeholder={i18n.t('tables.searchPlaceholder')} minlength={3} maxlength={maxLength} oninvalid={(event) => { if (event.currentTarget.validity.tooShort) event.currentTarget.setCustomValidity(i18n.t('tables.searchMinLength')); }} oninput={(event) => event.currentTarget.setCustomValidity('')} />
  </div>
  <div class="flex h-11 items-center gap-2">
    <Button type="submit" variant="secondary"><Icon name="search" size={17} />{i18n.t('tables.search')}</Button>
    {#if value}<Button href={`${route}${Object.values(parameters).some(Boolean) ? `?${new URLSearchParams(Object.entries(parameters).filter(([, item]) => Boolean(item)))}` : ''}`} variant="ghost">{i18n.t('tables.clear')}</Button>{/if}
  </div>
</form>
