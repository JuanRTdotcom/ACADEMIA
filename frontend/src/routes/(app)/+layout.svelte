<script lang="ts">
	import { Header, Sidebar, i18n, theme } from '$lib';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { subscribeAuth } from '$lib/auth-channel';
	import { cerrarSesionLocal } from '$lib/session-client';
	import { isLocale, isTheme, MENU_STORAGE } from '$lib/preferences';
	import { queuePreference } from '$lib/preferences-client';
	import {
		suscribirActualizacionesPerfil,
		type UsuarioCabecera
	} from '$lib/user-profile-channel';
	import { companyAppearancePreview } from '$lib/stores/company-appearance-preview.svelte';

	let { children, data } = $props();

	// /auth/me ya llegó durante SSR. El idioma se fija antes de renderizar las
	// páginas hijas, no después de hidratar, evitando un salto visual.
	const idiomaInicial = untrack(() => data.usuario.preferencias.idioma);
	const temaInicial = untrack(() => data.usuario.preferencias.tema);
	if (isLocale(idiomaInicial)) {
		i18n.locale = idiomaInicial;
	}
	if (isTheme(temaInicial)) {
		theme.prepare(temaInicial);
	}

	const crearUsuarioCabecera = (): UsuarioCabecera => ({
		id_usuarios: data.usuario.id_usuarios,
		persona: { ...data.usuario.persona },
		roles: data.usuario.roles.map((rol) => ({ ...rol })),
		avatar: { ...data.usuario.avatar }
	});
	let usuarioCabecera = $state<UsuarioCabecera>(untrack(crearUsuarioCabecera));

	// Si SvelteKit vuelve a ejecutar el layout, PostgreSQL vuelve a ser la autoridad.
	$effect(() => {
		data.usuario;
		usuarioCabecera = crearUsuarioCabecera();
	});

	onMount(() => {
		// El primer pintado ya usa SSR/cookies; aquí solo alineamos APIs del navegador.
		if (isTheme(data.usuario.preferencias.tema)) theme.hydrate(data.usuario.preferencias.tema);
		if (isLocale(data.usuario.preferencias.idioma)) i18n.hydrate(data.usuario.preferencias.idioma);

		// localStorage solo notifica a las otras pestañas; PostgreSQL sigue siendo
		// la autoridad que definió el valor inicial de este render SSR.
		localStorage.setItem(MENU_STORAGE, collapsed ? 'true' : 'false');
		const sincronizarMenu = (event: StorageEvent) => {
			if (event.key === MENU_STORAGE && (event.newValue === 'true' || event.newValue === 'false')) {
				collapsed = event.newValue === 'true';
			}
		};
		window.addEventListener('storage', sincronizarMenu);

		// Registra FID y metadatos del cliente. No solicita permiso de notificaciones.
		import('$lib/client-registration').then((m) => m.registrarCliente());

		// Otra PESTAÑA cerró sesión → esta se va al login.
		const dejarDeEscuchar = subscribeAuth((event) => {
			if (event === 'logout') goto('/login', { invalidateAll: true });
		});

		const dejarPerfil = suscribirActualizacionesPerfil((actualizacion) => {
			if (actualizacion.id_usuarios !== usuarioCabecera.id_usuarios) return;
			usuarioCabecera = {
				...usuarioCabecera,
				persona: actualizacion.persona
					? { ...actualizacion.persona }
					: usuarioCabecera.persona,
				avatar: actualizacion.avatar ? { ...actualizacion.avatar } : usuarioCabecera.avatar
			};
		});

		// Stream SSE: el SERVER revocó esta sesión desde otro lado (robo de token,
		// "cerrar sesión en todos", revocación de un admin) → botar al instante.
		const fuente = new EventSource('/auth/stream');
		fuente.onmessage = (e) => {
			const dato = JSON.parse(e.data) as { tipo?: string };
			if (dato.tipo === 'session_revoked') cerrarSesionLocal();
		};

		return () => {
			window.removeEventListener('storage', sincronizarMenu);
			dejarDeEscuchar();
			dejarPerfil();
			fuente.close();
		};
	});

	// Se conoce antes del render: el menú no salta de abierto a cerrado al hidratar.
	let collapsed = $state(untrack(() => data.usuario.preferencias.menu_colapsado));
	let mobileOpen = $state(false);

	function toggleSidebar() {
		if (typeof window !== 'undefined' && window.innerWidth < 1024) {
			mobileOpen = !mobileOpen;
		} else {
			collapsed = !collapsed;
			localStorage.setItem(MENU_STORAGE, collapsed ? 'true' : 'false');
			queuePreference({ menu_colapsado: collapsed });
		}
	}

	const titleKeys: Record<string, string> = {
		'/dashboard': 'nav.dashboard',
		'/administrator/company': 'nav.company',
		'/superadmin/roles': 'nav.roles',
		'/superadmin/companies': 'nav.companies',
		'/superadmin/users': 'nav.systemUsers',
		'/recursos': 'nav.resources'
	};
	const titleKey = $derived(
		Object.entries(titleKeys).find(
			([path]) => page.url.pathname === path || page.url.pathname.startsWith(`${path}/`)
		)?.[1]
	);
	const title = $derived(titleKey ? i18n.t(titleKey) : 'Sumaq System');
	const activeBranchAppearance = $derived(data.usuario.sede_activa?.apariencia ?? null);
	const tenantAppearance = $derived(companyAppearancePreview.value ?? activeBranchAppearance ?? data.tenant.interfaz);
