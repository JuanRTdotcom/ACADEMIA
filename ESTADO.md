# Sumaq System — Estado del proyecto

> Documento vivo. Qué está hecho y qué falta. Última actualización: 2026-08-06.
> Plataforma educativa (colegios / academia SERUM). Multi-tenant, web + móvil a futuro.

### ✅ UI Planes/Permisos: dropdown, iconos, compactación y marcado responsive (2026-08-06)

- **Lista de planes**: acciones migradas a **menú de 3 puntos** (`DropdownMenu` + `ellipsis`), patrón espejo de roles (Gestionar módulos / Editar / Eliminar). "Gestionar módulos" navega con `window.location.href`.
- **Icono descripción (crear/editar plan)**: usaba `align-left` (no está en el whitelist de `Icon.svelte` → no renderizaba); cambiado a `file-text` (ya whitelisted, mismo que roles).
- **PK de planes a UUID v4 válidos** (migración `20260806210000_plans_valid_uuid_v4`): ver entrada del módulo Planes; corrige el 404 de `plans.notFound` de raíz.
- **Gestionar módulos del plan** y **Permisos de roles** rediseñados compactos (petición: "solo lo necesario, sin adorno"):
  - Quitado: título 32px + descripción + badge de conteo, iconos por módulo, rutas (`code`), contadores por grupo, conectores `└`, tarjetas grandes por grupo, botón guardar flotante.
  - Padding reducido (`py-1.5`), checkbox `size-4`, jerarquía por sangría; botón guardar normal (`flex justify-end`) como en roles.
  - Nombre de módulo en **negrita si está marcado/completo**, normal si no; **títulos de grupo súper negrita** (`font-extrabold`).
- **Marcado responsive**: bloque de checkboxes/switch a la **izquierda en móvil** y a la **derecha en escritorio** (`md:`). Las tablas se convirtieron a **filas flex** con `md:flex-row-reverse` (un solo set de controles); la línea separadora también se adapta (`border-l` móvil / `border-r` escritorio).
- **Frontend UUID regex** (`companies.ts` y `plans/+page.server.ts`): relajado de v4-estricto a cualquier versión, alineado con `ParseUUIDPipe` del backend.
- **Verificado**: `svelte-check` 0/0; 3 planes → `/modules` 200 por SSR con sesión superadmin real.
- **Pendiente**: verificación visual en móvil/escritorio del reordenamiento (no ejecutada por no ingresar credenciales en el navegador). Considerar aplicar el mismo orden responsive a otras tablas si se desea consistencia.

### ✅ Módulo Planes de suscripción (superadmin) + fix 404 gestionar módulos (2026-08-06)

- **Backend `planes`** (Clean Architecture): entity `plan.ts`, datasource `planes-prisma.datasource.ts`, controller `/plans` con CRUD completo: `GET /plans`, `GET /plans/creation-options`, `GET /plans/:id`, `POST`, `PATCH :id`, `PATCH :id/status`, `PATCH :id/modules`, `DELETE :id`. RBAC `superadmin.plans.read|create|update|delete`, throttle, `crearContextoSolicitud`, auditoría en transacción, baja lógica (`eliminado_en`). `actualizarModulos` sincroniza además `organizaciones_modulos` de las orgs con ese plan.
- **BD** migración `20260806173000_add_subscription_plans`: tablas `configuracion.planes` + `configuracion.planes_modulos` (FK cascade), 3 planes semilla (BASIC/PREMIUM/FULL), permisos + asignación a rol `SUPERADMIN`, módulo nav `superadmin.plans`, columna `nucleo.organizaciones.fid_planes` (NOT NULL, default FULL).
- **Frontend** `superadmin/plans` (lista con crear/editar/estado/eliminar) + `superadmin/plans/[id]/modules` (asignar módulos por grupos). Empresas: `general` muestra `plan_nombre`; `superadmin/companies` muestra badge del plan.
- **UX**: acciones de la lista de planes migradas a **menú de 3 puntos** (`DropdownMenu` + `ellipsis`), patrón espejo de roles. "Gestionar módulos" navega con `window.location.href`.
- **🐞 Fix 404 "plans.notFound" al gestionar módulos**: el regex UUID del frontend (`companies.ts` y `plans/+page.server.ts`) exigía **v4 estricto** (`-4xxx-[89ab]xxx-`), pero los planes semilla usan ids no-v4 (`40000000-...`). El backend (`ParseUUIDPipe`) sí los acepta → frontend más estricto que backend rechazaba ids válidos y lanzaba 404 antes de llamar al backend. Regex relajado a UUID de cualquier versión. Afectaba también editar/eliminar planes semilla. Verificado: los 3 planes → modules 200.
- **PK de planes migradas a UUID v4 válidos** (migración `20260806210000_plans_valid_uuid_v4`): los ids semilla pasaron de no-v4 a v4 corrigiendo los nibbles de versión/variante, conservando literales fijos y mnemónicos:
  - BASIC `...-4000-8000-000000000001`, PREMIUM `...002`, FULL `...003`.
  - Se liberaron y recrearon las FKs (`planes_modulos`, `organizaciones`) para actualizar las PK; 8 orgs y `planes_modulos` (20/22/27) repuntados sin pérdida; 0 huérfanos. `@default` de `organizaciones.fid_planes` actualizado al nuevo id de FULL. La creación de empresa fija `fid_planes` explícito, así que no depende del default.
- **Verificado**: `svelte-check` 0/0; `prisma validate` OK; `prisma migrate status` al día (87 migraciones); los 3 planes → `/modules` 200 por SSR con sesión superadmin real.
- **Pendiente**: pruebas E2E de LINEAMIENTOS §10 para el módulo Planes.

### ✅ Aplicación y Validación por Permisos RBAC de Extremo a Extremo (2026-08-05)

- **Backend NestJS (`@Permisos`)**:
  - Decoradores `@Permisos(...)` aplicados en `ControladorUsuarios`, `ControladorEmpresas` y `ControladorRoles`.
  - `GuardiaPermisos` intercepta peticiones en tiempo real contra los permisos del usuario leídos desde PostgreSQL. Ante falta de autorización responde `HTTP 403 Forbidden`.
- **Frontend SvelteKit (SSR Route Protection)**:
  - Guardias de ruta en `+page.server.ts` que validan `tienePermiso(...)`. Si un usuario intenta ingresar a una URL protegida sin el permiso `read`, es redirigido automáticamente a `/dashboard`.
