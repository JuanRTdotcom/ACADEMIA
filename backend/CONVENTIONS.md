# Convenciones — Sumaq System (backend / base de datos)

## Código NestJS

- Código propio del backend en español: clases, métodos, variables, archivos de negocio y comentarios. Solo las carpetas estructurales de Clean Architecture usan inglés.
- Todas las rutas HTTP y cada segmento visible de una URL se escriben en inglés (`/companies/:id/sections/contact`, nunca `/empresas/:id/secciones/contacto`). Esta regla no cambia el idioma español del dominio interno.
- `ñ` se escribe `ni` y no se usan tildes en identificadores (`contrasenia`, `sesion`).
- APIs de NestJS, Prisma y otras librerías conservan sus nombres originales (`@Injectable`, `findMany`, etc.).
- Clases TypeScript usan PascalCase y métodos/variables locales usan camelCase. Esta regla no cambia nombres físicos de la base.

## Clean Architecture por feature

- Todo feature sigue `data/`, `domain/` y `presentation/` según [ARCHITECTURE.md](./ARCHITECTURE.md).
- Cada endpoint llama una clase en `domain/usecases/` mediante `ejecutar()`.
- Entidades y comandos viven en `domain/entities/`; contratos abstractos en `domain/repositories/`.
- Dominio no importa `data`, `presentation`, Express ni Prisma.
- DTO y objetos `Request` pertenecen a `presentation`; antes del caso de uso se convierten a comandos y `ContextoSolicitud`.
- Consultas y transacciones Prisma viven en `data/datasources/`. Las implementaciones de contratos viven en `data/repositories/`.
- `data/models/` se crea únicamente cuando sea necesario representar o mapear datos que no cubran los tipos generados por Prisma.
- `*.module.ts` es la raíz de composición de Nest y enlaza contrato/implementación con `{ provide, useExisting }`.
- No crear carpetas vacías ni capas sin responsabilidad real.

## Configuración y manejo de errores

- Toda variable de entorno consumida por la aplicación debe declararse como obligatoria y validarse al arrancar.
- No usar valores predeterminados para ocultar variables faltantes o inválidas. El arranque debe fallar con un mensaje que identifique la variable.
- El `try/catch` se coloca en el límite del caso de uso. Las excepciones HTTP conocidas se vuelven a lanzar sin cambiar su código y los errores inesperados se registran y convierten en una respuesta 500 controlada.
- No envolver cada consulta en un `try/catch` que silencie errores o permita continuar con datos incompletos.
- Escrituras que forman una sola operación lógica deben ejecutarse en una transacción Prisma. La auditoría de esa operación participa en la misma transacción.

## Límite entre superadministración y administración tenant

- `companies.*` es alcance global: solo la organización propietaria aprovisiona, lista, activa, desactiva o elimina tenants mediante `/companies`. El listado entrega únicamente los campos necesarios para esa gestión.
- La organización propietaria se reconoce por `organizaciones.es_sistema`, nunca por un slug hardcodeado o una variable que pueda quedar obsoleta al editarlo. El superadministrador puede editar también esa empresa desde el módulo global.
- `companyProfile.*` es alcance tenant: la empresa se obtiene siempre desde `fid_organizaciones` de la sesión y se administra mediante `/company/current`; el cliente nunca envía un ID de organización para escoger qué empresa modificar.
- El `slug` pertenece al aprovisionamiento global. El administrador tenant puede verlo, pero no modificarlo.
- No volver a exponer endpoints administrativos como `/companies/:id/sections/...` ni confiar en un `id_organizaciones` recibido desde la vista para la configuración del tenant actual.

## Mensajes de error i18n (obligatorio en toda API)

- Los servicios y controladores nunca lanzan texto para el usuario: lanzan un CÓDIGO/clave (ej. `throw new BadRequestException("profile.hobbies.duplicate")`). El filtro global `FiltroExcepcionesI18n` (`APP_FILTER`) traduce ese código al idioma de la petición y arma la respuesta. Así toda API responde en el idioma correcto sin trabajo extra.
- Toda clave lanzada debe existir en `comun/i18n/es.json` y `en.json` (ambos idiomas). Si falta, `traducir` devuelve el código crudo: no rompe, pero se ve feo. Mantener los dos diccionarios en paridad.
- El idioma sale de `Accept-Language` (lo reenvía el frontend desde la cookie de locale en `requestBackend`), con respaldo al `idioma` del JWT y luego al inglés. El frontend nunca traduce estos mensajes de error: solo reenvía la preferencia y muestra `body.message`.
- Los mensajes con datos variables (un tope, un conteo, segundos de espera) nunca incrustan el número en el texto del diccionario. Se usa un placeholder `{clave}` y se lanza la excepción con `args`: `throw new BadRequestException({ message: "profile.hobbies.limit", args: { max } })`. El filtro interpola `{clave}` con `args`. Incrustar el número en el JSON lo vuelve estático y se desincroniza del valor real (ej. el tope configurable).
- Los mensajes de éxito los arma el frontend con sus propias claves i18n; usan el mismo locale, así que el idioma queda consistente en toda la app.

