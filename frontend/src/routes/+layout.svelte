<script lang="ts">
	import appStyles from '$lib/styles/app.css?url';
	import { i18n } from '$lib/i18n/index.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { setPreferencePersistenceEnabled } from '$lib/preferences-client';
	import { Toaster } from '$lib/components/ui/sonner';
	import { brandThemeStyle } from '$lib/color-contrast';
	import { companyAppearancePreview } from '$lib/stores/company-appearance-preview.svelte';
	import { untrack } from 'svelte';

	let { children, data } = $props();

	// Fija el idioma resuelto en el servidor ANTES de renderizar hijos → SSR sin salto.
	i18n.locale = untrack(() => data.locale);
	theme.prepare(untrack(() => data.resolvedTheme));

	// Solo una sesión presente puede persistir preferencias en la cuenta.
	$effect(() => setPreferencePersistenceEnabled(data.isAuthenticated));

	// El color llega por SSR con el tenant. Durante la edición, la vista temporal
	// sustituye ese valor sin persistir hasta que se pulse Guardar cambios.
	const primarySeed = $derived(
		companyAppearancePreview.value?.color_primario ?? data.tenant.marca.color_primario
	);
	const tenantBrandStyle = $derived(brandThemeStyle(primarySeed, theme.current === 'dark'));
</script>

<svelte:head>
	<!-- Una sola hoja global, emitida por SSR como recurso bloqueante. -->
	<link rel="stylesheet" href={appStyles} />
	<!-- Solo contiene hexadecimales validados por brandThemeStyle. La regla tiene
	     la misma especificidad que el tema oscuro y aparece después de tokens.css. -->
	{@html tenantBrandStyle
		? `<style id="tenant-brand-theme">:root,:root[data-theme='dark']{${tenantBrandStyle}}</style>`
		: ''}
</svelte:head>

{@render children()}

<!-- Una sola instancia global: cualquier ruta puede emitir notificaciones. -->
<Toaster
	position="top-right"
	theme={theme.current}
	closeButton
	expand
	gap={10}
	visibleToasts={5}
	duration={5000}
	containerAriaLabel={i18n.t('notifications.label')}
	closeButtonAriaLabel={i18n.t('notifications.close')}
/>
