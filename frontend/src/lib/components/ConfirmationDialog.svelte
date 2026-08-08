<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	export type ConfirmationVariant = 'danger' | 'warning' | 'info' | 'success' | 'neutral';

	interface Props {
		open?: boolean;
		variant?: ConfirmationVariant;
		title: string;
		description: string;
		confirmLabel: string;
		cancelLabel: string;
		icon?: string;
		size?: 'default' | 'wide';
		confirmDisabled?: boolean;
		children?: Snippet;
		onConfirm?: () => void | Promise<void>;
		onCancel?: () => void;
		onError?: (error: unknown) => void;
	}

	let {
		open = $bindable(false),
		variant = 'neutral',
		title,
		description,
		confirmLabel,
		cancelLabel,
		icon,
		size = 'default',
		confirmDisabled = false,
		children,
		onConfirm,
		onCancel,
		onError
	}: Props = $props();

	let processing = $state(false);
	const contentSize = $derived(size === 'wide' ? 'max-w-[840px] sm:max-w-[840px]' : 'max-w-[420px] sm:max-w-[420px]');

	const icons: Record<ConfirmationVariant, string> = {
		danger: 'alert-triangle',
		warning: 'alert-triangle',
		info: 'circle-info',
		success: 'circle-check',
		neutral: 'help-circle'
	};

	/** Mantiene el diálogo abierto mientras termina una confirmación asíncrona. */
	async function confirm(event: MouseEvent) {
		event.preventDefault();
		if (processing) return;

		processing = true;
		try {
			await onConfirm?.();
			open = false;
		} catch (error) {
			onError?.(error);
		} finally {
			processing = false;
		}
	}

	function cancel() {
		if (processing) return;
		onCancel?.();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		data-variant={variant}
		overlayProps={{ class: 'bg-ink/25 dark:bg-black/65' }}
		showCloseButton={false}
		class={`confirmation-dialog max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${contentSize} gap-0 overflow-y-auto rounded-[28px] border border-hairline bg-canvas px-5 py-7 shadow-elevated sm:px-8 sm:py-9`}
	>
		<Dialog.Header class="flex flex-col items-center gap-0 text-center">
			<div
				class="confirmation-dialog__icon mb-8 grid size-[76px] place-items-center rounded-full bg-[var(--confirmation-soft)] text-[var(--confirmation-accent)]"
				aria-hidden="true"
			>
				<Icon name={icon ?? icons[variant]} size={29} strokeWidth={1.9} />
			</div>

			<Dialog.Title class="text-[22px] font-bold tracking-[-0.025em] text-ink">
				{title}
			</Dialog.Title>
			<Dialog.Description class="mt-3 max-w-[330px] text-[15px]/6 text-steel">
				{description}
			</Dialog.Description>
		</Dialog.Header>
		{#if children}
			<div class="mt-6 w-full">
				{@render children()}
			</div>
		{/if}

		<Dialog.Footer class="mt-8 flex flex-col gap-3.5 sm:flex-col">
			<button
				type="button"
				class="confirmation-dialog__confirm h-14 w-full rounded-xl text-[15px] font-semibold transition-[filter,transform] duration-150 active:translate-y-px"
				disabled={processing || confirmDisabled}
				aria-busy={processing}
				onclick={confirm}
			>
				<span class="inline-flex items-center justify-center gap-2">
					{#if processing}
						<Icon name="loader-circle" size={17} class="animate-spin" />
					{/if}
					{confirmLabel}
				</span>
			</button>
			<Dialog.Close
				class="h-14 w-full rounded-xl border border-hairline-strong bg-canvas text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-surface"
				disabled={processing}
				onpointerdown={(event) => {
					if (processing) return;
					event.preventDefault();
					cancel();
				}}
				onclick={cancel}
			>
				{cancelLabel}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.confirmation-dialog) {
		--confirmation-accent: var(--slate);
		--confirmation-soft: var(--surface);
		--confirmation-on-accent: var(--on-dark);
	}

	:global(.confirmation-dialog[data-variant='danger']) {
		--confirmation-accent: var(--error);
		--confirmation-soft: color-mix(in srgb, var(--error) 14%, var(--canvas));
	}

	:global(.confirmation-dialog[data-variant='warning']) {
		--confirmation-accent: var(--warning);
		--confirmation-soft: var(--tint-orange);
	}

	:global(.confirmation-dialog[data-variant='info']) {
		--confirmation-accent: var(--primary);
		--confirmation-soft: var(--tint-sky);
		--confirmation-on-accent: var(--on-primary);
	}

	:global(.confirmation-dialog[data-variant='success']) {
		--confirmation-accent: var(--success);
		--confirmation-soft: var(--tint-green);
	}

	:global(.confirmation-dialog__icon svg) {
		width: 29px;
		height: 29px;
	}

	:global(.confirmation-dialog__confirm) {
		background: var(--confirmation-accent) !important;
		color: var(--confirmation-on-accent) !important;
	}

	:global(.confirmation-dialog__confirm:hover:not(:disabled)) {
		filter: brightness(0.92);
	}
</style>