## Recursos inexistentes y edición/eliminación concurrente

- Toda mutación (`PATCH`/`DELETE`, y cualquier acción sobre un elemento identificado) verifica primero que el recurso siga activo (`findFirst` con `estado: 1` y pertenencia al dueño) dentro de la misma transacción antes de actuar. Si no existe, lanza `NotFoundException`; nunca revive un registro con baja lógica ni crea uno nuevo.
- Escenario objetivo: el usuario tiene abierta una lista en una pestaña/dispositivo y el elemento ya fue eliminado en otro. La operación debe fallar limpia (gana la última acción), sin lost update ni resurrección del dato.
- El mensaje de esa excepción es estandarizado e intuitivo en todos los módulos con colecciones (alta/edición/eliminación). No describe el detalle técnico ni el nombre del recurso; comunica que el elemento ya no existe e invita a recargar:
  - ES: «Este elemento ya no existe. Recarga la página para ver la lista actualizada.»
  - EN: «This item no longer exists. Reload the page to see the updated list.»
- Se conserva una key `notFound` por módulo (`profile.<modulo>.notFound`) en `comun/i18n/{es,en}.json` del backend y en `lib/i18n/{es,en}.json` del frontend, todas con el mismo texto. El backend envía la key; el frontend la traduce y la muestra en un toast de error.

## Orden obligatorio de listados

- Toda tabla o colección operativa nueva se devuelve desde backend con el registro creado más recientemente primero: `created_at DESC`.
- El orden debe ser determinista. Después de `created_at DESC` se agrega la PK UUID de la tabla también en `DESC` como desempate.
- La UI conserva el orden recibido; no debe reordenar por nombre, estado ni fecha en memoria salvo que exista una opción explícita de orden elegida por el usuario.
- Los catálogos jerárquicos o maestros con un campo funcional `orden` son la excepción: respetan ese orden cuando su finalidad es alimentar selects o navegación, no mostrar un historial operativo.

## Límite máximo por colección

- Toda colección del perfil (elementos que el usuario agrega/edita/elimina) define un máximo de registros activos. Antes de crear, dentro de la misma transacción y tras `bloquearPersona`, se cuenta `count({ fid_personas, estado: 1 })` y se lanza `BadRequestException("profile.<modulo>.limit")` si alcanza el tope. Solo cuentan los activos; los de baja lógica no suman, por lo que eliminar libera cupo.
- El tope de cada colección es una variable de entorno obligatoria (entero > 0), validada al arranque en `validar-entorno.ts`, sin valor predeterminado. Se lee con `ConfigService.getOrThrow<number>(...)`; nunca se hardcodea. Variables: `PROFILE_MAX_EMAILS`, `PROFILE_MAX_NATIONALITIES`, `PROFILE_MAX_INSURANCES`, `PROFILE_MAX_DOCUMENTS`, `PROFILE_MAX_HOBBIES`, `PROFILE_MAX_ACADEMIC_STUDIES`, `PROFILE_MAX_COMPLEMENTARY_STUDIES`.

## Almacenamiento de objetos

