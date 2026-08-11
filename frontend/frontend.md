# Sumaq System — Frontend

> Documento de contexto para cualquier IA o dev que entre al proyecto.
> Léelo completo antes de tocar código. Última actualización: 2026-07-28.

---

## 1. Qué estamos construyendo

**Sumaq System** es la aplicación (marca del producto). Frontend de una plataforma
educativa. El proyecto nació como "academia SERUM" (educación para médicos serumistas)
y se está evaluando extenderlo a un **sistema de colegio** (con perfiles padre /
estudiante / profesor / admin). **Decisión de producto aún abierta** — ver §7.

El Dashboard conserva datos de demostración. El login y el módulo de Empresas ya están
conectados al backend mediante acciones y cargas SSR.

Stack backend (existe pero NO se toca en esta fase): NestJS 11 + Prisma 7 + Postgres 18
en `../backend` y `../database`.

---

## 2. Stack del frontend

| Pieza | Versión | Nota |
|---|---|---|
| SvelteKit | 2.63 | rutas file-based, runes forzados |
| Svelte | 5.56 | **runes** (`$state`, `$props`, `$derived`, snippets) |
| Tailwind CSS | 4.3 | vía `@tailwindcss/vite`, config CSS-first (`@theme`) |
| Lucide Svelte | 1.27 | catálogo completo de iconos lineales para Recursos UI |
| TypeScript | 5.7 | |
| Adapter | adapter-auto | |

**Regla dura del proyecto: TODO se estiliza con Tailwind.** No se escriben clases CSS
propias ni bloques `<style>` en componentes. Los estilos salen de utilidades Tailwind
que mapean a tokens de diseño (ver §4).

Correr:
```bash
npm run dev        # http://localhost:5173
npm run build
npx svelte-check   # type-check (debe dar 0 errores)
```

---

## 3. Sistema de diseño

Fuente de verdad: **`DESIGN2.md`** (en esta carpeta) — estilo Notion "daylight".
Hubo un `DESIGN.md` previo (púrpura, botones rectangulares) que **se descartó**; el
usuario prefirió DESIGN2. No uses DESIGN.md.

Principios DESIGN2:
- **Un solo acento estructural**: azul Notion `#0075de` (`--primary`). Es el único color
  que pinta acciones y links. Nunca un segundo acento estructural.
- **CTAs tipo pill** (`rounded-full`); botones de nav/utility tienen 8px (`variant="utility"`).
- Canvas cálido `#f6f5f4` (`--surface`) de fondo de página; **cards blancas** (`--canvas`)
  con hairline `#e6e6e6`.
- Indigo profundo `#213183` (`--brand-navy`): banda "night" del hero (solo en login).
- **Paleta de colores (sky/purple/pink/orange/teal/green) = SOLO decoración**
  (icon tiles, dots, chips). Nunca rellena estructura ni pinta un CTA.
- Sombras casi invisibles (micro-capas). Headings 700 + tracking negativo. Body 400.
- Fuente: Inter local en WOFF2 (pesos 400/500/600/700), sin dependencia de Google Fonts.

Temas **light + dark**: el store escribe `data-theme` en `<html>`. Los tokens se voltean
en `[data-theme="dark"]`, así que las utilidades Tailwind cambian solas — casi no se usa
`dark:`. Init sin parpadeo en un `<script>` inline dentro de `app.html`.

Medios con transparencia (logos, escudos e imagotipos) deben usar `bg-canvas` y
`object-contain`: se ven blancos en tema claro y adoptan la superficie correcta en oscuro.
Nunca usar `bg-white` ni otro color fijo como fondo de un medio de la interfaz.

---

## 4. Cómo funciona el theming (importante)

`src/lib/styles/tokens.css` — define los tokens crudos como CSS vars en `:root`
(light) y los sobreescribe en `:root[data-theme="dark"]`. Ej: `--primary`, `--canvas`,
`--r-lg`, `--shadow-1`.

`src/lib/styles/app.css` — importa Tailwind y **mapea esos tokens al theme de Tailwind**
con `@theme inline { --color-primary: var(--primary); ... }`. `inline` hace que las
utilidades referencien la var directamente → light/dark cambian sin `dark:`.

Utilidades disponibles (ejemplos): `bg-primary text-on-primary bg-canvas bg-surface
border-hairline text-ink text-steel bg-tint-sky text-accent-purple rounded-lg
rounded-full shadow-soft shadow-elevated`.

Para agregar un color/token: agrégalo en `tokens.css` (light + dark) y mapea en el
bloque `@theme inline` de `app.css`.

---

## 5. Estructura

