# Diseño del esquema — Sumaq System

Base multi-organización con RBAC, separación persona/usuario/credencial, auditoría y soporte futuro para eventos de dominio.

Fuente ejecutable: [`schema.prisma`](./schema.prisma). Convenciones: [`../CONVENTIONS.md`](../CONVENTIONS.md).

## Resumen

- 26 tablas.
- 6 schemas PostgreSQL: `nucleo`, `personas`, `seguridad`, `configuracion`, `system`, `eventos`.
- Identificadores propios en español, `snake_case` minúsculo, sin tildes y `ñ → ni`.
- Los nombres físicos y los escalares de Prisma son idénticos; no se usan `@map` ni `@@map`.
- PK: `id_tabla`; FK: `fid_tabla`; ambas usan UUID nativo PostgreSQL (`@db.Uuid`).
- Soft-delete: `estado`.
- Auditoría estándar: `created_at`, `created_by`, `updated_at`, `updated_by`.

## `nucleo`

### `organizaciones`

Tenant principal. Guarda `slug`, nombre y estado. El slug permitirá resolver tenants por subdominio.

### `perfil_organizacion`

Relación 1:1 con organización. Contiene datos legales, contacto, marca, configuración de correo, idioma y zona horaria predeterminados.

## `personas`

### `personas`

Datos personales independientes del acceso: nombres, apellidos, documento, sexo, nacimiento, contacto y foto. Una persona puede relacionarse con una o más cuentas de usuario.

Los datos humanos con límite funcional no usan `text` ilimitado: `nombres` es
`varchar(50)` y cada apellido es `varchar(30)`. Todo cambio futuro debe mantener
el mismo máximo en input, esquema frontend, DTO backend y columna PostgreSQL;
la base es la última barrera y nunca debe truncar silenciosamente datos existentes.

## `seguridad`

### Identidad y acceso

- `usuarios`: cuenta técnica dentro de una organización. Se identifica con `usuario`, único por tenant, normalizado en mayúsculas y limitado a 20 caracteres alfanuméricos. El correo no es credencial. `intentos_fallidos` controla el lockout por cuenta; no reemplaza el rate limit HTTP por IP.
- `personas_correos`: medios de contacto de una persona. Admite varios correos, conserva verificación y garantiza como máximo uno activo para notificaciones.
- `personas`: información humana y de contacto; ubicación residencial enlazada a un distrito. La API intercambia el UBIGEO INEI de seis dígitos y la base resuelve su FK.
- `configuracion.departamentos`, `configuracion.provincias`, `configuracion.distritos`: catálogo territorial oficial del Perú; 25 departamentos, 196 provincias y 1,892 distritos.
- `credenciales`: mecanismos cerrados por `tipo_credencial` (`contrasenia`, `passkey`). Cada usuario puede tener una sola contraseña activa y varias passkeys; un índice parcial de PostgreSQL impone la unicidad de la contraseña activa.
- `historial_contrasenias`: hashes anteriores para políticas de no reutilización.
- `tokens_verificacion`: verificación de correo, recuperación, enlace mágico, invitación y dispositivo nuevo.

### MFA y dispositivos

- `usuario_mfa`: TOTP, SMS o correo.
- `codigos_recuperacion_mfa`: códigos de un solo uso almacenados como hash.
- `dispositivos`: dispositivos web/móvil asociados al usuario.
- `sesiones`: refresh protegido con HMAC, familia rotativa, última actividad, expiraciones, revocación y marcador único de reuso.

### Autorización

- `roles`: roles por organización.
- `permisos`: catálogo global de permisos.
- `roles_permisos`: relación N:M.
- `usuarios_roles`: relación N:M.

### Preferencias y configuración de cuenta

- `configuracion_usuario`: claves JSON específicas de una cuenta.
- `preferencias_usuario`: tema, idioma, menú, país, zona horaria, formato y notificaciones.

Estas tablas viven en `seguridad` porque pertenecen directamente a la identidad del usuario.

## `configuracion`

- `modulos`: árbol de módulos navegables, ruta, icono y permiso requerido.
- `organizaciones_modulos`: módulos habilitados por tenant.
- `parametros`: catálogo global de listas simples.
- `configuracion_organizacion`: claves JSON por organización.
- `auditoria`: bitácora transversal con acción, entidad, usuario, organización, IP, agente y metadatos.

Las referencias de auditoría no usan FK deliberadamente: deben sobrevivir a la eliminación del registro original.

## `system`

Catálogos globales de la plataforma, independientes del tenant:

- `paises`: catálogo operativo de países; actualmente contiene únicamente Perú.
- `zonas_horarias`: catálogo completo de identificadores IANA expuestos por PostgreSQL.

`preferencias_usuario` referencia estos catálogos mediante UUID; no almacena nombres sueltos.

## `eventos`

### `eventos_maestro`

Maestro versionado de contratos funcionales. Define código estable, agregado, nombre, descripción, versión, visibilidad en Actividad y estado de emisión. PostgreSQL es la única fuente de esas propiedades; `eventos-funcionales.ts` conserva solo los identificadores técnicos que la aplicación puede emitir. Los registros inactivos se conservan para mantener válido el historial.

### `eventos`

Bitácora cronológica de eventos: organización, usuario, contrato maestro, identificador del agregado, datos, metadatos y fecha de ocurrencia. `fid_eventos_maestro` es una FK restrictiva y `fid_usuarios` está indexado junto con `ocurrido_en` para listar eficientemente el historial de una cuenta.

`ServicioAuditoria.registrar()` escribe solo auditoría interna. `registrarConEvento()` acepta únicamente códigos tipados, verifica que el maestro esté activo y corresponda al agregado, agrega la acción funcional al historial y permite que ambas filas compartan la transacción del cambio de negocio. Refresh exitoso y actualizaciones técnicas no crean eventos.

El modelo todavía no garantiza append-only en PostgreSQL. Cuando se active event sourcing deben agregarse permisos o reglas que bloqueen `UPDATE` y `DELETE`.

## Relaciones principales

```text
organizaciones 1──N personas
organizaciones 1──N usuarios
personas       1──N usuarios
usuarios       1──N credenciales
usuarios       1──N dispositivos
dispositivos   1──N sesiones
usuarios       N──M roles       mediante usuarios_roles
roles          N──M permisos    mediante roles_permisos
organizaciones N──M modulos     mediante organizaciones_modulos
usuarios       N──1 paises      mediante preferencias_usuario
usuarios       N──1 zonas       mediante preferencias_usuario
```

## Fuente de verdad

1. `schema.prisma`: modelo actual.
2. `prisma/migrations/`: historial reproducible.
3. `database/sumaq_system.sql`: fotografía sin datos; no reemplaza migraciones.