- Imágenes, documentos, audios y videos no se guardan como binarios/Base64 en PostgreSQL ni en el filesystem efímero del servidor. El proveedor vigente es Cloudflare R2 mediante el contrato neutral de `src/storage`.
- Las credenciales son secretos obligatorios del backend (`STORAGE_*`), nunca datos de la base, del frontend, de logs, de documentación ni del repositorio. En producción deben proceder de un gestor de secretos.
- Ningún controlador genérico expone el bucket. Cada feature consumidor valida primero sesión, organización, estado, permisos, tipo, tamaño y cuota; luego solicita una URL firmada para una sola clave y operación.
- Las claves las genera el servidor y deben comenzar por `tenants/<id_organizacion>/...`; nunca se acepta una clave libre enviada por el cliente.
- Tras la carga directa, el backend inspecciona tamaño, MIME, checksum y existencia antes de confirmar los metadatos en PostgreSQL. Si la confirmación falla, el objeto se elimina o queda en cuarentena para limpieza.
- El bucket permanece privado. Descargas y cargas usan URLs temporales; `STORAGE_SIGNED_URL_TTL_SECONDS` es obligatorio y no puede superar 3600 segundos.
- Una transacción PostgreSQL no puede abarcar atómicamente R2. Se usa compensación: el registro queda pendiente, se confirma tras verificar R2 y cualquier binario huérfano se elimina mediante una tarea idempotente.
- Todo objeto nuevo bajo `tenants/<id_organizacion>/...` reserva y confirma sus bytes en `nucleo.archivos_organizacion` desde la capa común de almacenamiento. El estado `2` significa carga pendiente, `1` objeto confirmado y `0` objeto retirado. Guardar y eliminar actualizan este ledger; leer un archivo no recalcula consumo ni consulta una cuota. Ningún módulo consumidor mantiene un contador paralelo.
- `configuracion.planes.almacenamiento_max_bytes` contiene la cuota común del plan. `NULL` significa sin límite. Antes de cargar, la capa común bloquea la organización, suma estados pendientes/confirmados y rechaza una reserva que supere la cuota; no implementar límites independientes por feature.
- Toda imagen cacheable usa una clave inmutable con UUID. Una sustitución crea un objeto y una URL nuevos; nunca se sobrescribe una clave existente. Avatares y medios administrativos usan caché privada; escudo y portadas del login pueden usar caché pública porque son visibles antes de autenticar. Solo una respuesta de imagen 200 cuya versión coincida exactamente con PostgreSQL puede recibir `max-age=31536000, immutable`. Ausencia, versión antigua, error o contenido inesperado siempre usan `no-store`.
- La caché de imágenes nunca se hereda a datos. HTML SSR, respuestas `__data.json`, JSON del API, sesión, permisos, preferencias, mutaciones y errores usan `Cache-Control: private, no-store`. En Cloudflare no se debe habilitar una regla global `Cache Everything`; cualquier regla de caché debe limitarse a assets estáticos o rutas versionadas `/media/.../<uuid>.<formato>`.
- Escudo e imagotipo aceptan únicamente PNG, tanto para su variante de fondo claro como para la de fondo oscuro; las portadas aceptan JPG/PNG/WebP. El límite de entrada común es `COMPANY_MEDIA_MAX_BYTES=3145728` (3 MB), obligatorio y sin fallback. Backend comprueba MIME, extensión, firma y formato decodificado; después genera una clave UUID nueva y guarda escudos/imagotipos como PNG y portadas como WebP.
- Cada familia de marca puede compartir una sola clave R2 entre ambos temas. Esa decisión se guarda explícitamente y cualquier reemplazo, separación o eliminación debe actualizar todas las referencias implicadas dentro de una transacción. Un objeto solo se elimina de R2 después del commit y cuando ninguna variante vigente conserva su clave.
- Valores por defecto en `.env`/`.env.example`: correos 10, nacionalidades 10, seguros 10, documentos 10, hobbies 20, estudios realizados 30, estudios complementarios 30. Se cambian editando el `.env`, sin tocar código.
- El mensaje `limit` es entendible: indica el máximo y sugiere eliminar uno para agregar otro. Vive como key por módulo en el i18n de backend y frontend.

## Regla obligatoria para PostgreSQL y Prisma

- Toda tabla, columna, tipo enum, valor enum, restricción e índice propio usa `snake_case` en minúsculas.
- El identificador declarado en `schema.prisma` debe ser el mismo identificador físico de PostgreSQL.
- No usar `@map` ni `@@map` para mantener dos nombres distintos.
- Nombres en español, sin tildes y con `ñ → ni`.
- PostgreSQL puede mostrar comillas en SQL generado; como todos los nombres son minúsculos, ya no dependen de ellas para conservar mayúsculas.
- Los campos virtuales de relación de Prisma no son columnas. Pueden usar un nombre singular descriptivo (`usuario`, `organizacion`, `rol`).

## Columnas estándar en toda tabla

```prisma
estado    Int      @default(1)
created_at DateTime @default(now()) @db.Timestamptz(3)
created_by String?
updated_at DateTime @default(now()) @db.Timestamptz(3)
updated_by String?
```

- `estado`: 1 activo, 0 inactivo; permite baja lógica.
- `created_at`: lo genera PostgreSQL con `CURRENT_TIMESTAMP`.
- `updated_at`: lo genera PostgreSQL mediante el trigger común `configuracion.establecer_updated_at()`; no usar Prisma `@updatedAt` porque toma el reloj del proceso.
- `created_by` y `updated_by`: los asigna la aplicación con el usuario de sesión.

