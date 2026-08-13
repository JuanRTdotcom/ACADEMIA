<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import Icon from '$lib/components/Icon.svelte';

  let {
    label,
    icon,
    size = 16,
    danger = false,
    onclick
  }: {
    label: string;
    icon: string;
    size?: number;
    danger?: boolean;
    onclick: () => void;
  } = $props();
</script>

<Tooltip.Provider delayDuration={300}>
  <Tooltip.Root>
    <Tooltip.Trigger
      aria-label={label}
      {onclick}
      class="grid size-8 place-items-center rounded-md text-stone {danger ? 'hover:bg-error/10 hover:text-error' : 'hover:bg-primary-soft hover:text-primary'}"
    >
      <Icon name={icon} {size} />
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        sideOffset={6}
        class="z-50 whitespace-nowrap rounded-md border border-hairline-strong bg-ink px-2.5 py-1.5 text-xs font-medium text-canvas shadow-soft"
      >
        {label}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
