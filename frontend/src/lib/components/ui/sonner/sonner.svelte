<script lang="ts">
	import { mode } from "mode-watcher";
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
	import InfoIcon from '@lucide/svelte/icons/info';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
	theme={mode.current}
	class="toaster group"
	style="--width: 400px; --normal-bg: var(--canvas); --normal-text: var(--ink); --normal-border: var(--hairline-strong); --border-radius: var(--r-sm); font-family: var(--font-sans);"
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" />
	{/snippet}
</Sonner>

<style>
	/* El color comunica el tipo; el fondo queda limpio para mantener contraste. */
	:global(.toaster [data-sonner-toast]) {
		--toast-accent: var(--steel);
		--toast-tint: var(--surface-soft);
	}

	:global(.toaster [data-sonner-toast][data-type='success']) {
		--toast-accent: var(--success);
		--toast-tint: var(--tint-green);
	}

	:global(.toaster [data-sonner-toast][data-type='error']) {
		--toast-accent: var(--error);
		--toast-tint: color-mix(in srgb, var(--error) 13%, var(--canvas));
	}

	:global(.toaster [data-sonner-toast][data-type='warning']) {
		--toast-accent: var(--warning);
		--toast-tint: var(--tint-orange);
	}

	:global(.toaster [data-sonner-toast][data-type='info']) {
		--toast-accent: var(--primary);
		--toast-tint: var(--tint-sky);
	}

	:global(.toaster [data-sonner-toast][data-styled='true']) {
		min-height: 76px;
		padding: 14px 46px 14px 18px;
		gap: 13px;
		color: var(--ink) !important;
		border: 1px solid var(--hairline-strong) !important;
		border-radius: var(--r-sm) !important;
		background:
			linear-gradient(90deg, var(--toast-accent) 0 4px, transparent 4px), var(--canvas) !important;
		box-shadow: var(--shadow-2) !important;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-icon]) {
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		width: 32px;
		height: 32px;
		margin: 0 !important;
		padding: 0;
		flex: 0 0 32px;
		line-height: 0;
		color: var(--toast-accent);
		background: var(--toast-tint);
		border-radius: 9999px;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-icon] svg) {
		display: block;
		width: 17px;
		height: 17px;
		margin: 0 !important;
		stroke-width: 2.4;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-title]) {
		color: var(--ink);
		font-size: 14px;
		font-weight: 700;
		line-height: 1.35;
		letter-spacing: -0.01em;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-description]) {
		margin-top: 2px;
		color: var(--steel) !important;
		font-size: 13px;
		line-height: 1.4;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-close-button]) {
		left: auto !important;
		right: 12px !important;
		top: 50% !important;
		width: 28px;
		height: 28px;
		color: var(--stone);
		background: transparent !important;
		border: 0 !important;
		transform: translateY(-50%) !important;
	}

	:global(.toaster [data-sonner-toast][data-styled='true'] [data-close-button]:hover) {
		color: var(--ink);
		background: var(--surface) !important;
	}
</style>