## Regla temporal

- Esta regla es obligatoria para toda tabla, endpoint, servicio, seed y migración futura que agregue una fecha u hora.
- PostgreSQL es la única autoridad de fecha y hora para datos persistidos, comparaciones temporales y claims JWT `iat`/`exp`.
- Los instantes usan `DateTime @db.Timestamptz(3)`; fechas civiles sin hora, como `fecha_nacimiento`, usan `@db.Date`.
- Los instantes viajan por API en ISO 8601 con offset explícito (`Z` o `+00:00`); nunca enviar una fecha-hora sin zona.
- No usar `new Date()` ni `Date.now()` para escribir o validar datos del dominio.
- Consultar el reloj mediante `ServicioRelojBaseDatos`, que usa `CURRENT_TIMESTAMP` de PostgreSQL.
- Duraciones configurables se calculan dentro de PostgreSQL usando intervalos (`CURRENT_TIMESTAMP + ... * INTERVAL`).
- Las estrategias JWT ignoran el reloj local de Passport y validan `exp` mediante `ServicioRelojBaseDatos`.
- El frontend solo convierte para presentación. Debe usar la zona IANA del usuario/tenant, por ejemplo `America/Lima`, y nunca restar horas manualmente.
- En SSR siempre se pasa `timeZone` explícitamente; no depender de la zona del servidor Node.

### Sesiones y refresh

- Las contraseñas usan Argon2id. Los refresh tokens aleatorios se almacenan como `hmac-sha256:<hex>` usando `REFRESH_TOKEN_HASH_SECRET`; nunca se ejecuta una función de derivación lenta dentro de la transacción de refresh.
- Los hashes Argon2 de refresh previos solo se aceptan como compatibilidad temporal: la siguiente rotación siempre los reemplaza por HMAC-SHA-256.
- Una sesión activa se decide con todas sus condiciones: `estado = 1`, `revocada_en IS NULL`, `expira_en`, `expira_inactividad_en` y `expira_absoluta_en` mayores que `CURRENT_TIMESTAMP`.
- Toda petición protegida válida actualiza `ultimo_uso_en` y extiende `expira_inactividad_en` mediante PostgreSQL, sin superar `expira_en` ni `expira_absoluta_en`.
- Cada refresh conserva el `sid` y rota en la misma fila el token, hash y contador `generacion`; mantiene `iniciada_en`, dispositivo y vencimiento absoluto.
- La fila de sesión se bloquea con `FOR UPDATE` para impedir dos rotaciones concurrentes válidas.
- `rotada_en` distingue una rotación normal de logout/revocación. `reuso_detectado_en` hace que cada token reutilizado se procese una sola vez y revoca únicamente esa sesión.
- Refresh correcto no crea auditoría ni evento; `sesiones.ultimo_uso_en` y `dispositivos.ultimo_acceso_en` conservan su estado operativo. Solo el reuso sospechoso se audita.
- Access y refresh se firman y verifican con allowlist explícita `HS256`; nunca se confía en el encabezado `alg` recibido.
- Refresh tiene límite por IP antes del JWT y por `sid` firmado después del JWT. El contador por sesión es local a la instancia hasta migrarlo a almacenamiento distribuido.
- Ningún TTL de sesión puede estar codificado como fallback. Access, refresh, inactividad, máximo absoluto y gracia de reuso son variables obligatorias validadas al arrancar.

## Claves

- PK: `id_` + nombre plural de tabla. Ejemplos: `id_usuarios`, `id_personas`, `id_organizaciones`.
- FK: `fid_` + nombre plural de la tabla referenciada. Ejemplos: `fid_usuarios`, `fid_personas`, `fid_organizaciones`.
- PK y FK internas usan UUID nativo: `String @id @default(uuid()) @db.Uuid` y `String @db.Uuid`.
- No crear nuevas PK `Int autoincrement()` ni UUID almacenados como `TEXT` sin una decisión arquitectónica documentada.
- Identificadores externos (`uid_dispositivo`, `id_credencial_webauthn`, códigos y slugs) siguen como `String` cuando no son claves internas.
- Un dato administrable de catálogo se guarda mediante `fid_*` UUID hacia su maestro; nunca mediante su código o etiqueta textual en la tabla de negocio. El `codigo` permanece único y estable en el maestro como identificador funcional.
- La UI muestra la etiqueta del maestro, pero envía su UUID. El backend valida dentro de la transacción que el UUID exista, esté activo y pertenezca al grupo esperado.
- Toda FK nueva crea su índice en la misma migración. Las selecciones múltiples usan una tabla puente con UUID, FKs, unicidad de la pareja, estado y campos de auditoría; no arreglos de códigos.

