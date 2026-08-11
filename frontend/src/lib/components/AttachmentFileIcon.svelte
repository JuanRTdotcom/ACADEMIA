<script lang="ts">
  import { File } from '@lucide/svelte';
  import { attentionAttachmentFamily } from '$lib/config/attention-attachments';

  let { name, size = 30, class: klass = '' }: { name: string; size?: number; class?: string } = $props();
  const family = $derived(attentionAttachmentFamily(name));
  const source = $derived(family === 'pdf' ? '/office-png/pdf.webp' : family === 'word' ? '/office-png/word.webp' : family === 'excel' ? '/office-png/excel.webp' : family === 'powerpoint' ? '/office-png/ppt.webp' : '');
</script>

{#if source}
  <img src={source} alt="" width={size} height={size} class="object-contain {klass}" />
{:else}
  <File {size} strokeWidth={1.7} class="text-stone {klass}" aria-hidden="true" />
{/if}