</script>

<div class="flex min-h-dvh bg-surface">
	<Sidebar
		{collapsed}
		{mobileOpen}
		tenantName={data.tenant.nombre}
		cornerLightColor={tenantAppearance.esquinero_claro}
		cornerDarkColor={tenantAppearance.esquinero_oscuro}
		menuLightColor={tenantAppearance.menu_claro}
		menuDarkColor={tenantAppearance.menu_oscuro}
		showShieldInMenu={tenantAppearance.mostrar_escudo_menu}
		showCompanyNameInMenu={tenantAppearance.mostrar_nombre_empresa_menu}
		hideExpandedCorner={tenantAppearance.ocultar_esquinero_expandido}
		cornerBackgroundEnabled={tenantAppearance.esquinero_fondo_activo}
		hideRightBorder={tenantAppearance.menu_ocultar_borde}
		shieldSizePercent={tenantAppearance.tamano_escudo_menu}
		primaryColor={companyAppearancePreview.value?.color_primario ?? activeBranchAppearance?.color_primario ?? data.tenant.marca.color_primario}
		shieldVersion={activeBranchAppearance?.escudo_version ?? data.tenant.marca.escudo_version}
		darkShieldVersion={activeBranchAppearance?.escudo_oscuro_version ?? data.tenant.marca.escudo_oscuro_version}
		imagotypeVersion={activeBranchAppearance?.imagotipo_version ?? data.tenant.marca.imagotipo_version}
		darkImagotypeVersion={activeBranchAppearance?.imagotipo_oscuro_version ?? data.tenant.marca.imagotipo_oscuro_version}
		mediaBase={activeBranchAppearance ? '/media/company/view' : '/media/tenant'}
		onClose={() => (mobileOpen = false)}
	/>
	<div class="flex-1 min-w-0 flex flex-col">
		<Header
			onToggleSidebar={toggleSidebar}
			{title}
			usuario={usuarioCabecera}
			organizacionNombre={data.tenant.nombre}
			sedes={data.usuario.sedes}
			sedeActiva={data.usuario.sede_activa}
			lightColor={tenantAppearance.cabecera_claro}
			darkColor={tenantAppearance.cabecera_oscuro}
			hideBottomBorder={tenantAppearance.cabecera_ocultar_borde}
		/>
		<main class="flex-1 p-7 max-md:p-4">
			{@render children()}
		</main>
	</div>
</div>