```
src/
  app.html                      # favicons, preload de Inter, init de tema anti-flash, lang SSR
  hooks.server.ts               # resuelve idioma desde cookie para SSR
  routes/
    +layout.server.ts           # pasa locale del servidor al layout
    +layout.svelte              # importa app.css e inicializa i18n
    +page.ts                    # redirige "/" → "/login"
    login/+page.server.ts       # acción SSR contra POST /auth/login
    login/+page.svelte          # login visual (hero indigo + formulario SSR)
    (app)/                      # grupo con el shell de la app (header + sidebar)
      +layout.svelte            # shell: <Sidebar> + <Header> + slot; maneja colapso/drawer
      dashboard/+page.svelte    # dashboard demo (stats, cursos, agenda, actividad)
      superadmin/empresas/      # listado SSR y baja lógica de organizaciones
      recursos/+page.svelte     # SHOWCASE de componentes (kitchen sink) — ver §6
  lib/
    index.ts                    # barrel: exporta todos los componentes desde '$lib'
    components/
      Button, Card, Badge, Input, Icon, LucideIcon, Logo, Avatar, ThemeToggle, LanguageSwitcher, StatCard
      layout/Header.svelte, layout/Sidebar.svelte
    config/nav.ts               # config del menú lateral (grupos + items)
    stores/theme.svelte.ts      # store de tema (runes) + localStorage 'academia-theme'
    i18n/en.json, es.json       # textos visibles y etiquetas accesibles
    i18n/index.svelte.ts        # estado y traducción reactiva EN/ES
    styles/tokens.css, app.css
static/
  logo.png            # logo original (1024x1536, transparente)
  logo-mark.png       # versión chica para el header (87x128) — la usa <Logo>
  favicon-32.png, favicon-512.png, apple-touch-icon.png
```

Importar componentes comunes: `import { Button, Card, Icon } from '$lib';`

---

## 6. Componentes reutilizables (estado actual)

Todos en Tailwind, sin CSS custom. Página viva en **`/recursos`** (menú → Sistema →
Recursos UI) que los muestra todos. Al crear un componente nuevo, agrégalo ahí.

| Componente | Props clave |
|---|---|
| `Button` | `variant` (primary/secondary/utility/dark/ghost/on-dark/link), `size`, `href`, `full`, `loading`, `disabled` |
| `Card` | `tint` (sky/purple/pink/orange/teal/green o null), `padding` (md/lg/xl), `elevated`, `hoverable` |
| `Badge` | `variant` (eyebrow, purple/pink/orange/green sólidos, tag-*, neutral) |
| `Input` | `label`, `icon`, `error`, `type` (password muestra toggle ojo), bindable `value` |
| `Icon` | `name`, `size`, `strokeWidth` — set liviano usado por la aplicación y navegación |
| `LucideIcon` | `name`, `size`, `strokeWidth` — catálogo oficial completo de **1.756 iconos** para consulta/reutilización |
| `Logo` | `size`, `showText` |
| `Avatar` | `name` (genera iniciales), `size`, `tint` |
| `ThemeToggle` | — |
| `LanguageSwitcher` | alterna EN/ES y persiste cookie `sumaq-locale` |
| `StatCard` | `label`, `value`, `icon`, `tint`, `delta`, `trend` |
| `Header` | `onToggleSidebar`, `title` |
| `Sidebar` | `collapsed`, `mobileOpen`, `onClose` |

Sidebar: colapsa a icon-only en desktop (264px ↔ 76px); en mobile (<1024px) es drawer
off-canvas con scrim. Responsive verificado en login, dashboard y recursos.

### Menú Superadministrador

El sidebar inicial queda reducido a Dashboard y al grupo exclusivo del propietario de la plataforma:

- Empresas (`Organizacion`, `PerfilOrganizacion`).
- Usuarios del sistema: personal interno de Sumaq, por ejemplo superadministración, soporte u operaciones.

Los administradores de empresa no pertenecen a «Usuarios del sistema»: son usuarios tenant y se gestionarán dentro de su empresa. Los usuarios internos reutilizarán las tablas actuales de seguridad y pertenecerán a la organización propietaria `sumaq-system`; no se crearán tablas `system_*` paralelas.

Empresas ya tiene pantalla real: lista las organizaciones activas mediante SSR y permite su baja lógica. Solo un `SUPERADMIN` autenticado dentro de `sumaq-system` puede usar los endpoints, y la propia organización `SUMAQ SYSTEM` no puede eliminarse.

### Catálogo de iconos

`/recursos` integra el catálogo oficial Lucide Svelte: **1.756 iconos** de trazo uniforme. Incluye búsqueda, contador, carga progresiva de 160 elementos y copia del nombre. Para usar uno, importar `LucideIcon` directamente desde `$lib/components/LucideIcon.svelte` y escribir `<LucideIcon name="Building2" />`. No se exporta desde el barrel `$lib`: así Dashboard y las demás rutas no descargan el catálogo completo.

Lucide es la única fuente permitida para iconografía visible. No se crean SVG, `path`, emojis, formas CSS ni nombres de iconos propios. Los usos nuevos importan el componente oficial de `@lucide/svelte` o emplean `LucideIcon` con un nombre verificado; si no existe un icono exacto, se elige el equivalente oficial más cercano o se usa texto.

---

## 7. Decisiones de producto abiertas (contexto)

- **Colegio vs Academia SERUM**: sin decidir cuál es el producto primario. Núcleo (auth,
  roles, aula virtual, UI) se comparte ~70%. Diferencia clave del colegio: **perfil de
  padre de familia** + modelo académico (grados/secciones, notas, asistencia, pensiones).
  Se resuelve con **RBAC** (campo `role` en usuario: padre/estudiante/profesor/admin) —
  una sola app, distinto menú/dashboard por rol.