- **Frontend SvelteKit (UI Dinámica)**:
  - `Sidebar.svelte` filtra dinámicamente las opciones del menú de navegación según los permisos `read` otorgados.
  - `UserMenu.svelte` oculta automáticamente la opción de **"Perfil"** en el menú desplegable de la cabecera si el usuario no tiene permisos de lectura sobre ninguna sección del Perfil.
  - Asignados permisos de perfil (`profile.*`) y administración de empresa (`administrator.company.*`) al rol `ADMIN` en la base de datos PostgreSQL (`seed.ts`).
  - **Corrección de Bug de Preferencias Iniciales en Perfil**: Se corrigieron las consultas SQL en `listarSesiones` (`LEFT JOIN` a `preferencias_usuario` con `COALESCE` a `America/Lima`) y `listarActividad` (fallback a `America/Lima` si el usuario aún no ha personalizado su zona horaria). Esto solucionó definitivamente los errores **404 Not Found** en `/profile/sessions` y **400 Bad Request** en `/profile/activity` para usuarios recién creados.
  - **Asignación Limpia de Roles y Permisos**: Los permisos de un usuario dependen 100% de los roles seleccionados al momento de crearlo ([`FuenteDatosUsuariosPrisma.crear`](file:///Users/juanruiz/Documents/proyectos-personales/ACADEMIA/backend/src/usuarios/data/datasources/usuarios-prisma.datasource.ts#L160-L170)), manteniendo el control RBAC limpio y derivado únicamente del catálogo de roles.
  - **Reinicio Administrativo de Contraseñas y Expulsión en Tiempo Real**:
    - Se agregó el botón **"Reiniciar clave"** (icono 🔑) en la tabla de usuarios ([`superadmin/users/+page.svelte`](file:///Users/juanruiz/Documents/proyectos-personales/ACADEMIA/frontend/src/routes/(app)/superadmin/users/+page.svelte)) con un modal que valida las 5 reglas de contraseña segura (longitud, mayúscula, minúscula, número y especial).
    - Al ejecutar el reinicio ([`ControladorUsuarios.reiniciarContrasenia`](file:///Users/juanruiz/Documents/proyectos-personales/ACADEMIA/backend/src/usuarios/presentation/controllers/usuarios.controller.ts) y [`FuenteDatosUsuariosPrisma.reiniciarContrasenia`](file:///Users/juanruiz/Documents/proyectos-personales/ACADEMIA/backend/src/usuarios/data/datasources/usuarios-prisma.datasource.ts)), el backend actualiza el hash de la clave, revoca inmediatamente todas las sesiones activas en la BD, emite el evento SSE `session_revoked` expulsando al usuario si está en línea, y vuelve a registrar la **Acción Requerida** de cambio de contraseña obligatoria para su siguiente inicio de sesión.
  - Vistas de administración ocultan/deshabilitan los botones de **"+ Nuevo"**, **"Editar"**, **"Cambiar Estado"** y **"Eliminar"** si el usuario carece de los permisos `create`, `update` o `delete`.
- **Verificado**: `nest build` 0 errores, `svelte-check` 0 errores / 0 advertencias.

---

### ✅ Matriz Organizada de Permisos por Tabla y Estandarización de Acciones (2026-08-05)

- **Estandarización de 5 Acciones Canónicas**: Permisos estandarizados en 5 columnas principales: `read` (Listar), `create` (Crear), `update` (Editar / Estados / Asignar), `delete` (Eliminar) y `export` (Descargar).
- **Rediseño de la Pantalla de Permisos por Rol (`/superadmin/roles/[id]/permissions`)**:
  - Matriz visual en tabla organizada con 7 columnas: **Módulo**, **Todos**, **Listar**, **Crear**, **Editar**, **Eliminar**, **Descargar**.
  - Mapeo dinámico de permisos por módulo y acción, mostrando checkbox en acciones disponibles e indicador `—` en no aplicables.
  - Switches de alternado "Todos" a nivel de módulo, subgrupo y grupo funcional.
- **Verificado**: `svelte-check` 0 errores / 0 advertencias.

---

### ✅ Correo Institucional Dinámico por Slug de Empresa (2026-08-05)

- **Input Group con Símbolo e Inyección de Slug**: En `Input.svelte` se añadió soporte para el prop `suffix`, renderizando un bloque derecho integrado (`border-l`, `bg-surface`, `font-mono`).
- **Comportamiento en Crear y Editar Usuario (`/superadmin/users/new` y `/superadmin/users/[id]/edit`)**:
  - Al seleccionar una empresa (o cargar la empresa del usuario a editar), se obtiene dinámicamente su `slug` (ej: `colegiorosas`).
  - El campo de correo muestra automáticamente el sufijo `@<slug>.com` (ej: `@colegiorosas.com`).
  - Se restringe la tecla/pegado del carácter `@` dentro del input (`replace(/@/g, '')`), ya que la extensión vive en el extremo derecho.
  - Al guardar, el formulario concatena reactivamente el prefijo ingresado con `@<slug>.com` y lo envía en el campo `correo` al servidor.
- **Backend Nest**: `opciones()` incluye el `slug` en el catálogo de empresas para que el cliente disponga de la extensión exacta sin peticiones adicionales.
- **Verificado**: `svelte-check` 0 errores/0 advertencias y `nest build` 0 errores.

---

### ✅ Usuarios del sistema (2026-08-05)

- Se creó el módulo `Usuarios` con arquitectura `data/domain/presentation` en Nest.
- Rutas API: `GET /users`, `GET /users/creation-options`, `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/status`, `DELETE /users/:id`.
- Alta atómica: Persona + correo institucional principal + Usuario + credencial Argon2id + roles + auditoría, dentro de una transacción.
- Validaciones en front y back: UUID, empresa y roles activos, nombres, usuario alfanumérico (3–12 caracteres max para compatibilidad con DNI/códigos e inicio de sesión), correo, contraseña temporal (8–20 con complejidad), duplicados y campos requeridos.
- Baja lógica: `seguridad.usuarios.eliminado_en/eliminado_por`; editar datos del usuario, modificar su estado (activación o desactivación) o eliminar la cuenta revoca inmediatamente todas las sesiones activas en la tabla `seguridad.sesiones`. La migración protege correos activos únicos por empresa.
- Mutaciones: JWT, anti-CSRF, rate limit de 20/min, actor activo, transacción y auditoría.
- SSR: `/superadmin/users` lista y busca por nombre, usuario, rol o empresa; `/superadmin/users/new` crea en página independiente. Editar, estado y eliminar tienen bloqueo, confirmación y Sonner.
- La antigua ruta española fue reemplazada por `/superadmin/users` para mantener URLs en inglés.
- Verificado: migración aplicada, Prisma generado, `nest build`, `svelte-check` y build SSR correctos.
- Recordatorio: volver a Roles para cerrar autorización real por `@Permisos`, globalidad, normalización de mensajes DTO/UUID y pruebas.

---

### ✅ Catálogo de permisos y vista de selección de roles (2026-08-04)

- Migración `20260804330000_permissions_catalog`: `seguridad.permisos` ahora pertenece a un módulo de `configuracion.modulos` y define una acción; códigos, módulos y acciones viven en PostgreSQL, no en listas hardcodeadas del frontend.
- Se registraron las capacidades actuales: dashboard, superadministración (empresas, usuarios y roles), todas las secciones de Empresa administradora, y cada apartado de Perfil (cuenta, profesional, preferencias e información).
- La llave de cada rol abre `/superadmin/roles/[id]/permissions`. La ruta usa SSR y Nest entrega exclusivamente módulos y permisos activos, junto con las asignaciones actuales del rol.
- La pantalla permite marcar/desmarcar por acción o con «Todo» por módulo **solo en memoria**. No existe endpoint de guardado, no cambian `roles_permisos` y tampoco se activó la autorización por permiso en las rutas todavía.
- La siguiente fase será persistir esa selección de forma transaccional y recién después aplicar los guards por permiso/ruta. El diseño de roles globales y sus límites por tenant queda para esa fase, sin alterar aún los roles actuales por empresa.
- Verificado: migración aplicada, Prisma generado, `nest build` y `svelte-check` correctos.
- La vista agrupa permisos en colapsables semánticos (Sistema, Superadministrador, Administrador, Perfil y Recursos); cada grupo y cada módulo puede marcar todas sus acciones. Iconos del catálogo se limitan al registro real de `Icon.svelte`.
- Jerarquía de permisos ampliada: cada grupo contiene subacordeones semánticos. Por ejemplo, Administrador → Empresa y Perfil → Tu cuenta / Profesional / Preferencias / Información.
- Asignación ya persistente: `PATCH /roles/:id/permissions` valida IDs activos, usuario/tenant/rol activo, sincroniza altas/bajas lógicas en `seguridad.roles_permisos` dentro de una transacción y registra auditoría `roles.permisos_actualizados`. Límite: 20 mutaciones/minuto. La pantalla bloquea Guardar hasta detectar cambios y durante el envío.

---

### ✅ Empresas: borradores, gestión completa y búsqueda SSR (2026-08-03)

- La ruta del frontend se normalizó a inglés: `/superadmin/companies`; navegación, breadcrumb y política de acceso fueron actualizados.
- El listado continúa siendo SSR y protegido en dos capas: `companies.read` en el layout fail-closed y en Nest. La búsqueda sensible a mayúsculas/minúsculas consulta servidor con 250 ms de espera, máximo 30 lecturas/minuto y filtros seguros sobre nombre, slug, razón social, RUC/NIF y correo.
- «Nueva empresa» solo solicita el nombre. Nest genera un slug ASCII único, crea el perfil base y deja la organización como **borrador** (`estado=0`); así no puede ingresar hasta que el superadministrador complete datos y la active.
- La nueva página `/superadmin/companies/[id]` expone todos los campos existentes de `nucleo.organizaciones` y `nucleo.perfil_organizacion`, organizados en Información básica, Contacto y ubicación, Identidad visual, Comunicaciones e Idioma/zona horaria. Permite guardar, activar y desactivar.
- Las mutaciones conservan sesión, permisos específicos, CSRF global, límite 20/minuto, transacciones y auditoría. Edición bloquea la fila y ahora permite limpiar campos opcionales de perfil. La organización propietaria queda protegida también en backend contra edición directa.
- Se corrigió el refresco de datos tras cada mutación mediante `enhance` + `invalidateAll`, y los fallos de refresh SSR vuelven a redirigir a login en lugar de convertirse en 503.
- Verificación: `nest build`, pruebas unitarias existentes 3/3 (6/6), `svelte-check` 0 errores/0 advertencias y build SSR correctos. **Pendiente:** prueba E2E HTTP específica de Empresas; el intento de actualizar Graphify encontró extracción semántica sin proveedor LLM configurado, por lo que el mapa compartido no se pudo regenerar.

---

### ✅ Pestaña renombrada a Claves y acceso (2026-08-02)

- `/profile/account` ahora muestra **Claves y acceso** en menú, breadcrumb y título SSR mediante la clave i18n compartida `profile.tab.authentication`.
- Ruta y lógica de cambio de contraseña no cambiaron.

---

### ✅ Switch de discapacidad en Datos personales (2026-08-02)

- `personas.personas.discapacidad` usa booleano obligatorio con `false` por defecto; la UI lo representa mediante Switch Sí/No.
- Campo alineado en Prisma, DTO Nest, dominio, datasource transaccional, SSR/Superforms, Valibot e i18n EN/ES.
- `Switch.svelte` admite ahora `name` y emite un valor oculto booleano para formularios reales.
- Migración inicial `20260802183000_add_person_disability`, conversión definitiva `20260802184000_person_disability_boolean` y cobertura E2E.

---

### ✅ Menú profesional, estudios y familia + modelo múltiple (2026-08-02)

- Whitelist de iconos corregida: `monitor-smartphone` y nuevos iconos profesionales ya renderizan; validación automática confirmó que ningún icono usado por menú falta.
- Nuevo grupo **PROFESIONAL**: Nacionalidades, Seguros, Teléfonos, Hobbies, Documentos, Estudios y Familia. Breadcrumb e i18n EN/ES incluidos.
- Vistas UI creadas con formularios, tablas vacías, estados responsive y patrón visual existente. Estudios separa realizados y complementarios; Familia queda maqueta hasta definir autorización de apoderado–alumno.
- Migración `20260802182000_person_professional_studies`: crea siete tablas normalizadas. Documento y teléfonos antiguos se conservan mediante migración y luego salen de `personas.personas` para evitar duplicidad.
- Nuevos maestros: `tipos_telefono`, `frecuencias_hobby`, `tipos_estudio_complementario`. Diseño de relación familiar documentado en `database/PERFIL_PROFESIONAL_ESTUDIOS.md`.

---

### ✅ Procedencia y residencia sin campos redundantes de ciudad (2026-08-02)

- Datos personales separa **Procedencia** de **Residencia actual y contacto**. Ya no usa `lugar de nacimiento`, `ciudad_nacimiento` ni `ciudad`: país + Level 3 cubren la ubicación administrativa.
- Cada bloque territorial muestra **País solo en la primera fila**, conservando ancho de 4/12; Level 1, Level 2 opcional y Level 3 aparecen debajo según configuración del país.
- API, DTO, dominio, datasource, Superforms, validación Valibot, traducciones y pruebas E2E quedaron alineados. Migración `20260802180000_remove_person_city_fields` elimina ambas columnas antiguas y `20260802181000_rename_person_origin_fields` cambia los nombres internos de `_nacimiento` a `_procedencia` sin perder país/distrito.

---

## 🔖 CONTINUAR AQUÍ (sesión en curso — para la siguiente IA)

### ✅ Módulo Hobbies completo (backend + frontend) con catálogos en parametros (2026-08-03)

- **Patrón espejo de Nacionalidades/Seguros** (arquitectura hexagonal): entity `hobby-persona.ts`, datasource `hobbies-prisma.datasource.ts`, usecases listar/agregar/eliminar, DTO `agregar-hobby.dto.ts`, repo abstract+impl, controller `GET/POST/DELETE profile/hobbies`, providers en módulo.
- **Maestros en `configuracion.parametros`**: grupo `hobbies` (30 + `otros`) y grupo `frecuencias_hobby` (5). Las migraciones insertan esos datos en PostgreSQL y la aplicación los consulta desde allí; ya no existe una copia TypeScript ni el seed los sincroniza. **Se administran agregando/desactivando filas en `parametros`.**
- **"Otros" → texto libre**: si `codigo_hobby='otros'`, exige `hobby_personalizado` (2..100), y se guarda ese texto en `personas_hobbies.hobby`; si no, guarda la etiqueta del catálogo (ignora texto del cliente). `codigo_frecuencia` guarda el código.
- **Validaciones (LINEAMIENTOS)**: DTO (whitelist/trim/longitudes); en datasource: `bloquearPersona` FOR UPDATE + revalida usuario/tenant/persona activos dentro de la tx; valida `codigo_hobby` y `codigo_frecuencia` contra `parametros` activos (no solo formato); dedup por `(fid_personas, hobby)` con reactivación de soft-deleted; soft-delete en eliminar; `ParseUUIDPipe v4`; rate limit 30/min listar, 20/min mutar; scoping por claims de sesión.
- **Auditoría + eventos**: `PERFIL_HOBBY_AGREGADO`/`PERFIL_HOBBY_ELIMINADO` (visible_actividad=true) vía `registrarConEvento` en la misma transacción.
- **Frontend** `profile/hobbies`: SSR load (catálogos + lista), form select-hobby + input "Otros" condicional + select-frecuencia, `ConfirmationDialog` antes de agregar/eliminar, toasts, estado vacío estilo Familia (via `ProfileCollectionShell`). i18n es/en completo.
- **Verificado**: backend `tsc` + `nest build` OK; `svelte-check` 0/0; migración aplicada (31 hobbies, 5 frecuencias, 2 eventos en DB). **NO** verificado E2E por HTTP (login bloqueado en esta sesión); pendiente prueba real por la ruta y, si se quiere, los tests E2E de LINEAMIENTOS §10.


### ✅ Sesiones: confirmación de cierre + geolocalización IP local (2026-08-02)

- **UI cierre de sesión**: ya no cierra directo. El botón (ahora `variant="primary"`, antes `ghost`/`secondary` que "no se notaba") abre un **diálogo de confirmación** (shadcn Dialog); el botón del modal muestra `loading` mientras cierra. Al cerrar con éxito → `invalidateAll` → la sesión desaparece de la lista.
- **"Cerrar las demás" ELIMINADO** por pedido: front (botón + action `revokeOthers` + i18n `othersClosed`/`revokeAll`) y **backend completo** — endpoint `DELETE /profile/sessions`, `CasoUsoCerrarOtrasSesiones` (archivo borrado), método repo/datasource, provider del módulo. Cero referencias.
- **Info reducida**: la lista ya no muestra IP, versión SO ni versión app. Solo: **dispositivo**, **última actividad**, **inicio**, y **ubicación** (nuevo).
- **Geolocalización por IP, local y actualizable**:
  - Nueva tabla `system.rangos_geo_ip` (migración `20260803030049_geo_ip_ranges`): rangos `inet` (`ip_inicio`/`ip_fin`) → FK a `configuracion.admin_level_0` (país) y `admin_level_1` (región), o `ciudad` libre. CHECK de rango válido y de ubicación presente. **Referencia la jerarquía territorial existente**. Se llena/actualiza fácil (export GeoLite2 → filas, o filas manuales).
  - Función `system.a_inet(text) → inet` (plpgsql, devuelve NULL si no es IP válida) para que la consulta nunca falle con `sesiones.ip` no-IP.
  - `listarSesiones` (SSR) resuelve ubicación en la misma query: IP privada/loopback/LAN → marca `local` (UI muestra i18n "Red local"/"Local network"); IP pública → LATERAL contra `rangos_geo_ip` (rango más específico) + joins a país/región; IP desconocida → sin ubicación. Payload nuevo `ubicacion: { local, ciudad, pais_es, pais_en } | null`.
  - **Probado end-to-end en DB**: `190.234.12.5` → "LIMA, Perú/Peru"; `::1`/`192.168.x` → local; basura → null. En dev las sesiones son `::1` → "Red local".
  - Sembrado 1 rango de ejemplo (190.234.0.0/16 → Lima) como demostración; datos reales via GeoLite2 pendiente.
- **Validaciones cerrar-una**: ya estaban completas (transacción + `FOR UPDATE` + reloj PG + re-check pertenencia usuario+org+activa en la tx + `count===1` + limpia FCM + auditoría con evento). No se puede cerrar la actual.
- **Verificado**: `svelte-check` 0/0, backend `tsc` + `nest build` OK, `prisma migrate status` al día. Snapshot `database/sumaq_system.sql` regenerado (schema-only) con la tabla + función.
- **Pendiente**: poblar `system.rangos_geo_ip` con datos reales (importador GeoLite2). Nota: la IP real del cliente en prod depende de [deploy-client-ip].

### 🚧 Sección Perfil/Ajustes con menú de secciones + tema/idioma funcional (2026-08-01)

> **Estado: solo UI (maqueta)** salvo tema e idioma, que SÍ funcionan. Datos de perfil/seguridad/sesiones/dispositivos/actividad/notificaciones/privacidad son de ejemplo, sin backend aún. Cada sección es una ruta propia lista para recibir su `+page.server.ts`.

- **Entrada al perfil**: ítem **Perfil** agregado al dropdown de `UserMenu.svelte` (arriba, separador, luego «Cerrar sesión») → `goto('/profile')`.
- **Rutas en inglés (regla nueva del usuario)**: TODAS las rutas del front deben ser inglés (anotado en memoria `frontend-english`). Rutas viejas español (`/recursos`, `/superadmin/empresas|usuarios`) quedan pre-existentes; nuevas van inglés.
- **Estructura** (`(app)/profile/`): `+layout.svelte` con **breadcrumb + menú vertical agrupado**; cada tab = ruta hija:
  - **Tu cuenta**: `/profile` (Perfil — datos personales `personas` + avatar con lápiz), `/profile/account` (correo, cambio contraseña, desactivar), `/profile/security` (MFA, códigos, sesiones `sesiones`, dispositivos `dispositivos`), `/profile/privacy` (exportar datos, consentimientos, eliminar cuenta).
  - **Preferencias**: `/profile/appearance` (tema + idioma/región), `/profile/notifications` (switches push), `/profile/activity` (registro `auditoria`, timeline por día).
  - **Información**: `/profile/help` (buscador, FAQ, contacto, feedback), `/profile/legal` (términos, privacidad, normas).
- **Apariencia FUNCIONAL** (no maqueta):
  - **Tema claro/oscuro/sistema**: `theme.svelte.ts` extendido con `mode` (`light`|`dark`|`system`) además de `current` (concreto). Aplica al instante en toda la app + persiste (localStorage + cookie `sumaq-theme` + backend `tema`), igual que el `ThemeToggle` del header. **"system" sigue al SO en vivo** (listener `matchMedia change`) y corrige drift al cargar. Backend/cookie solo guardan concreto → "system" vive en el navegador. Nueva clave `THEME_MODE_STORAGE=academia-theme-mode`. **Migración**: navegadores con tema fijo previo (sin clave de modo) lo conservan como explícito, no saltan a "system". `ThemeToggle` header ahora fija modo explícito.
  - **Idioma**: select cambia al instante vía `i18n.set` (mismo camino que `LanguageSwitcher`).
  - **Región/zona horaria**: catálogos reales desde `system`, carga SSR y persistencia por usuario.
- **Ajuste visual de Apariencia**: la configuración quedó separada en tres `Card` independientes — Tema, Idioma y Región. Idioma conserva aplicación inmediata; Región agrupa país, zona horaria y acciones de guardar/cancelar.
- **Apariencia inicializada desde SSR**: Tema e Idioma toman directamente `data.usuario.preferencias`, que ya llegó desde `/auth/me` en `(app)/+layout.server.ts`; no ejecutan otra petición ni esperan `onMount` para seleccionar sus controles. El layout fija también el idioma global antes de renderizar las páginas hijas. `menu_colapsado` ya nacía desde el mismo contexto SSR. Todo `/profile/*` conserva acceso para cualquier usuario autenticado (`permission:null`).
- **Sincronización única de Tema/Idioma**: Apariencia dejó de mantener copias locales y ahora observa directamente `theme.mode` e `i18n.locale`, los mismos stores usados por los botones del header. Cambiar desde cualquiera de los dos lugares actualiza ambos controles, otras pestañas y encola el mismo `PATCH /preferences`. `tema` admite ahora `light`, `dark` y `system`; el modo exacto se guarda en PostgreSQL y cookie, mientras `sumaq-theme` conserva únicamente el tema concreto previo al pintado.
- **Guard confirmado**: `(app)/+layout.server.ts` valida sesión (cookie → `/auth/me` DB-check + refresh) y `access.ts` fail-closed. `/profile` declarada con `permission:null` (un prefijo cubre todas las hijas).
- **Componentes/infra nueva reutilizable**:
  - `Breadcrumb.svelte` **dinámico**: se arma solo desde `page.url.pathname` (`$app/state`), raíz siempre `/dashboard`. Registrar cada ruta nueva en el export `routeLabels` (path→clave i18n). Uso: `<Breadcrumb />` sin props.
  - `Switch.svelte` (toggle on/off accesible, `role=switch`, bindable).
  - `Card` ganó `padding="none"`.
  - `Icon.svelte` es **whitelist manual** (no lucide completo): se agregaron `pencil, house, phone, badge-check, shield, monitor, smartphone, laptop, log-out, globe, map-pin, x, qr-code, copy, circle-user, download, history, palette, send`. Usar un `name` inexistente no renderiza nada (silencioso).
  - i18n: ~150 claves nuevas `profile.*` (es/en), ~361 total.
- **Verificado**: `svelte-check` **0 errores** (permanece el warning previo del login). NO verificado en navegador (login rechazó credenciales de prueba); tema/idioma usan los caminos ya probados.
- **Pendiente**:
  - Conectar backend por sección (cada `+page.server.ts`: personas, sesiones, dispositivos, auditoría, preferencias).
  - Si se quiere "system" cross-device → agregar `tema:'system'` al backend (hoy solo `light`/`dark`).
  - Región/zona horaria: persistencia completada con referencias UUID a catálogos globales.
  - Limpiar claves i18n viejas sin uso (`profile.account.title`, `profile.eyebrow` de la 1ª versión).

### ✅ Rate limit en logout + silenciado del warning pg (2026-08-01)

- **Rate limit en `/auth/logout`**: agregado `@Throttle({ limit:20, ttl:60s })` por IP, igual que login/refresh. Los 3 flujos de sesión ya tienen límite por IP; login además lockout de cuenta (19→60min), refresh además límite por sesión (`GuardiaLimiteRefresco`). Global 100/min. **Todo el rate limit es in-memory** → multi-instancia necesita Redis (pendiente prod).
- **Warning `DeprecationWarning: Calling client.query() when the client is already executing a query`**: lo emite `pg` 8.22 (usado por Prisma 7 vía `@prisma/adapter-pg`) al pipelinear queries de una transacción interactiva. **Benigno** (no rompe; cambia en pg@9); es de la capa del driver, NO de la lógica (se verificó que todo se awaitea; no reproducible en login/refresh/logout/me/prefs/devices ni 15 logins concurrentes). Node lo muestra una sola vez por proceso. Se silenció SOLO ese mensaje con un filtro puntual en `main.ts` (`process.emitWarning`), sin ocultar otros avisos. **Fix real futuro**: al actualizar `pg`/`@prisma/adapter-pg` se puede quitar el filtro.

### ✅ Página 500 branded + cierre de auditoría del refresh (2026-08-01)

- **Auditoría del refresh cerrada**: el flujo es robusto. Todo problema de sesión (vencida/inválida/revocada/reuso/rate-limit/error backend ALCANZABLE) → **bota limpio al login**, sin cuelgues ni loops. El reintento de `/auth/me` tras un refresh usa `event.cookies.getAll()` (cookies recién rotadas, no las viejas). Refrescos concurrentes → `refreshBackendSession` single-flight (misma rotación, sin falso reuso).
- **Decisión (backend caído / inalcanzable)**: el `fetch` a `/auth/me` en `(app)/+layout.server.ts` lanza (no hay try/catch) → SSR responde **500** y se muestra la **página de error branded**, hasta que el backend se restaure. Es intencional: si el backend no está, ninguna acción corre y el login tampoco funcionaría; mostrar 500 "servicio no disponible" es más honesto que rebotar a un login roto.
- **Página 500 branded como la 404**: el 500 por backend caído renderiza `src/error.html` (la shell), NO `+error.svelte`. Se le agregó copy específico **5xx → "Servicio no disponible / Service unavailable"** (antes usaba genérico); el texto inicial ya no muestra el mensaje de tenant en un 500. `+error.svelte` también quedó branded (logo + número grande + mensaje, con clave `error.serverDown` para 5xx) para errores de navegación client-side. Nuevas claves i18n `error.serverDown.title/body` (en/es).
- **Verificado (SSR curl, backend abajo)**: `GET /dashboard` con cookie → **HTTP 500**, título `500 · Sumaq System`, número `500` grande, mensaje "Servicio no disponible". `svelte-check` en verde.
- **Nota herramienta**: el navegador in-app NO pinta respuestas 500 (pantalla negra); un navegador real sí renderiza la página. No es bug de la app.

### ✅ Sesión de UNA fila + contador de generación (adiós familia) (2026-08-01)

- **Cambio de modelo del refresh**: del modelo append (una fila nueva por cada rotación) a **una sola fila por sesión, rotada in-place**. Motivo: el append hacía crecer `sesiones` (~1.700 filas por 100 usuarios/4h de clase); el estado operativo vive en la propia sesión y solo anomalías como reuso pasan a auditoría.
- **Migración** `20260801000000_single_row_session_generation`: quita `uid_familia_sesion` (+ índice), agrega `generacion INT NOT NULL DEFAULT 0`.
- **Cómo funciona**: `sid` **estable** (NO cambia al rotar; la fila se actualiza). El refresh JWT lleva claim `gen`. En `procesarRefresco`: `gen === generacion` → rota in-place (hash nuevo, `generacion++`, ventanas); `gen === generacion-1` dentro de la gracia → doble-refresh benigno, 401 sin revocar; `gen < generacion` fuera de gracia → **reuso** → revoca la sesión (mata el token vigente del atacante) + audita + SSE; `gen > generacion` imposible → inválido. HMAC del token se sigue verificando (defensa en profundidad, otro secreto).
- **Familia eliminada**: con una fila por login, la fila ES la sesión → el reuso revoca solo esa; sin `uid_familia_sesion` ni `updateMany` por familia. `GuardiaLimiteRefresco` usa `sid` como clave (estable).
- **Consistencia**: `expira_absoluta_en` (cap) NO se toca en la rotación; `dispositivos.ultimo_acceso_en` avanza también al rotar.
- **Crecimiento resuelto**: refresh ya no crea filas → ~100 filas (una por login) vs ~1.700 por 100 usuarios/4h.
- **Archivos actuales**: `prisma/schema.prisma`, `autenticacion/domain/entities/tipos.ts`, `autenticacion/data/datasources/autenticacion-prisma.datasource.ts`, `autenticacion/presentation/controllers/autenticacion.controller.ts` y `presentation/guards/guardia-limite-refresco.ts`.
- **Verificado E2E (API)**: login + refresh×2 → **1 fila, generacion=2**; reuso token gen0 → `401` + `revocada`/`reuso`; refresh con token vigente tras reuso → `401`. La rotación normal no crea auditoría ni evento; el reuso queda una sola vez en auditoría de seguridad.
- **Pendiente prod**: rate limit in-memory (`ThrottlerGuard` + `Map` de `GuardiaLimiteRefresco`) → multi-instancia necesita Redis. Opcional: cron que borre sesiones revocadas/vencidas viejas (ahora crecen solo por login).

### ✅ Replay, rate limit, algoritmo JWT y pruebas E2E (2026-07-31)

- Migración aditiva `20260731233000_refresh_reuse_processed`: `seguridad.sesiones.reuso_detectado_en` marca el primer procesamiento de un refresh rotado reutilizado. Repetir el mismo token responde `401` sin nuevas escrituras ni revocaciones.
- El replay fuera de la gracia de 10 s dejó de revocar globalmente al usuario: ahora revoca únicamente filas activas de `uid_familia_sesion`, audita familia/cantidad y emite SSE dirigido a los `sid` afectados. Un login posterior u otro dispositivo no puede ser cerrado con ese token antiguo.
- Refresh incorpora el claim firmado y estable `familia`. El rate limit secundario usa esa familia aunque cambie `sid`; tokens heredados sin claim usan `sid` una vez y migran automáticamente al rotar.
- Dos capas de límite: `20/minuto/IP` con `@Throttle` antes del JWT y `REFRESH_SESSION_RATE_LIMIT=10` por familia firmada durante `REFRESH_SESSION_RATE_WINDOW_SECONDS=60`. Ambas configuraciones de familia son obligatorias y no tienen fallback. Redis queda para una futura distribución.
- Firma y verificación de access/refresh tienen allowlist explícita `HS256`; un JWT correctamente firmado con `HS384` se rechaza antes de consultar HMAC o sesión.
- La prueba E2E heredada de Hello World fue reemplazada. Resultado: 5/5 unitarias y 10/10 E2E contra PostgreSQL real: HMAC/legado, guardia por familia, rotación, concurrencia `200/401`, rollback de auditoría, inactividad, límite absoluto, replay único/aislado, HMAC incorrecto, HS384, límite por familia y límite por IP. Los dispositivos y auditorías E2E se limpian al finalizar.
- Prisma validate/generate/migrate correctos; migración aplicada y `migrate diff` sin diferencias; ESLint dirigido y build Nest correctos. No se modificaron proxy/despliegue ni dependencias Firebase por decisión del usuario.

### ✅ Refresh migrado de Argon2 a HMAC-SHA-256 (2026-07-31)

- Los refresh tokens, que ya poseen alta entropía, se almacenan como `hmac-sha256:<hex>` mediante el nuevo `ServicioHashTokenRefresco`. Argon2id queda reservado para contraseñas y para leer temporalmente sesiones antiguas.
- Nueva variable obligatoria y sin fallback: `REFRESH_TOKEN_HASH_SECRET`, mínimo 32 caracteres y distinta de ambos secretos JWT. La configuración real recibió una clave aleatoria independiente; el ejemplo solo contiene un marcador.
- Login y cada rotación nueva calculan HMAC-SHA-256 rápido. El refresh ya no ejecuta `argon2.hash()` mientras mantiene `FOR UPDATE`, reduciendo el tiempo de lock, conexión y transacción.
- Compatibilidad segura: si una sesión existente contiene `$argon2...`, se verifica con el método anterior una vez; la rotación sucesora queda automáticamente en HMAC. Formatos desconocidos se rechazan.
- Comparación HMAC en tiempo constante mediante `timingSafeEqual`. Se añadieron pruebas unitarias para creación, token incorrecto y compatibilidad Argon2.
- Verificación: 3/3 pruebas unitarias correctas, build Nest correcto y arranque completo con DI/configuración en puerto temporal `3100`; el proceso temporal fue cerrado.

### ✅ Política temporal ajustada a uso educativo (2026-07-31)

- Política acordada y aplicada mediante variables obligatorias: access `15 minutos`, inactividad deslizante `120 minutos`, refresh rotativo `12 horas` y límite absoluto `30 días`.
- `JWT_REFRESH_TTL_DAYS` fue reemplazada por `JWT_REFRESH_TTL_HOURS`; PostgreSQL calcula la expiración con `CURRENT_TIMESTAMP + INTERVAL '1 hour'`, sin depender del reloj de Node.
- Cada refresh válido recibe nuevamente 12 horas, sin superar `expira_absoluta_en`. Dos horas sin una petición autenticada invalidan la sesión aunque la cookie de refresh todavía exista.
- Backend y frontend SSR quedaron alineados: `JWT_REFRESH_TTL_HOURS=12`, `SESSION_IDLE_TTL_MINUTES=120` y `REFRESH_TOKEN_TTL=43200` segundos. No existen valores predeterminados.
- Verificación: build Nest correcto; `svelte-check` con 0 errores y el warning previo del login; build SSR/frontend correcto.

### ✅ Refresh transaccional + sesión deslizante por actividad (2026-07-31)

- **Comportamiento tipo CodeIgniter:** toda petición protegida válida registra actividad y renueva `expira_inactividad_en`. Si el usuario no hace nada durante la ventana configurada, la siguiente evaluación falla y SvelteKit limpia cookies/redirige a `/login`; no requiere cron ni temporizador del navegador.
- Configuración obligatoria, sin defaults ocultos: `SESSION_IDLE_TTL_MINUTES=120`, `SESSION_ABSOLUTE_TTL_DAYS=30` y `REFRESH_REUSE_GRACE_SECONDS=10`. Access (`15 min`) y refresh rotativo (`12 horas`) conservan variables separadas. Cambiar la política solo requiere modificar env y reiniciar.
- Migraciones `20260731213000_session_rotation_and_idle_timeout`, `20260731214500_align_session_family_default` y `20260731233000_refresh_reuse_processed`: `seguridad.sesiones` incorpora familia, actividad, ventanas, rotación y marcador de reuso, con índices para familia e inactividad.
- PostgreSQL sigue siendo la única autoridad temporal: login, actividad, inactividad, límite absoluto, gracia de reuso, `iat` y `exp` usan `CURRENT_TIMESTAMP`/intervalos dentro de `ServicioRelojBaseDatos` o SQL transaccional. Node no decide horas.
- Refresh endurecido: HMAC-SHA-256 se verifica antes de bloquear (Argon2 solo para sesiones heredadas); luego `SELECT ... FOR UPDATE` serializa el `sid`. Revalidación, revocación de la sesión anterior, creación de la sucesora y auditoría ocurren en una transacción. Si cualquier paso falla, el refresh anterior continúa vigente y no queda una sesión huérfana.
- Cada rotación conserva la misma familia, dispositivo, `iniciada_en` y techo `expira_absoluta_en`; genera `sid`, access, refresh y hash nuevos. La sesión puede deslizarse por actividad, pero jamás pasar el límite absoluto.
- Reuso: una repetición inmediata dentro de 10 s responde `401` sin crear otra sucesora ni cerrar sesiones; fuera de esa gracia, el primer reuso marca `reuso_detectado_en`, revoca solo la familia comprometida, audita y emite SSE dirigido. Repeticiones posteriores no tienen efectos.
- SvelteKit incorpora single-flight en memoria por refresh token: dos cargas SSR/pestañas simultáneas de esta instancia realizan una sola llamada backend, copian la misma cookie rotada y ambas continúan. Al distribuir SvelteKit en varias instancias, este coordinador deberá pasar a Redis; el bloqueo PostgreSQL ya evita dos sucesoras en backend.
- Pruebas reales, con dispositivos temporales eliminados al finalizar: rotación `200`, replay inmediato `401`, 2 filas/1 activa/misma familia e inicio; dos SSR simultáneos `200/200`, misma cookie y una rotación; concurrencia directa backend `200/401`, una sucesora; inactividad vencida → `303 /login`; límite absoluto vencido → `401`; actividad `/auth/me` extendió correctamente la ventana.
- Verificación: Prisma validate/generate/migrate, `migrate diff` sin diferencias, ESLint dirigido, build Nest, `svelte-check` (0 errores; warning previo del login) y build frontend correctos.
- **Pendiente visual separado:** revisar en navegador el dropdown con preset Mira/radio small; no forma parte del refresh.

### ✅ Logout sin navegación duplicada + estado de carga (2026-07-31)

- `POST /logout` de SvelteKit ahora responde `204 No Content`: Nest revoca la sesión y SvelteKit limpia cookies, pero el endpoint ya no emite un `303`. El cliente realiza una única navegación a `/login`, eliminando la redirección/carga duplicada que hacía perceptible la demora.
- `cerrarSesionLocal()` comparte una sola promesa de cierre. Doble clic, botón y evento SSE simultáneo reutilizan el mismo trabajo: no se repiten el POST, el broadcast ni `goto()`.
- El ítem «Cerrar sesión» permanece abierto mientras procesa, cambia a spinner + «Cerrando sesión…», expone `aria-busy` y queda deshabilitado junto con el trigger hasta terminar.
- `components.json` quedó configurado con estilo oficial `mira`, iconos Lucide y menú `default/subtle`. Los siete componentes shadcn ya presentes se reinstalaron desde el registry con esa configuración (no quedó como ajuste solo para componentes futuros).
- El radio `small` oficial (`0.45rem`) se aplica solo a componentes shadcn por `data-slot`, conservando la geometría y colores propios del template Sumaq. Corrección posterior: la sobreescritura usa `--r-*` (los tokens que realmente consume `app.css`), no `--radius-*`; la primera versión compilaba pero no cambiaba visualmente el radio.
- Verificación: `svelte-check` y build frontend correctos.

### ✅ Menú de usuario migrado a dropdown shadcn-svelte (2026-07-31)

- El componente se instaló/reinstaló realmente desde el registry oficial con `npx shadcn-svelte@latest add dropdown-menu --overwrite --yes` (CLI v1.4.2). Los archivos generados bajo `src/lib/components/ui/dropdown-menu/` quedaron intactos.
- **Reinstalación completa solicitada:** dependencias actuales verificadas/reinstaladas: Tailwind CSS `4.3.3`, `@tailwindcss/vite 4.3.3`, shadcn-svelte CLI `1.4.2`, `tw-animate-css 1.4.0`, `bits-ui 2.18.1`, `tailwind-variants 3.3.0`, `tailwind-merge 3.6.0`, `clsx 2.1.1` y Lucide Svelte `1.28.0`. Las dependencias de build/UI quedaron correctamente en `devDependencies`.
- **Corrección de animaciones oficiales:** faltaba la dependencia global `tw-animate-css`, requerida por shadcn-svelte con Tailwind v4. Se instaló como devDependency y se importó justo después de Tailwind en `app.css`. Ahora funcionan las clases que ya traía el componente: `animate-in/out`, `fade-in/out`, `zoom-in/out` y `slide-in` según el lado.
- **Causa raíz adicional encontrada en runtime:** el registry genera clases `data-open:*` / `data-closed:*`, mientras Bits UI 2.18 emite `data-state="open|closed"`. Sin configuración, Tailwind produjo selectores `[data-open]` que nunca coincidían; el navegador confirmó `animation-name: none` y `duration: 0s`. Se agregaron en `app.css` las variantes puente `@custom-variant data-open (&[data-state='open'])` y `data-closed`; no se editaron componentes oficiales. Tras corregirlo, navegador confirmó `animation-name: enter` y `duration: 0.1s`; build genera también `animation: exit` para `data-state=closed`.
- `UserMenu.svelte` dejó de implementar manualmente apertura, clic exterior y tecla Escape. Ahora usa únicamente `DropdownMenu.Root`, `Trigger`, `Content` e `Item` del componente oficial instalado.
- Se mantuvo intacta la línea visual y el contenido anterior: avatar, nombre y rol permanecen en el botón; al desplegar solo aparece «Cerrar sesión». El contenido abre alineado al extremo derecho mediante el portal accesible de `bits-ui`.
- `UserMenu` no sobrescribe tamaño, padding, radio, sombra, borde ni estados del panel/ítem. Solo indica `align="end"`; colores claro/oscuro vienen del mapeo global `shadcn-theme.css` hacia tokens Sumaq.
- El componente ahora aporta manejo estándar de foco, navegación por teclado, cierre automático, atributos ARIA y estado `expanded` sin código artesanal.
- Logout continúa usando `cerrarSesionLocal()`, incluida la revocación backend, limpieza de cookies, sincronización entre pestañas y redirección.
- **Verificado:** `svelte-check` sin errores (permanece solo el warning previo del login), build correcto y CSS final contiene `@keyframes enter/exit` junto con todas las reglas `data-open`/`data-closed` oficiales. Navegador real: trigger accesible y acción «Cerrar sesión» reconocida como `menuitem`.
- Se reinició Vite tras cambiar lockfile; cliente y SSR reoptimizaron dependencias. El servidor nuevo quedó escuchando en `5173` y el dashboard respondió correctamente después del reinicio.

### ✅ Prueba del menú de usuario con Menubar shadcn-svelte (2026-07-31)

- Instalado desde registry oficial con `npx shadcn-svelte@latest add menubar --overwrite --yes`.
- Se probó temporalmente `Menubar.Root/Menu/Trigger/Content/Item`, pero se descartó: Menubar está orientado a barras persistentes de comandos, no al menú puntual de una cuenta. Además, el componente generado solo anima entrada, no salida.
- `UserMenu.svelte` quedó restaurado a `DropdownMenu.Root/Trigger/Content/Item`, manteniendo trigger actual con avatar/nombre/rol y única acción «Cerrar sesión».
- El wrapper visual del Menubar se neutraliza mediante props (`border-0`, fondo transparente y sin padding), sin editar archivos generados. El panel conserva animación oficial `fade + zoom + slide` y origen de transformación provisto por Bits UI.
- Se agregó el token faltante `--color-muted: var(--surface)` en `shadcn-theme.css`; el estado abierto del trigger usa ahora la superficie Sumaq en lugar del gris neutral de shadcn.
- La prueba de Menubar pasó `svelte-check`, build y navegador, pero el resultado visual no fue el esperado. Estado final verificado nuevamente con DropdownMenu: trigger accesible, panel `menu` y «Cerrar sesión» como `menuitem`.

### ✅ Contexto de usuario SSR + autorización vigente + preferencia del menú (2026-07-31)

- Nueva migración aplicada `20260731181000_user_sidebar_preference`: agregó `menu_colapsado BOOLEAN NOT NULL DEFAULT false` sin borrar datos; la tabla vive actualmente en `seguridad.preferencias_usuario`.
- **Login y `/auth/me` comparten el mismo contrato seguro:** `id_usuarios`, `fid_organizaciones`, `correo`, `persona`, `organizacion`, `roles`, `permisos` y `preferencias`. Nunca exponen hashes, tokens, intentos, bloqueos ni credenciales.
- Nuevo `ServicioContextoUsuario`: una selección Prisma reutilizada filtra cuenta, tenant, asignaciones, roles y permisos activos, y construye el contexto seguro. Login lo devuelve desde el primer ingreso; refresh lo vuelve a cargar.
- `EstrategiaAcceso` ya no confía en roles/permisos mutables del JWT. En **cada petición protegida** consulta sesión + dispositivo + cuenta + organización + RBAC vigente en PostgreSQL y reemplaza los claims antes de ejecutar `GuardiaRoles` / `GuardiaPermisos`. Retirar un permiso tiene efecto sin esperar el vencimiento del access token.
- El layout SSR `(app)/+layout.server.ts` llama `/auth/me` en cada carga, devuelve `{ usuario }` completo a todas las páginas y, si rota el refresh, repite `/auth/me` con las cookies nuevas antes de renderizar.
- Nuevo `config/access.ts`: toda ruta del grupo privado declara permiso o acceso solo autenticado. Política **fail-closed**: una página nueva no registrada responde 403. Actualmente: dashboard/recursos = autenticado; empresas = `companies.read`; usuarios del sistema = `systemUsers.read`.
- El menú visual filtra enlaces con los permisos actuales; esto es UX. La seguridad real sigue duplicada correctamente en SSR y en los controladores/guardias de Nest.
- `menu_colapsado` nace desde los datos SSR, sin salto al hidratar. Solo el menú desktop se persiste; el drawer móvil sigue siendo estado temporal. Cambia de forma optimista, se guarda por la misma cola de preferencias y se sincroniza entre pestañas mediante `sumaq-menu-collapsed`.
- El action de login lee el contexto devuelto y fija cookies de tema/idioma **antes** del redirect; el dashboard ya realiza el primer pintado con las preferencias de la cuenta.
- **Verificado:** migración aplicada; Nest build + ESLint sin errores; `svelte-check` 0 errores (warning previo del login); frontend build correcto. Contrato real login/me: 8 bloques de contexto, 1 rol, 6 permisos y `{ tema, idioma, menu_colapsado }`. Menú: abierto → colapsado → recarga siguió colapsado; dos pestañas cambiaron juntas; se restauró abierto al terminar y PostgreSQL confirmó `menu_colapsado=false`.

### ✅ Tema e idioma persistidos como preferencias de usuario (2026-07-31)

- **Preferencias activas actualmente:** `tema` (`light`/`dark`), `idioma` (`en`/`es`) y `menu_colapsado` (boolean). `zona_horaria`, `formato_fecha` y `notificaciones` siguen reservadas, sin controles ni lógica de usuario.
- Backend: nuevo feature `src/preferencias/` con `GET /preferences` y `PATCH /preferences`, ambos protegidos por la sesión global. El PATCH es parcial, valida valores cerrados y hace `upsert` sobre `seguridad.preferencias_usuario`; el primer cambio crea la fila y los siguientes la actualizan sin tocar las demás columnas.
- `/auth/me` devuelve el contexto completo, incluido `{ preferencias: { tema, idioma, menu_colapsado } }`, permitiendo restaurarlas al entrar desde otro navegador o dispositivo.
- Frontend: `preferences-client.ts` implementa guardado **optimista**. La preferencia cambia inmediatamente; 200 ms después se guarda en segundo plano. La cola agrupa cambios rápidos y serializa peticiones para que una respuesta lenta nunca reemplace una elección nueva.
- Tolerancia de red: hasta 3 intentos controlados, reanudación al volver `online` y `keepalive` al cerrar la pestaña. No hay reintentos infinitos ni espera visible para el usuario.
- Nuevo proxy same-origin `PATCH /preferences`: SvelteKit adjunta cookies HttpOnly, tenant y cabecera anti-CSRF antes de llamar a Nest.
- El tema tiene ahora cookie SSR `sumaq-theme`; el script previo al primer pintado la prioriza sobre `localStorage`, manteniendo la carga sin parpadeo. La cookie `sumaq-locale` continúa siendo la autoridad SSR del idioma.
- El idioma mutable de la cookie se reenvía al API como `Accept-Language`. El backend lo prioriza y usa el claim del JWT solo como respaldo, evitando que los mensajes queden en el idioma que tenía el usuario al emitir el token.
- **Verificado:** Nest build + ESLint sin errores; `svelte-check` con 0 errores y el warning previo del login; frontend build correcto. Navegador con 2 pestañas: ambas quedaron `dark/en`; PostgreSQL confirmó `preferencias_usuario = { tema: "dark", idioma: "en" }`; la recarga conservó ambos valores.

### ✅ Idioma sincronizado entre pestañas (2026-07-31)

- El i18n conserva la cookie `sumaq-locale` como autoridad del idioma SSR sin parpadeo.
- Al cambiar EN/ES también escribe una señal `sumaq-locale-sync` en `localStorage`; el evento `storage` actualiza inmediatamente el estado reactivo y `<html lang>` de las otras pestañas del mismo navegador y origen.
- La pestaña receptora no vuelve a escribir cookie ni `localStorage`, evitando bucles entre pestañas.

### ✅ Tema sincronizado entre pestañas (2026-07-31)

- El store de tema escucha el evento nativo `storage` para la clave `academia-theme`.
- Cambiar claro/oscuro en una pestaña actualiza inmediatamente `data-theme` y el estado reactivo de las demás pestañas del mismo navegador y origen, sin recargar.
- La pestaña receptora no vuelve a escribir `localStorage`, evitando eventos redundantes o bucles; la persistencia y el inicio sin parpadeo continúan iguales.

### ✅ 404 de rutas alineado con el 404 de tenant (2026-07-31)

- Una URL inexistente ya no usa la variante de error con header, selectores e icono. `+error.svelte` replica el mismo shell centrado de `error.html`: isotipo, código grande, título y descripción.
- Se conserva el significado correcto: tenant inválido muestra «Organización no encontrada» y una ruta inexistente muestra «Página no encontrada», con nuevas claves i18n EN/ES.
- `+error.svelte` replica también las medidas, tipografía y paleta autónoma de `error.html`, responsive y en claro/oscuro; no se modificó el template de la aplicación.

### ✅ Prisma global único + tenant sin cache (2026-07-31)

- Nuevo `ModuloPrisma` global en `backend/src/comun/prisma.module.ts`: registra y exporta una sola instancia de `PrismaService` para toda la aplicación.
- `ModuloAplicacion` importa `ModuloPrisma` una vez. Auth, empresas, dispositivos, inquilinos, reloj de base de datos, auditoría y push ya no vuelven a declarar `PrismaService`; se evitan clientes y pools PostgreSQL duplicados.
- La validación SSR del tenant eliminó por completo `tenantCache`, el TTL y el `Map`: cada carga completa consulta `GET /tenants/current` y refleja inmediatamente una activación o desactivación.
- Validación fail-closed: `200` permite continuar, `404` muestra organización inexistente y cualquier error distinto se propaga como fallo de la página; el host no entra si la API no pudo validarlo.
- Verificado: TypeScript y ESLint backend sin errores; `svelte-check` con 0 errores y el warning previo del login; `admin.localhost` responde 200 y un tenant inexistente responde 404.

### ✅ shadcn-svelte instalado como librería base de componentes (2026-07-31)

- **REGLA NUEVA (usuario):** construir UI nueva sobre **shadcn-svelte**; NO crear componentes a mano ni tocar los componentes/páginas existentes salvo que el usuario lo pida. `npx shadcn-svelte@latest add <componente>` para sumar.
- Instalado shadcn-svelte v1.4 + `bits-ui`, `tailwind-variants`, `clsx`, `tailwind-merge`. `components.json` en `frontend/` (aliases: ui=`$lib/components/ui`, utils=`$lib/utils`). El CLI `init` no se usó (pide un "preset" codificado y quiere reescribir app.css) → se configuró manual.
- Componentes base en `src/lib/components/ui/`: **button, input, label, card, dropdown-menu, dialog**.
- **On-brand sin rediseñar:** [shadcn-theme.css](frontend/src/lib/styles/shadcn-theme.css) mapea tokens semánticos de shadcn (`background`, `foreground`, `primary-foreground`, `secondary`, `muted-foreground`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover`) → paleta Academia (tokens.css). Heredan el look Notion y cambian con `data-theme`. Importado en app.css (+1 línea).
- **Fix clave:** `vite.config.ts` → `ssr.noExternal: ['@lucide/svelte', 'bits-ui']`. Sin `bits-ui` ahí, Node fallaba en SSR al cargar los `.svelte` de bits-ui (`ERR_UNKNOWN_FILE_EXTENSION .svelte`) → 500 en cualquier página que use un componente con bits-ui (label/dropdown/dialog). Mismo motivo por el que Lucide ya estaba ahí.
- Se creó `src/lib/utils.ts` (`cn` + `WithElementRef`) que el CLI `add` no generó.
- **Verificado en navegador:** button (todas las variantes), card, input, label, dropdown — on-brand, light/dark. Build + `svelte-check` en verde. Solo se tocó: app.css (+import), vite.config (noExternal). Ningún componente/página existente modificado.

### ✅ Revocación de sesión en 3 capas: /me, BroadcastChannel, SSE (2026-07-31)

**Problema resuelto:** estando en el dashboard, si la sesión se borraba/revocaba, el usuario NO era botado (el front solo checaba presencia de cookie; el access token stateless valía ~15min).

**Capa 1 — Access token consciente de la sesión** ([estrategia-acceso.ts](backend/src/autenticacion/presentation/strategies/estrategia-acceso.ts)):

- `EstrategiaAcceso.validate` consulta en una sola operación sesión, dispositivo, cuenta, tenant y RBAC activo. Logout/revocación y cambios de roles/permisos surten efecto en la siguiente petición protegida.
- Front ([(app)/+layout.server.ts](<frontend/src/routes/(app)/+layout.server.ts>)): en cada carga llama `/auth/me`. 401 → intenta 1 refresh; si funciona, repite `/auth/me` con cookies nuevas antes de continuar; si falla, limpia cookies y va a login.

**Capa 2 — BroadcastChannel (pestañas mismo navegador)** ([auth-channel.ts](frontend/src/lib/auth-channel.ts), [session-client.ts](frontend/src/lib/session-client.ts)):

- Canal `sumaq-auth`. Logout en una pestaña → las demás van a login; login en una → las que están en login van al dashboard.
- **Bug clave resuelto (orden):** el broadcast debe ir DESPUÉS de que `/logout` limpie las cookies (compartidas entre pestañas); si va antes, la otra pestaña navega a /login con la cookie aún puesta y rebota al dashboard. `cerrarSesionLocal()` hace fetch /logout → broadcast → goto.
- Enviar usa un `BroadcastChannel` fresco por mensaje (el singleton se despachaba mal al navegar). Emisores: logout en [UserMenu.svelte](frontend/src/lib/components/layout/UserMenu.svelte) y `onResult` (redirect) del login. Solo cubre mismo navegador; es UX, no seguridad.

**Capa 3 — SSE desde Nest (cross-device, instantáneo)**:

- Bus en memoria [servicio-eventos-sesion.ts](backend/src/comun/eventos-sesion/servicio-eventos-sesion.ts) (RxJS Subject, módulo `@Global`). Endpoint `@Sse('auth/events')` en [autenticacion.controller.ts](backend/src/autenticacion/presentation/controllers/autenticacion.controller.ts): stream del usuario autenticado, filtra por `sub` + `sid`, ping keep-alive 25s.
- **Heartbeat como evento CON nombre** (`event: ping`, `MessageEvent {type:'ping'}`) → el `onmessage` del cliente NO lo recibe (solo dispara para eventos sin nombre) → sin parseo de pings. Es como lo hacen las grandes (heartbeat invisible); alternativa equivalente es el comentario SSE `:\n\n`. `session_revoked` va como evento por defecto para que `onmessage` sí lo capte.
- Emite `session_revoked` en `revocarTodasLasSesiones` (sin sid → todos los dispositivos: robo de token / cerrar-en-todos) y en `cerrarSesion` (con sid → esa sesión).
- Proxy [auth/stream/+server.ts](frontend/src/routes/auth/stream/+server.ts): el navegador (EventSource) se conecta same-origin (cookies viven en el front), SvelteKit reenvía a Nest con las cookies. Cliente en [(app)/+layout.svelte](<frontend/src/routes/(app)/+layout.svelte>) → `session_revoked` → `cerrarSesionLocal()`.
- **Alcance:** SSE dispara solo cuando la revocación pasa POR el backend. Un DELETE crudo en DB (método de prueba manual) NO lo dispara → para eso queda la Capa 1 en navegación. Consumidor natural: futura pantalla de gestión de sesiones / "cerrar en todos".
- **NO se usó FCM:** en web exige permiso de notificaciones (getToken lo requiere) — se decidió no pedir permiso. FCM queda para app móvil o cuando haya notificaciones reales. Ver [[push-and-devices]].
- **Prod SSE:** costo bajo (500 conexiones ≈ 15-25MB, ~0 CPU idle). Config: `proxy_buffering off` + timeouts altos en nginx/CF, subir ulimit `nofile`. Multi-instancia → cambiar el Subject por Redis pub/sub (los llamadores no cambian). Serverless/edge no sirve para SSE.

**Verificado en navegador (2 pestañas):** boot-on-revoke al navegar; login/logout sync entre pestañas; SSE probado aislado (`fetch('/logout')` desde consola, sin broadcast, botó la pestaña → puro SSE). Backend build + `svelte-check` sin errores.

### ✅ Logout afecta todas las tablas + endurecimiento login (2026-07-31)

- **Logout** ([autenticacion-prisma.service.ts](backend/src/autenticacion/data/datasources/autenticacion-prisma.datasource.ts) `cerrarSesion`): en una transacción revoca `sesiones.revocada_en`, limpia `dispositivos.firebase_token_fcm`, audita y emite SSE tras confirmar.
- **Login (cerrado):** `@MaxLength` en correo (254) y contraseña (128) alineado front+DTO; regex de contraseña sin el mínimo (lo impone `@MinLength(8)`); estado de cuenta chequeado ANTES del contador de intentos (cuenta inactiva ya no acumula fallos); mensaje `invalidCredentials` orientado al usuario en los 4 archivos i18n (back+front). Parser host→slug extraído a `comun/inquilinos/resolver-host` y reusado por login.
- **IP del cliente:** SvelteKit reenvía `X-Forwarded-For` con `getClientAddress()`; `trust proxy=1` en Nest la lee. En dev llega `::1` (loopback = correcto). Prod pendiente: [deploy-client-ip].

### ✅ Validación de tenant por subdomain + 404 branded (2026-07-31)

- Un subdomain **no registrado/inactivo** ya no muestra el login: se valida al cargar cualquier ruta y se responde **404**. Decisión: existencia de organización NO es secreta (estándar SaaS: Slack/Canvas/Blackboard); la enumeración de USUARIOS sigue protegida por el `401` uniforme del login.
- **Backend**: nuevo feature `inquilinos/` con `GET /tenants/current` (`@Publico`, GET → sin CSRF). Resuelve el tenant desde `X-Forwarded-Host` y responde `200 {slug,nombre}` o `404 tenant.notFound`. Parser host→slug extraído a `comun/inquilinos/resolver-host.ts` (`resolverSubdomain`), reutilizado por el login (auth ya no duplica el parseo). i18n `tenant.notFound` en en/es.
- **Frontend**: guard en `+layout.server.ts` (raíz) vía `$lib/server/tenant.ts` (`tenantRegistrado`), sin cache y con validación en cada carga SSR. Es fail-closed: si el backend no puede validar, la ruta no continúa. Si el tenant no existe → `redirect` a `TENANT_NOT_FOUND_URL` (env opcional nueva) o, si está vacía, **404**.
- **Página 404**: se usa `src/error.html` (shell branded, theme-aware, ES/EN por navegador) porque un error en el load del layout raíz NO lo captura `+error.svelte` (necesita boundary padre) → SvelteKit usa la plantilla shell. `+error.svelte` queda para errores de navegación in-app. Icono `alert-triangle` agregado a `Icon.svelte`.
- **Verificado en navegador**: `admin.localhost` → app normal; `admininistrador.localhost` (typo) y raíz sin subdomain → 404 branded en español. API: válido `200`, typo `404`, raíz `404`. Backend build + `svelte-check` sin errores nuevos.
- **Pendiente prod**: si `getClientAddress` no da la IP real, ver [deploy-client-ip]. Definir `TENANT_NOT_FOUND_URL` cuando exista la landing.

### ✅ Respuesta uniforme del login para organizaciones (2026-07-31)

- Todo fallo de autenticación devuelve ahora el mismo `401 auth.invalidCredentials`: tenant ausente, organización inexistente/inactiva, usuario inexistente, contraseña incorrecta, cuenta bloqueada o inactiva.
- El cliente solo recibe «Credenciales inválidas»; el motivo real sigue guardándose exclusivamente en auditoría como `organizacion_invalida`, `usuario_inexistente`, `contrasenia_invalida`, `cuenta_bloqueada` o `cuenta_inactiva`.
- Las ramas de organización ejecutan la verificación Argon2 señuelo antes del rechazo, reduciendo diferencias temporales que permitirían enumerar tenants.
- `rechazarIngreso()` ya no acepta un código público alternativo: el contrato uniforme queda impuesto por el propio helper y no depende de que cada llamada recuerde usarlo.
- Se retiraron las traducciones de organización específicas que el login ya no expone. Verificado con build de Nest, Prettier y ESLint dirigido sin errores.

### ✅ PostgreSQL como única autoridad temporal (2026-07-31)

- Regla global: el backend y el seed ya no usan `new Date()` ni `Date.now()` para persistir o validar tiempos del dominio.
- Todos los instantes de los cinco esquemas se migraron de `timestamp without time zone` a `timestamptz(3)`; `fecha_nacimiento` se corrigió a `date`.
- `created_at` nace del `CURRENT_TIMESTAMP` de PostgreSQL. Se eliminó Prisma `@updatedAt`; los 23 `updated_at` se mantienen mediante el trigger `configuracion.establecer_updated_at()`.
- Nuevo servicio global `ServicioRelojBaseDatos`: entrega hora actual, ventanas de access/refresh y validación de expiración desde PostgreSQL.
- JWT access/refresh recibe `iat` y `exp` derivados de PostgreSQL. Passport usa `ignoreExpiration: true` únicamente porque ambas estrategias verifican `exp` contra PostgreSQL; no usan reloj local de Nest.
- Bloqueos, vencimientos de sesión, `ultimo_acceso_en`, revocaciones, refresh, logout y `correo_verificado_en` del seed usan tiempos originados en PostgreSQL.
- Migración aplicada: `20260731083000_database_clock_timestamps`. Prisma/schema y snapshot SQL actualizados.
- Verificación: 56 columnas temporales son `timestamp with time zone`, existen 23 triggers; login, `/auth/me`, refresh y logout respondieron `200` usando validación temporal de base.

### ✅ Anti-enumeración temporal para cuentas bloqueadas (2026-07-31)

- El rechazo de una cuenta con `bloqueado_hasta` vigente ahora ejecuta `gastarTiempoVerificacion()` contra el hash Argon2 señuelo antes de responder.
- Conserva el mismo `401 auth.invalidCredentials` y el motivo real `cuenta_bloqueada` únicamente en auditoría.
- Evita que el estado bloqueado sea distinguible porque antes respondía sin pagar el coste de Argon2.
- PostgreSQL es ahora la autoridad temporal del bloqueo: `tieneBloqueoVigente()` compara contra `CURRENT_TIMESTAMP`; ya no se compara `bloqueado_hasta` con `new Date()` de Nest.
- La transacción de intento fallido obtiene `ahora_base` desde PostgreSQL para calcular vencimiento y nuevo `bloqueado_hasta`.
- La transacción de login bloquea la fila con `FOR UPDATE` y vuelve a comprobar estado y bloqueo con el reloj de PostgreSQL antes de limpiar el contador y crear la sesión. Esto evita una carrera entre la validación inicial y la creación de sesión.

### ✅ Registro del cliente sin solicitar notificaciones (2026-07-31)

- Columnas Firebase renombradas para quedar agrupadas y explícitas: `firebase_id_instalacion` y `firebase_token_fcm`. Migración aplicada: `20260731070000_rename_firebase_columns`; Prisma, backend, frontend y snapshot SQL alineados.
- Se corrigió la confusión entre Firebase Installation ID y token FCM. Al cargar el área autenticada se obtiene el **Firebase Installation ID (FID)** sin usar la API de notificaciones y se registra en `seguridad.dispositivos.firebase_id_instalacion`.
- Se eliminó la ejecución automática de `Notification.requestPermission()` y `getToken()`. `firebase_token_fcm` queda `NULL`; en el futuro solo se llenará cuando el usuario active explícitamente las notificaciones y conceda permiso.
- El cliente registra `tipo_dispositivo`, `modelo` cuando el navegador lo revela, `version_so` y `version_app`. En web el modelo físico puede no estar disponible por restricciones del navegador; se guarda `NULL`, nunca un dato inventado.
- Nuevo endpoint autenticado `POST /devices/client-info`; actualiza exclusivamente el dispositivo asociado al usuario y al `device_id` httpOnly actual. No crea dispositivos ni modifica tokens push.
- SvelteKit reenvía el `User-Agent` real hacia Nest, evitando que las sesiones queden registradas con el agente del proceso Node.
- Migración aplicada: `20260731063000_client_installation_metadata`. Snapshot `database/sumaq_system.sql` actualizado.
- Configuración añadida: `PUBLIC_APP_VERSION` obligatoria en el frontend. Build backend y `svelte-check`/build frontend correctos; permanece únicamente el warning previo del formulario de login.
- Prueba real en navegador: FID presente, `tipo_dispositivo = escritorio`, `version_so = macOS 26.5.2`, `version_app = 0.0.1`, `modelo = NULL` y `firebase_token_fcm = NULL`. No apareció solicitud de permiso ni se envió una notificación. El `User-Agent` real llegó a la sesión y la sesión de prueba fue cerrada correctamente.

### 🚧 Login estricto, seed limpio y logout (2026-07-31)

- `uid_dispositivo` y `plataforma` pasan a ser obligatorios en `DtoIngreso`; backend ya no inventa UUID ni reemplaza plataformas inválidas por `web`.
- `plataforma_dispositivo` incorpora `desconocido` para clientes que explícitamente no puedan determinar plataforma. Migración aplicada: `20260731050000_add_unknown_device_platform`.
- Contraseña alineada en front, backend y seed: mínimo 8, mayúscula, minúscula, número y carácter especial.
- Seed rehecho: crea/reactiva organización y perfil propietario, permisos base, rol `SUPERADMIN` con todos los permisos activos, usuario/credencial/rol; escrituras agrupadas en una transacción. Correo configurado: `admin@admin.sumaq`. Ya no imprime contraseña.
- Logout creado en frontend: componente modular `UserMenu.svelte`, dropdown en avatar, `POST /logout`, llamada SSR a `POST /auth/logout`, limpieza local y redirección a `/login`.
- Logout backend revoca sesión y limpia `firebase_token_fcm` del dispositivo en una transacción. Una sesión ya revocada no puede limpiar el token push de una sesión posterior.
- Contraseña de desarrollo actualizada con el carácter especial autorizado; permanece únicamente en `.env` y el seed no la imprime.
- Base local `sumaq_system` reiniciada por completo, cinco migraciones aplicadas y seed ejecutado. Se agregó `tsx` como dependencia de desarrollo porque el script `db:seed` lo requería pero no estaba instalado.
- Prueba API: dos ingresos consecutivos sobre mismo dispositivo dejaron `1` sesión activa y `1` revocada; logout dejó `0` activas. Validación adicional: dispositivo ausente `400`, plataforma inválida `400`, `desconocido` `200`.
- Prueba navegador: `admin@admin.sumaq` ingresó, dropdown del avatar se mostró y “Sign out” revocó/redirigió a `/login` correctamente.
- Rastros de prueba eliminados al terminar. Estado entregado: 1 organización, 1 usuario, 1 rol SUPERADMIN, 6 permisos asignados, 0 dispositivos, 0 sesiones y 0 auditorías.
- Backend y frontend compilan; `svelte-check` conserva solo el warning previo del formulario de login.

**Dónde nos quedamos:** identidad de dispositivo + notificaciones push (Firebase) implementadas (abajo). Antes: i18n backend, multi-tenant host-driven, endurecimiento OWASP. Faltan por decisión del usuario: **#2 breach-check** y **MFA** → "cuando hagamos la configuración". El logout **no se toca** por ahora.

### ✅ Identidad de dispositivo + Push preparado (Firebase FCM) (2026-07-30)

- **Identidad de dispositivo**: cookie httpOnly `device_id` (UUID ~400 días) que pone SvelteKit (`frontend/src/lib/server/device.ts` → `getOrCreateDeviceId`) y manda en el login como `uid_dispositivo`. El backend hace upsert por `(fid_usuarios, uid_dispositivo)`. Modelo **1 dispositivo → N sesiones**. Verificado: 2 logins mismo navegador → 1 dispositivo (antes cada login creaba uno por el bug del UUID aleatorio, ya arreglado). Se limpiaron los dispositivos fantasma en dev.
- **NO usar FingerprintJS** para esto (es antifraude/adversario; cambia al actualizar el navegador; GDPR). Para "mis dispositivos" de un usuario logueado, el id almacenado es lo correcto.
- **Push backend** en `comun/push/`: `ServicioPush` (`ModuloPush` global, `firebase-admin`). Se activa solo si están `FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY`; si faltan, no-op. Métodos `enviarADispositivo` y `notificarUsuario`. Limpia tokens FCM inválidos.
- **Endpoint** `POST /devices/push-token` (feature `dispositivos/`, autenticado + CSRF) guarda el `firebase_token_fcm` del dispositivo.
- **Cliente web (SvelteKit)**: `static/firebase-messaging-sw.js`, `src/lib/push.ts` y `src/routes/push/register/+server.ts` quedan preparados para una activación futura explícita. Ya no se dispara permiso/token FCM desde `(app)/+layout.svelte`; ver corrección del 2026-07-31 arriba.
- **Verificado**: backend loguea "Push habilitado"; envío de prueba llegó a FCM (solo rechazó el token falso) → credenciales válidas; front compila 0 errores.
- **Pendiente**: (1) prueba real de notificación en navegador normal (aceptar permiso → token → enviar); (2) decidir disparadores de push (ej. "nuevo inicio de sesión" con `notificarUsuario`); (3) cliente móvil cuando exista la app (FCM + IDFV/FID); (4) **Etapa 2: gestión de sesiones** (listar/revocar) — aún no construida.

### ✅ Login: una sesión activa por dispositivo (2026-07-30)

- El dispositivo continúa siendo estable y se reutiliza mediante el upsert por `(fid_usuarios, uid_dispositivo)`; un login nuevo no crea otro dispositivo.
- Dentro de la misma transacción del ingreso, después del upsert y antes de insertar la sesión nueva, se revocan las sesiones todavía activas del mismo dispositivo (`estado = 1`, `revocada_en IS NULL`, `expira_en > ahora`).
- Resultado: si el usuario vuelve a ingresar sin cerrar sesión, la nueva sesión queda vigente y la anterior conserva su historial con `revocada_en`.
- El access token y el refresh token ahora llevan el mismo claim `sid` (`id_sesiones`). Esto permitirá distinguir `es_actual` al construir el listado de sesiones.
- Identificación prevista para “mis sesiones”: el backend compara el `sid` autenticado con `sesiones.id_sesiones`; esa fila apunta al dispositivo mediante `sesiones.fid_dispositivos`. El navegador no necesita leer el JWT httpOnly ni enviar cuál considera actual.
- No se agregó un booleano `activa`: se calcula con `estado`, `revocada_en` y `expira_en`, evitando guardar un valor que pueda quedar obsoleto.
- Revocación al cerrar sesión y endpoints para listar/revocar sesiones quedan pendientes por decisión del usuario; este cambio solo corrige el login.
- Verificación original: `npm run build` y ESLint dirigido. Las rutas actuales de esos archivos están documentadas en la sección Clean Architecture.

### ✅ i18n de respuestas del backend (2026-07-30)

- **Mensajes del API traducidos por idioma.** Sistema custom minimalista (sin librería), espeja el i18n del front. Detalle completo en memoria `backend-i18n`.
- **Servicios/guardias lanzan un CÓDIGO** (`auth.invalidCredentials`, `auth.csrfMissing`, `auth.sessionInvalid`, `common.validationError`...), NO texto literal.
- **Filtro global** `src/comun/filtros/filtro-excepciones-i18n.ts` (`APP_FILTER`) traduce el código al idioma y responde `{ statusCode, codigo, message, detalles? }`.
- **Núcleo** `src/comun/i18n/`: `idiomas.ts` (en/es, default en, `normalizarIdioma`), `en.json`/`es.json`, `servicio-traduccion.ts` (si el código no existe, devuelve el string tal cual → migración incremental), `resolver-idioma.ts`, `i18n.module.ts` (global).

### ✅ Estructura: carpeta `src/comun/` (2026-07-30)

- Todo lo **transversal** (no exclusivo de un feature) vive en **`src/comun/`**: `configuracion/` (validar-entorno), `i18n/`, `filtros/`, `prisma.service.ts`, `auditoria/` (`ServicioAuditoria`, `@Global`), `cookies/` (`ServicioCookies`, `@Global`). Los features (`autenticacion/`, `empresas/`) quedan aparte. Debe ir dentro de `src` (NestJS compila desde ahí).
- **Regla de servicios**: si lo usan varios features → `comun/` como módulo `@Global` (cualquiera lo inyecta sin reimportar); si es específico → se queda en el feature. El feature solo LLAMA al servicio compartido (opcionalmente vía un helper privado que mapea su dominio — ej. `auditarIngreso()` de auth mapea resultado/motivo y llama a `ServicioAuditoria.registrar()`). `comun` no importa código de feature (tipos compartidos se definen en `comun`).
- **Aplicado**: auditoría y cookies salieron de `autenticacion/` → el feature quedó solo con núcleo de autenticación (controlador, servicio, módulo, decoradores, DTO, estrategias, guardias y tipos). Verificado: arranque OK, login 200, auditoría escrita, cookies emitidas.
- **Resolución de idioma**: `Accept-Language` de la petición (SvelteKit lo construye desde `sumaq-locale`) → claim `idioma` del JWT como respaldo → en.
- **Verificado (curl)**: mismo 401 → "Credenciales inválidas" (es) / "Invalid credentials" (en/sin header); CSRF y validación también traducidos; token con `"idioma"`.
- **Pendiente**: los `detalles` de validación (ValidationPipe) salen crudos de class-validator (inglés) → localizar con mensajes custom en los DTOs.
- **Para agregar un mensaje**: clave en `en.json`+`es.json` y `throw new XException("codigo")`.

**Nota:** también se movieron a env `LOGIN_MAX_INTENTOS` (19) y `LOGIN_BLOQUEO_MINUTOS` (60) — la política de bloqueo ya no está hardcodeada.

### ✅ Multi-tenant por subdomain, host-driven (2026-07-30)

- **El backend deduce el tenant del host de la petición. El front NO envía slug** (se quitó `slug_organizacion` del body y `ownerOrgSlug` del front). Diseño: el navegador entra por `admin.localhost` / `<tenant>.localhost`; SvelteKit reenvía ese host; Nest extrae el subdomain.
- **Front** `frontend/src/lib/server/backend.ts` (`requestBackend`): reenvía el host real del navegador como `X-Forwarded-Host` (además de cookie y `x-sumaq-csrf`). Genérico, sin parsear nombres.
- **Backend** `resolverSlugOrganizacion` (`data/datasources/autenticacion-prisma.datasource.ts`): recibe host ya adaptado a `ContextoSolicitud`, quita puerto y resta el sufijo del dominio base.
- **Env nueva** `APP_BASE_DOMAIN` (validada al arrancar): `localhost` en dev, `sumaq.com` en prod. Solo se cambia esa var para producción.
- **DB**: la org propietaria se renombró de slug `sumaq-system` → **`admin`**. `OWNER_ORG_SLUG=admin` en el `.env` del backend (seed). El front ya no usa `OWNER_ORG_SLUG`.
- **Verificado (curl + navegador)**: `admin.localhost` → 200 (org admin); los hosts sin tenant o con tenant inválido se rechazan sin consultar usuarios. Desde 2026-07-31 todos esos rechazos son `401 auth.invalidCredentials`. Login E2E `admin.localhost` → `/dashboard`.
- **Seguridad**: `X-Forwarded-Host` es el estándar de proxy; forjarlo solo elige en qué org intentar entrar, igual exige credenciales válidas de esa org. En prod el backend NO debe exponerse directo, solo tras el proxy.
- **Archivos actuales relevantes**: `frontend/src/lib/server/backend.ts`, `frontend/src/lib/server/config.ts`, `frontend/src/routes/login/+page.server.ts`, `backend/src/autenticacion/data/datasources/autenticacion-prisma.datasource.ts` y `backend/src/comun/configuracion/validar-entorno.ts`.

### ✅ Endurecimiento OWASP del login (2026-07-30)

- **Anti-enumeración por timing**: cuando el usuario o la credencial no existen, se corre un `argon2.verify` contra un **hash señuelo cacheado** (`gastarTiempoVerificacion` en `data/datasources/autenticacion-prisma.datasource.ts`) para igualar el tiempo de respuesta.
- **#6 Lockout ajustado**: `LOGIN_MAX_INTENTOS = 19`, bloqueo **60 min**. `registrarIntentoFallido` reinicia el contador si el bloqueo ya venció. La lectura usa `SELECT ... FOR UPDATE` dentro de la transacción para bloquear solo la fila del usuario y evitar incrementos perdidos ante intentos simultáneos. Verificado con dos solicitudes concurrentes: contador `0 → 2`; luego restablecido a `0` mediante login correcto.
- **#5 Claims JWT `iss`/`aud`**: nuevas env `JWT_ISSUER=sumaq-system` / `JWT_AUDIENCE=sumaq-api` (validadas al arrancar). Helper `opcionesEmisor()` aplicado a las 4 firmas (login + refresh); ambas estrategias Passport verifican iss/aud. Sin coste de sincronización (valores fijos de config).
- **#4 Anti-CSRF (defensa en profundidad)**: nuevo `GuardiaCsrf` (`guards/guardia-csrf.ts`) exige cabecera `x-sumaq-csrf` en métodos que mutan (POST/PUT/PATCH/DELETE); GET/HEAD/OPTIONS libres. Registrado global tras throttler. El front (`frontend/src/lib/server/backend.ts` → `requestBackend`) la envía siempre. Verificado: sin cabecera → 403; con → 200; GET → 401.
- **Pendiente OWASP (fino, no urgente)**: límite de intentos también por `correo` (no solo por IP) para credential stuffing distribuido. La respuesta genérica para organizaciones ya fue aplicada el 2026-07-31.
- **Verificado E2E**: login navegador → `/dashboard`; `tsc`/`check` 0 errores; token con `iss/aud`; `/auth/me` con cookie → 200.

**Ubicación actual:** autenticación quedó distribuida entre `domain/entities`, `domain/repositories`, `domain/usecases`, `data/datasources`, `data/repositories` y `presentation`; configuración transversal vive en `comun/configuracion`.

### 🔎 Concurrencia del contador y Prisma (2026-07-30)

- Una transacción no significa que todas sus consultas ocurran como una sola instrucción ni que nadie pueda intercalarse. Garantiza principalmente **todo o nada**; el aislamiento determina qué pueden leer dos transacciones concurrentes.
- El problema anterior era `findUnique → calcular en Nest → update`: dos solicitudes podían leer `17`, calcular ambas `18` y guardar `18`; debían terminar en `19` y bloquear la cuenta.
- **Implementación actual:** dentro de `$transaction`, un `$queryRaw` parametrizado ejecuta `SELECT ... FOR UPDATE` sobre la fila del usuario. La segunda solicitud espera el `commit`, luego lee el contador nuevo. El cálculo, actualización, posible bloqueo y auditoría permanecen en esa misma transacción corta.
- `$queryRaw` está parametrizado mediante el template tag de Prisma; `id_usuarios` no se concatena y no se usa `$queryRawUnsafe`.
- Prisma `7.9.1` no ofrece actualmente `lock`/`forUpdate` en `findUnique` o `findFirst`; para un bloqueo pesimista explícito se necesita SQL o una estrategia diferente de concurrencia.
- **Alternativa recomendada, todavía NO aplicada:** mantenerlo 100% ORM con un `updateMany` condicional que reinicie el bloqueo vencido, seguido de `usuarios.update({ intentos_fallidos: { increment: 1 } })`. Ambos `UPDATE` bloquean/serializan la fila y el incremento ocurre dentro de PostgreSQL, no en Nest.
- Otra alternativa es una transacción `Serializable`, pero debe capturar y reintentar conflictos Prisma `P2034`; para este contador es más compleja de lo necesario.
- Regla práctica: incremento simple → operación atómica Prisma; reglas complejas de leer/decidir/escribir → `FOR UPDATE`; ediciones con mucha concurrencia → control de versión optimista; `Serializable` solo cuando se acepte implementar reintentos.
- **DECISIÓN CERRADA (2026-07-30):** se mantiene el `$queryRaw ... FOR UPDATE`. Es un read-decide-write genuino (reinicio-si-vencido + bloqueo-al-límite) que no cabe limpio en un solo UPDATE; el lock pesimista lee mejor. Verificado por 2ª vez con 2 peticiones concurrentes: contador `0 → 2`, luego reset a `0` con login correcto. No se sustituye por `updateMany + increment`.
- **Variantes de lock a tener presentes** (guardadas en memoria `concurrency-patterns`): fuerza `FOR UPDATE / FOR NO KEY UPDATE / FOR SHARE / FOR KEY SHARE`; espera `NOWAIT` (falla ya) / `SKIP LOCKED` (salta — colas y repartir recursos); objetivo `OF tabla` (JOINs). Probable uso en Sumaq: `FOR UPDATE` (principal), `SKIP LOCKED` (colas de correo/notificaciones, turnos/cupos), `NOWAIT` (UX sin espera).
- Detalle SQL: `${id_usuarios}::uuid` castea el parámetro (texto) a tipo `uuid` para comparar con la columna `uuid` y usar su índice; ver explicación en la conversación.

---

**Traspaso de la sesión previa (contexto, ya hecho):** revisión paso a paso del login. La migración a `snake_case` ya está terminada; se ordenó el flujo, se exigió toda la configuración y se hicieron atómicas sus escrituras.

### Traspaso exacto de la última sesión

**Configuración sin valores predeterminados:**

- Backend obligatorio y validado al arrancar: `DATABASE_URL`, `NODE_ENV`, `PORT`, `FRONTEND_ORIGIN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_HASH_SECRET`, `JWT_ACCESS_TTL_MINUTES` y `JWT_REFRESH_TTL_HOURS`.
- El backend valida tipos, rango de puerto, URL PostgreSQL, origen del frontend y los tres secretos de autenticación (mínimo 32 caracteres y todos distintos). Si algo falta o es inválido, Nest no arranca y nombra la variable.
- Seed obligatorio: `DATABASE_URL`, `OWNER_ORG_SLUG`, `OWNER_ORG_NAME`, `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`. No crea datos usando valores inventados.
- Frontend SSR obligatorio y centralizado en `frontend/src/lib/server/config.ts`: `API_URL`, `APP_URL`, `OWNER_ORG_SLUG`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL` y `REFRESH_COOKIE_NAME`.
- `main.ts`, `PrismaService`, cookies, estrategias JWT y servicio de autenticación consumen la configuración mediante `getOrThrow()` o el objeto validado; no tienen fallback de entorno.

**Flujo actual exacto de `POST /auth/login`:**

1. `DtoIngreso` valida correo y contraseña. `slug_organizacion` sigue marcado con `@IsOptional()` porque puede venir del subdomain; si llega en el body solo valida que sea `string`.
2. `resolverSlugOrganizacion()` intenta obtener el slug del subdomain y, como alternativa, de `dto.slug_organizacion`.
3. Si ninguna fuente entrega slug, ejecuta Argon2 señuelo, audita `organizacion_invalida` y responde `401 auth.invalidCredentials`.
4. Consulta la organización y la valida inmediatamente. Si no existe o está inactiva, ejecuta Argon2 señuelo y responde el mismo `401 auth.invalidCredentials`. Se corta el flujo: no consulta usuario, credencial, roles ni crea sesión.
5. Busca el usuario únicamente dentro de la organización validada; luego comprueba bloqueo.
6. Busca explícitamente la credencial activa de tipo `contrasenia` y verifica Argon2.
7. Solo después de autenticar carga roles y permisos activos.
8. Firma access/refresh y calcula el HMAC-SHA-256 del refresh antes de abrir la transacción.
9. La transacción exitosa revalida la cuenta, reinicia intentos/bloqueo, hace upsert del dispositivo, crea la sesión y registra la auditoría. Todo se confirma o todo se revierte.

**Errores y transacciones:**

- `FuenteDatosAutenticacionPrisma.ingresar()` contiene el `try/catch` del caso de uso. Vuelve a lanzar `HttpException` conocidas para conservar su 400/401; registra errores inesperados y devuelve un 500 controlado.
- No se añadió un `try/catch` alrededor de cada consulta: eso podría ocultar fallos y permitir continuar con estado incompleto.
- Contraseña incorrecta ejecuta en una sola transacción: bloqueo de fila `FOR UPDATE`, cálculo de `intentos_fallidos` (con reinicio si el bloqueo previo venció), posible bloqueo de **60 minutos al llegar a 19** y auditoría del fallo.
- Login correcto ejecuta en una sola transacción: reinicio de intentos, dispositivo, sesión y auditoría de éxito.
- La auditoría acepta el cliente transaccional de Prisma. No atrapa su error internamente porque debe provocar rollback si no puede guardarse.
- `ThrottlerGuard` (20 solicitudes/minuto por IP, en memoria) sigue separado del bloqueo de cuenta almacenado en PostgreSQL. Redis y pruebas automatizadas quedaron aplazados por decisión del usuario.

**Decisión cerrada sobre los mensajes del login (2026-07-31):**

- Se aplicó un único `401 Credenciales inválidas` para todos los rechazos de autenticación, incluida la organización ausente, inexistente o inactiva.
- El slug continúa opcional en el DTO porque normalmente se resuelve desde el subdomain; hacerlo obligatorio rompería el flujo host-driven.

**Archivos principales modificados en esta sesión:**

- `backend/src/comun/configuracion/validar-entorno.ts`
- `backend/src/main.ts`
- `backend/src/comun/prisma.service.ts`
- `backend/src/autenticacion/data/datasources/autenticacion-prisma.datasource.ts`
- `backend/src/comun/auditoria/servicio-auditoria.ts`
- `backend/src/comun/cookies/servicio-cookies.ts`
- `backend/prisma/seed.ts` y `backend/.env.example`
- `frontend/src/lib/server/config.ts` (nuevo), `backend.ts`, `session.ts` y `routes/login/+page.server.ts`
- `backend/CONVENTIONS.md` y este documento.

**Comprobaciones realizadas:**

- Backend: `npm run build`, ESLint de archivos modificados y `npx prisma validate`: correctos.
- Frontend: `npm run check` y `npm run build`: 0 errores. Existe 1 warning previo de Svelte por capturar el valor inicial de `data` en `login/+page.svelte`.
- Prueba real: slug ausente `400`; organización inexistente `401`; contraseña incorrecta `401`; credenciales correctas `200` con cookies.
- PostgreSQL confirmó contador reiniciado, sesión creada y auditorías de fallo/éxito. El dispositivo/sesión temporal de la prueba fue eliminado; las filas de auditoría se conservaron.
- Se comprobó fail-fast iniciando con `PORT` vacío: el arranque se detuvo indicando que faltaba `PORT`.
- El servidor Nest usado para las pruebas fue detenido; el puerto `3000` quedó libre.

**Último paso completado (2026-07-29):**

- Toda configuración usada por Nest, Prisma, cookies, el seed y el frontend SSR es obligatoria: se eliminaron los valores predeterminados y el proceso falla al iniciar si falta una variable o su formato es inválido.
- El login quedó estrictamente secuencial: resuelve la organización, la consulta y la valida inmediatamente. Si falta devuelve 400; si no existe o está inactiva devuelve su 401 específico y no consulta usuario, credencial, roles ni crea sesión.
- `FuenteDatosAutenticacionPrisma.ingresar()` es el límite `try/catch`: conserva los errores HTTP esperados y registra/convierte únicamente fallos inesperados a un 500 controlado.
- El intento fallido guarda incremento, posible bloqueo y auditoría en una sola transacción. El ingreso correcto guarda reinicio del contador, dispositivo, sesión y auditoría en otra transacción única; cualquier fallo revierte todo el grupo.
- Endurecido `POST /auth/login` manteniendo separados los dos controles: `ThrottlerGuard` limita solicitudes por IP en memoria; `usuarios.intentos_fallidos` bloquea una cuenta por contraseñas incorrectas.
- El login ahora consulta identidad y credencial primero; carga roles/permisos solo después de validar Argon2.
- Usuario, bloqueo, contraseña y estado de cuenta conservan el mismo 401 genérico. La organización devuelve mensajes explícitos por decisión del flujo actual. Solo `estado = 1` y `estado_cuenta = activo` pueden iniciar sesión.
- `intentos_fallidos` se calcula dentro de una transacción; bloqueo de **19 fallos por 60 minutos**, con reinicio a 0 tras vencer el bloqueo (ver sección OWASP arriba).
- Reinicio del contador, upsert del dispositivo y creación de sesión se guardan juntos en una transacción corta; firma JWT y HMAC-SHA-256 del refresh ocurren antes para no mantenerla abierta.
- Creado el servicio de auditoría: registra éxitos, fallos y bloqueos en `configuracion.auditoria`; únicamente las acciones funcionales aprobadas crean además `eventos.eventos`. No guarda correo, contraseña ni tokens. Si no existe organización, usa el logger de Nest porque la auditoría exige su FK.
- Verificación manual: configuración ausente falla con mensaje claro; organización ausente/inexistente corta el flujo; contraseña errónea incrementa y audita; login correcto reinicia, crea sesión y audita. Backend, Prisma y frontend compilan.
- El rate limit distribuido se deja para cuando existan varias instancias. La instancia actual tiene límites por IP y familia, más suite automatizada unitaria/E2E.
- Añadida y aplicada la migración `20260729193000_snake_case_identifiers`.
- Las 25 tablas y sus columnas, 5 enums y sus valores, restricciones e índices propios quedaron en `snake_case` minúsculo.
- `schema.prisma` usa exactamente los nombres físicos de PostgreSQL, sin `@map` ni `@@map`.
- Cliente Prisma regenerado y todo el backend adaptado a modelos/campos snake_case.
- DTO de login alineado: `slug_organizacion` y `uid_dispositivo`; enums: `activo`, `suspendido`, `contrasenia`, `passkey`, `ios`, `android`, `web`.
- Frontend alineado con respuestas snake_case de autenticación y empresas. `OWNER_ORG_SLUG` es configuración requerida del login SSR.
- Verificación real: login, `/auth/me`, `/companies` y refresh responden 200 con `jruizt96@gmail.com` / `Pass123456`.
- `prisma migrate status`: actualizado; `prisma migrate diff`: sin diferencias; backend y frontend compilan.
- Consulta de catálogo PostgreSQL: 0 mayúsculas en tablas, columnas, enums, valores enum, restricciones e índices.

**Historial inmediato anterior:**

- Creado `ServicioCookies` en `backend/src/comun/cookies/servicio-cookies.ts`.
- Centraliza opciones seguras, escritura y limpieza de cookies mediante `ponerSesion()` y `limpiarSesion()`.
- El controlador quedó sin `ConfigService` ni construcción directa de cookies.
- Registrado como provider del módulo de autenticación. Build y `tsc --noEmit`: OK.
- Duraciones centralizadas en el entorno del backend: `JWT_ACCESS_TTL_MINUTES` controla el JWT y cookie de acceso; `JWT_REFRESH_TTL_HOURS` controla el JWT, sesión y cookie de refresco.
- Agregado `backend/.env.example` sin secretos reales para documentar la configuración requerida.
- Eliminados los valores predeterminados de ambas duraciones. `validarEntorno()` detiene el arranque con un error claro si falta una variable o no contiene un entero positivo.
- Credenciales endurecidas: el enum `tipo_credencial` es el catálogo cerrado de mecanismos; PostgreSQL permite una sola `contrasenia` activa por usuario y conserva múltiples `passkey`.
- El login dejó de depender de `credenciales[0]`: busca explícitamente la contraseña activa con `findFirst()` y filtra asignaciones, roles y permisos activos.
- Migración `20260729164500_active_password_credential` aplicada y probada contra duplicados. Login y `/auth/me`: 200.

**Siguiente punto para revisar con el usuario:** decidir si reemplazar el `FOR UPDATE` actual por `updateMany + increment` completamente Prisma. Luego decidir si todos los rechazos del login volverán al único mensaje genérico recomendado por OWASP (hoy la organización devuelve mensajes explícitos) y continuar recorriendo autenticación método por método.

**Contrato de tenant actual (ACTUALIZADO 2026-07-30 — reemplaza lo anterior):**

- El frontend manda **solo** `{ correo, contrasenia }`. Ya NO envía `slug_organizacion`.
- El tenant lo deduce el **backend** desde `X-Forwarded-Host` (subdomain), restando el sufijo `APP_BASE_DOMAIN`. Ver sección "Multi-tenant por subdomain, host-driven" arriba.
- `dto.slug_organizacion` sigue `@IsOptional()` en el DTO como fallback para clientes de API, pero el flujo web no lo usa.

**Reglas nuevas del proyecto establecidas esta sesión (ya en memoria):**

- **Frontend:** identificadores/archivos en **inglés**, pero **comentarios en español**. Seguir **SOLID** y legibilidad.
- **Backend:** todo en español (ya era); además los **símbolos de framework/librería llevan comentario al costado en español** (origen + qué hacen). Ya aplicado a todo `src/autenticacion/`.

---

## Directivas / convenciones (reglas del proyecto)

- **Base de datos y Prisma** en español, `snake_case` minúsculo, **ñ → "ni"** (`contrasenia`), sin tildes. Los nombres deben ser iguales y no se usan `@map`/`@@map`.
- **PK** = `id_tabla` (`id_usuarios`) · **FK** = `fid_tabla` (`fid_organizaciones`) · ambas UUID nativo PostgreSQL (`@db.Uuid`).
- **Cada tabla** lleva `estado` + auditoría (`created_at`, `created_by`, `updated_at`, `updated_by`).
- **Código backend** en español (clases, métodos, variables). Excepción: APIs de framework/Prisma en inglés.
- **Rutas API** en inglés (`/auth/login`…).
- **Código frontend** en inglés (convención JS/Svelte).
- **Textos del frontend**: i18n, **default inglés**, conmutable. Traducciones en archivos, no en DB.
- **Fechas/horas**: todo instante nuevo usa PostgreSQL `timestamptz(3)` y `CURRENT_TIMESTAMP`; API en ISO 8601 UTC (`Z`/`+00:00`); frontend muestra usando la zona IANA del usuario/tenant (`America/Lima` para Perú). Fechas civiles sin hora usan `date`. Nunca ajustar horas manualmente ni depender de la zona SSR.

---

## ✅ HECHO

### Infraestructura / DB

- [x] Docker: Postgres **18** + pgAdmin (`database/docker-compose.yml`). Base `sumaq_system`.
- [x] Prisma **7** con driver adapter (`@prisma/adapter-pg`), cliente CJS fuera de `src`.
- [x] `PrismaService` transversal en `src/comun/prisma.service.ts`, expuesto mediante `ModuloPrisma` global; los casos de uso acceden a persistencia únicamente mediante puertos.

### Modelo de datos — 26 tablas, 6 schemas (todo en español)

- [x] **seguridad**: usuarios · credenciales (password + passkey) · historial_contrasenias · usuario_mfa · codigos_recuperacion_mfa · dispositivos · sesiones · tokens_verificacion · roles · permisos · roles_permisos · usuarios_roles · configuracion_usuario · preferencias_usuario
- [x] **nucleo**: organizaciones · perfil_organizacion
- [x] **personas**: personas
- [x] **configuracion**: modulos · organizaciones_modulos · parametros · configuracion_organizacion · configuracion_usuario · preferencias_usuario
- [x] **system**: paises · zonas_horarias
- [x] **eventos**: eventos_maestro · eventos
- [x] Diseño: 3 capas (persona → usuario → credencial), RBAC, multi-tenant, 2FA (TOTP + recovery), lockout, detección de dispositivo nuevo, i18n/tz, event sourcing. Ver `backend/prisma/SCHEMA_DESIGN.md`.
- [x] Todas las PK y referencias internas `fid*` usan UUID nativo PostgreSQL; futuros modelos deben seguir la misma convención.
- [x] `tipo_credencial` representa mecanismos soportados por código. Una restricción parcial garantiza una sola contraseña activa por usuario sin limitar múltiples passkeys.

### Backend — Auth (español, verificado)

- [x] `src/autenticacion/` completo: servicio, controlador, guardias, estrategias y decoradores.
- [x] Endpoints: `POST /auth/login · /auth/refresh · /auth/logout` · `GET /auth/me`.
- [x] JWT en cookies httpOnly (access 15m + refresh 12h rotado, inactividad 2h y detección de reuso).
- [x] Login: organización → usuario → credencial (argon2) → dispositivo → sesión + roles (RBAC).
- [x] Lockout por intentos (19 fallos → 60 min, reinicio tras vencer), rate-limit login (20/min), helmet, CORS, ValidationPipe.
- [x] **Endurecimiento OWASP (2026-07-30)**: anti-enumeración por timing (argon2 señuelo), claims JWT `iss`/`aud` firmados y verificados, guardia anti-CSRF por cabecera custom (`x-sumaq-csrf`) en métodos que mutan. Pendiente: breach-check de contraseñas (#2) y MFA — para la fase de configuración.
- [x] Seed inicial configurable por variables obligatorias (`OWNER_ORG_SLUG`, `OWNER_ORG_NAME`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD`). Correr: `npm run db:seed`.
- [x] Probado con curl: login/me/refresh/logout/mal-pass/rate-limit → OK.

### Backend — Autorización por permisos (desde DB)

- [x] JWT lleva `permisos` (calculados al ingresar: usuario→roles→roles_permisos→permisos).
- [x] `@Permisos('companies.read')` + `GuardiaPermisos` global. Ya NO se usa `@Roles('SUPERADMIN')` hardcodeado.
- [x] `empresas` protegido por `companies.read` / `companies.delete`. Verificado: superadmin 200, sin permiso 403.
- [x] `GET /auth/me` devuelve roles **y permisos** (para que el front muestre/oculte por permiso).
- [x] **Seed reproducible**: crea la organización propietaria indicada por `OWNER_ORG_SLUG` + rol SUPERADMIN + 6 permisos base + primer usuario superadmin. Todas sus variables son obligatorias; no existen defaults. Idempotente.
- [x] Slug de org del login sale de env (`OWNER_ORG_SLUG`), no hardcodeado.

### Backend — Empresas

- [x] `GET /companies`: lista organizaciones activas con su perfil básico.
- [x] `DELETE /companies/:id`: baja lógica (`estado = 0`) para conservar relaciones y auditoría.
- [x] Acceso restringido al rol `SUPERADMIN` de la organización propietaria `sumaq-system`.
- [x] La organización `SUMAQ SYSTEM` no puede eliminarse desde el módulo.

### Frontend — UI

- [x] SvelteKit 2 + Svelte 5 + **Tailwind v4** (tokens del design system, sin CSS custom).
- [x] Design system Notion "daylight" (`frontend/DESIGN2.md`), light + dark.
- [x] Componentes reutilizables: Button, Card, Badge, Input, Icon, Logo, Avatar, StatCard, ThemeToggle, LanguageSwitcher, Header, Sidebar.
- [x] Pantallas: **login** (auth real), **dashboard** (demo), **empresas** (SSR real) y **recursos** (showcase de componentes).
- [x] Sidebar contraíble + drawer móvil, responsive, marca/logo Sumaq System.
- [x] Sidebar reducido a **Dashboard**, **Empresas** y **Usuarios del sistema**; Dashboard se preservó sin cambios.
- [x] «Usuarios del sistema» se reservó para personal interno de Sumaq; los administradores tenant se gestionarán dentro de cada empresa.
- [x] Recursos UI, módulos aplazados, Ayuda y Plan Pro fueron retirados del menú; `/recursos` sigue disponible por URL directa.
- [x] Recursos UI ampliado con el catálogo oficial de **1.756 iconos Lucide**, búsqueda y carga progresiva.
- [x] Template y Dashboard preservados sin cambios visuales ni estructurales.
- [x] Selector de tema sin discrepancia SSR/hidratación: sol y luna comparten markup estable.
- [x] Recursos UI funciona en SSR de desarrollo: Lucide se transforma con Vite y Node ya no intenta abrir archivos `.svelte` directamente.
- [x] Login conectado por acción SSR a `POST /auth/login`; las cookies HTTP-only del backend se conservan en el navegador.
- [x] Empresas lista datos reales por SSR y permite baja lógica con formulario SSR, confirmación y mensajes traducidos.

### Frontend — Login endurecido (sesión 2026-07-28)

- [x] **Validación con schema** (`sveltekit-superforms` + `valibot`, ligero): schema en `src/lib/schemas/login.ts`, valida en cliente **y** servidor con la misma fuente. Errores por campo con claves i18n (`login.invalidEmail`, `login.passwordRequired`).
- [x] Eliminado helper `authErrors.ts`; errores de negocio del backend salen por `message()` de superforms (`$message`).
- [x] **Contrato snake_case**: el login SSR envía `slug_organizacion` desde `OWNER_ORG_SLUG`; el DTO también acepta `uid_dispositivo`.
- [x] **UX de errores**: transición `slide` (160ms) en el error bajo el input (`Input.svelte`) y en el mensaje global; mensaje global en rojo sólido (`bg-error text-white`). Verificado en navegador.
- [x] **Configuración SSR centralizada** en `src/lib/server/config.ts`: `API_URL`, `APP_URL`, `OWNER_ORG_SLUG`, ambos TTL y `REFRESH_COOKIE_NAME` son obligatorios y se validan sin defaults. Cookie de sesión centralizada en `session.ts`.
- [x] **`.env` + `.env.example`** creados: `API_URL`, `APP_URL` (origen del front, documentado sin consumir aún), `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `REFRESH_COOKIE_NAME`.
- [x] **Guarda de sesión SSR**: `session.ts` (`hasSession`) → `hooks.server.ts` pone `locals.isAuthenticated` → `app.d.ts` tipa `Locals` → `(app)/+layout.server.ts` redirige a `/login` sin sesión, y `login` redirige a `/dashboard` con sesión. Verificado ambos caminos en navegador. ⚠️ Solo checa **presencia** de cookie, no validez (la validez real la impone el backend con 401).

### Backend — Documentación de auth (sesión 2026-07-28)

- [x] Todo `src/autenticacion/` (11 archivos) con **comentarios al costado en español** en cada símbolo de framework/librería (Nest, Passport, Prisma, class-validator, argon2, jwt): origen + resumen. `tsc --noEmit` OK.

### Frontend — i18n (SSR, sin salto)

- [x] Sistema i18n con archivos `en.json` / `es.json` (`src/lib/i18n/`).
- [x] **SSR con cookie**: `hooks.server.ts` + `+layout.server.ts` → el server renderiza el idioma correcto, **sin parpadeo**.
- [x] Default **inglés**, conmutable con `LanguageSwitcher` (EN/ES), persiste en cookie.
- [x] Convertidos a i18n: **login, dashboard, recursos, nav/sidebar, header, títulos y etiquetas accesibles**.
- [x] `npm run check`: 0 errores. Permanece 1 warning previo de reactividad Svelte en el formulario de login.

### Frontend — SSR dinámico

- [x] SSR habilitado globalmente y prerender desactivado.
- [x] Navegación interna con recarga completa: cada ruta vuelve a solicitar HTML al servidor.
- [x] Precarga de datos desactivada y respuestas dinámicas con `Cache-Control: no-store`.
- [x] CSR conservado para hidratar las interacciones; assets estáticos mantienen caché eficiente.

### Documentación / idioma

- [x] Backend propio en español y frontend propio en inglés.
- [x] Convenciones y diseño del schema actualizados con nombres españoles reales.
- [x] README de backend y base de datos reemplazados por documentación de Sumaq System.
- [x] Base predeterminada y ejemplos unificados en `sumaq_system`.
- [x] Contexto visual persistido en `.impeccable.md`: extender el diseño existente sin rediseñar el template.

---

## ⏳ PENDIENTE

### Frontend ↔ Backend

- [x] Conectar el **login del frontend** al `POST /auth/login` real para la organización `sumaq-system`.
- [x] Protección de rutas: grupo `(app)` valida `/auth/me` y permisos vigentes en cada carga SSR; las rutas nuevas deben declararse en `config/access.ts` o fallan cerradas con 403.
- [x] Manejar refresh de token en SSR: cuando el access de 15 minutos caduca, SvelteKit llama `/auth/refresh`, propaga las cookies rotadas y repite la petición protegida mediante single-flight.
- [ ] Restringir el grupo Superadministrador al propietario real cuando el menú sea server-driven.
- [x] Implementar listado y eliminación lógica de Empresas, con pantalla y endpoints reales.
- [ ] Implementar Usuarios del sistema reutilizando las tablas actuales de seguridad y la organización propietaria `sumaq-system`.

### Backend / features de dominio

- [ ] **Sembrar roles base** (PROFESOR, ESTUDIANTE, PADRE) + permisos + módulos por organización.
- [ ] Menú **server-driven**: endpoint que devuelve módulos del usuario (tenant + permisos) → alimentar el sidebar (hoy `nav.ts` está hardcodeado).
- [ ] Módulos de dominio (aún NO modelados): cursos, matrículas, notas, asistencia, pagos/pensiones, etc. (definir producto: colegio vs SERUM).
- [ ] Envío de correos (verificación, recuperación) — el modelo está, falta el proveedor SMTP.
- [ ] Implementar 2FA (TOTP), passkeys (WebAuthn), alerta de dispositivo nuevo — el modelo está, falta la lógica.
- [ ] Event sourcing: aplicar por módulo de negocio cuando se construyan.

### Multi-tenant / infra

- [~] Resolver tenant por **subdomain** real (comodín DNS + cert wildcard). El backend ya puede resolver el slug del header `Host`; en el login SSR actual se usa `OWNER_ORG_SLUG` hasta configurar DNS/cert wildcard.
- [ ] Ampliar Empresas con creación/edición y gestión de administradores tenant. El listado y la baja lógica ya existen.
- [ ] **AL DESPLEGAR — IP real del cliente**: `sesiones.ip` y `auditoria.ip` dependen de que SvelteKit resuelva bien `getClientAddress()`. Hoy (dev) funciona. En prod tras nginx/Cloudflare con `adapter-node`, `getClientAddress()` devuelve la IP del proxy, no la del navegador → cambiar `adapter-auto`→`adapter-node` y setear env `ADDRESS_HEADER=x-forwarded-for` + `XFF_DEPTH=<n proxies>`. Si se añaden proxies directos ante Nest, ajustar `trust proxy` en `main.ts` (hoy `1`). Verificar tras deploy: login externo → IP pública real guardada, no la del proxy.

### Decisiones abiertas

- [ ] **Producto primario**: ¿colegio (4 perfiles, notas, pensiones, padre) o academia SERUM (3 perfiles, cursos, certificados)? El núcleo (seguridad) ya sirve a ambos.

---

## Cómo correr

```bash
# Base de datos
docker compose -f database/docker-compose.yml up -d

# Backend (http://localhost:3000)
cd backend && npm run start:dev
npm run db:seed        # datos demo

# Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Docs relacionados: `backend/ARCHITECTURE.md` · `backend/CONVENTIONS.md` · `backend/prisma/SCHEMA_DESIGN.md` · `frontend/frontend.md` · `frontend/DESIGN2.md`.

---

## Corrección — idioma del login sin sesión (2026-08-01)

- El idioma del primer render continúa resolviéndose en SSR mediante la cookie `sumaq-locale`; no se espera a `onMount` ni se consulta la base desde el cliente.
- Las cookies de tema e idioma se declaran expresamente `httpOnly: false` porque son preferencias no sensibles que deben poder cambiarse desde el navegador incluso sin sesión.
- El layout raíz renueva la cookie de idioma con esa configuración. Esto corrige cookies antiguas creadas con el valor predeterminado `HttpOnly` de SvelteKit.
- `localStorage` conserva su función de sincronizar pestañas; la cookie es la fuente que permite al servidor renderizar el idioma correcto sin salto visual.

---

## Corrección — doble salto tipográfico (2026-08-01)

- Se retiraron las cuatro declaraciones manuales de Inter (`400/500/600/700`) y su precarga. Tailwind/shadcn no incluyen Inter; ahora toda la interfaz usa una única pila sans nativa `ui-sans-serif/system-ui`, sin descargar fuentes ni efectuar `font-display: swap`.
- `app.css` continúa siendo la única entrada global para Tailwind, `tw-animate-css`, tokens y shadcn, pero ahora el layout raíz la emite como `<link rel="stylesheet">` durante SSR en lugar de depender de su inserción mediante JavaScript.
- No se alteraron componentes, tamaños, colores ni estructura visual.

---

## Componente reutilizable — Select (2026-08-01)

- Se creó `frontend/src/lib/components/Select.svelte` siguiendo exactamente el diseño de los select existentes: etiqueta, icono opcional, error, estado deshabilitado, foco azul y flecha propia.
- El `<select>` nativo ocupa todo el campo; presionar el icono izquierdo, el texto o la flecha derecha abre el selector.
- Perfil personal y Apariencia dejaron de duplicar clases y ahora usan el componente común.
- El nuevo componente fue exportado desde `$lib` y añadido al catálogo `/recursos`.

---

## Catálogos de país y zona horaria — schema `system` (2026-08-01)

- Creado el schema PostgreSQL `system`, reservado para configuración y catálogos globales independientes del tenant.
- Nuevas tablas `system.paises` y `system.zonas_horarias`, ambas en `snake_case`, con UUID nativo, `estado` y auditoría estándar.
- Migraciones `20260801190000_system_regions_timezones` y `20260801201000_simplify_system_regions` aplicadas: el catálogo operativo conserva únicamente Perú y mantiene los 597 identificadores IANA disponibles en PostgreSQL. La tabla puente país/zona fue retirada porque ambas selecciones son independientes.
- `seguridad.preferencias_usuario` ahora guarda `fid_paises` y `fid_zonas_horarias` como claves foráneas; se retiró el texto libre `zona_horaria`.
- El seed asigna Perú y `America/Lima` al superadministrador mediante los UUID reales de los catálogos.
- Backend: `GET /system/catalogs/appearance` entrega los catálogos protegidos por sesión y calcula `desfase_utc` (`UTC-05:00`, `UTC+02:00`, etc.) usando `CURRENT_TIMESTAMP` de PostgreSQL; así respeta automáticamente el horario de verano vigente. El guardado se separó en `PATCH /profile/appearance`.
- `/auth/me` incluye los dos UUID en preferencias, por lo que cada carga SSR conoce la selección vigente antes de renderizar.
- Frontend: `/profile/appearance` espera primero al layout autenticado, obtiene los catálogos desde el servidor y muestra país/zona ya seleccionados sin consulta `onMount` ni salto visual. Cada zona aparece como `nombre_iana (UTC±HH:mm)`. Todos los grids de Apariencia siguen 12 columnas: cada tema ocupa `2`, idioma `4`, región `4` y zona `4`; en móvil cada elemento ocupa 12. Se retiraron los `max-w-*` que comprimían visualmente la distribución. El guardado usa una action SSR, reintenta tras refresh si caducó el access token y vuelve a cargar el contexto vigente.
- Verificación: migración y seed correctos; Prisma validate/generate, build Nest, `svelte-check` con 0 errores y build SvelteKit correctos.

### API segura de Perfil/Apariencia

- Nuevo feature backend `src/perfil/` con `PATCH /profile/appearance`; no lleva `@Publico()`, por lo que exige sesión vigente mediante el guardia global.
- DTO cerrado: `fid_paises` y `fid_zonas_horarias` son obligatorios y deben ser UUID. El `ValidationPipe` global elimina/rechaza campos ajenos; el formulario HTML también marca ambos `<select>` como `required` y la action SSR vuelve a validar.
- El endpoint admite 20 solicitudes por minuto e IP mediante `@Throttle`; conserva además las capas globales de CSRF, sesión, cuenta, tenant y contexto actualizado.
- País y zona deben existir y estar activos. El cliente nunca envía un ID de usuario: el backend toma usuario y organización de la sesión validada, por lo que solo puede modificar sus propias preferencias.
- Validación, `upsert` y auditoría `perfil.apariencia.actualizada` se ejecutan en una sola transacción. La auditoría registra usuario, organización, IP, agente y valores anterior/nuevo; si falla, también se revierte la preferencia.
- El PATCH genérico `/preferences` ya no acepta país ni zona, evitando saltarse las reglas o la auditoría del endpoint dedicado.
- La action SSR de Apariencia llama al nuevo API, adjunta la cabecera anti-CSRF desde servidor y conserva el refresh/reintento cuando caduca el access token.
- Prueba E2E `perfil-apariencia.e2e-spec.ts`: confirma rechazo sin CSRF, rechazo si falta cualquiera de los campos, escritura y auditoría correctas, y respuesta 429 en la solicitud 21 de la misma IP.

### Notificaciones globales con Sonner

- Instalado el componente oficial `sonner` mediante el CLI configurado de shadcn-svelte estilo Mira. Dependencias registradas con el gestor del proyecto: `svelte-sonner` y `mode-watcher`; `package-lock.json` queda como único lockfile.
- Una sola instancia global de `<Toaster>` vive en el layout raíz, disponible también en login y futuras rutas. Posición `top-right`, máximo cuatro visibles, cierre manual, duración de cuatro segundos y soporte claro/oscuro.
- El wrapper generado se adaptó a los tokens existentes (`canvas`, `ink`, `hairline`, radio pequeño y tipografía del sistema) sin cambiar el template.
- Apariencia reemplazó los mensajes incrustados por `toast.success` y `toast.error` al guardar mediante la action SSR. Mantiene claves i18n y atributos accesibles en español/inglés.
- `svelte-check`: 0 errores; build de producción correcto. La comprobación en navegador confirmó que el contenedor global accesible de notificaciones se monta en la aplicación.
- El botón `+` del header funciona temporalmente como demostración: muestra en secuencia, cada 600 ms, un toast de error, éxito, advertencia, información y neutral. Se bloquea durante el ciclo para evitar secuencias duplicadas y todos los textos usan i18n.
- Diseño visual de toast actualizado según la referencia entregada: superficie limpia, barra lateral de 4 px formada por fondo (no altera el layout), icono circular, título fuerte, descripción secundaria y cierre a la derecha. Éxito usa verde, error rojo, advertencia naranja, información azul y neutral gris; todos reutilizan los tokens claro/oscuro existentes.
- La demostración del header incluye ahora los cinco estados: error, éxito, advertencia, información y neutral. El Toaster admite cinco avisos visibles y conserva las animaciones, apilado y accesibilidad de Sonner.
- Corregido el centrado de los iconos: el wrapper anula los márgenes direccionales internos de Sonner, usa un contenedor flex fijo de `32 × 32` y elimina los márgenes del SVG para centrarlo en ambos ejes.
- Sonner quedó en modo `expand`: los avisos ya no se superponen; aparecen como filas independientes desde la esquina superior derecha hacia abajo, con 10 px de separación.
- Se instaló el `AlertDialog` oficial de shadcn-svelte y se creó `ConfirmationDialog.svelte` como confirmación reutilizable. Replica la referencia con icono circular, título y descripción centrados y acciones apiladas; admite las variantes `danger`, `warning`, `info`, `success` y `neutral`, usando los tokens semánticos en tema claro/oscuro.
- El componente conserva foco, teclado y cierre accesible de Bits UI. También espera acciones asíncronas antes de cerrarse y bloquea ambos botones durante su ejecución. La campana del header abre temporalmente una confirmación `danger` de demostración; al confirmar, muestra un toast de éxito. Todo el texto usa i18n.
- `ConfirmationDialog` queda disponible y documentado para acciones futuras que realmente requieran confirmación; ya no interviene en el guardado de Perfil/Apariencia.
- Corrección del patrón de confirmación: `ConfirmationDialog` fue migrado de `AlertDialog` a `Dialog` oficial de shadcn-svelte. Ahora se comporta como modal descartable al presionar el fondo o `Escape`, sin mostrar una `X`. La presentación se ajustó a la referencia con tarjeta de 420 px y radio amplio, icono circular de 76 px, texto centrado y dos botones de 56 px apilados a ancho completo.
- Perfil/Apariencia guarda directamente mediante su formulario SSR. Se eliminó el botón Cancelar: queda una sola acción con icono de disco; durante el envío el disco cambia por un spinner, el botón queda bloqueado y Sonner comunica el resultado final.
- Los errores de `PATCH /profile/appearance` ya no se sustituyen siempre por un texto genérico: la action SSR conserva el mensaje seguro y traducido del backend. El límite de la ruta es 20 solicitudes por IP; la número 21 bloquea esa ruta durante 60 segundos. Nest responde `429`, `Retry-After`, `retry_after_seconds` y `common.tooManyRequests`; Sonner lo presenta como advertencia indicando los segundos restantes. Otras rutas y la sesión continúan disponibles.
- Después de guardar Apariencia ya no se llama `update()` en el formulario mejorado. No hay `reset`, `invalidateAll` ni recarga visual: los selects conservan exactamente la selección activa, se apaga el spinner y únicamente aparece el resultado mediante Sonner. Una navegación posterior obtiene naturalmente los valores persistidos mediante SSR.
- El botón Guardar de Apariencia permanece deshabilitado mientras región y zona horaria sean iguales a los valores recibidos por SSR. También se cancela cualquier envío por Enter o disparado programáticamente cuando no existen cambios. Tras una respuesta correcta, la selección actual pasa a ser la nueva referencia y el botón vuelve a quedar deshabilitado sin recargar ni alterar el formulario.

---

## Refactor — Clean Architecture dentro de NestJS (2026-08-01)

- Los features usan las tres capas conocidas: `data`, `domain` y `presentation`. Sus subcarpetas estructurales también están en inglés; features, clases, métodos, mensajes y nombres de base de datos permanecen en español.
- `domain/entities` contiene entidades y comandos; `domain/repositories` contiene los contratos abstractos; `domain/usecases` contiene una clase con `ejecutar()` por acción.
- `data/datasources` concentra las consultas y transacciones Prisma. `data/repositories` implementa los contratos del dominio y delega en los datasources.
- `data/models` se utilizará cuando exista una representación de persistencia que necesite mapeo propio; no se duplican sin motivo los modelos ya generados por Prisma.
- `presentation/controllers` contiene los controladores y `presentation/dto` valida la entrada. Autenticación agrega `decorators`, `guards` y `strategies` dentro de presentación.
- `ContextoSolicitud` vive en `comun/domain/entities`: presentación adapta el `Request` antes de entregarlo al caso de uso. El dominio nunca recibe Express.
- Los módulos Nest son raíces de composición: registran datasource, implementación del repositorio y contrato mediante `{ provide, useExisting }`.
- Verificación de dependencias: `domain` no importa `data`, `presentation`, Express ni Prisma; los controladores no acceden a Prisma.
- Se corrigió la prueba antigua del rate limit que todavía esperaba `familia`; ahora verifica el `sid` estable del modelo de sesión actual.
- Comportamiento preservado: build correcto, lint completo sin errores, 5/5 pruebas unitarias y 16/16 E2E. Las E2E usan `app.init()`/`app.close()` y no abren un puerto de escucha.
- Lineamientos completos en `backend/ARCHITECTURE.md` y reglas obligatorias añadidas a `backend/CONVENTIONS.md`.

---

## Esquemas, auditoría e historial de eventos (2026-08-01)

- Migración aplicada `20260801220000_relocate_user_settings_and_event_history`: `configuracion_usuario` y `preferencias_usuario` pasaron a `seguridad`; `auditoria` pasó a `configuracion`. No se borraron filas.
- `eventos.eventos` incorpora `fid_usuarios UUID` e índice `(fid_usuarios, ocurrido_en)` para listar eficientemente el historial cronológico por usuario. No tiene FK hacia usuario: el historial debe sobrevivir a una baja futura.
- Migración aplicada `20260802020000_eventos_maestro`: creada `eventos.eventos_maestro` con UUID, código/version únicos, agregado, nombre, descripción, visibilidad, estado y auditoría estándar. `eventos.eventos` reemplazó los textos libres de tipo/agregado/version por `fid_eventos_maestro UUID` con FK restrictiva.
- Los contratos históricos no reconocidos se conservan automáticamente como inactivos y no visibles; no se destruye historial. El seed sincroniza los contratos aprobados: login correcto, logout, apariencia, datos personales, avatar actualizado y avatar eliminado.
- `eventos-funcionales.ts` conserva únicamente códigos y versiones tipados que la aplicación puede emitir. Nombre, descripción, agregado, visibilidad y estado salen de `eventos.eventos_maestro`. `registrarConEvento()` consulta el maestro dentro de la transacción, valida el agregado y hace rollback si falta o está inactivo.
- Verificación del maestro: 18 migraciones aplicadas, seed sincronizado, Prisma válido/generado, build y lint correctos, 5/5 pruebas unitarias y 16/16 E2E. `database/sumaq_system.sql` fue regenerado sin datos. No se abrieron puertos.
- `ServicioAuditoria.registrar()` escribe únicamente en `configuracion.auditoria`. `registrarConEvento()` agrega explícitamente la actividad funcional a `eventos.eventos`; cuando se llama dentro de un cambio de negocio, todas las escrituras comparten transacción y cualquier fallo revierte todo.
- Generan auditoría + evento funcional únicamente las acciones aprobadas hasta ahora: login correcto, logout, apariencia/región/zona, actualización de datos personales, cambio de avatar y eliminación de avatar. Preferencias rápidas de tema/idioma/menú y baja lógica de empresa conservan auditoría transaccional, pero no crean filas en `eventos.eventos`. Los intentos fallidos y el reuso de refresh quedan solo en auditoría de seguridad.
- Refresh correcto no crea auditoría ni evento: actualiza generación, hash, ventanas, `ultimo_uso_en` y último acceso del dispositivo en `seguridad.sesiones`. El registro del cliente se audita solo cuando cambian sus datos, pero no aparece en eventos. Actualizar token FCM no crea historial técnico.
- Dispositivos comparan valores anteriores antes de escribir. Tokens FCM, identificadores Firebase y detalles del equipo no se copian al historial. La baja de empresa usa una actualización condicional: clics concurrentes no pueden crear dos bajas ni dos eventos válidos.
- Lecturas (`GET`) y navegación no generan eventos. El historial representa cambios de estado y acciones de seguridad, no cada render o clic visual.
- No se añade `try/catch` local que oculte errores: la excepción hace rollback y el filtro global de Nest devuelve una respuesta controlada. Así no quedan cambios sin auditoría ni auditorías de cambios inexistentes.

### Perfil / Actividad real por usuario (2026-08-02)

- `GET /profile/activity` quedó implementado dentro del feature `perfil` respetando `data/domain/presentation`: entidad, contrato, caso de uso, repository de data, datasource Prisma, DTO y controlador.
- El endpoint obtiene `id_usuarios` y `fid_organizaciones` exclusivamente de la sesión validada. El cliente no envía ni puede escoger otro usuario; la consulta filtra simultáneamente por usuario, tenant y `estado = 1`.
- Solo devuelve campos necesarios para la vista: identificador, tipo de evento, instante y agente de usuario. La IP continúa almacenada para seguridad, pero ya no se expone ni se muestra en Actividad. Tampoco entrega `datos`, `metadatos`, identificadores de otros usuarios ni detalles internos del agregado.
- La respuesta está paginada (20 por página desde SSR, máximo 50 en API) y limitada globalmente a los 500 eventos más recientes. Se ordena por `ocurrido_en DESC` e identificador descendente, por lo que la actividad más actual siempre aparece arriba. La ruta admite 30 solicitudes por minuto e IP.
- Actividad toma el código público mediante la relación con `eventos_maestro` y solo incluye contratos con `visible_actividad = true`; nunca depende de tipos escritos libremente en el historial.
- PostgreSQL entrega `ahora`; la zona IANA activa se obtiene obligatoriamente de las preferencias del usuario. La vista usa esa zona explícitamente para agrupar en Hoy/Ayer/fecha y formatear cada hora, sin alterar el instante UTC almacenado ni depender de la zona del navegador. No existe fallback silencioso.
- `/profile/activity/+page.server.ts` carga todo antes de renderizar. No usa `onMount`, fetch del navegador ni datos simulados. Las páginas fuera del rango se redirigen a la última página válida.
- La interfaz conserva el timeline existente, añade estado vacío, traducciones EN/ES, descripción básica de navegador/SO y paginación SSR accesible.
- Pruebas E2E: exigen sesión, verifican campos públicos, fecha de PostgreSQL, zona horaria, aislamiento frente a otro usuario, orden descendente y límite estricto de 500 eventos.
- Verificación final del bloque: Prisma válido, build y lint del backend correctos, 5/5 pruebas unitarias y 16/16 E2E. Frontend con `svelte-check` sin errores y build de producción correcto; permanece únicamente una advertencia previa de `superForm` en login. Las pruebas E2E usan `app.init()`/`app.close()` y no abren puertos.

---

## Perfil / Datos personales con SSR y Superforms (2026-08-02)

- `/profile` dejó de usar datos simulados. Su `+page.server.ts` espera primero el contexto autenticado y luego carga `GET /profile/personal`; persona, catálogos y roles están completos antes del primer render. No existe `onMount` ni consulta del navegador para completar el formulario.
- El formulario usa `sveltekit-superforms` + Valibot en servidor y cliente. Conserva validación por campo, bloquea Guardar mientras no haya cambios o exista un envío activo, muestra disco/spinner y comunica el resultado con Sonner sin resetear ni recargar la vista.
- El correo ya no es un input editable. Solo se muestra como dato de la cuenta. El rol llega desde las asignaciones activas del usuario y se presenta al final como campo informativo deshabilitado; nunca se acepta dentro del payload de actualización.
- Se exponen todos los campos editables actuales de `personas.personas`: nombres, apellidos, tipo/número de documento, sexo, fecha de nacimiento, teléfono y URL de foto. Todos usan los componentes reutilizables `Input`/`Select`, iconos de la misma línea y grid de 12 columnas adaptable.
- `configuracion.parametros` contiene los grupos activos `tipos_documento` y `sexos`. Sus opciones se crean mediante migración y se leen exclusivamente desde PostgreSQL; el seed no conserva ni sincroniza una copia.
- Nuevo API Clean Architecture: casos de uso de consulta/actualización, contrato de repositorio, implementación, datasource Prisma, DTO y controlador. `GET /profile/personal` admite 30 solicitudes/minuto; `PATCH /profile/personal`, 20/minuto. Ambos exigen sesión; PATCH conserva CSRF global, tenant de la sesión, whitelist DTO y validación de catálogos activos.
- El frontend nunca envía usuario, empresa, correo ni roles. El backend obtiene usuario/tenant desde JWT y exige que usuario y persona estén activos y pertenezcan a esa organización.
- La fecha de nacimiento es civil (`date`, sin zona horaria): PostgreSQL valida calendario y que no sea futura usando `CURRENT_DATE`; PostgreSQL también hace la conversión y el trigger fija `updated_at` con reloj de base.
- La actualización bloquea la fila con `SELECT … FOR UPDATE`, vuelve a validar dentro de la transacción y guarda persona + auditoría como unidad indivisible. Solicitudes concurrentes se serializan; si falla cualquier paso, todo hace rollback. La auditoría guarda únicamente nombres de campos modificados, no valores personales sensibles.
- Actualizar datos personales crea auditoría y evento funcional `perfil.datos_personales.actualizados`; aparece en Actividad como una acción independiente del avatar.
- El campo URL de foto y el campo informativo de roles fueron retirados del formulario. Los roles continúan en el card de identidad superior con el badge azul `tag-sky`, alineado con el estilo general. Escribir nombres o apellidos ya no altera ese card: cambia únicamente después de guardar correctamente.
- Validación simétrica frontend/backend/base: nombres, apellido paterno y apellido materno son obligatorios; sexo, fecha de nacimiento y teléfono son opcionales. Los máximos son nombres 50 y apellidos 30 cada uno en `maxlength`, Valibot, DTO Nest y columnas PostgreSQL `varchar(50/30/30)`; documento conserva 40 y teléfono 30. Fecha usa el control nativo de fecha, selects solo aceptan catálogos y avatar conserva su límite binario. Los nombres admiten letras Unicode, espacios, apóstrofes y guiones; documento y teléfono tienen patrones cerrados. Si se informa sexo, el backend exige que pertenezca al catálogo activo; la fecha civil continúa validándose en PostgreSQL.
- Migración aplicada `20260802102000_person_name_lengths`: comprueba primero que no existan valores antiguos fuera de rango y después limita físicamente las tres columnas, sin truncamiento silencioso. Prisma fue regenerado y el snapshot `database/sumaq_system.sql` refleja `varchar(50/30/30)`.
- Avatar separado en `GET/POST/DELETE /profile/avatar`. La entrada admite como máximo `2 MB` y solo extensiones `.png`, `.jpg`, `.jpeg`, MIME PNG/JPEG, firma binaria correspondiente y contenido real decodificable del mismo formato. Sharp limita píxeles, rechaza imágenes múltiples, corrige orientación, recorta al centro a `80×80`, aplana transparencia y elimina metadatos/contenido añadido mediante recodificación completa. La salida comienza en JPEG al `90%` y reduce recursivamente la calidad, con límites finitos, hasta pesar como máximo `5 KB`.
- Los archivos viven fuera de exposición estática, bajo la raíz obligatoria `UPLOADS_DIRECTORY`, dentro de `uploads/avatars/<organización>/<usuario>/`, con nombre UUID generado por el servidor y permisos restringidos. Nunca se usa el nombre aportado por el usuario. `AVATAR_MAX_BYTES` es obligatorio y debe equivaler exactamente a `2 MB` tanto en Nest como en SvelteKit; no existe fallback silencioso.
- Cambio de avatar usa archivo nuevo versionado, transacción con bloqueo `FOR UPDATE`, actualización de `personas.foto_url`, auditoría y evento `perfil.avatar.actualizado`. Si la transacción falla, elimina el archivo nuevo; después del commit limpia el anterior. Eliminar avatar confirma base + auditoría + evento `perfil.avatar.eliminado` y luego limpia el archivo. Un fallo de limpieza solo puede dejar un archivo huérfano, nunca una referencia de base rota.
- El lápiz lateral del avatar abre `DropdownMenu` oficial shadcn-svelte con «Subir foto» y «Borrar foto». La selección sube automáticamente mediante XHR; el círculo muestra porcentaje durante transferencia y Sonner informa éxito/error. Borrar muestra spinner y Sonner. El proxy SSR `/media/avatar` conserva sesión, refresh, CSRF, errores traducidos y `no-store`.
- El menú de usuario del header dejó de usar identidad simulada: muestra únicamente el primer nombre + apellido paterno, limitado a 30 caracteres y a 180 px con elipsis para no ensanchar el header; rol principal y avatar también llegan desde el contexto real `/auth/me` durante SSR. Guardar datos personales, subir avatar o borrarlo actualiza el header inmediatamente después de una respuesta correcta. Un canal validado `BroadcastChannel`, con fallback de `storage`, replica el cambio en las demás pestañas del mismo usuario y origen sin recargar; una navegación/SSR posterior vuelve a tomar PostgreSQL como autoridad.
- Rate limit: lectura de avatar 60/minuto; subida y eliminación 20/minuto por IP. Se mantienen guardias globales de sesión, tenant, cuenta y CSRF. Multipart admite exactamente un archivo, cero campos adicionales y se limita antes de mantenerlo en memoria; no se usa el límite redundante `parts`, porque produce falsos rechazos según cómo el navegador/proxy construya la solicitud. MIME, extensión, firma, formato decodificado, píxeles y peso se validan en profundidad; los originales nunca se guardan. La lectura fuerza JPEG, `nosniff`, CSP sandbox, mismo origen, sin caché y nombre seguro. Errores multipart se convierten en respuestas controladas.
- Migración aplicada `20260802050000_profile_personal_avatar_events`; agrega los tres maestros funcionales del perfil. El snapshot sin datos `database/sumaq_system.sql` fue regenerado. `Sharp`, `multer` y tipos quedaron registrados en dependencias. Auditoría de producción: 0 vulnerabilidades altas o críticas; las 6 moderadas existentes pertenecen al árbol Firebase ya documentado.
- E2E dirigido: 9/9. Comprueba sesión, CSRF, validación personal, evento personal, rechazo superior a `2 MB`, imagen inválida, procesamiento real `80×80 JPEG` de máximo `5 KB`, lectura autenticada, eventos separados de cambio/borrado, limpieza de base y rate limit 429. Frontend conserva `svelte-check` sin errores y build productivo correcto; solo permanece la advertencia previa de Superforms en login.
- Se ampliaron `Avatar` para foto con fallback a iniciales e `Icon` con los símbolos requeridos, sin cambiar los tokens ni el template visual existente. Nombres y ambos apellidos comparten el icono `user` para mantener consistencia visual. Textos y catálogos visibles tienen traducción español/inglés.
- Verificación: migración aplicada, Prisma generado y snapshot `database/sumaq_system.sql` regenerado sin datos; build y lint dirigido del backend correctos; prueba E2E de sesión, CSRF, catálogos, rol, exclusión de correo, escritura, auditoría y ausencia de evento correcta. Frontend: `svelte-check` sin errores y build productivo correcto. No se abrió ningún puerto.

---

## Cierre de avance — seguridad del refresh (2026-07-31)

### Completado

- Política temporal obligatoria y sin valores por defecto: access de 15 minutos, inactividad deslizante de 2 horas, refresh rotativo de 12 horas y límite absoluto de sesión de 30 días.
- PostgreSQL es la autoridad de tiempo para expiración, actividad, inactividad, gracia de reuso y rotación; no se toman decisiones temporales con el reloj de Node.
- Refresh almacenado con HMAC-SHA-256 y comparación en tiempo constante. Argon2 queda únicamente como compatibilidad transitoria para sesiones heredadas y para contraseñas.
- Rotación serializada con `SELECT ... FOR UPDATE`: validación, revocación anterior, creación sucesora y auditoría se confirman o revierten juntas en una transacción.
- Protección contra replay: un token reutilizado solo compromete su propia familia, se procesa una única vez y no puede cerrar sesiones nuevas ni otros dispositivos.
- JWT restringido expresamente a `HS256`, tanto al firmar como al verificar access y refresh.
- Rate limit en dos capas: 20 solicitudes por minuto por IP y 10 por minuto por familia firmada. Las variables de configuración son obligatorias.
- Frontend SSR con refresh automático y single-flight local para evitar rotaciones duplicadas cuando coinciden cargas o pestañas.
- Migraciones aplicadas y esquema sincronizado. Verificaciones correctas: Prisma, build backend, lint dirigido, build frontend, 5 pruebas unitarias y 10 pruebas E2E contra PostgreSQL real.

### Pendientes deliberados

- Configurar IP real y `trust proxy` al definir nginx, Cloudflare y el despliegue definitivo. Se omitió ahora por decisión del usuario.
- Revisar las 6 alertas moderadas transitivas relacionadas con Firebase. No existen alertas altas ni críticas y no se actualizaron dependencias por decisión del usuario.
- Sustituir el rate limit y el single-flight en memoria por almacenamiento compartido (por ejemplo, Redis) únicamente cuando backend o frontend SSR se ejecuten en varias instancias.
- Retirar la compatibilidad Argon2 para refresh después de que hayan expirado todas las sesiones heredadas y se confirme que la base ya no contiene hashes antiguos.

**Estado actual:** el flujo de refresh queda completo y validado para la arquitectura actual de una sola instancia. Los puntos anteriores son tareas futuras de despliegue, distribución o limpieza; no bloquean el login ni la renovación de sesión actuales.

---

## Perfil / Cuenta y cambio de contraseña (2026-08-02)

- `/profile/account` dejó de ser maqueta. Se retiraron correo y desactivación de cuenta; queda únicamente cambio de contraseña con SSR, Superforms, Valibot, iconos, disco/spinner, bloqueo durante envío y Sonner.
- Cuenta muestra un card superior de correo únicamente informativo: toma correo y estado real `correo_verificado_en` desde `/auth/me` durante SSR, sin input ni apariencia editable. Su composición sigue el patrón informativo de GitHub: correo y badges «Principal»/«Verificado» en una misma fila, descripción debajo y un único contenedor con borde, usando los colores propios del sistema. No existe control ni API de edición; una cuenta sin confirmación no recibe falsamente el badge verificado.
- Composición visual ajustada al grid de 12 columnas: contraseña actual, nueva, confirmación y panel de seguridad quedan apilados verticalmente, cada uno con ancho 6/12 y ancho completo en móvil. Contraseña actual usa `key-round`, icono existente en la línea Lucide del proyecto.
- Política alineada con login en frontend y backend: 8–128 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial no vacío. La UI muestra cinco criterios y nivel débil/medio/seguro; Guardar solo se habilita con contraseña actual, política completa y confirmación coincidente.
- Nuevo `PATCH /profile/password` bajo `data/domain/presentation`: DTO con whitelist global, caso de uso, contrato, repository y datasource. Usuario, tenant y sesión salen exclusivamente del contexto autenticado; el cliente no puede escogerlos.
- Verifica contraseña actual con Argon2id y rechaza la nueva si coincide con la actual o cualquiera de las cinco anteriores. Solo se conservan los cinco hashes históricos más recientes. Nunca se guardan ni devuelven contraseñas en texto; la action SSR limpia los tres secretos antes de devolver cualquier resultado.
- Argon2 se ejecuta fuera de la transacción. Después PostgreSQL bloquea la credencial con `FOR UPDATE` y comprueba que el hash no cambió concurrentemente. Cambio de hash, historial, poda, revocación de todas las demás sesiones y auditoría/evento se confirman o revierten en una sola transacción.
- La sesión que ejecuta el cambio permanece activa, pero ya no conserva sus credenciales anteriores: después de comprobar la contraseña, el backend rota refresh y access, incrementa `generacion`, guarda el nuevo HMAC y devuelve ambas cookies HttpOnly. El access JWT también lleva `gen`; la estrategia exige que coincida con PostgreSQL antes de renovar actividad, por lo que ambos tokens anteriores dejan de autorizar inmediatamente. El `sid` no secreto permanece estable para conservar el canal SSE. Las demás sesiones quedan revocadas con `CURRENT_TIMESTAMP` y reciben `session_revoked` después del commit. Si excepcionalmente la rotación actual falla después del cambio, el controlador intenta revocar esa sesión y siempre limpia sus cookies: falla cerrada hacia login, nunca continúa deliberadamente con tokens antiguos.
- Evento funcional nuevo `perfil.contrasenia.actualizada` sobre `credenciales`, visible en Actividad como “Cambio de contraseña”. Metadatos guardan solo cantidad de sesiones revocadas; nunca hashes ni claves. Migración aplicada `20260802110000_profile_password_event`; seed y catálogo comparten el mismo contrato.
- Todas las rutas actuales de Perfil quedaron con mínimo 20 solicitudes/minuto por IP: mutaciones 20, lecturas 30 o 60. `LIMITE_MUTACIONES_PERFIL = 20` queda como piso para próximas mutaciones del feature. La solicitud 21 recibe `429`, `Retry-After` y mensaje seguro; no bloquea otras rutas.
- E2E aislado con usuario temporal: 4/4 para CSRF, política, cambio real, historial, ausencia de secretos en auditoría/evento, conservación de sesión actual, revocación de otra sesión, rechazo de reutilización y rate limit 20→429. Suite existente de Perfil: 9/9 después de actualizar sus límites. La limpieza elimina toda información temporal.
- La suite de refresh dejó de depender de la contraseña mutable del superadmin: crea su propia cuenta temporal, ejecuta 10/10 escenarios y la elimina. Así una contraseña real cambiada desde Perfil no rompe pruebas ni suma intentos fallidos a la cuenta propietaria.
- Verificación: migraciones 23/23 aplicadas, Prisma válido/generado, snapshot SQL regenerado, build Nest correcto, `svelte-check` sin errores y build SvelteKit correcto. No se abrió ningún puerto.
- Se retiró el maestro histórico inactivo `preferencias.usuario.actualizada` y sus 4 eventos técnicos antiguos mediante `20260802120000_remove_preference_update_event`; no será recreado por el seed ni aparece en Actividad. El mismo código se conserva únicamente como acción en `configuracion.auditoria` para rastrear cambios rápidos de tema, idioma y menú: esa tabla es independiente de `eventos_maestro`.

---

## Usuario de acceso, correos y UBIGEO (2026-08-02)

- El login dejó de usar correo. `seguridad.usuarios.usuario` es la credencial única por organización: 1–20 caracteres, solo letras y números, normalizada en mayúsculas en frontend, DTO, seed y PostgreSQL. El superadministrador propietario quedó como `JRUIZT`.
- Access JWT, refresh, `/auth/me`, guardias y SSR transportan/revalidan `usuario`; ningún correo forma parte del token ni decide el acceso.
- Contraseñas unificadas a 8–20 caracteres en login, cambio de contraseña, frontend, backend y seed; se mantienen mayúscula, minúscula, número, carácter especial, Argon2id e historial de cinco claves.
- Los correos se movieron a `personas.personas_correos`. Una persona puede tener hasta diez activos, cada uno conserva su verificación y un índice parcial garantiza un solo correo activo para notificaciones. Agregar y seleccionar correo usan endpoints autenticados, CSRF, límite 20/minuto, validación, bloqueo de persona, transacción y auditoría. Un correo no verificado no puede seleccionarse para comunicaciones sensibles.
- Cuenta lista los correos con badges, permite agregar otro y elegir mediante select el correo verificado de notificaciones. Las mutaciones pasan por actions SSR con refresh automático y muestran Sonner sin recargar ni resetear la vista.
- Datos personales incorporan estado civil, nivel de instrucción, país, procedencia y residencia mediante jerarquía administrativa, dirección, referencia, teléfono principal y teléfono de emergencia. Estado civil y nivel salen de `configuracion.parametros`.
- La vista de Datos personales quedó dividida en cards semánticos: identidad y avatar, información personal, ubicación/procedencia y contacto/dirección. Existe separación vertical clara después de identidad. Cada card editable muestra su propio botón Guardar, pero todos son submits del mismo Superform y ejecutan una sola operación transaccional sobre el formulario completo.
- Catálogo territorial nuevo en `configuracion`: 25 departamentos, 196 provincias y 1,892 distritos del catálogo oficial INEI publicado el 17-09-2025. La UI selecciona departamento/provincia/distrito, el contrato envía UBIGEO de seis dígitos y PostgreSQL guarda la relación al distrito, evitando jerarquías contradictorias.
- Migraciones `20260802150000_username_person_contact_ubigeo` y `20260802151000_normalize_username`, ambas aplicadas; seed ejecutado y snapshot `database/sumaq_system.sql` regenerado sin datos. Validación: Prisma, build Nest, 5 unitarias, 24 E2E (incluye correos), `svelte-check` sin advertencias y build SvelteKit.
# Avance 2026-08-02 — jerarquía territorial global y ubicaciones de persona

- Se normalizó territorio con `configuracion.admin_level_0`, `admin_level_1`, `admin_level_2` y `admin_level_3`.
- Los UUID y los 25/196/1892 registros existentes de Perú se conservaron mediante migración por renombre.
- Level 3 admite Level 2 nulo; el seed de México prueba la ruta Estado → Municipio/Alcaldía.
- Cada país define las etiquetas locales de sus niveles; la UI no mantiene nombres territoriales hardcodeados.
- `personas.personas` separa nacimiento/procedencia y residencia actual, cada una con país y Level 3 propios.
- Checks y trigger de PostgreSQL impiden pares incompletos o una división territorial perteneciente a otro país.
- Se creó `FuenteDatosCatalogoTerritorialPrisma.listarJerarquiaAdministrativa()` y se integra en el SSR de Datos personales.
- El formulario presenta dos jerarquías independientes, oculta Level 2 cuando el país no lo usa y conserva el guardado transaccional con auditoría.
- La preferencia regional ahora referencia `fid_admin_level_0`; se actualizaron Prisma, backend y frontend sin cambiar el comportamiento existente.
- Migración aplicada: `20260802160000_global_admin_levels_person_locations` (26/26).
- Verificación: backend build; 5 unitarias; 25 E2E; frontend `svelte-check` y build productivo.
# Avance 2026-08-02 — estándar y regresión de formularios

- Se creó `LINEAMIENTOS_FORMULARIOS.md` como contrato obligatorio para formularios actuales y futuros.
- Toda mutación de negocio debe validar nuevamente al usuario activo dentro de la operación transaccional; la escritura y auditoría se revierten juntas.
- Las lecturas simples permanecen fuera de transacción porque no modifican estado.
- Datos personales ya verifica sesión vigente, usuario/persona activos, tenant, CSRF, DTO, catálogos, relaciones, rate limit y auditoría transaccional.
- Se agregaron pruebas E2E para usuario desactivado, campos desconocidos, tipos, formatos, catálogo, reglas cruzadas, ausencia de cambios, SQL injection, XSS, concurrencia, rollback y rate limit directo.
- Las nuevas pruebas detectaron y corrigieron la comparación frágil de “sin cambios”: ahora compara cada campo y funciona también bajo concurrencia.
- Verificación final: backend build, 5 unitarias, 31 E2E y frontend `svelte-check`, todo aprobado.
# Avance 2026-08-02 — Emails, autenticación y sesiones

- La pestaña Cuenta se renombró posteriormente a `Claves y acceso` y conserva únicamente el cambio seguro de contraseña.
- La gestión de múltiples correos se trasladó a `/profile/emails`; mantiene alta de correo y selección del correo verificado para notificaciones.
- Se creó `/profile/sessions` con carga SSR de sesiones reales asociadas a dispositivos; no usa datos de ejemplo.
- La sesión actual se identifica mediante el `sid` autenticado y se muestra junto con modelo, plataforma, sistema, versión, IP e historial horario convertido con la zona IANA del usuario.
- Se puede cerrar una sesión remota o todas las demás. La sesión actual no puede cerrarse por estas acciones.
- Cada cierre valida usuario, cuenta, persona, organización y tenant activos dentro de una transacción; revoca sesión, limpia FCM y registra auditoría/evento en la misma unidad.
- Tras el commit se avisa por SSE al dispositivo cerrado para expulsarlo inmediatamente.
- Se eliminó la interfaz independiente de Dispositivos y la antigua ruta Seguridad redirige a Claves y acceso.
- Se agregaron pruebas E2E aisladas para listado, sesión actual, usuario inactivo, CSRF, cierre individual, cierre masivo, revocación inmediata y auditoría.
- Verificación: backend build, 5 unitarias, 35 E2E, frontend `svelte-check` y build productivo; todo aprobado.

# Avance 2026-08-02 — Switch de autenticación 2FA

- En `/profile/account`, debajo del cambio de contraseña, se agregó un card de autenticación de dos factores con switch, estado Activado/Desactivado, botón con disco/spinner y mensajes Sonner.
- El valor llega en el contexto autenticado durante SSR, por lo que no aparece con un estado provisional ni se consulta desde `onMount`.
- No se guardó en `preferencias_usuario`: el esquema ya contenía `seguridad.usuario_mfa`, que es la ubicación correcta para una configuración de seguridad. Se reutiliza su booleano `habilitado` para el método `totp`.
- Nuevo `PATCH /profile/two-factor` siguiendo `data/domain/presentation`. Acepta exclusivamente `{ habilitado: boolean }`, toma usuario y tenant de la sesión, exige CSRF y aplica 20 solicitudes por minuto.
- La actualización vuelve a validar usuario, cuenta y tenant activos dentro de una transacción; hace `upsert` de `usuario_mfa` y registra auditoría en la misma confirmación.
- Por decisión funcional, todavía no genera secreto, QR, códigos ni modifica el login. La UI avisa expresamente que el switch solo conserva la decisión hasta implementar el enrolamiento 2FA.
- Se agregó cobertura E2E para CSRF, tipo booleano, persistencia en `usuario_mfa` y exposición en `/auth/me`. La suite está escrita, pero su ejecución local quedó detenida en el login porque la contraseña actual de la cuenta ya no coincide con `SUPERADMIN_PASSWORD`; no se alteraron datos para forzarla.
- Verificación disponible: Prisma sincronizado con 31 migraciones, build Nest correcto, 5/5 unitarias, `svelte-check` con 0 errores y 0 advertencias, y build SvelteKit correcto. No se abrió ningún puerto.

# Avance 2026-08-02 — Correos múltiples, usos y verificación provisional

- Se conservó `personas.personas_correos` como tabla normalizada de múltiples correos por persona; no se creó una segunda tabla duplicada.
- Nueva tabla `personas.personas_correos_usos`: asigna un correo a cada finalidad `principal`, `mensajes` y `respaldo`. La restricción única `(fid_personas, tipo)` garantiza una sola selección por finalidad y la FK compuesta impide asociar un correo perteneciente a otra persona.
- El antiguo booleano `es_notificacion` fue retirado. La migración `20260802200000_email_uses_and_manual_verification` convirtió su selección existente en los tres usos iniciales para correos ya verificados.
- PostgreSQL valida mediante trigger que todo uso activo apunte a un correo activo y verificado. Si un correo pierde verificación o se desactiva, otro trigger retira automáticamente todos sus usos activos.
- El seed asigna el correo verificado del propietario como principal, mensajes y respaldo de forma idempotente. No se ejecutó el seed durante este avance para no restablecer la contraseña actual del propietario.
- La UI de `/profile/emails` mantiene el estilo existente y ahora contiene: lista de varios correos, badges por uso, switch provisional de verificación, formulario de alta y tres selectores independientes para principal, mensajes y respaldo. Solo aparecen correos verificados en esos selectores.
- El switch actualiza `verificado_en` con `CURRENT_TIMESTAMP` de PostgreSQL. Es una herramienta provisional solicitada para desarrollo; todavía no envía OTP. Al desactivarlo, la UI y la base eliminan inmediatamente las asignaciones del correo.
- Nuevas rutas: `PATCH /profile/emails/use` y `PATCH /profile/emails/:id/verification`. Ambas toman usuario/tenant de la sesión, exigen CSRF, validan DTO/UUID/enum/boolean, aplican 20 solicitudes por minuto y guardan cambio + auditoría dentro de una transacción con persona bloqueada.
- `/auth/me` y el SSR exponen por correo `usos[]` y `verificado`; la vista llega completa antes del render y no usa `onMount` para consultar datos.
- Prueba E2E aislada aprobada: alta, rechazo sin CSRF, rechazo de booleano/tipo inválidos, bloqueo en API y PostgreSQL de correos no verificados, verificación, asignación de los tres usos, desverificación, retiro automático de usos y auditoría. También aprobaron 5/5 unitarias, build Nest, `svelte-check` sin errores/advertencias y build SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-02 — Alta única y autoguardado de usos de correo

- El formulario de alta ocupa 4/12 columnas, muestra el icono de correo y usa un botón cuadrado `+`; conserva ancho adaptable en móvil.
- Los tres selectores de uso ahora guardan automáticamente al cambiar. No existe botón Guardar. Durante la solicitud el selector queda bloqueado, muestra progreso y, ante error, recupera la selección confirmada; Sonner informa éxito, validación o `429`.
- El alta normaliza el correo y exige unicidad dentro de toda la organización, no solo dentro de la persona. `personas_correos.fid_organizaciones` queda protegido por FK compuesta con persona y por restricción única `(fid_organizaciones, correo)` para impedir duplicados incluso bajo concurrencia.
- La selección de uso vuelve a comprobar dentro de la transacción que usuario, cuenta, organización y persona estén activos; que el correo pertenezca a esa persona y organización; y que esté activo y verificado. El trigger PostgreSQL conserva la misma regla como defensa adicional.
- Migración aplicada `20260802201000_email_unique_per_organization`; Prisma validado/generado y snapshot `database/sumaq_system.sql` actualizado sin datos.
- Verificación aprobada: build Nest, 5/5 unitarias, E2E de correos 2/2 (incluye correo inactivo y duplicado de otra persona del mismo tenant), `svelte-check` sin errores/advertencias y build SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-02 — Modificación y eliminación de correos

- Cada correo muestra al extremo derecho un menú `…` de shadcn-svelte con acciones Modificar y Eliminar, adaptado a los componentes, colores, animaciones e iconos existentes.
- Modificar abre un Dialog accesible con el correo actual. Exige un formato válido y un cambio real. Al confirmar, normaliza el nuevo correo, valida unicidad en toda la organización, reinicia su verificación y el trigger PostgreSQL retira automáticamente sus usos anteriores.
- Eliminar usa el `ConfirmationDialog` de peligro. La eliminación es lógica (`estado = 0`), conserva trazabilidad y retira verificación/usos; la lista se actualiza inmediatamente y Sonner informa el resultado.
- Nuevas rutas `PATCH /profile/emails/:id/address` y `DELETE /profile/emails/:id`, ambas con sesión, tenant, usuario/cuenta/organización/persona activos, CSRF, UUID v4, DTO whitelist, rate limit 20/minuto, pertenencia del correo, transacción y manejo de errores seguro.
- Modificación y eliminación registran auditoría y evento funcional dentro de la misma transacción. Los maestros `perfil.correo.modificado` y `perfil.correo.eliminado` son visibles en `/profile/activity` con iconos y traducciones propias. No se guarda el correo en metadatos del evento para evitar duplicar información personal.
- Migración aplicada `20260802202000_email_update_delete_events`; seed, catálogo, Prisma y snapshot `database/sumaq_system.sql` quedan alineados.
- Verificación aprobada: build Nest, 5/5 unitarias, E2E de correos 3/3 (CSRF, duplicado, normalización, reinicio de verificación, retiro de usos, baja lógica, auditoría y actividad), `svelte-check` sin errores/advertencias y build SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-02 — Retiro de triggers de negocio

- Por decisión arquitectónica, PostgreSQL ya no ejecuta efectos empresariales ocultos ante cambios manuales. Se eliminaron los tres triggers `personas_validar_ubicaciones_administrativas`, `validar_correo_verificado` y `retirar_usos_si_no_verificado`, junto con sus funciones PL/pgSQL.
- Se conservan exclusivamente los triggers técnicos `establecer_updated_at`, que asignan `CURRENT_TIMESTAMP` de PostgreSQL sobre la misma fila ya actualizada.
- Validación territorial ya estaba en el caso de uso de Datos personales: verifica país y Level 3 activos y relacionados antes de escribir.
- Seleccionar un uso de correo ya valida dentro de la transacción que el correo pertenezca al usuario/tenant y esté activo y verificado. Modificar, eliminar, desverificar y reactivar correo ahora retiran explícitamente sus usos con `updateMany` dentro de la misma transacción; auditoría y evento siguen participando en el mismo commit/rollback.
- Se mantienen restricciones declarativas `NOT NULL`, `CHECK`, `UNIQUE` y FK. Un cambio manual puede omitir reglas de negocio y queda bajo responsabilidad del operador, sin efectos automáticos inesperados.
- Migración aplicada `20260802203000_remove_business_triggers`. PostgreSQL confirma `0` triggers de negocio. Build Nest, 5/5 unitarias y E2E aislado de correos 3/3 aprobados. La suite E2E completa conserva un bloqueo previo ajeno a este cambio: pruebas antiguas de Apariencia intentan ingresar con la contraseña mutable del propietario y reciben `401`; no se alteraron credenciales para forzarla. No se abrió ningún puerto.

# Avance 2026-08-02 — Límite y estabilidad visual de correos

- Cada persona puede conservar como máximo 10 correos activos. El backend cuenta y valida el límite dentro de la misma transacción y después de bloquear la persona, por lo que solicitudes simultáneas no pueden superar el máximo; eliminar un correo libera un cupo.
- La vista también bloquea el campo y el botón de alta al alcanzar 10 correos y muestra el límite antes de enviar otra solicitud. La validación del backend continúa siendo la autoridad.
- En `Uso de tus correos`, el estado de autoguardado ahora ocupa una altura permanente: cambia su visibilidad sin insertar ni retirar contenido, evitando que las filas salten. También se amplió el espacio entre iconos y textos.
- Los usos `principal`, `mensajes` y `respaldo` forman un enum técnico cerrado de PostgreSQL/Prisma y se almacenan como filas de `personas.personas_correos_usos`; no son un maestro editable.
- Verificación aprobada: build Nest, E2E aislado de correos 4/4 —incluido rechazo HTTP 400 del correo número 11 y conservación de los 10 activos—, `svelte-check` sin errores/advertencias y build SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-02 — Correos institucionales y externos

- Se precisó el propósito de los usos: `principal` es la dirección institucional interna y puede asignarse sin verificación externa; `mensajes` y `respaldo` son direcciones externas y exigen verificación.
- La regla se aplica en backend dentro de la transacción y también en la UI: el selector principal lista todos los correos activos; los otros dos listan solo los verificados.
- Al retirar la verificación o modificar la dirección, se eliminan únicamente los usos externos `mensajes` y `respaldo`; el uso institucional `principal` se conserva. Al eliminar el correo sí se retiran todos sus usos.
- Se reescribieron los textos ES/EN para explicar el alcance real de cada dirección y evitar indicar que el correo principal sirve para acceso o que necesita verificación.
- En `Uso de tus correos`, cada selector ocupa 4/12 columnas y el texto 8/12. Los iconos quedan centrados verticalmente y separados del texto por el mismo ritmo de 20 px usado en el borde interior de la fila.
- Verificación aprobada: build Nest, E2E aislado de correos 4/4, `svelte-check` con 0 errores y 0 advertencias, y build SSR de SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-03 — Modal reutilizable y estado lógico obligatorio

- `ConfirmationDialog` ahora admite contenido de formulario, icono específico y bloqueo del botón de confirmación, conservando el mismo diseño accesible, cierre exterior y procesamiento asíncrono.
- Modificar correo reutiliza el mismo modal visual que Eliminar: variante informativa, campo validado, botones verticales y cierre únicamente después del resultado correcto. Eliminar correo conserva la variante de peligro.
- Cerrar una sesión individual también reutiliza `ConfirmationDialog`, muestra el dispositivo afectado y mantiene el modal abierto mientras el backend responde. La prueba E2E específica de cierre individual aprobó.
- Se añadió a `LINEAMIENTOS_FORMULARIOS.md` la obligación de filtrar explícitamente `estado = 1` en existencia, pertenencia, selección, modificación, eliminación, duplicidad y relaciones de tablas con baja lógica. Los registros `estado = 0` se consideran inexistentes para acciones de negocio.
- Modificar correo ya exigía que el objetivo estuviera activo; ahora la duplicidad también distingue estado. La restricción global se reemplazó por el índice único parcial `personas_correos_organizacion_correo_activo_key`, que impide dos correos activos iguales en un tenant pero permite reutilizar una dirección eliminada.
- Migración `20260803033000_active_email_unique` aplicada; Prisma y snapshot sin datos actualizados. E2E de correos 4/4 cubre duplicado activo, reutilización de correo inactivo y rechazo de modificar un registro eliminado.
- Verificación final: build Nest, migraciones al día, `svelte-check` 0 errores/0 advertencias y build SSR correctos. La prueba antigua de “cerrar todas las demás sesiones” sigue esperando una ruta `DELETE /profile/sessions` que actualmente no existe; queda fuera del cambio de cierre individual y no se simuló. No se abrió ningún puerto.

# Avance 2026-08-02 — Acciones requeridas en Emails

- Se creó `configuracion.acciones_requeridas_maestro` para definir acciones estables y `seguridad.acciones_requeridas` para su estado por usuario, tenant y recurso. No se usan preferencias ni contadores duplicados.
- Primer maestro: `perfil.correos.sin_verificar`, sección `emails`. Queda pendiente únicamente cuando existe al menos un correo activo sin verificar y se resuelve cuando todos están verificados.
- Alta, modificación, eliminación, cambio de uso y cambio provisional de verificación reconcilian la acción dentro de la misma transacción que correo y auditoría. Fallo en cualquier paso revierte todo.
- `/auth/me` incorpora `acciones_requeridas: { total, por_seccion }`; SvelteKit lo valida y lo entrega por SSR antes del primer render.
- Menú de Perfil muestra badge en Emails. Respuesta de cada mutación actualiza el badge inmediatamente y lo sincroniza entre pestañas mediante `BroadcastChannel`, sin nueva consulta cliente.
- La migración crea únicamente el maestro de la acción; el seed no copia datos maestros ni crea instancias para el usuario. La instancia nace al agregar un correo nuevo y luego se resuelve o reactiva según su verificación.
- Migraciones `20260803040000_required_actions`, `20260803041000_fix_required_email_action` y `20260803042000_update_required_email_copy` alinean estructura, regla y copy.
- Verificación aprobada: Prisma validate/generate, build Nest, 5/5 unitarias, E2E Emails 4/4 —creación, resolución, reapertura y `/auth/me`—, `svelte-check` 0 errores/0 advertencias y build SSR. Base y snapshot quedaron actualizados.

# Avance 2026-08-03 — Nacionalidades funcionales

- `/profile/nationalities` dejó de ser maqueta. El catálogo y las nacionalidades activas llegan por SSR desde `GET /profile/nationalities`; no se consultan mediante `onMount` ni se muestra información provisional.
- El selector ocupa 4/12 columnas, excluye países ya registrados y abre una confirmación antes del alta. Alta y eliminación muestran loader, bloquean dobles acciones y actualizan solo la lista confirmada, sin resetear ni recargar el formulario.
- Se reutiliza `personas.personas_nacionalidades`: la baja es lógica (`estado = 0`) y volver a agregar el país reactiva la misma fila. No existe edición porque la nacionalidad solo identifica el país seleccionado.
- Nuevas rutas `POST /profile/nationalities` y `DELETE /profile/nationalities/:id`. Aplican sesión global, CSRF, UUID v4, DTO whitelist, rate limit 20/minuto, usuario/cuenta/organización/persona activos, pertenencia al tenant y país activo.
- Las mutaciones bloquean la fila de persona con `FOR UPDATE`, guardan cambio y auditoría dentro de una transacción y conservan la restricción única persona–país. Solicitudes simultáneas producen una sola alta y un conflicto controlado.
- Migración `20260803110000_secure_person_nationalities`: agrega `CHECK (estado IN (0,1))` y el trigger técnico de hora PostgreSQL `establecer_updated_at`; no agrega triggers de negocio.
- Verificación aprobada: build Nest, `svelte-check` 0 errores/0 advertencias y E2E Nacionalidades 4/4 —sesión, CSRF, DTO estricto, alta, duplicidad, auditoría, aislamiento, baja lógica, concurrencia y usuario inactivo—. No se abrió ningún puerto.

# Avance 2026-08-03 — Eventos visibles de correos y nacionalidades

- El historial funcional incorpora `perfil.correo.agregado`, `perfil.correo.uso_seleccionado`, `perfil.correo.eliminado`, `perfil.nacionalidad.agregada` y `perfil.nacionalidad.eliminada`.
- Eliminar correo ya emitía evento; se conservó y se incluyó en la migración de sincronización para garantizar que los cinco maestros solicitados existan y estén activos.
- Alta/asignación de correo y alta/baja de nacionalidad ahora usan `registrarConEvento`: auditoría técnica y actividad funcional se escriben dentro de la misma transacción que el cambio. Si maestro, auditoría o evento fallan, se revierte la operación completa.
- Los identificadores técnicos del código, `eventos.eventos_maestro`, la traducción ES/EN y los iconos de `/profile/activity` quedan alineados. Los textos y propiedades del maestro existen solo en PostgreSQL. Migración: `20260803120000_profile_email_nationality_events`.

# Avance 2026-08-03 — Seguros funcionales y catálogo normalizado

- `/profile/insurance` dejó de ser maqueta. La vista recibe por SSR los seguros activos de la persona y el catálogo completo; no consulta datos en `onMount` ni renderiza valores provisionales.
- Se creó `configuracion.seguros_maestro` con las 24 instituciones proporcionadas y la opción `Otros`. El seed es idempotente y la migración incorpora el catálogo para instalaciones existentes y nuevas.
- `personas.personas_seguros` ahora referencia el maestro mediante UUID. Conserva el número de seguro y solo admite `nombre_otro` cuando el maestro seleccionado tiene `permite_otro = true`.
- La UI habilita dinámicamente el nombre de aseguradora al escoger `Otros`; permite agregar, modificar y eliminar con confirmación, spinner, bloqueo contra doble clic, Sonner y actualización local sin recargar la página.
- Nuevas rutas `GET/POST /profile/insurance` y `PATCH/DELETE /profile/insurance/:id`. Las mutaciones aplican sesión, CSRF, UUID v4, DTO whitelist, longitudes y caracteres permitidos, catálogo activo, usuario/cuenta/organización/persona activos, pertenencia al tenant, detección de duplicados y rate limit 20/minuto.
- Cada mutación bloquea la persona con `FOR UPDATE` y guarda el seguro, auditoría y evento funcional dentro de una sola transacción. La eliminación es lógica (`estado = 0`). Las FK, `CHECK`, índice único parcial e índice de catálogo refuerzan integridad y concurrencia sin triggers de negocio.
- Se agregaron los eventos visibles `perfil.seguro.agregado`, `perfil.seguro.modificado` y `perfil.seguro.eliminado`, con maestros, seed, traducciones e iconos para `/profile/activity`.
- Migración aplicada `20260803140000_profile_insurance_catalog`; Prisma regenerado, snapshot sin datos actualizado y base verificada con 25 maestros activos, uno de ellos `Otros`.
- Verificación aprobada: build Nest, E2E Seguros 3/3, `svelte-check` 0 errores/0 advertencias, build SSR y migraciones al día. No se abrió ningún puerto.

# Avance 2026-08-03 — Catálogos compartidos de Seguros y Hobbies

- Por decisión funcional, se retiró `configuracion.seguros_maestro`. Las 24 aseguradoras y `Otros` ahora viven en `configuracion.parametros` con `codigo_grupo = 'seguros'`, igual que los demás maestros editables del perfil.
- La migración conserva todos los seguros existentes: transforma su UUID de maestro en `codigo_seguro`, copia el catálogo a parámetros y solo después elimina la FK y tabla anterior. La base quedó sin seguros ni hobbies huérfanos.
- PostgreSQL contiene 25 parámetros de `seguros`, 31 de `hobbies` y 5 de `frecuencias_hobby`, creados por migraciones. El seed no contiene esas listas. Cada lectura SSR obtiene únicamente opciones activas y cada mutación vuelve a comprobar el código y `estado = 1` dentro de la transacción.
- `personas_hobbies` dejó de copiar la etiqueta del maestro. Guarda `codigo_hobby`, `codigo_frecuencia` y, únicamente para `otros`, `hobby_personalizado`. La migración convirtió registros anteriores sin perderlos.
- Hobbies ahora permite agregar, modificar y eliminar. Ambos selectores salen de `parametros`; “Otros” exige texto válido, el resto rechaza texto personalizado, y los duplicados se comparan sin distinguir mayúsculas/minúsculas.
- Los botones Modificar de Seguros y Hobbies usan el azul primario estándar. Los formularios bloquean dobles envíos, muestran spinner/confirmación/Sonner y deshabilitan Guardar cuando no existe un cambio real.
- Seguros y Hobbies aplican sesión, CSRF, DTO whitelist, patrones y longitudes, rate limit 20/minuto, usuario/cuenta/organización/persona activos, tenant, baja lógica, transacción, `FOR UPDATE`, restricciones declarativas e índices únicos parciales.
- Auditoría y evento participan en la misma transacción para las seis acciones: seguro agregado/modificado/eliminado y hobby agregado/modificado/eliminado. `/profile/activity` incorpora los tres eventos de Hobbies con traducciones e iconos.
- Migraciones aplicadas `20260803150000_profile_catalogs_in_parameters` y `20260803151000_profile_collections_updated_at`; la segunda agrega exclusivamente el trigger técnico que toma `updated_at` del reloj PostgreSQL en Seguros y Hobbies, sin lógica de negocio. Prisma y snapshot sin datos actualizados. Verificación aprobada: build Nest, E2E Seguros + Hobbies 6/6, `svelte-check` 0/0, build SSR y migraciones al día. No se abrió ningún puerto.

# Avance 2026-08-03 — PostgreSQL como única fuente de datos maestros

- Se eliminaron del código las listas `CATALOGO_SEGUROS`, `CATALOGO_HOBBIES` y `PARAMETROS_DATOS_PERSONALES`, junto con sus archivos de catálogo. Seguros, hobbies, frecuencias, documentos, sexo, estado civil, instrucción, teléfonos y tipos de estudio se leen únicamente de `configuracion.parametros` con `estado = 1`.
- El seed dejó de insertar o sincronizar parámetros, eventos, acciones requeridas y permisos. Las migraciones de PostgreSQL son responsables de crear los maestros; el seed se limita a crear la organización y cuenta propietarias y a relacionarlas con maestros activos existentes.
- Los contratos técnicos quedaron separados en `grupos-parametros.ts`, `eventos-funcionales.ts` y `acciones-requeridas.ts`. Solo contienen códigos necesarios para consultar o emitir una operación; no duplican etiquetas, nombres, descripciones, orden ni datos visibles.
- Migración `20260803152000_permissions_master_in_database` aplicada: los seis permisos iniciales ahora nacen en `seguridad.permisos` desde PostgreSQL. El seed falla explícitamente si no existe ningún permiso activo.
- Verificación directa de la base: 25 seguros, 31 hobbies, 5 frecuencias, 6 permisos, 19 eventos y 1 acción requerida activos. TypeScript, build Nest y 5/5 pruebas unitarias aprobados. No se abrió ningún puerto.

# Avance 2026-08-03 — Documentos y teléfonos funcionales

- `/profile/documents` y `/profile/phones` dejaron de ser maquetas. Ambas vistas reciben registros y maestros durante SSR; no consultan catálogos en `onMount` ni contienen listas visibles hardcodeadas.
- Los tipos de documento y teléfono salen exclusivamente de `configuracion.parametros`, grupos `tipos_documento` y `tipos_telefono`, filtrados por `estado = 1`. Las migraciones garantizan 6 tipos documentales y 4 tipos telefónicos iniciales.
- Documentos permite agregar y eliminar; Teléfonos permite agregar, modificar y eliminar, incluyendo titular y marca de emergencia. Todas las acciones usan confirmación, spinner, bloqueo contra doble clic, Sonner y actualización local sin recargar el formulario.
- Nuevas rutas `GET/POST /profile/documents`, `DELETE /profile/documents/:id`, `GET/POST /profile/phones` y `PATCH/DELETE /profile/phones/:id`. Aplican sesión, tenant, CSRF, UUID v4, DTO whitelist, normalización, caracteres y longitudes, maestro activo, usuario/cuenta/organización/persona activos y rate limit de 20 mutaciones por minuto.
- Cada mutación bloquea la persona con `FOR UPDATE`; cambio, auditoría y evento se confirman dentro de una misma transacción. Las bajas son lógicas (`estado = 0`) y permiten reactivar el registro posteriormente.
- La base impide documentos activos duplicados dentro de la organización por tipo+número y teléfonos activos equivalentes dentro de la persona aunque cambie su formato. Se agregaron FK compuesta de tenant, `CHECK`, índices parciales e índices de consulta; no existen triggers de negocio.
- Los cinco eventos visibles son `perfil.documento.agregado`, `perfil.documento.eliminado`, `perfil.telefono.agregado`, `perfil.telefono.modificado` y `perfil.telefono.eliminado`. La actividad tiene textos e iconos propios. Auditoría/eventos no duplican número de documento, teléfono ni titular en metadatos.
- Migración aplicada `20260803153000_profile_documents_phones`; Prisma validado/generado y esquema al día con 48 migraciones.
- Verificación aprobada: build Nest, 5/5 unitarias, E2E específico 3/3 y regresión Seguros+Hobbies+Documentos/Teléfonos 9/9; `svelte-check` 0 errores/0 advertencias y build SSR correcto. La suite E2E completa conserva fallos previos por credenciales/rate limit compartido y una ruta antigua de sesiones; las suites aisladas del alcance aprobaron. No se abrió ningún puerto.
- Los números cuyo maestro tiene código `movil` se presentan agrupados de tres en tres desde la derecha (`+51 999 111 222`) en la lista y confirmaciones. Es una transformación exclusivamente visual: formularios, API y PostgreSQL conservan el valor original.
- Documentos también permite modificar tipo y número mediante el mismo `ConfirmationDialog`. El botón permanece deshabilitado sin cambios y todos los controles se bloquean mientras se procesa la solicitud.
- Nueva ruta `PATCH /profile/documents/:id`: exige sesión, tenant, CSRF, UUID v4, DTO estricto, 20 mutaciones por minuto, documento/persona/usuario/organización activos, pertenencia, maestro activo, formato, longitud, cambio real y ausencia de duplicidad institucional.
- La modificación bloquea la persona con `FOR UPDATE` y confirma documento, auditoría y el evento visible `perfil.documento.modificado` dentro de una sola transacción. No copia el número documental a metadatos.
- Migración aplicada `20260803154000_profile_document_update_event`; 49 migraciones al día. E2E cubre CSRF, maestro inactivo, ausencia de cambios, registro eliminado, auditoría, actividad y persistencia; suite específica 3/3 y regresión de colecciones 9/9 aprobadas.

# Avance 2026-08-03 — Traducciones normalizadas de parámetros

- Se creó `configuracion.parametros_traducciones`, relacionada por UUID con `configuracion.parametros`, con una fila por parámetro e idioma, FK con borrado en cascada, idioma validado, etiqueta no vacía, unicidad `(fid_parametros, codigo_idioma)` e índice por idioma.
- La migración `20260803155000_parameter_translations` incorporó español e inglés para los parámetros existentes; las migraciones posteriores mantienen el mismo contrato. Actualmente existen 120 parámetros y 240 traducciones, sin maestros carentes de ES o EN.
- `parametros.etiqueta` se conserva como texto base/fallback; los códigos siguen siendo la única identidad funcional. Un idioma futuro se agrega mediante filas nuevas, sin alterar tablas de negocio ni crear columnas.
- Nest obtiene las traducciones como relación agrupada, las transforma una sola vez en `Record<idioma, etiqueta>` y las entrega en el SSR/API. No existe una consulta por opción ni catálogos visibles hardcodeados.
- Svelte usa el resolvedor común `parameterLabel`. Datos personales, documentos, teléfonos, seguros y hobbies reaccionan al mismo idioma activo; se retiraron los mapas particulares de sexo, estado civil e instrucción.
- Rendimiento base medido antes de ampliar Estudios: 92 parámetros + 184 filas traducidas, 184 resultados, 42 kB de ordenación y 0.341 ms de ejecución. El crecimiento actual sigue siendo pequeño y los índices cubren búsquedas puntuales; no se requiere caché.
- Verificación aprobada: Prisma generado y migración aplicada; build Nest; 6/6 unitarias; E2E Hobbies + Documentos/Teléfonos 6/6; E2E Seguros 3/3; `svelte-check` 0 errores/0 advertencias y build SSR. La suite histórica de Apariencia volvió a presentar su fallo previo de login/rate limit compartido (401 antes de llegar a estas consultas), sin relación con la traducción. Snapshot SQL regenerado. No se abrió ningún puerto.

# Avance 2026-08-03 — Estudios realizados y complementarios

- Se retiró el maestro `tipos_documento.sin_documento`: no representa un documento. Cualquier registro histórico activo de ese tipo se da de baja lógica antes de eliminar el maestro.
- `/profile/studies` ahora carga por SSR los estudios de la persona y cuatro catálogos desde PostgreSQL: niveles de instrucción, grados obtenidos, profesiones y tipos de estudio complementario. Todos usan `parametros_traducciones`; no existen opciones visibles hardcodeadas.
- Maestros nuevos: 10 grados obtenidos, 16 profesiones y 9 tipos complementarios. Cada grupo posee `otro`; únicamente esa elección exige y permite el texto personalizado correspondiente.
- Las tablas existentes `personas_estudios_realizados` y `personas_estudios_complementarios` fueron normalizadas. Guardan códigos estables, valores personalizados separados, periodo, estado en curso, baja lógica y autores técnicos.
- La migración `20260803160000_profile_studies` añadió `CHECK` de estado, fechas y coherencia de “Otro”; índices de búsqueda; unicidad parcial para registros activos; y trigger exclusivamente técnico para `updated_at`. No agregó triggers de negocio.
- Nuevas rutas: `GET /profile/studies`; `POST/PATCH/DELETE /profile/studies/academic`; y `POST/PATCH/DELETE /profile/studies/complementary`. Las mutaciones exigen sesión, tenant, CSRF, UUID v4, DTO whitelist, tipos, patrones, longitudes, maestros activos, coherencia de fechas y “Otro”, cambio real, usuario/organización/persona activos y rate limit 20/minuto.
- Cada mutación bloquea la persona mediante `FOR UPDATE`; dato, auditoría y evento funcional se confirman dentro de una sola transacción. Existen seis eventos visibles: alta, modificación y eliminación para cada clase de estudio.
- La maqueta plana fue reemplazada por dos colecciones. Cada una muestra botón Agregar; alta y modificación se completan dentro del modal compartido; eliminación usa confirmación de peligro. Botones, formulario y modal bloquean dobles envíos, muestran loader/Sonner y Guardar queda deshabilitado sin cambios.
- La vista conserva el grid de 12 columnas, tema claro/oscuro, iconos y traducciones ES/EN del sistema. El cambio de idioma actualiza inmediatamente maestros y textos.
- Verificación aprobada: Prisma válido/generado, 51 migraciones aplicadas, build Nest, 6/6 unitarias, E2E Estudios 3/3, regresión Documentos/Teléfonos 3/3, `svelte-check` 0/0 y build SSR. No se abrió ningún puerto.

# Avance 2026-08-03 — Modales amplios y nombre de estudio complementario

- Los modales de alta y modificación de estudios realizados y complementarios usan la variante amplia de `ConfirmationDialog`: 840 px máximos, exactamente el doble de la variante normal de 420 px, con ancho fluido, altura limitada al viewport, desplazamiento vertical y una sola columna en móviles.
- Los botones Agregar se movieron a la esquina superior derecha de cada cabecera, alineados con título y subtítulo. En pantallas estrechas bajan a una fila propia y conservan alineación derecha.
- Estudios complementarios ahora exige `nombre_estudio` (2–150 caracteres) para identificar el curso, seminario, diplomado u otro estudio, separado de su tipo e institución. Se valida en SvelteKit SSR/actions, DTO Nest, dominio y PostgreSQL.
- El nombre se persiste, se devuelve al listado, participa en la detección concurrente de duplicados y en la comparación de cambios al modificar. Los registros anteriores fueron completados de manera segura durante la migración.
- Migración `20260803161000_complementary_study_name` aplicada; Prisma regenerado y 52 migraciones al día.
- Verificación aprobada: build Nest, E2E Estudios 3/3, `svelte-check` 0 errores/0 advertencias y build SSR de SvelteKit. No se abrió ningún puerto.

# Avance 2026-08-03 — Periodos consistentes y cabeceras sobrias

- Las fechas de estudios se presentan como fechas de calendario legibles (`12, Julio 2025`) y reaccionan al idioma activo. No se convierten con la zona horaria porque PostgreSQL las guarda como `DATE`, sin hora ni zona; así se conserva exactamente el día elegido. La zona horaria del usuario continúa aplicándose a timestamps de sesiones, actividad y auditoría.
- El frontend interactivo, las acciones SSR, Nest y PostgreSQL exigen ahora `fecha_inicio < fecha_fin`. La misma fecha y los periodos invertidos se rechazan; un estudio en curso sigue exigiendo `fecha_fin = NULL`.
- Los selectores de fecha fin reciben como mínimo el día siguiente al inicio. El mensaje de validación ES/EN explica que la fecha final debe ser posterior.
- La migración `20260803162000_strict_study_periods` normaliza registros históricos de un solo día y refuerza ambos `CHECK` con comparación estricta. Hay 53 migraciones aplicadas.
- Se añadió al catálogo Lucide interno el icono lineal `book-open`; el campo Nombre del estudio complementario ya lo muestra correctamente.
- Se eliminaron los iconos decorativos encerrados en rectángulos de las cabeceras de Perfil: colecciones compartidas, correos, usos de correo, sesiones, familia y segundo factor. Permanecen los iconos funcionales de campos, registros, botones, estados y vacíos.
- Verificación aprobada: build Nest, E2E Estudios 3/3 —incluido rechazo de fechas iguales—, `svelte-check` 0/0 y build SSR. No se abrió ningún puerto.

# Avance 2026-08-03 — Mensaje estandarizado de elemento inexistente (concurrencia)

- Se estandarizó el texto `notFound` de los seis módulos de colección con alta/edición/eliminación (studies, nationalities, insurance, phones, documents, hobbies). Cuando un usuario edita o elimina un registro ya eliminado en otra pestaña/dispositivo, la validación previa (`findFirst` con `estado: 1`) devuelve `NotFoundException` y ahora el toast muestra un mensaje unificado e intuitivo: ES «Este elemento ya no existe. Recarga la página para ver la lista actualizada.» / EN «This item no longer exists. Reload the page to see the updated list.»
- Solo cambio de textos i18n. Se conservan las keys por módulo (`profile.X.notFound`). No se modificó ninguna lógica de validación, transacciones, soft-delete ni el flujo de refresco de datos. Decisión del usuario: solo mensaje (sin auto-refresco) y keys por módulo.
- Archivos: `frontend/src/lib/i18n/es.json` y `en.json` (6 keys c/u); `backend/src/comun/i18n/es.json` y `en.json` (3 keys existentes: nationalities, documents, phones — el resto se traduce en frontend por key). JSON validado en los 4 archivos.

# Avance 2026-08-03 — Regla de concurrencia en convenciones, email y fix modal hobbies

- Se documentó como regla obligatoria en `backend/CONVENTIONS.md` (sección «Recursos inexistentes y edición/eliminación concurrente») la verificación previa de existencia (`findFirst` con `estado: 1`) en toda mutación, el escenario de edición/eliminación concurrente entre pestañas/dispositivos y el mensaje estandarizado ES/EN de recurso inexistente. Queda como lineamiento permanente para nuevas APIs.
- Se extendió el mensaje estandarizado al módulo de correos (`profile.email.notFound`) en frontend (`lib/i18n/es.json`, `en.json`) y backend (`comun/i18n/es.json`, `en.json`), porque los correos también se editan/eliminan.
- Fix de bug en `frontend/src/routes/(app)/profile/hobbies/+page.svelte`: el modal de confirmación de eliminación mostraba «[object Object]» porque interpolaba los objetos `Parametro` crudos (`objetivo.hobby`, `objetivo.frecuencia`). Ahora usa `nombreHobby(objetivo)` y `parameterLabel(objetivo.frecuencia)`, igual que el listado. Se revisaron los demás módulos (nationalities, insurance, phones, documents, studies): ya renderizaban con `nombrePais`/`parameterLabel`, sin el defecto.
- Verificación: `svelte-check` 0 errores/0 advertencias; JSON válido en los cuatro archivos i18n. Sin cambios de lógica de negocio.

# Avance 2026-08-03 — Actividad con scroll infinito

- `profile/activity` reemplazó la paginación por botones (Anterior/Siguiente con `?pagina=`) por scroll infinito: al bajar se cargan y agregan las páginas siguientes.
- Nuevo endpoint proxy same-origin `src/routes/(app)/profile/activity/eventos/+server.ts` (GET). Reusa `requestBackend` para añadir cookies de sesión, tenant e idioma; valida `pagina` (entero 1–10000); consulta `/profile/activity?pagina=N&limite=20`; exige `locals.isAuthenticated`. La carga SSR de la página 1 se conserva para el primer render.
- Frontend: la lista es `$derived([...data.eventos, ...extras])`; la paginación vigente sale de la última respuesta cargada o del SSR. Un `IntersectionObserver` con `rootMargin: 240px` sobre un centinela al final dispara la carga anticipada. Estados: cargando (spinner `loader-circle`), fin de lista, y error con botón Reintentar (`rotate-cw`). La agrupación por día opera sobre el acumulado.
- Se añadió el icono `rotate-cw` al catálogo interno `Icon.svelte` y las keys i18n ES/EN `profile.activity.feed|loadingMore|end|loadMoreError|retry`. Las keys previas de paginación quedaron sin uso (no se eliminaron).
- Sin cambios en backend Nest ni en el contrato del endpoint de actividad. Verificación: `svelte-check` 0 errores/0 advertencias; JSON i18n válido. No se verificó en navegador por estar tras login (requiere credenciales, backend y subdominio de tenant).

# Avance 2026-08-03 — Límite máximo de elementos por colección de perfil

- Se añadió tope de registros activos en el path de creación (tras `bloquearPersona`, dentro de la transacción) de: nacionalidades (10), seguros (10), documentos (10), hobbies (20), estudios realizados (30) y estudios complementarios (30). Correos ya tenía 10. Patrón: `count({ fid_personas, estado: 1 })` y `BadRequestException("profile.<modulo>.limit")` al alcanzar el tope. Solo cuentan activos; eliminar (baja lógica) libera cupo.
- Datasources modificados: `nacionalidades`, `seguros`, `hobbies`, `documentos`, `estudios` (realizado y complementario) en `backend/src/perfil/data/datasources`.
- Mensajes i18n entendibles (indican el máximo e invitan a eliminar uno) en frontend (`lib/i18n/{es,en}.json`) y backend (`comun/i18n/{es,en}.json`): keys `profile.nationalities.limit`, `profile.insurance.limit`, `profile.documents.limit`, `profile.hobbies.limit`, `profile.studies.academicLimit`, `profile.studies.complementaryLimit`.
- Regla documentada como obligatoria en `backend/CONVENTIONS.md` (sección «Límite máximo por colección») con los topes vigentes, para nuevas APIs.
- Verificación: `tsc --noEmit` backend 0 errores; JSON válido en los cuatro i18n. Sin cambios de esquema ni de contrato de endpoints. No verificado en navegador (perfil tras login).

# Avance 2026-08-03 — Topes de colecciones del perfil como variables de entorno

- Los máximos por colección dejaron de estar hardcodeados y ahora son variables de entorno obligatorias (entero > 0), validadas al arranque en `backend/src/comun/configuracion/validar-entorno.ts` (sin default): `PROFILE_MAX_EMAILS`, `PROFILE_MAX_NATIONALITIES`, `PROFILE_MAX_INSURANCES`, `PROFILE_MAX_DOCUMENTS`, `PROFILE_MAX_HOBBIES`, `PROFILE_MAX_ACADEMIC_STUDIES`, `PROFILE_MAX_COMPLEMENTARY_STUDIES`.
- Cada datasource lee su tope con `ConfigService.getOrThrow<number>(...)` en el chequeo de creación. Se inyectó `ConfigService` en los constructores de `nacionalidades`, `seguros`, `hobbies`, `documentos`, `estudios` y `perfil` (email). `ConfigModule` es global (`isGlobal: true`), así que la inyección no requirió cambios de módulo.
- Valores por defecto en `.env` y `.env.example`: correos 10, nacionalidades 10, seguros 10, documentos 10, hobbies 20, estudios realizados 30, complementarios 30. Se modifican editando el `.env` sin tocar código ni recompilar (solo reiniciar el proceso).
- Regla en `backend/CONVENTIONS.md` actualizada: los topes son env vars leídas con `getOrThrow`, nunca hardcodeadas.
- Verificación: `tsc --noEmit` backend EXIT=0. Los E2E cargan `dotenv/config` → leen el `.env` actualizado; no hay instanciación manual de datasources (todo DI). Sin cambios de esquema.

# Avance 2026-08-03 — Mensaje de límite dinámico con la cantidad real

- El mensaje de tope de colección ahora incluye la cantidad configurada, no un número estático. Se usa el mismo mecanismo que `{seconds}` de rate limit: el filtro global `filtro-excepciones-i18n.ts` interpola placeholders `{clave}` del mensaje traducido con un objeto `args` que provee quien lanza la excepción.
- Filtro: lee `args` del cuerpo de la `HttpException` (además de `message`) y, tras traducir, reemplaza cada `{clave}` con su valor. Genérico: sirve para futuros mensajes parametrizados.
- Datasources: los 7 topes (correos, nacionalidades, seguros, documentos, hobbies, estudios realizados/complementarios) lanzan `new BadRequestException({ message: "profile.<mod>.limit", args: { max } })`, donde `max` es el valor de la env var leído con `getOrThrow`.
- i18n backend y frontend: las claves `*.limit`/`academicLimit`/`complementaryLimit` usan `{max}` en lugar de un número fijo (ES y EN). El texto que ve el usuario lo produce el backend ya interpolado (ej. «Alcanzaste el máximo de 5 hobbies. Elimina uno para agregar otro.»). Las claves del frontend quedan como respaldo coherente (no se renderizan en este flujo porque el backend devuelve el texto final).
- Verificación: `tsc --noEmit` backend EXIT=0; JSON válido en los cuatro i18n; ningún E2E afirma estos textos. `traducir` devuelve el texto con el placeholder intacto y el filtro lo sustituye.

# Avance 2026-08-03 — Regla i18n de mensajes de error como convención de APIs

- Se documentó en `backend/CONVENTIONS.md` (sección «Mensajes de error i18n») como obligatorio para toda API: los servicios lanzan CÓDIGOS/claves, no texto; el filtro global `FiltroExcepcionesI18n` traduce al idioma del request (`Accept-Language` reenviado por `requestBackend`, respaldo JWT → inglés); las claves deben existir en `es.json` y `en.json`; los datos variables van con placeholder `{clave}` + `args` (nunca número incrustado en el diccionario); los mensajes de éxito los arma el frontend con su i18n en el mismo locale.
- Aclaración de diseño registrada: el desajuste anterior (validaba con 5, mostraba 20) no era del frontend; el backend enviaba el texto con el número escrito a mano en el JSON, desacoplado del valor real de la env var. La interpolación con `args: { max }` unifica ambos en una sola fuente.

# Avance 2026-08-03 — Módulo Empresas: crear, listar y gestionar

- El módulo empresas (superadmin, `/superadmin/companies` ↔ backend `/companies`) pasó de solo listar+eliminar a CRUD de gestión: crear, listar (incluye inactivas), editar (nombre, slug y perfil), y activar/desactivar (baja lógica reversible).
- Alcance de creación (decisión del usuario): solo organización + perfil (nombre, slug, razón social, RUC/NIF, dirección, teléfono, correo de contacto, sitio web, idioma y zona horaria por defecto). Sin usuario admin ni módulos por ahora.
- Backend nuevo: DTO `DtoGuardarEmpresa` (class-validator, whitelist); usecases crear/actualizar/cambiar-estado; datasource con transacciones, `FOR UPDATE` al editar, detección de "sin cambios", unicidad de slug traducida (P2002 → `companies.slugDuplicate`), auditoría administrativa (`empresas.creada|modificada|activada|eliminada`). Endpoints POST `/companies`, PATCH `/companies/:id`, PATCH `/companies/:id/activate`, DELETE `/companies/:id`, con `@Permisos('companies.create|update|delete')` y `@Throttle` 20/min. Los permisos ya existían en BD (migración 20260803152000) y el seed los concede al SUPERADMIN de la org propietaria.
- Incumplimientos corregidos (auditoría): mensajes de error del backend ahora son CLAVES i18n (antes texto plano español), traducidos por el filtro global; rate limit agregado; front usa `ConfirmationDialog` + toast (antes `confirm()` nativo y strings literales); la lista SSR ahora tipa y usa claves i18n.
- Autorización de org raíz: el datasource comparaba contra un slug hardcodeado `"sumaq-system"` que NO coincide con `OWNER_ORG_SLUG=admin` (el módulo estaba roto para ese .env). Decisión del usuario: por ahora leer el slug propietario desde `OWNER_ORG_SLUG` (añadido a la validación de entorno backend y leído con `ConfigService`); MÁS ADELANTE, al terminar el módulo, migrar la detección de org raíz a un flag en base de datos (ej. `es_sistema` en `organizaciones`). Pendiente registrado en memoria del proyecto.
- i18n: claves de error en backend (`companies.forbidden|notFound|slugDuplicate|noChanges|cannotChangeSelf`) y UI/éxito en frontend (`companies.new|edit|activate|inactive|save|cancel|createTitle|...|field.*`), ES y EN. Iconos nuevos en el catálogo: `link`, `file-text`, `hash`, `languages` (y `rotate-cw` de antes).
- Verificación: `tsc --noEmit` backend EXIT=0; `svelte-check` 0 errores/0 advertencias; JSON i18n válido (4 archivos). PENDIENTE: pruebas E2E de empresas (lineamiento #10) — requieren BD y un usuario de prueba con permisos `companies.*`; no ejecutadas en este entorno. No verificado en navegador (superadmin tras login).

# Avance 2026-08-03 — Empresas por secciones SSR y listado renovado

- El listado de `/superadmin/companies` fue renovado con una tabla responsive y más legible: identidad visual por inicial, nombre y slug, RUC/NIF, contacto, fecha de creación, estado outline y acciones consistentes. `Gestionar` usa el botón azul del sistema; desactivar usa peligro outline; reactivar tiene acción propia; la organización del sistema permanece protegida.
- Crear, activar y desactivar bloquean dobles envíos, mantienen loader durante toda la solicitud y confirman las acciones de estado con el modal compartido. La baja continúa siendo lógica y reversible.
- La antigua pantalla única para completar una empresa se eliminó. Ahora existe un layout SSR compartido con resumen, estado, navegación lateral y cinco páginas reales: `/general`, `/contact`, `/identity`, `/communications` y `/region`. Entrar al ID redirige a `general`.
- Cada página consulta desde el servidor solamente su sección y tiene su propio formulario y botón Guardar. Guardar está deshabilitado si no hay cambios, si el formulario es inválido, mientras se procesa o si la empresa está protegida. La respuesta no reinicia el formulario ni provoca saltos visuales.
- Backend Clean Architecture: entidad tipada de secciones, repositorio, datasource y casos de uso separados para resumen, lectura de sección y actualización de sección. Se añadieron `GET /companies/:id/summary`, `GET /companies/:id/sections/:section` y un `PATCH` tipado por cada sección.
- Las mutaciones usan DTO estricto, whitelist global, UUID, sesión, tenant, permisos `companies.update`, CSRF global, rate limit 20/minuto, bloqueo `FOR UPDATE`, detección de cambio real, validación de zona horaria activa y auditoría dentro de una única transacción. El perfil de empresa respeta `estado`; uno eliminado lógicamente no expone datos y se reactiva de forma explícita al guardar.
- Los textos nuevos tienen traducción ES/EN y los componentes usan Tailwind y los tokens existentes; no se añadió CSS particular ni se cambió la línea visual general.
- Se agregó `test/empresas-secciones.e2e-spec.ts`: valida carga mínima SSR, aislamiento de secciones, sesión/CSRF/whitelist, las cinco actualizaciones, auditoría transaccional y rechazo de zona horaria inválida. Resultado: 2/2 pruebas E2E, build Nest aprobado, `svelte-check` 0/0 y build SSR aprobado. No se abrió ningún puerto para estas verificaciones.

# Avance 2026-08-03 — Empresa seleccionada y navegación consistente con Perfil

- La empresa abierta se identifica ahora mediante un card superior con etiqueta «Empresa seleccionada», nombre, slug/subdominio, explicación y badge de estado. El enlace para volver al listado queda separado fuera del card.
- La navegación lateral de las cinco secciones replica el patrón de Perfil: ancho de 250 px, card `md`, agrupación con título, espaciado vertical, enlaces con iconos de 18 px y los mismos estados activo/hover.
- El texto común de acción cambió de «Guardar» a «Guardar cambios» (`Save changes` en inglés) en todas las secciones de empresa.
- Solo se reutilizaron Card, Badge, Icon, tokens y clases Tailwind existentes; no se añadió CSS personalizado. Verificación: `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Avance 2026-08-03 — URLs de Empresas completamente en inglés

- Se corrigieron las páginas hijas de empresa a `/general`, `/contact`, `/identity`, `/communications` y `/region`; se eliminaron las carpetas vacías anteriores `/contacto`, `/identidad` y `/comunicaciones`.
- El API correspondiente quedó en inglés: `GET /companies/:id/summary`, `GET /companies/:id/sections/:section`, los cinco `PATCH /companies/:id/sections/...` y `PATCH /companies/:id/activate`. Los nombres internos del dominio permanecen en español.
- La regla quedó documentada en `backend/CONVENTIONS.md` y `frontend/frontend.md`: cada segmento visible de rutas HTTP, rutas SvelteKit y proxies hacia el API debe escribirse siempre en inglés.
- El Sidebar ahora considera activa una opción cuando la URL coincide con ella o pertenece a una ruta hija. Por tanto, Empresas continúa seleccionada al navegar dentro de cualquier empresa. El título del Header usa la misma resolución jerárquica.
- Verificación aprobada: build Nest, E2E Empresas 2/2, `svelte-check` 0 errores/0 advertencias y build SSR. No se abrió ningún puerto.

# Avance 2026-08-03 — Breadcrumb contextual en gestión de Empresas

- Se eliminó el enlace independiente «Volver a empresas» de la gestión de una empresa.
- En su lugar se usa el componente compartido `Breadcrumb` con una ruta explícita y legible: Dashboard → Empresas → nombre de la empresa → sección activa. El UUID nunca se muestra como una migaja.
- `Breadcrumb.svelte` ahora admite opcionalmente una lista contextual de elementos; cuando no se proporciona conserva exactamente su generación automática anterior, por lo que Perfil y las demás páginas no cambian.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Avance 2026-08-03 — Breadcrumb también en listado de Empresas

- `/superadmin/companies` usa ahora el breadcrumb compartido Dashboard → Empresas.
- Se retiraron los textos superiores redundantes «Superadministrador» del listado y «Empresa seleccionada» del card de detalle; los títulos y estados permanecen sin cambios.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Avance 2026-08-03 — Base de almacenamiento privado Cloudflare R2

- Se integró Cloudflare R2 en el backend mediante una feature Clean Architecture en `backend/src/storage`: entidades y contrato neutral en `domain`, casos de uso para carga/descarga firmada, inspección y eliminación, adaptador AWS S3 en `data` y módulo Nest exportable. La lógica de negocio no depende directamente de Cloudflare, lo que permitirá reemplazar R2 por S3/MinIO sin modificar los módulos consumidores.
- Se instalaron `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner`. El bucket continúa privado: el backend genera URLs temporales para una única operación y objeto; las credenciales permanentes nunca se entregan al navegador.
- Se añadieron variables obligatorias `STORAGE_PROVIDER`, `STORAGE_ACCOUNT_ID`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT`, `STORAGE_REGION` y `STORAGE_SIGNED_URL_TTL_SECONDS`. `validar-entorno.ts` detiene el arranque si falta alguna, exige R2/`auto`, valida cuenta, bucket, endpoint HTTPS perteneciente a la cuenta, longitud de credenciales y limita las firmas a un máximo de 3600 segundos. `.env.example` documenta los valores; `.env` conserva vacíos únicamente los datos de la cuenta y las credenciales que el propietario debe pegar localmente.
- Seguridad de objetos: validación de claves contra rutas absolutas, traversal, segmentos vacíos y controles; sanitización de nombres de descarga; firma de MIME, longitud y checksum SHA-256 opcional; inspección `HEAD` posterior; tratamiento explícito de 404; eliminación idempotente desde la perspectiva del consumidor. No se publicó un controlador genérico para evitar acceso arbitrario al bucket: cada feature futura deberá validar sesión, tenant, estado, permisos, tipo, tamaño y cuota antes de invocar estos casos de uso.
- Se agregó `npm run storage:check`, prueba integral que crea un objeto temporal, lo carga mediante URL firmada, inspecciona, descarga, compara bytes y lo elimina en `finally`; no imprime secretos ni URLs. Está listo para ejecutarse cuando el propietario complete las credenciales locales.
- Regla permanente añadida a `backend/CONVENTIONS.md`: binarios fuera de PostgreSQL/filesystem, claves bajo `tenants/<organizacion>/...`, bucket privado, secretos fuera de BD/Git/frontend y patrón de compensación porque PostgreSQL y R2 no comparten una transacción atómica.
- Verificación local sin credenciales reales: build Nest aprobado y suite completa 17/17 aprobada (incluye configuración obligatoria, endpoint coherente, firma temporal, secreto no expuesto, traversal y nombre de descarga). `npm audit fix` corrigió la vulnerabilidad alta transitiva; permanecen 6 avisos moderados en dependencias transitivas de Firebase y no se aplicó `--force` porque propone degradar `firebase-admin` a una versión mayor incompatible. No se abrió ningún puerto.
- Verificación real posterior con las credenciales locales mediante `npm run storage:check`: Cloudflare R2 aceptó una carga directa firmada, `HEAD` confirmó sus metadatos, la descarga devolvió exactamente los mismos bytes y el objeto temporal se eliminó en `finally`. No se imprimieron secretos/URLs ni se abrió ningún puerto.

# Avance 2026-08-03 — Avatares de Perfil migrados a Cloudflare R2

- El cambio de avatar dejó de escribir/leer/eliminar archivos en el filesystem local. `AlmacenAvatarLocal` fue sustituido por `AlmacenAvatarR2`, aislado en `backend/src/perfil/data/datasources/avatar/` junto con sus pruebas.
- Organización de objetos: cada avatar se guarda como `tenants/<id_organizacion>/users/<id_usuario>/profile/avatar/<uuid>.jpg`. Todos los segmentos los genera el servidor; el navegador no puede elegir la clave ni acceder al bucket directamente.
- Se conservó el contrato de frontend (`/media/avatar`) y toda la UX existente: progreso, bloqueo durante la operación, toast, actualización entre pestañas y versionado visual. Nest recibe como máximo 2 MB, verifica MIME/extensión/firma, limita píxeles y páginas, rota/recorta a 80×80, elimina metadatos/EXIF al recodificar, comprime hasta 5 KB y recién entonces sube el JPEG seguro a R2 con SHA-256.
- Se amplió la capa neutral `storage` con escritura y lectura privadas desde backend (`CasoUsoGuardarObjeto`/`CasoUsoLeerObjeto`). Perfil no depende del SDK ni de Cloudflare; también usa el caso de eliminación neutral.
- Consistencia mantenida: primero se crea el nuevo objeto R2; luego la referencia de persona, auditoría y evento cambian dentro de la transacción PostgreSQL existente. Si la transacción falla, se compensa eliminando el nuevo objeto. Tras commit se intenta eliminar el avatar anterior sin romper la operación si R2 está temporalmente indisponible.
- Se añadió el comando idempotente `npm run storage:migrate-avatars`. Se ejecutó sobre la base actual: 1 avatar local migrado, 0 omitidos. La referencia PostgreSQL quedó bajo `tenants/...`, `HEAD` confirmó que el objeto existe en R2 y los archivos locales se conservaron como respaldo (no se borró información).
- `.env.example` aclara que `UPLOADS_DIRECTORY` queda únicamente para migraciones/respaldos heredados; las nuevas imágenes no se escriben allí.
- Verificación: suite backend completa 20/20, build Nest aprobado y comprobación real DB↔R2 con 1 referencia/1 objeto válido. La lectura real devolvió JPEG 80×80 de 2591 bytes. No se modificó el esquema, no se abrió ningún puerto y no se expusieron credenciales ni claves completas en la salida.

# Corrección 2026-08-03 — Avatar preparado desde cero, sin migración

- Por decisión del usuario se revirtió por completo la migración del avatar antiguo. La referencia `personas.foto_url` volvió a `null` y el objeto que se había copiado a R2 fue eliminado y verificado como inexistente.
- Se eliminaron el script `scripts/migrate-local-avatars-to-r2.ts` y el comando `storage:migrate-avatars`; no queda lógica de migración en el backend. Los archivos locales heredados permanecen físicamente como respaldo, pero ninguna consulta ni flujo de ejecución los usa.
- El nuevo `AlmacenAvatarR2` se conserva sin cambios: el sistema queda preparado para que el usuario suba su próximo avatar desde cero y solo entonces cree una clave `tenants/<organizacion>/users/<usuario>/profile/avatar/<uuid>.jpg`.
- Estado comprobado: 0 avatares asociados en PostgreSQL, suite completa 20/20 y build Nest aprobado. No se abrió ningún puerto.

# Avance 2026-08-03 — Caché privada y segura del avatar versionado

- Se habilitó caché únicamente para el JPEG del avatar, no para información personal, sesión, roles, permisos, preferencias ni cargas SSR/JSON.
- Nest responde el avatar con `Cache-Control: private, max-age=<AVATAR_CACHE_TTL_SECONDS>, immutable` y `ETag` igual al nombre UUID de la versión vigente. La duración es una env obligatoria sin fallback, validada al arranque y limitada a un máximo de 31536000 segundos; `.env`/`.env.example` usan 31536000 (un año). No usa `Vary: Cookie`: la URL UUID identifica una versión única y esto evita perder la caché cuando rotan los tokens de sesión.
- El proxy SvelteKit `/media/avatar` no confía solo en la URL: cachea únicamente una respuesta 200 `image/jpeg` cuando el parámetro `?v=` coincide exactamente con el `ETag` que Nest obtuvo de PostgreSQL/R2. Sin versión, con versión antigua, ante 401/404/429/5xx o cualquier contenido distinto, fuerza `private, no-store`. POST y DELETE continúan siempre sin caché.
- Cada cambio de avatar ya crea una clave/UUID nuevos y el frontend reemplaza `versionAvatar`, actualiza el contexto del header y publica el cambio entre pestañas. Por ello la URL nueva produce un cache miss obligatorio; la copia antigua puede permanecer físicamente en la caché del navegador, pero ningún estado vigente vuelve a referenciarla.
- La regla quedó documentada en `backend/CONVENTIONS.md`. Verificación: backend 20/20 + build aprobado; frontend `svelte-check` 0 errores/0 advertencias + build SSR aprobado. No se abrió ningún puerto.

# Corrección 2026-08-03 — El hook SSR ya no anula la caché del avatar

- Se detectó que `frontend/src/hooks.server.ts` reemplazaba al final de cada solicitud las cabeceras específicas de `/media/avatar` por `no-store`. Por eso el navegador descargaba nuevamente el avatar aunque la URL versionada no hubiera cambiado.
- El hook global conserva ahora las cabeceras del endpoint únicamente cuando la respuesta es exitosa, es un `image/jpeg`, está marcada como caché privada, no contiene `no-store` y posee `ETag`. Las páginas SSR, datos, errores, respuestas sin versión y cualquier otro recurso dinámico continúan obligatoriamente sin caché.
- La versión del avatar sigue formando parte de la URL. Al subir o eliminar una imagen cambia esa versión y el navegador solicita el recurso nuevo; si no cambia, puede reutilizar su copia privada de memoria o disco.
- Tras comprobar que las descargas observadas se debían a `Disable cache` activado en DevTools, se retiró la respuesta `304` anticipada añadida para el diagnóstico. El sistema usa únicamente el comportamiento HTTP estándar del navegador: caché privada larga para la imagen UUID inmutable y `no-store` para todo dato dinámico, error o imagen cuya versión no coincida.
- **Diagnóstico reutilizable ante imágenes que parpadean o nunca quedan en caché:** revisar primero `frontend/src/hooks.server.ts`. El hook se ejecuta después del endpoint y puede sobrescribir un `Cache-Control: private, max-age=..., immutable` correcto con `no-store` si la nueva ruta versionada no fue incluida expresamente entre las imágenes cacheables.
- El caso reapareció en `/media/users/<id>/avatar/<version>.jpg`: Nest y el proxy enviaban caché correcta, pero el hook solo reconocía `/media/avatar`, `/media/tenant` y `/media/company`. Se añadió únicamente la ruta estricta y versionada de usuarios; mantiene las comprobaciones de respuesta 200, `ETag`, MIME de imagen y ausencia de `no-store`. Páginas SSR, JSON, datos personales y errores siguen sin caché.
- Para confirmar este problema en DevTools, usar recarga normal con **Disable cache desactivado** y mirar `Size`: transferencia en bytes en cada recarga indica que no se conservó la caché; `(memory cache)` o `(disk cache)` confirma reutilización. `Initiator users:<línea>` solo identifica qué elemento de la página inició la petición y no es un error.

# Avance 2026-08-03 — Identidad institucional y personalización del login

- Empresas incorpora identidad visual desde R2: escudo institucional y **imagotipo** (símbolo junto al nombre). La cabecera común de la empresa muestra el escudo vigente y la sección Identidad permite subirlo, sustituirlo o eliminarlo mediante componentes modulares, confirmación, loader, bloqueo de doble envío y mensajes Sonner.
- Se añadió la página inglesa `/superadmin/companies/:id/login-branding`. Permite decidir qué bloques se muestran y personalizar etiqueta, título, subtítulo, tres beneficios, comunidad, bienvenida y pie. `Sumaq System` permanece fijo en todos los accesos y no es configurable.
- El login consume la marca en el SSR público obligatorio del tenant; no ejecuta una consulta adicional en `onMount`. Muestra el escudo sobre «Bienvenido» y reproduce hasta seis portadas como carrusel, con transición suave, indicadores manuales, pausa implícita para movimiento reducido y fallback al fondo actual cuando no existen portadas.
- Restricciones de salida: escudo PNG 256×256 ≤40 KB; imagotipo PNG 640×200 ≤80 KB; portada WebP 1280×1920 ≤100 KB; máximo cuatro portadas activas. El original no puede superar 3 MB. Se valida MIME, extensión, firma binaria, formato decodificado, una sola página y máximo 30 MP; Sharp rota, redimensiona, elimina metadatos y recodifica, por lo que nunca se guarda el original ni contenido ejecutable.
- Las claves R2 son inmutables y generadas por servidor bajo `tenants/<organizacion>/branding/<tipo>/<uuid>.webp`. Al reemplazar se crea otra clave; la referencia y auditoría cambian dentro de transacción PostgreSQL, con compensación del nuevo objeto si falla la base y eliminación posterior del objeto antiguo. Portadas usan baja lógica y orden único por empresa.
- El bucket sigue privado. Las rutas públicas de escudo/portadas primero resuelven el tenant activo por host y exigen que la versión solicitada coincida con PostgreSQL. Los endpoints administrativos exigen sesión, tenant del sistema, cuenta activa, permiso `companies.update`, CSRF en mutaciones, rate limit, UUID y pertenencia de empresa.
- La caché queda aislada: solo imágenes 200 versionadas conservan caché larga `immutable`; páginas SSR, `__data.json`, API/JSON, sesión, permisos, preferencias, mutaciones y errores continúan en `private, no-store`. Se creó `DEPLOYMENT.md` con la prohibición de `Cache Everything` global y la comprobación requerida al desplegar Cloudflare.
- Base: nueva tabla `nucleo.imagenes_login_organizacion` y nuevos campos de marca/login en `nucleo.perfil_organizacion`. La migración `20260803232000_company_login_branding` quedó aplicada y Prisma reporta el esquema al día. `COMPANY_MEDIA_MAX_BYTES` es env obligatoria, sin fallback.
- Verificación: build Nest aprobado; unitarias 24/24 (incluyen las tres políticas de imagen y rechazo de firma inconsistente); E2E Empresas 2/2 con la nueva sección; `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto ni se expusieron credenciales.

# Avance 2026-08-04 — Separación Superadministrador / Administrador de empresa

- El Sidebar incorpora el grupo **Administrador** con **Empresa** (`/administrator/company`). Toda la configuración que antes dependía de seleccionar `/superadmin/companies/[id]` se movió a páginas SSR bajo esa ruta: general, contacto, identidad, comunicaciones, región y personalización del login.
- La empresa administrada ya no llega desde la URL ni desde el formulario. Nest la obtiene exclusivamente de `fid_organizaciones` de la sesión mediante `/company/current/*`; se eliminaron las rutas HTTP que permitían consultar o modificar secciones de una empresa arbitraria por ID. El permiso nuevo es `companyProfile.read|update` y el `slug` queda visible pero reservado al superadministrador.
- **Superadministrador → Empresas** conserva buscador y tabla. “Nueva empresa” exige nombre, RUC/NIF, razón social, slug, correo y teléfono de contacto. La creación guarda organización + perfil, crea el rol `ADMIN` de ese tenant y le asigna los permisos de su propia empresa dentro de una sola transacción auditada.
- La tabla global muestra solo los datos de aprovisionamiento requeridos, incluye un switch activo/inactivo y un único botón de papelera. El switch usa `PATCH /companies/:id/status`; la papelera realiza baja lógica no reversible desde UI con `estado=0`, `eliminado_en` según PostgreSQL y `eliminado_por`. Las empresas eliminadas dejan de aparecer y no pueden reactivarse accidentalmente.
- Se aplicó la migración `20260804010000_company_admin_scope`: columnas de eliminación lógica, índice, permisos `companyProfile.*`, rol `ADMIN` por organización y asignación a `ADMIN`/`SUPERADMIN`. La convención de separación quedó fijada en `backend/CONVENTIONS.md`.
- Seguridad: DTO estricto y whitelist, UUID, sesión activa, permisos, organización raíz en operaciones globales, tenant activo en operaciones propias, CSRF, rate limit (20 mutaciones/minuto), bloqueo contra doble envío, transacciones, `FOR UPDATE` en edición y auditoría atómica.
- Verificación: `prisma format/validate/generate`, migración aplicada, build Nest, E2E Empresas 3/3, `svelte-check` 0 errores/0 advertencias y build SSR aprobados. No se abrió ningún puerto.

# Corrección 2026-08-04 — Superadministrador puede gestionar todas las empresas

- `/superadmin/companies` incorpora **Editar** en cada fila. El modal reutiliza los seis campos de aprovisionamiento (nombre, razón social, RUC/NIF, slug, correo y teléfono), valida cambios reales, bloquea doble envío y usa `PATCH /companies/:id` con permiso `companies.update`, CSRF, rate limit y auditoría dentro de la misma transacción.
- Se retiró la excepción visual y de backend que deshabilitaba la empresa base: ya no aparece como “Sistema” en lugar de acciones. Su switch, edición y papelera están habilitados como en cualquier otra empresa, según la decisión de que el superadministrador gestione todo.
- La autorización global dejó de depender de `OWNER_ORG_SLUG`. La migración aplicada `20260804023000_system_company_flag` añade `nucleo.organizaciones.es_sistema`, marca la organización propietaria existente a partir del rol SUPERADMIN con `companies.read` y crea su índice. El seed conserva esa marca. Así el superadministrador puede modificar el slug de la empresa base sin perder el alcance global.
- La edición global usa un comando de dominio, DTO estricto y `FOR UPDATE`; actualiza solo los seis campos visibles y no borra por accidente dirección, región, identidad o personalización del login.
- Verificación: Prisma válido y generado, migración aplicada (empresa `admin` marcada `es_sistema=true`, activa), build Nest, E2E Empresas 3/3, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.

# Corrección 2026-08-04 — Empresas sin RBAC temporal y estado consistente

- Por decisión actual, el menú muestra todos los módulos y acciones. Se retiraron filtros por permiso del Sidebar y decoradores `@Permisos` de los controladores de Empresas. Permanecen sesión, usuario y organización activos, CSRF, DTO/whitelist, UUID, rate limit, transacciones y auditoría. RBAC queda pendiente obligatorio antes de producción.
- Se retiró `nucleo.organizaciones.es_sistema` mediante la migración aplicada `20260804031500_remove_system_company_flag`; ninguna empresa recibe trato especial y la empresa base puede editarse, activarse, desactivarse o eliminarse como las demás.
- El caso reportado de eliminación sí había escrito correctamente `estado=0`, `eliminado_en` y auditoría en PostgreSQL. La tabla no mantiene una copia local: `data.empresas` del `load` SSR es la única fuente y cada mutación correcta revalida ese `load`.
- Listar exige organizaciones no eliminadas y perfiles con `estado=1`. Editar y eliminar exigen empresa/perfil activos; una empresa inactiva solo puede reactivarse. Cambios concurrentes u operaciones repetidas fallan de forma controlada.
- Límites: nombre 2–120, razón social 2–150, RUC/NIF 8–20, slug 3–63, correo válido hasta 120 y teléfono con 7–15 dígitos. Campos extra son rechazados.
- Verificación: 57 migraciones al día, Prisma generado, build Nest aprobado, unitarias 24/24, E2E Empresas 4/4, `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Corrección 2026-08-04 — Unicidad de empresa solo entre activas

- `organizaciones.slug` dejó de tener unicidad global. La migración aplicada `20260804033000_active_company_slug_unique` crea un índice único parcial `WHERE estado = 1`; una empresa inactiva o eliminada ya no bloquea crear otra con el mismo slug.
- Login, resolución pública del tenant y generación de slugs consultan únicamente organizaciones activas. El seed dejó de depender de `upsert` por slug porque Prisma no representa índices únicos parciales.
- La creación sigue validando formato y longitudes del DTO, sesión/organización activa, CSRF, rate limit, transacción y auditoría. RUC, correo, teléfono, nombre y razón social no se consideran duplicados; el conflicto funcional actual es únicamente un slug perteneciente a otra empresa activa.
- Prueba E2E añadida: duplicar slug activo devuelve 409; eliminar la empresa y recrear el mismo slug devuelve 201. Empresas E2E 4/4, unitarias 24/24 y build Nest aprobados. Migraciones 58/58 aplicadas. No se abrió ningún puerto.

# Corrección 2026-08-04 — Validación visible de Empresas

- Crear y editar ya no deshabilitan silenciosamente la confirmación por un formulario inválido. Al confirmar se validan los seis campos; el modal permanece abierto, aparece Sonner de error y cada campo incorrecto muestra borde y mensaje rojo.
- La validación también aparece al salir de un campo y desaparece al corregirlo. Cubre obligatorios, nombre, razón social, RUC/NIF, slug, correo y teléfono con las mismas reglas y límites del DTO backend.
- Editar continúa deshabilitado cuando no existe ningún cambio real; durante una solicitud ambos formularios bloquean doble envío.
- Textos añadidos en español e inglés. `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Corrección 2026-08-04 — Estado separado de eliminación lógica

- Se confirmó `eliminado_en` como marca de baja lógica, sin duplicarlo con otro booleano. Los estados quedan definidos así: activa (`estado=1`, `eliminado_en=null`), inactiva recuperable (`estado=0`, `eliminado_en=null`) y eliminada (`estado=0`, `eliminado_en` informado).
- La eliminación de empresa escribe atómicamente `estado=0`, `eliminado_en=CURRENT_TIMESTAMP` y `eliminado_por`. La migración `20260804034500_active_company_requires_not_deleted` añade una restricción PostgreSQL que impide que una organización eliminada permanezca activa.
- Login, tenant público, contexto de sesión, empresa administrada, Empresas y operaciones de Perfil ahora exigen conjuntamente organización activa y no eliminada. La lista global conserva empresas inactivas no eliminadas para poder reactivarlas; una eliminada no puede reactivarse.
- El índice único parcial de slug ahora considera exclusivamente `estado=1 AND eliminado_en IS NULL`.
- Prisma reporta 59 migraciones aplicadas, el build Nest finaliza correctamente, las unitarias pasan 24/24 y Empresas E2E pasa 4/4.

# Corrección 2026-08-04 — Orden del listado de empresas

- `/companies` ordena exclusivamente por `created_at DESC`: la empresa creada más recientemente aparece arriba. Como desempate estable usa `id_organizaciones ASC`.
- El estado activo/inactivo y el nombre ya no alteran el orden cronológico. Se agregó una comprobación E2E del primer registro.

# Corrección 2026-08-04 — Campos obligatorios en mutaciones de Empresas

- Crear y editar exigen los seis campos completos, no vacíos y con tipo/formato/límites correctos. Campos ausentes, nulos, vacíos o adicionales reciben `400` mediante el `ValidationPipe` global.
- Cambiar estado exige el UUID de la ruta y un booleano JSON `activo`; omitirlo o enviar texto como `"false"` recibe `400`. El puente SSR ya no convierte un valor ausente en `false`.
- Eliminar exige un UUID válido en la ruta. No tiene cuerpo porque el único dato funcional necesario es el identificador; una ruta con identificador inválido recibe `400`.
- Se añadieron pruebas E2E explícitas para cuerpos vacíos, tipo incorrecto y UUID inválido.

# Corrección 2026-08-04 — Sincronización del switch de empresa

- Al cambiar el estado de una empresa, el frontend espera `tick()` después de asignar la empresa objetivo y el nuevo booleano. Solo entonces envía el formulario SSR mejorado.
- Esto garantiza que el primer clic incluya el UUID y `activo` correctos; ya no puede enviar los valores iniciales o los pertenecientes al registro anterior.

# Corrección 2026-08-04 — Trazabilidad temporal y conflicto al reactivar empresas

- Editar, cambiar estado y eliminar desde `/superadmin/companies` actualizan obligatoriamente `organizaciones.updated_at` con `CURRENT_TIMESTAMP` de PostgreSQL. La edición también actualiza `perfil_organizacion.updated_at` con el mismo reloj de base.
- Si una empresa inactiva intenta reactivarse y su slug ya pertenece a otra empresa activa, el `P2002` de Prisma ahora se traduce a `409 companies.slugDuplicate`; la transacción completa retrocede y la empresa permanece inactiva.
- Se mantiene el listado completo sin paginación por decisión actual del usuario.

# Corrección 2026-08-04 — Registros obsoletos visibles hasta actualización manual

- Si editar, cambiar estado o eliminar recibe `404` porque otra operación ya cambió o eliminó la empresa, `/superadmin/companies` conserva la fila que el usuario estaba viendo y muestra un Sonner que le pide actualizar la página.
- Se eliminó la revalidación automática que retiraba la fila después del error del switch. Las mutaciones exitosas sí continúan revalidando el SSR y reflejando inmediatamente su propio resultado.

# Avance 2026-08-04 — Empresa del Administrador completada

- El módulo `/administrator/company` sigue resolviendo el tenant exclusivamente desde la sesión y usa `/company/current/*`, separado de las APIs globales `/companies/*` del Superadministrador.
- Información básica quedó solo lectura: nombre, slug, razón social y RUC/NIF se cargan por SSR, no existe formulario ni botón y se retiró `PATCH /company/current/sections/general`. Bajo el nombre se muestra el enlace completo al subdominio público calculado por backend con `FRONTEND_ORIGIN`, `APP_BASE_DOMAIN` y el slug vigente.
- Contacto incorpora ubicación administrativa normalizada. `perfil_organizacion` guarda país y Level 3; departamento/provincia se derivan de la jerarquía activa y el ubigeo es el código del Level 3. País y ubigeo deben enviarse juntos o ambos vacíos; el backend comprueba pertenencia jerárquica y estado de todos los maestros dentro de la transacción.
- Comunicaciones ahora representa atención institucional: correo, teléfono, WhatsApp, centro de ayuda y horario para alumnos/profesores. Se retiró de esta vista la semántica de remitente y cabecera de impresión.
- Identidad muestra primero escudo e imagotipo y después el color institucional. Cada imagen usa lápiz + menú Subir/Eliminar; seleccionar archivo inicia inmediatamente una subida XHR con porcentaje, bloqueo, confirmación de eliminación y Sonner. El proxy solo admite escudo/imagotipo y el backend mantiene MIME, extensión, firma, dimensiones, recodificación WebP, límites, R2 privado, transacción, compensación y auditoría.
- La pestaña de personalización se llama **Acceso**, usa un icono visible de tamaño fijo y el menú trunca textos largos con puntos suspensivos sin encoger iconos.
- Idioma y zona horaria quedan como valores heredables por usuarios nuevos hasta que definan preferencias propias. El país configurado en Contacto puede servir como valor territorial institucional; no se agregó otro ajuste especulativo.
- Migración aplicada: `20260804050000_company_location_support`. Verificación: Prisma formateado/generado, build Nest, pruebas DTO/medios 8/8, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.

# Avance 2026-08-04 — Contactos, presencia digital, horarios y Acceso institucional

- Contacto y ubicación admite dos teléfonos y dos correos institucionales. Sitio web dejó esa sección y pasó a la nueva página SSR inglesa `/administrator/company/digital-presence`, junto con Facebook, Instagram, TikTok, YouTube, LinkedIn y X. Los enlaces solo admiten HTTP(S), tienen límites explícitos y se guardan mediante la API independiente de la empresa de la sesión.
- Comunicaciones ya no contiene centro de ayuda ni un horario libre. Conserva correo, teléfono y WhatsApp de atención, y añade una agenda visual de lunes a domingo con estado cerrado/abierto e inputs `time` para apertura y cierre. Backend y PostgreSQL exigen exactamente siete días únicos, horas `HH:mm`, apertura anterior al cierre y horas nulas cuando el día está cerrado.
- Se creó `nucleo.horarios_atencion_organizacion`, relacionada con la organización y única por empresa/día. Perfil de empresa recibió contacto secundario y enlaces sociales. La migración `20260804110000_company_channels_schedules` quedó aplicada; perfil y los siete horarios se actualizan dentro de la misma transacción y la auditoría se registra de forma atómica.
- Acceso se reorganizó siguiendo el orden real del login: portadas, panel visual y panel de ingreso, separados en cards con iconos. Su formulario usa una única acción SSR mejorada, detecta cambios, bloquea doble envío, muestra loader/Sonner y vuelve a guardar mediante `PATCH /company/current/sections/login-branding`. Recuperar contraseña y mantener sesión dejaron de ser configurables y ahora siempre aparecen.
- El login público mantiene su consulta de tenant en SSR. El escudo sobre la bienvenida aumentó de 80×80 a 160×160, y escudo, bienvenida y subtítulo quedaron centrados. El pie es fijo: `© 2026 Sumaq System`.
- La cabecera del Administrador muestra el escudo institucional en 112×112 y conserva un fallback equivalente. El menú usa iconos de tamaño fijo y truncado para no deformarse.
- Seguridad conservada: sesión/usuario/organización activos, tenant tomado de la sesión, ValidationPipe estricto, CSRF global, rate limit de 20 mutaciones/minuto, límites y formatos en frontend/SSR/Nest/PostgreSQL, transacción y auditoría. Verificación: migración aplicada, build Nest aprobado, DTO de empresa 4/4, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Corrección 2026-08-04 — Formatos y mensajes de identidad visual

- Identidad visual dejó de convertir todos los recursos a WebP. Los nuevos escudos aceptan exclusivamente PNG y se almacenan como PNG 256×256; los nuevos imagotipos aceptan exclusivamente JPG/JPEG y se almacenan como JPG 640×200. Las portadas conservan entrada JPG/PNG/WebP y salida WebP.
- El máximo de entrada de todos los medios empresariales bajó de 5 MB a 3 MB. `COMPANY_MEDIA_MAX_BYTES` quedó en `3145728` tanto en entorno como en su validación obligatoria, sin fallback.
- Frontend, endpoint SSR, Multer y almacenamiento R2 comprueban el contrato correspondiente. El backend continúa verificando coincidencia entre MIME, extensión, firma binaria y formato decodificado, además de una sola página y máximo 30 MP; Sharp elimina metadatos, redimensiona y optimiza al formato final.
- Los mensajes de error explican el problema concreto: escudo debe ser PNG, imagotipo debe ser JPG/JPEG, o archivo supera 3 MB. Los textos informativos bajo cada imagen conservan el formato compacto original y solo reflejan el nuevo formato final.
- Las imágenes institucionales WebP ya existentes siguen siendo legibles como compatibilidad; solo las cargas nuevas adoptan el contrato PNG/JPG. La caché versionada admite PNG/JPG/WebP sin modificar la política `no-store` de páginas y datos.
- Verificación: unitarias backend 30/30, build Nest aprobado, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Avance 2026-08-04 — Marca institucional en el sidebar

- La cabecera del sidebar consume la marca del tenant que ya entrega el layout raíz por SSR; no realiza una consulta adicional desde el navegador.
- Con el menú expandido muestra el imagotipo institucional dentro de todo el rectángulo de marca, con un padding óptico mínimo para que no toque sus bordes. Con el menú colapsado muestra el escudo en formato compacto. El drawer móvil se considera expandido.
- Cada presentación tiene fallback independiente: si falta el imagotipo o el escudo correspondiente, conserva exactamente la marca predeterminada de Sumaq System que existía antes.
- Las URLs siguen versionadas, por lo que una nueva carga de identidad invalida el recurso visual sin desactivar la caché de imágenes ni habilitar caché para datos SSR.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Ajuste 2026-08-04 — Plantilla Grafito

- Grafito adopta una composición monocromática moderna: primary carbón `#27272A`, superficies claras negro suave `#18181B` y superficies oscuras negro profundo `#09090B`. Conserva el cálculo automático de contraste y la adaptación accesible del primary en modo oscuro.

# Avance 2026-08-04 — Esquinero opcional en menú ampliado

- La sección **Esquinero** incorpora **Ocultar esquinero al ampliar**. En menú ampliado retira exclusivamente el bloque superior de imagotipo y deja el escudo institucional como inicio del menú; al contraer el sidebar, el esquinero reaparece con el escudo compacto existente.
- La opción requiere que exista un escudo y que **Ver escudo en el menú** esté activo. La UI la deshabilita si no se cumple y Nest repite la regla dentro de la transacción. Desactivar el escudo del menú o eliminar su última variante desactiva también esta opción para evitar una cabecera vacía.
- El nombre institucional usa peso negrita y el separador bajo escudo/nombre deja mayor aire respecto del nombre, conservando el espacio inferior, las proporciones responsive y los contrastes automáticos de la superficie del menú.
- La preferencia `ui_ocultar_esquinero_expandido` se guarda en `nucleo.perfil_organizacion`, viaja mediante el tenant público y se aplica desde SSR, además de participar en la previsualización local sin escrituras anticipadas.
- Migración aplicada: `20260804200000_company_hide_expanded_corner`; 65 migraciones al día. Verificación: Prisma formateado/generado, 10 suites/40 pruebas backend, build Nest, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.

# Corrección 2026-08-04 — Fondo suave derivado del primary

- Se incorporó el token semántico `primary-soft`, calculado como mezcla transparente visual del `primary` institucional con el canvas: 12% en tema claro y 20% en oscuro.
- Los estados activos del sidebar, navegación de Perfil y navegación de Empresa ya no usan el azul decorativo fijo `tint-sky`. Texto y fondo cambian juntos con la apariencia seleccionada.
- Selectores activos, tiles de identidad vinculados al primary, filas institucionales y el control de carga de portadas también consumen `primary-soft`, evitando combinaciones como texto rojo/verde sobre fondo azul.
- `tint-sky` permanece únicamente como color decorativo para componentes cuya variante semántica es explícitamente celeste.

# Ajuste 2026-08-04 — Header sin buscador

- Se retiraron del header el buscador visual, su icono y el atajo `⌘K`, porque esta navegación no utilizará búsqueda global. El título permanece a la izquierda y las acciones/cuenta conservan su alineación a la derecha.
- También se eliminaron las traducciones sin uso y se actualizó la descripción de Cabecera en Apariencia.

# Avance 2026-08-04 — Fondo opcional del esquinero

- Esquinero incorpora **Activar color de fondo**. Desactivado conserva el canvas y la línea habitual; activado pinta tanto el bloque superior como el área de escudo/nombre situada antes de `General`, usando sus variantes clara/oscura.
- Si los colores del esquinero todavía son los predeterminados, activar el switch los inicializa con `color_primario`. Después pueden editarse independientemente sin perder la previsualización inmediata.
- Con el fondo activo, la línea inferior del esquinero y el separador bajo el nombre quedan transparentes; el nombre y la marca calculan automáticamente texto claro u oscuro según contraste.
- Las plantillas con esquinero cromático activan la opción; Predeterminado y las plantillas con esquinero neutro la desactivan. Las configuraciones históricas realmente personalizadas se conservaron activas durante la migración.
- `ui_esquinero_fondo_activo` se valida como booleano obligatorio, se guarda con la identidad en la misma transacción/auditoría y viaja por tenant SSR. Migración aplicada: `20260804210000_company_corner_background`; 66 migraciones al día.
- Verificación: 10 suites/40 pruebas backend, build Nest, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.

# Corrección 2026-08-04 — Sidebar de la plantilla Predeterminada

- Los valores visibles `#FFFFFF` y `#1E1E1D` del Menú en la plantilla Predeterminada vuelven a tratarse como el canvas nativo, no como un fondo institucional personalizado.
- Por ello el estado activo del aside recupera exactamente el patrón original `primary-soft` + `primary`, igual que la navegación interna de **Configuración de empresa**, y continúa reaccionando al color principal elegido.

# Avance 2026-08-04 — Marca institucional por tema

- Escudo e imagotipo cuentan ahora con variantes para fondo claro y fondo oscuro. Las cuatro cargas aceptan exclusivamente PNG, mantienen el máximo original de 3 MB y generan salidas normalizadas de 256×256 o 640×200 según la familia.
- Cada familia incorpora la opción **Usar la misma imagen en ambos temas**. Al activarla, ambas columnas apuntan a una sola clave R2; reemplazar la variante clara sincroniza también la oscura. Al desactivarla, la variante oscura queda vacía y habilitada para una carga independiente.
- PostgreSQL recibió `escudo_oscuro_url`, `imagotipo_oscuro_url` y los dos booleanos de reutilización mediante la migración `20260804143000_company_theme_branding`, aplicada correctamente. Las imágenes anteriores se enlazaron en ambos temas sin duplicar objetos.
- Subir, eliminar o cambiar la reutilización bloquea la organización, revalida usuario/tenant activos, aplica rate limit, DTO estricto, auditoría y transacción. R2 se modifica fuera del commit con compensación; una clave anterior solo se borra cuando ninguna variante sigue apuntándola.
- La identidad activa cambia reactivamente con `theme.current` en login, sidebar abierto/cerrado y cabecera del Administrador. El tema concreto también llega al layout raíz por SSR para que el login renderice la variante correcta desde el primer HTML.
- La UI separa semánticamente ambas familias y previsualiza físicamente cada PNG sobre un lienzo claro u oscuro fijo para evaluar su contraste real. También bloquea la variante oscura compartida y conserva loaders, progreso, Sonner, responsive e i18n ES/EN.
- Verificación: migración aplicada, Prisma generado, 10 suites/38 pruebas backend aprobadas, build Nest aprobado, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Avance 2026-08-04 — Color institucional en el sidebar

- El tenant público expone por SSR `color_primario` únicamente cuando cumple el formato hexadecimal `#RRGGBB`; un valor ausente o inválido conserva el fondo `bg-canvas` predeterminado.
- El color institucional se aplica exclusivamente al área de navegación situada debajo del header del sidebar; el recuadro del escudo/imagotipo conserva el fondo normal del sistema.
- El sidebar calcula la luminancia relativa WCAG del hexadecimal y elige automáticamente texto/iconos blancos o casi negros según cuál produzca mayor contraste. Los estados activo, hover, títulos de grupo y badges reciben variantes coherentes con esa decisión.
- Guardar la sección Identidad revalida el layout raíz para reflejar el nuevo color inmediatamente. Las demás secciones mantienen su revalidación actual.

# Avance 2026-08-04 — Apariencia institucional por superficies y tema

- Identidad visual permite configurar independientemente **Cabecera**, **Esquinero** y **Menú**, cada uno con color para tema claro y tema oscuro. Los seis valores son opcionales: vacío conserva exactamente el diseño predeterminado del sistema.
- Se ofrecen doce cards con miniaturas clara/oscura y estado seleccionado: Predeterminado; tres con menú/esquinero iguales y cabecera suave; tres con cabecera/esquinero iguales y menú predeterminado; dos monocromáticas; y tres con menú de color y cabecera/esquinero neutros. Toda variante clara usa superficies claras y toda variante oscura usa superficies oscuras. **Predeterminado** vacía los seis colores y desactiva el escudo del menú, sin borrar el color institucional ni los medios.
- Plantillas, campos de color y switch del escudo actualizan inmediatamente una store temporal consumida por el layout. Esta previsualización no dispara API ni escribe PostgreSQL; se descarta al abandonar la página y solo se persiste mediante **Guardar cambios**.
- Predeterminado muestra en los seis campos los tokens reales `#FFFFFF` para tema claro y `#1E1E1D` para tema oscuro. Los registros anteriores que representaban esos valores con campos vacíos se normalizan solo en el formulario, sin habilitar Guardar cambios ni escribir la base hasta que exista una modificación del usuario.
- El bloque institucional del menú se compone de escudo de 72×72, nombre opcional centrado y un separador antes de `General`. El nombre tiene una preferencia independiente; al ocultar el escudo desaparece el bloque completo, incluido nombre y separador, sin perder la elección del nombre para una activación futura.
- `ui_mostrar_nombre_empresa_menu` se persiste con valor inicial `true`, viaja por el tenant SSR y participa en la previsualización local. Migración aplicada: `20260804183000_company_menu_name`.
- El menú puede mostrar el escudo centrado antes de `General`. La opción permanece deshabilitada sin escudo y Nest vuelve a comprobarlo dentro de la transacción. Si se elimina la última variante del escudo, la opción se desactiva atómicamente.
- El tenant público entrega esta apariencia desde PostgreSQL durante el SSR raíz. No se añadió ninguna consulta `onMount`; la Cabecera, el Esquinero y el Menú nacen con su configuración antes del primer render y cambian de variante reactivamente al alternar el tema.
- Un utilitario común calcula luminancia relativa y selecciona texto/iconos blancos o casi negros para el contraste más alto. Incluye título, botones de cabecera, selector de idioma/tema, cuenta, grupos, opciones y badges del menú.
- Migración aplicada: `20260804170000_company_interface_colors`, con seis `VARCHAR(7)`, booleano y restricciones PostgreSQL `#RRGGBB`. La actualización usa el endpoint existente de identidad con sesión/organización activa, DTO estricto, CSRF, rate limit, bloqueo de fila, transacción y auditoría.
- Verificación: Prisma formateado/generado, migraciones al día, build Nest aprobado, 10 suites/40 pruebas backend aprobadas, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Avance 2026-08-04 — Color principal global por apariencia

- Cada una de las doce plantillas de Apariencia define ahora un `color_primario` coherente con su paleta y lo muestra mediante una muestra circular dentro de su card. Seleccionar una plantilla actualiza también el campo **Color principal** inferior y toda la previsualización en vivo; editar ese campo manualmente produce el mismo resultado.
- `color_primario` dejó de limitarse al sidebar y pasó a ser la fuente institucional de los tokens globales `primary`, `primary-pressed`, `on-primary`, enlaces y tonos de marca. Por ello botones, estados activos, focos, controles y demás consumidores existentes de Tailwind/Shadcn cambian sin estilos particulares por módulo.
- El contraste del texto sobre acciones se calcula automáticamente. En tema oscuro, un color excesivamente oscuro se aclara conservando su familia cromática; el color guardado en PostgreSQL no se duplica ni se altera.
- El login consume los mismos tokens desde el layout raíz SSR. La superposición de sus portadas deriva sus tonos oscuros del color institucional y nace personalizada desde el primer HTML, sin `onMount`, petición adicional ni salto de color.
- La plantilla **Predeterminado** usa el primary canónico actual `#0075DE`; sus variantes clara y oscura siguen siendo exactamente las definidas en `tokens.css`. La previsualización temporal se descarta al salir y solo **Guardar cambios** persiste el valor mediante la API, transacción y auditoría ya existentes.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Avance 2026-08-04 — Borde inferior opcional en Cabecera

- Cabecera incorpora **Ocultar borde inferior**. El switch retira únicamente la línea de separación entre el header y el contenido, sin cambiar color, altura ni distribución.
- La previsualización responde al instante. Se conserva el ancho del borde como transparente para evitar saltos de layout; la plantilla **Predeterminado** restaura el borde visible.
- `ui_cabecera_ocultar_borde` es booleano obligatorio en DTO, se guarda con Identidad dentro de la transacción y auditoría existentes, y llega mediante tenant SSR antes del primer render. Valor inicial: `false`.
- Migración aplicada: `20260804220000_company_header_border`; 67 migraciones al día.
- Verificación: Prisma formateado/generado, 10 suites/40 pruebas backend, build Nest, `svelte-check` 0 errores/0 advertencias y build SSR aprobados. No se abrió ningún puerto.

# Avance 2026-08-04 — Borde lateral opcional en Menú

- Cabecera agrupa también **Ocultar borde lateral**. Esta opción elimina físicamente el borde derecho del aside, incluida la separación de 1 px; desactivada restaura la línea habitual.
- El cambio se previsualiza inmediatamente. La plantilla **Predeterminado** restaura el borde visible.
- `ui_menu_ocultar_borde` es booleano obligatorio, se guarda en la misma transacción/auditoría de Identidad y llega por tenant SSR antes del render. Valor inicial: `false`.
- Migración aplicada: `20260804230000_company_menu_border`; 68 migraciones al día.
- Verificación: Prisma formateado/generado, 10 suites/40 pruebas backend, build Nest, `svelte-check` 0 errores/0 advertencias y build SSR aprobados. No se abrió ningún puerto.

# Avance 2026-08-04 — Tamaño configurable del escudo en Menú

- Debajo de **Ver escudo en el menú** se agregó un deslizador accesible de `50%` a `200%`, con pasos de `5%` y lectura visible del porcentaje. `100%` conserva los 72×72 px anteriores.
- El escudo ampliado cambia durante la previsualización; el control se bloquea si no existe escudo o su visualización está desactivada. La plantilla **Predeterminado** restaura `100%`.
- `ui_tamano_escudo_menu` se valida en frontend y DTO como entero `50–200`; PostgreSQL repite el límite mediante `CHECK`. Se guarda con Identidad en la transacción/auditoría existentes y llega por tenant SSR.
- Migraciones aplicadas: `20260804240000_company_menu_shield_size` y `20260804250000_company_menu_shield_size_200`; 70 migraciones al día.
- Verificación: Prisma formateado/generado, 10 suites/40 pruebas backend, build Nest, `svelte-check` 0 errores/0 advertencias y build SSR aprobados. No se abrió ningún puerto.
- La card de configuración ya no repite el encabezado **Identidad visual**: conserva únicamente **Apariencia del sistema**, su descripción y sus controles.

# Avance 2026-08-04 — Galería de portadas de Acceso

- Acceso dejó de usar los iconos decorativos de sus encabezados. La portada se presenta como una galería responsive de hasta cuatro recuadros: cada imagen tiene una `X` y, mientras exista capacidad, el último recuadro muestra `+` para subir una sola imagen.
- La carga individual muestra progreso real, bloquea operaciones simultáneas y finaliza con Sonner. La eliminación conserva el diálogo de confirmación y también bloquea dobles acciones.
- El original debe ser JPG/JPEG válido, no vacío y de máximo 3 MB. Nest verifica extensión, MIME declarado, firma binaria, decodificación real, una sola página y hasta 30 millones de píxeles; después corrige orientación, recorta a 1280×1920, elimina metadatos y genera un WebP optimizado de máximo 100 KB para R2, conservando la mayor calidad que cumpla el límite.
- El máximo de cuatro se comprueba nuevamente dentro de una transacción con bloqueo de la organización, por lo que cargas concurrentes no pueden superar el límite. Se conservan sesión y tenant activos, rate limit de 20/min, auditoría, claves R2 UUID, checksum SHA-256 y compensación del objeto si la transacción falla.
- La subida pasa por un endpoint SvelteKit dedicado y mantiene la sesión/refresh del backend; no usa una acción de formulario tradicional ni recarga los datos visibles. Verificación: 10 suites/41 pruebas backend, build Nest, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.
- Sobre la galería se añadió **Usar filtro de color**. El switch previsualiza en las cuatro portadas el mismo degradado institucional del login y se guarda junto con la sección Acceso. Su valor inicial es `true`, por lo que configuraciones existentes conservan su apariencia.
- `login_usar_filtro_color` es booleano obligatorio en frontend y DTO, se persiste dentro de la transacción/auditoría de la sección y llega al login público mediante tenant SSR. Desactivarlo elimina el filtro desde el primer HTML, sin consulta cliente ni salto visual. Migración aplicada: `20260804260000_company_login_color_filter`; 71 migraciones al día.
- El switch guarda inmediatamente mediante `PATCH /company/current/login/color-filter`; no espera el botón general ni persiste otros campos pendientes del formulario. Mientras responde queda bloqueado y muestra loader; un error restaura el valor anterior y se informa con Sonner.
- El endpoint acepta exclusivamente un booleano, mantiene CSRF/sesión/rate limit 20/min, valida empresa y usuario activos, bloquea la organización, actualiza perfil y auditoría en una sola transacción. La prueba E2E cubre campo ausente, tipo incorrecto, persistencia y auditoría.

# Ajuste 2026-08-04 — Acceso y panel fijo de ingreso

- Se retiró por completo la card **Panel de ingreso** de la configuración de Acceso. El título de bienvenida, su descripción y los accesos alternativos tampoco forman parte ya del DTO editable ni del contrato público del tenant, por lo que no pueden alterarse mediante una petición manual. El escudo continúa viniendo de Apariencia del sistema.
- El formulario de ingreso queda fijo. Su título se resuelve en SSR: muestra **Bienvenido** en la primera visita del navegador a ese tenant y **Bienvenido de nuevo** en visitas posteriores. El indicador se guarda en una cookie `HttpOnly`, separada por slug y sin hidratación tardía ni salto visual.
- Título, descripción, etiqueta, beneficios y texto comunitario del panel visual ya no usan copias predeterminadas. Un valor vacío no genera contenido en el login; los grupos vacíos tampoco reservan espacio.
- Los tres círculos comunitarios conservan su solapamiento, pierden sus bordes y comparten un solo degradado continuo derivado de `primary`, su tono claro y `primary-pressed`.
- La marca permanente Sumaq System se apoya en una pestaña oscura lateral translúcida, con borde sutil, desenfoque y sombra, para conservar contraste sobre cualquier portada.
- `on-primary` prefiere blanco cuando alcanza contraste WCAG AA (4.5:1); solo usa texto oscuro si el blanco no cumple. Esto corrige botones verdes legibles sin debilitar accesibilidad en colores institucionales claros.
- Verificación: 10 suites/41 pruebas backend, build Nest, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobados. No se abrió ningún puerto.
- Se retiró también el switch **Mostrar panel visual** y `login_mostrar_panel` de los contratos editable y público. La estructura izquierda del login es fija; sus elementos opcionales se renderizan exclusivamente cuando sus campos contienen información.
- La pestaña oscura de Sumaq System tiene ahora altura y ancho definidos; la marca queda centrada horizontal y verticalmente dentro del notch, sin depender del padding lateral del panel.

# Avance 2026-08-04 — Iconos configurables en beneficios

- Los círculos comunitarios conservan el degradado continuo y el solapamiento, incorporando un borde blanco al 35% de opacidad: el límite se percibe sin introducir un color sólido ajeno al primary.
- Cada uno de los tres beneficios dispone de un selector visual con doce iconos educativos de la línea Lucide existente. El icono seleccionado se previsualiza también dentro del input y se guarda junto con el texto al pulsar **Guardar cambios**.
- PostgreSQL incorpora `login_destacado_icono_1`, `login_destacado_icono_2` y `login_destacado_icono_3`. La migración `20260804270000_company_login_benefit_icons` quedó aplicada; 72 migraciones al día.
- Frontend SSR, DTO Nest y restricciones `CHECK` de PostgreSQL comparten la misma lista permitida. Campos ausentes, vacíos o iconos inventados son rechazados; el login solo recibe nombres válidos y renderiza el resultado desde el primer HTML.
- La implementación reutiliza DropdownMenu, Icon, tokens y espaciado del diseño existente; no agrega CSS personalizado. Incluye etiquetas accesibles, teclado, responsive e i18n ES/EN.
- El extremo derecho del notch de Sumaq System adopta una terminación completamente redondeada tipo píldora, manteniendo el borde izquierdo unido al viewport y la marca centrada.
- Verificación: Prisma formateado/generado, migración aplicada, 10 suites/41 pruebas unitarias backend, E2E de empresas 4/4, build Nest, `svelte-check` 0/0 y build SSR aprobados. No se abrió ningún puerto.
- En Panel visual, **Etiqueta** y **Mostrar etiqueta** comparten la primera fila. Los controles de beneficios ocupan el bloque intermedio y, al final, **Mostrar texto de comunidad** y **Texto de comunidad** comparten otra fila. En pantallas estrechas cada pareja se apila sin perder el orden.
- El tab antes llamado **Acceso** se denomina ahora **Inicio de sesión**. La card interior conserva correctamente el título **Panel visual**. En su fila inferior el texto de comunidad queda a la izquierda y el switch a la derecha; **Guardar cambios** se integra dentro de la misma card, separado por la línea y espaciado usados en las demás secciones.

# Ajuste 2026-08-04 — Horarios de atención compactos

- Comunicaciones retiró el icono decorativo de **Horario de atención**. El encabezado queda formado únicamente por título y descripción.
- Las siete jornadas comparten ahora encabezados únicos para Día, Estado, Desde y Hasta. Cada fila usa controles de hora de 36 px, menor padding y columnas alineadas, reduciendo considerablemente la altura sin modificar datos, validación ni guardado.
- En pantallas de hasta 700 px cada jornada se reorganiza en dos filas: día/estado y apertura/cierre. Las etiquetas de hora reaparecen en móvil y todos los controles conservan `aria-label`, foco, estados deshabilitados y tema claro/oscuro.
- La mejora reutiliza Tailwind y los tokens existentes, sin CSS personalizado. `svelte-check`: 0 errores y 0 advertencias. No se abrió ningún puerto.
- Corrección funcional: el switch estaba representando `cerrado`, por lo que encenderlo visualmente cerraba el día y vaciaba sus horas. Ahora el switch encendido significa **Atiende** y el estado se convierte correctamente a `cerrado=false`; al activarlo se proponen `08:00–18:00` y al desactivarlo ambas horas vuelven a `null`.
- Si un día activo carece de horas o Desde no es anterior a Hasta, ambos controles se marcan en rojo y aparece una explicación. El botón continúa bloqueado en ese caso, pero ya no falla silenciosamente. La validación estricta SSR/Nest/transacción permanece sin cambios.

# Corrección 2026-08-04 — Validación al confirmar en Empresas

- Los modales de crear y editar Empresas dejaron de marcar campos al perder foco. Los errores visuales aparecen únicamente después de pulsar **Crear empresa** o **Guardar cambios**; Cancelar, Escape y clic fuera limpian el intento de validación y cierran sin enviar peticiones.

# Avance 2026-08-04 — Administración de roles

- Se comprobó la trazabilidad de Empresas: creación, edición, cambio de estado, eliminación lógica, secciones de la empresa administrada, horarios, medios, reutilización y filtro del login registran auditoría dentro de la misma transacción que modifica PostgreSQL. Las lecturas no generan auditoría.
- Se agregó **Superadministrador → Roles** en la ruta inglesa `/superadmin/roles`. El listado llega mediante SSR, muestra primero los roles de creación más reciente y ofrece crear, editar, activar/desactivar y eliminar mediante los componentes, modales, loaders, Sonner y tokens visuales existentes. Permisos se implementará después como un módulo separado.
- `seguridad.roles.codigo` se presenta como **alias**, evitando duplicar el mismo concepto en otra columna. Nombre, descripción, alias e icono son obligatorios; la descripción acepta de 5 a 250 caracteres y aparece en el listado y en ambos formularios. El alias se normaliza a mayúsculas y solo acepta letras, números y guion bajo. El icono pertenece a una lista Lucide permitida y se selecciona visualmente.
- Los roles recibieron icono y eliminación lógica (`eliminado_en`, `eliminado_por`). Eliminar fija también `estado=0` con la hora de PostgreSQL, desactiva asignaciones usuario–rol y rol–permiso dentro de la misma transacción y excluye el registro de listados posteriores. Los roles internos `SUPERADMIN` y `ADMIN` no pueden desactivarse ni eliminarse, y su alias es inmutable.
- La API revalida usuario, cuenta y tenant activos dentro de cada transacción; bloquea la fila con `FOR UPDATE`, evita envíos sin cambios, comprueba duplicados por alias o nombre sin distinguir mayúsculas y diferencia con mensajes claros un UUID inexistente, un rol inactivo y un rol ya eliminado. Editar o eliminar exige rol activo; cambiar estado acepta activo o inactivo, pero nunca eliminado. Aplica DTO estricto/whitelist/CSRF global y rate limit de 20 mutaciones por minuto. Cada alta, edición, activación, desactivación y eliminación registra auditoría atómica con valores relevantes.
- La unicidad de alias se aplica solamente a roles no eliminados, igual que el slug vigente de Empresas: una baja lógica conserva el historial y permite crear posteriormente un nuevo rol con el mismo alias. PostgreSQL repite tamaños, formato del alias, longitudes de nombre y descripción, estado, iconos y consistencia de eliminación. Migraciones aplicadas: `20260804300000_roles_management`, `20260804310000_roles_data_constraints` y `20260804320000_role_description_and_active_alias`; 75 migraciones al día.
- Los formularios de Roles no validan al perder foco: los errores visuales solo se habilitan después de pulsar **Crear rol** o **Guardar cambios**. Cancelar, Escape y clic fuera del modal cierran sin mostrar bordes rojos ni enviar peticiones.
- Los formularios de crear y editar usan ahora el ancho normal del diálogo y presentan nombre, alias, descripción e icono en una sola columna; se eliminó el ancho amplio innecesario sin alterar validaciones ni comportamiento responsive.
- Verificación: TypeScript backend de producción aprobado; E2E Empresas/Roles 5/5, incluida autenticación, DTO inválido, campos extra, duplicados, descripción, estado inactivo, registro eliminado, reutilización de alias, orden, cambios, eliminación lógica y auditoría; `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.
# Escudo en listado global de empresas (2026-08-04)

- El listado SSR de `/superadmin/companies` incluye las versiones públicas de los escudos claro y oscuro, nunca la clave interna de R2.
- Cada fila muestra el escudo disponible con carga diferida y conserva la inicial de la empresa como fallback si no existe o no puede cargarse.
- Se añadió lectura autenticada y versionada del escudo de una empresa no eliminada; la respuesta usa caché privada e inmutable por tratarse de un nombre de objeto único.
- Los datos dinámicos de la tabla continúan con `no-store`; la excepción de caché se limita al recurso de imagen.
- En los modales de Roles se retiró el texto de ayuda redundante del alias; las validaciones frontend/backend permanecen activas.
- El proxy autenticado del escudo en el listado admite versiones históricas PNG/JPG/WebP. Esto afecta solo la lectura; las nuevas cargas de escudos e imagotipos continúan restringidas a PNG.

# Cambio 2026-08-05 — Roles globales del sistema

- Se eliminó relación Empresa → Rol. La tabla `seguridad.roles` ya no contiene `fid_organizaciones` ni FK hacia `nucleo.organizaciones`; la migración `20260805140000_global_roles` fue aplicada.
- Modelo vigente: **Empresa ← Usuario → Rol global → Permisos**. `seguridad.usuarios_roles` es la única tabla que asigna roles a usuarios. Empresa sigue siendo parte del usuario y de auditoría, no de la definición, lectura ni selección del rol.
- Roles ahora son únicos globalmente mientras estén vigentes: PostgreSQL protege alias sin distinguir mayúsculas y nombre sin distinguir mayúsculas mediante índices parciales; una baja lógica permite reutilizarlos después.
- Seed crea/reutiliza `SUPERADMIN` y `ADMIN` globales. Usuarios de cualquier empresa pueden recibirlos si están activos; creación y edición revalidan por separado empresa activa y roles globales activos dentro de la misma transacción.
- Roles, permisos y catálogo ya no filtran por empresa. Las rutas de Roles aún validan usuario/tenant activo para conservar seguridad y registran la empresa del actor en auditoría, pero esa empresa no restringe el rol consultado o modificado.
- Formularios SSR de Crear/Editar Usuario ya muestran todos los roles globales, sin esperar ni filtrar por empresa. La empresa continúa siendo obligatoria porque define el tenant del usuario.
- Verificación: Prisma generado, migración aplicada, build Nest aprobado, 10 suites/41 pruebas backend aprobadas, `svelte-check` 0 errores/0 advertencias y build SSR aprobado. No se abrió ningún puerto.

# Ajuste 2026-08-05 — Creación de usuarios: empresa y roles

- El selector de Empresa muestra exclusivamente la razón social; ya no entrega nombre interno, slug ni otro código al navegador. La fuente SSR selecciona únicamente el identificador técnico y la razón social del perfil de cada empresa activa.
- Roles usa el componente `Select` común de la aplicación. Elegir uno lo agrega a la selección y lo muestra como etiqueta removible; permite conservar varios roles globales por usuario sin usar el selector múltiple nativo.
- Los roles seleccionados viajan como campos ocultos repetidos `fid_roles`, por lo que se conserva el mismo contrato SSR, DTO, límite de 20 roles y validación backend existente.
- Verificación: build Nest y 10 suites/41 pruebas backend aprobadas; `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Corrección 2026-08-05 — Reutilización de usuarios eliminados

- Se corrigió la contradicción entre la baja lógica y la unicidad del usuario. Antes, el servicio excluía usuarios eliminados, pero PostgreSQL mantenía un índice único normal y rechazaba reutilizar el mismo nombre de usuario.
- La migración `20260805143000_active_username_unique` reemplaza ese índice por uno único parcial: `empresa + UPPER(usuario)` solo cuando `eliminado_en IS NULL`. Una cuenta eliminada conserva historial, pero libera su usuario; dos cuentas vigentes no pueden compartirlo ni cambiar solo mayúsculas/minúsculas.
- Login y seed ahora buscan exclusivamente usuarios no eliminados. Así una identidad histórica jamás se autentica ni impide crear la nueva cuenta.
- Verificación: migración aplicada (80 al día), Prisma generado, build Nest y 10 suites/41 pruebas backend aprobadas. No se abrió ningún puerto.

# Auditoría 2026-08-05 — Alta completa de usuarios

- Se comprobó la base real después del alta: el usuario nuevo `ADEMOE` quedó vigente y posee exactamente una persona, un correo activo, una credencial activa, un rol activo y una auditoría `usuarios.creado`. No existen datos huérfanos ni una transacción parcial.
- La base contiene actualmente dos usuarios vigentes y dos eliminados. Reintentar `ADEMOE` debe rechazarse porque el primer intento ya terminó correctamente; los usuarios eliminados sí liberan su alias.
- Los conflictos concurrentes `P2002` ya no se convierten siempre en el mensaje genérico “ya existe”: el modelo `usuarios` responde nombre de usuario duplicado y `personas_correos` responde correo duplicado.
- La migración `20260805144000_active_email_case_insensitive_unique` refuerza correo vigente único por empresa mediante `LOWER(correo) WHERE estado = 1`. Un correo inactivo de una baja lógica no bloquea el alta y variantes de mayúsculas/minúsculas no evaden la unicidad.
- Verificación: 81 migraciones al día, Prisma generado, build Nest y 10 suites/41 pruebas backend aprobadas. No se abrió ningún puerto.

# Corrección 2026-08-05 — Respuesta visual al crear usuario

- Se identificó la causa del falso error: Nest confirmaba el alta y la acción SSR respondía con una redirección `303`, pero el callback personalizado de `use:enhance` solo consideraba exitoso `result.type === "success"`. La redirección caía en la rama de error, no navegaba y un segundo intento encontraba correctamente el usuario ya creado.
- Crear usuario ahora procesa explícitamente `result.type === "redirect"` mediante `applyAction`. Después de confirmar la transacción navega al listado SSR y muestra **Usuario creado correctamente**; solo respuestas `failure` muestran Sonner de error.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Ajuste 2026-08-05 — Alta consecutiva sin abandonar el formulario

- Crear usuario ya no redirige al listado. La acción SSR devuelve éxito en la misma ruta y el formulario permanece visible.
- Después de confirmar el alta se limpian empresa, roles seleccionados, nombres, apellidos, usuario, correo, contraseña y confirmación; también se reinician errores y bloqueo de envío.
- Sonner muestra **Usuario creado correctamente**. Ante un fallo se conservan los datos ingresados para poder corregirlos.
- Verificación: `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Avance 2026-08-05 — Edición de usuarios en página SSR

- Editar dejó de usar un modal. Cada fila navega a la ruta inglesa `/superadmin/users/:id/edit`, con breadcrumb y formulario de ancho completo consistente con Crear usuario.
- La página obtiene por SSR el usuario y las opciones activas antes del primer render. El listado dejó de solicitar catálogos de creación que no utiliza.
- Empresa permanece visible pero inmutable; puede modificarse el nombre de usuario, nombres, apellidos, correo institucional y uno o más roles globales. El botón se habilita únicamente cuando existe un cambio válido, se bloquea durante el envío y conserva el formulario ante errores.
- Frontend y servidor Svelte repiten obligatoriedad, formato, UUID, longitudes, correo, roles únicos y máximo de 20. Nest conserva DTO estricto, `ParseUUIDPipe`, whitelist global y rate limit de 20 mutaciones por minuto.
- El backend rechaza actor, tenant o usuario inactivos/eliminados; empresa inactiva, cambio silencioso de empresa, roles inactivos/inexistentes y duplicados vigentes de usuario o correo. La actualización bloquea la fila y modifica persona, usuario, correo principal, usos, roles y auditoría dentro de una sola transacción.
- Si un uso de correo principal preexistente estaba inactivo, la edición lo reactiva coherentemente dentro de esa misma transacción, evitando relaciones activas/inactivas contradictorias.
- Verificación: build Nest aprobado, 10 suites/41 pruebas backend aprobadas, `svelte-check` 0 errores/0 advertencias y build SSR de producción aprobado. No se abrió ningún puerto.

# Ajuste 2026-08-05 — Separación del escudo en Login

- La separación vertical entre el escudo institucional y el título de bienvenida aumentó finalmente a 96 px. Tamaño, centrado, carga SSR y versión por tema permanecen sin cambios.