## Estado y eliminación lógica de organizaciones

- `estado` representa disponibilidad operativa; `eliminado_en` representa eliminación lógica. No son el mismo concepto.
- Una organización utilizable exige siempre `estado = 1 AND eliminado_en IS NULL`.
- Una organización inactiva pero recuperable usa `estado = 0 AND eliminado_en IS NULL`.
- Una organización eliminada usa obligatoriamente `estado = 0`, `eliminado_en = CURRENT_TIMESTAMP` y `eliminado_por`; la baja debe escribir los tres datos dentro de una sola transacción.
- Las consultas normales, login, resolución de tenant y contexto de sesión excluyen filas con `eliminado_en IS NOT NULL`.
- Solo la acción explícita de cambiar estado puede leer una organización inactiva no eliminada para reactivarla. Una eliminada no puede reactivarse desde esa acción.
- PostgreSQL debe impedir mediante restricción que una fila eliminada conserve `estado = 1`.

## Contratos de eventos funcionales

- Ningún módulo escribe directamente en `eventos.eventos` ni inventa `tipo_evento` o `tipo_agregado` como texto libre.
- Todo evento funcional se declara primero en `src/comun/auditoria/catalogo-eventos.ts` y se sincroniza mediante el seed con `eventos.eventos_maestro`.
- `eventos_maestro.codigo` es un contrato estable: no se renombra ni reutiliza. Un cambio incompatible crea otra versión.
- `eventos.eventos` referencia el maestro mediante `fid_eventos_maestro`; PostgreSQL rechaza referencias inexistentes.
- `registrarConEvento()` exige un código tipado, consulta el maestro dentro de la transacción y valida `estado = 1` y el agregado esperado antes de escribir.
- `visible_actividad` controla si el tipo aparece en el historial del usuario. `estado` controla si todavía puede emitirse; desactivar un contrato no elimina sus eventos históricos.
- Agregar un evento requiere aprobación explícita, constante tipada, migración/seed, traducción de presentación y pruebas. Auditoría técnica no implica automáticamente un evento funcional.

## Flujo obligatorio para cambios

1. Editar `prisma/schema.prisma` usando los nombres físicos definitivos en `snake_case` minúsculo.
2. Crear y revisar una migración Prisma.
3. Aplicar la migración; no editar producción manualmente.
4. Ejecutar `prisma validate`, `prisma generate`, compilación y pruebas de las rutas afectadas.
5. Confirmar que `prisma migrate diff` no detecta diferencias entre la base y `schema.prisma`.

## Fase temporal de construcción de módulos

- El menú muestra todos los módulos y acciones; no se filtra por rol o permiso.
- Los controladores de Empresas no aplican permisos granulares mientras se construye el alcance funcional.
- Esto no elimina seguridad básica: se mantienen sesión, usuario y organización activos, CSRF, DTO estricto, rate limit, aislamiento tenant cuando corresponde, transacciones y auditoría.
- No usar un campo `organizaciones.es_sistema` para decidir acceso.
- Antes de producción es obligatorio restaurar y probar RBAC en backend; ocultar elementos del frontend nunca sustituye autorización del servidor.

## Apariencia institucional del tenant

- `color_primario` representa la identidad corporativa; no debe reutilizarse implícitamente como color de una superficie.
- Cabecera, esquinero y menú tienen campos explícitos para tema claro y oscuro. Vacío significa usar los tokens originales del sistema, no inventar un color de respaldo.
- Todo color persistido debe cumplir `#RRGGBB` en frontend, DTO Nest y restricción PostgreSQL.
- El contraste de texto e iconos se deriva por luminancia; no se guarda como otro campo configurable.
- `ui_mostrar_escudo_menu=true` exige al menos una variante activa del escudo. La comprobación y cualquier desactivación causada por eliminar el último escudo ocurren dentro de la misma transacción.
- El nombre y el separador del bloque institucional solo se renderizan dentro del bloque del escudo. `ui_mostrar_nombre_empresa_menu` conserva la preferencia del nombre aunque el escudo esté temporalmente oculto; nunca autoriza mostrar el nombre por sí solo.
- Las plantillas de apariencia son presets de diseño versionados en frontend; solo los seis colores resultantes se persisten. No son maestros de negocio.
- La apariencia llega en la resolución pública del tenant por SSR. No duplicar su consulta en `onMount` ni aplicar caché pública a la respuesta del tenant.