- **Multi-tenant por subdominio** (`santarosa.ejemplo.com`) discutido a futuro: DNS
  comodín + cert wildcard (setup 1 vez), luego crear tenant = fila en `organizaciones`
  y filtrar por `fid_organizaciones`. No implementado aún.

---

## 8. Idiomas

- Código frontend: inglés, siguiendo convenciones TypeScript/Svelte.
- Rutas y segmentos URL: siempre en inglés, incluidas las páginas hijas y los proxies hacia el API. Las etiquetas visibles continúan traducidas mediante i18n.
- Textos visibles: siempre mediante i18n.
- Idioma predeterminado: inglés.
- Inglés y español renderizados desde SSR según cookie, sin parpadeo.
- Login, dashboard, recursos, navegación, títulos y etiquetas accesibles están traducidos.

Para agregar texto: crear la misma clave en `en.json` y `es.json`, luego usar `i18n.t('clave')`.

## 9. Renderizado y navegación

- SSR dinámico activado globalmente; `prerender` desactivado.
- Cada enlace interno hace una navegación completa: request nuevo y HTML nuevo desde el servidor.
- La precarga especulativa de datos está desactivada.
- Las respuestas dinámicas usan `Cache-Control: no-store`; no se reutilizan páginas ni datos de usuario.
- CSR sigue activo solo para hidratar interacciones (tema, sidebar, idioma y formularios).
- Los assets estáticos versionados (JS, CSS, fuentes e imágenes) sí pueden usar caché.

## 10. Qué falta / próximos pasos

- [x] Login conectado al backend NestJS mediante acción SSR y cookies HTTP-only.
- [ ] Definir producto (colegio / SERUM) y modelar rutas/menú por **rol** (RBAC).
- [x] Empresas: listado SSR real y baja lógica con confirmación.
- [ ] Usuarios del sistema todavía es un enlace visual sin página.
- [ ] Más componentes en `/recursos` según se necesiten: modal, dropdown, tabla, tabs,
      toast, checkbox/switch, select, tooltip.
- [ ] Datos reales (hoy todo es mock hardcodeado en las páginas).

## 11. Reglas para trabajar aquí

1. **Solo Tailwind.** Nada de `<style>` ni CSS propio. Si falta un token, agrégalo en
   `tokens.css` + `app.css` (§4).
2. Seguí **DESIGN2.md** (no DESIGN.md). Azul = acciones; colores = solo decoración.
3. Componentes lo más **reutilizables** posible; si creás uno, mostralo en `/recursos`.
4. Mantené **light + dark** funcionando (usá tokens semánticos, no colores hardcodeados).
   En particular, logos e imágenes transparentes usan `bg-canvas`, nunca `bg-white`.
5. Responsive desde el inicio.
6. Corré `npx svelte-check` antes de dar algo por terminado (0 errores).
7. No hardcodear textos visibles: usar claves presentes en ambos diccionarios i18n.

## 12. Registro de cambios

### 2026-07-28 — Empresas y login SSR

- Conectado el formulario de login a `POST /auth/login` mediante una acción SSR; se copian las cookies HTTP-only emitidas por el backend.
- Creado `GET /companies` para listar organizaciones activas y `DELETE /companies/:id` para baja lógica.
- Restringidos ambos endpoints al rol `SUPERADMIN` dentro de la organización `sumaq-system`.
- Protegida `SUMAQ SYSTEM` contra su propia eliminación.
- Creada la pantalla Empresas con tabla responsive, estados vacío/error/éxito, i18n EN/ES y formularios SSR.
- Conservados sin cambios el Dashboard y la línea visual de `DESIGN2.md`.
- Verificado login, render SSR, listado y eliminación temporal; builds de backend y frontend correctos.

### 2026-07-28 — Superadministrador e iconografía

- Sidebar reducido a Dashboard, Empresas y Usuarios del sistema, sin modificar Dashboard.
- Eliminados del menú los módulos aplazados, Recursos UI, Ayuda y Plan Pro; `/recursos` continúa disponible por URL directa.
- Separado conceptualmente el usuario interno de plataforma del administrador perteneciente a un tenant.
- Documentado el cambio de modelo pendiente: alcance plataforma/tenant y organización opcional para usuarios internos.
- Agregados iconos lineales propios del nuevo grupo al set liviano de la aplicación.
- Incorporado `@lucide/svelte` 1.27.0 y catálogo completo de 1.756 iconos en Recursos UI.
- Agregadas búsqueda, carga progresiva, contador, estado vacío y foco visible al catálogo.
- Agregadas traducciones EN/ES para menú y catálogo.
- Creado `.impeccable.md` para fijar que el template y `DESIGN2.md` no se rediseñan.
- Eliminado aviso de hidratación del selector de tema renderizando ambos iconos y alternándolos con el tema CSS.
- Corregido `500 GET /recursos` en desarrollo: `@lucide/svelte` se procesa dentro del pipeline SSR de Vite mediante `ssr.noExternal`.
