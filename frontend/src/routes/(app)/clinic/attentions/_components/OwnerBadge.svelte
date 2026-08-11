<script lang="ts">
  import { Icon, i18n } from '$lib';

  type Owner = {
    nombre_completo: string;
    organizacion?: { nombre: string };
  };

  let { owner = null, compact = false }: { owner?: Owner | null; compact?: boolean } = $props();

  function tilt(node: HTMLElement) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const bounds = node.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      node.style.transform = `rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    };
    const reset = () => { node.style.transform = 'rotateX(0deg) rotateY(0deg)'; };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', reset);
    node.addEventListener('pointercancel', reset);
    return { destroy() { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', reset); node.removeEventListener('pointercancel', reset); } };
  }
</script>

<div class="[perspective:900px] {compact ? 'h-[280px] max-h-[280px]' : ''}">
  <article use:tilt class="relative overflow-hidden rounded-2xl border border-hairline-strong bg-canvas shadow-soft [transform-style:preserve-3d] [transform:rotateX(0deg)_rotateY(0deg)] transition-transform duration-150 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none motion-reduce:transition-none {compact ? 'h-full' : 'min-h-[350px]'}">
    <div class="relative overflow-hidden bg-primary {compact ? 'h-28' : 'h-32'}">
      <span class="absolute left-1/2 top-3 h-2.5 w-14 -translate-x-1/2 rounded-full bg-canvas/85 shadow-inner"></span>
      <span class="absolute -right-10 -top-14 size-36 rounded-full border border-white/20 bg-white/10"></span>
      <span class="absolute -bottom-16 -left-8 h-28 w-64 rotate-6 rounded-[50%] bg-white/12"></span>
    </div>
    <div class="absolute left-1/2 z-20 grid place-items-center border-canvas bg-primary-soft text-primary shadow-soft [transform:translateX(-50%)_translateZ(30px)] {compact ? 'top-[68px] size-16 rounded-xl border-[3px]' : 'top-[72px] size-24 rounded-2xl border-4'}">
      <Icon name={owner ? 'contact' : 'user-round'} size={compact ? 28 : 40} />
    </div>
    <div class="relative flex flex-col text-center [transform:translateZ(16px)] {compact ? 'h-[168px] px-5 pb-3 pt-9' : 'min-h-[222px] px-7 pb-5 pt-14'}">
      {#if owner}
        <h3 class="mx-auto font-semibold leading-[1.08] tracking-[-0.035em] text-ink {compact ? 'line-clamp-2 max-w-[190px] text-xl' : 'max-w-[230px] text-[27px]'}">{owner.nombre_completo}</h3>
        <p class="font-medium uppercase tracking-[0.1em] text-stone {compact ? 'mt-2 text-[10px]' : 'mt-3 text-xs'}">{i18n.t('attentions.owner')}</p>
        {#if owner.organizacion}<div class="mt-auto border-t border-hairline text-xs font-medium text-steel {compact ? 'pt-2' : 'pt-4'}">{owner.organizacion.nombre}</div>{/if}
      {:else}
        <h3 class="text-[27px] font-semibold tracking-[-0.035em] text-ink">{i18n.t('attentions.owner')}</h3>
        <p class="mx-auto mt-3 max-w-[220px] text-sm leading-5 text-steel">{i18n.t('attentions.ownerPending')}</p>
      {/if}
    </div>
  </article>
</div>
