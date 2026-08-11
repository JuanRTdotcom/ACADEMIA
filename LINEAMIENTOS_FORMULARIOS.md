# Lineamientos de formularios

## Alta rápida desde un selector

Cuando un `select` permita crear una opción que todavía no existe en su catálogo, la acción `Agregar …` debe mostrarse en la misma fila del label, alineada a la derecha, con icono Lucide `plus` y color primario. Es un botón semántico accesible, pero visualmente se presenta como acción textual —sin caja, fondo ni borde— con hover subrayado y foco visible. El `select` permanece debajo y ocupa siempre todo el ancho disponible; no se reduce para colocar la acción a su lado. La acción solo se muestra cuando el usuario posee el permiso de creación correspondiente. Tras confirmar el alta, se reutilizan validación, loading, Sonner y auditoría, se incorpora la opción al catálogo, queda seleccionada y el formulario principal conserva sus valores.

Estas reglas son obligatorias para formularios nuevos y para cualquier refactorización de formularios existentes.

## 1. Regla de autoridad

- La validación del frontend mejora la experiencia, pero nunca se considera una defensa de seguridad.
- Todo dato recibido debe volver a validarse en el backend mediante un DTO.
- El `ValidationPipe` global debe mantener `whitelist`, `forbidNonWhitelisted` y `transform` activos.
- Ninguna petición puede confiar en identificadores de usuario, organización, rol o permiso enviados por la vista.

## 2. Acceso a una mutación

Antes de escribir, el backend debe verificar con los datos de la sesión:

- sesión y token vigentes;
- usuario existente y `estado = 1`;
- persona asociada existente y `estado = 1`, cuando corresponda;
- organización correspondiente y activa, cuando la operación dependa de ella;
- pertenencia de todos los registros al mismo tenant;
- rol o permiso requerido cuando se incorporen las reglas de acceso.

La comprobación del usuario activo debe hacerse nuevamente dentro de la operación transaccional. No basta con que el token haya sido válido cuando se emitió.

## 3. Transacciones

- Toda mutación de negocio debe ejecutarse dentro de una transacción de base de datos.
- La validación de estado que protege la escritura, la escritura principal y su auditoría deben pertenecer a la misma transacción.
- Si alguna escritura o auditoría falla, todo debe revertirse.
- Cuando dos peticiones puedan modificar el mismo agregado, se debe bloquear su fila (`FOR UPDATE`) o utilizar otro control de concurrencia equivalente.
- Las lecturas simples sin efectos secundarios no necesitan transacción.
- Acciones externas no transaccionales —archivos, correos, push o eventos en memoria— deben compensarse o ejecutarse después del commit según el caso.

## 4. Validación estructural

- Declarar campos obligatorios y opcionales.
- Validar tipo: texto, número, booleano, fecha, UUID, objeto o arreglo.
- Recortar espacios cuando corresponda.
- Rechazar texto vacío en campos obligatorios.
- Definir longitud mínima y máxima.
- Rechazar campos que el DTO no declare.
- Normalizar mayúsculas, minúsculas y formatos antes de comparar o guardar.

## 5. Formatos y reglas semánticas

- Aplicar expresiones regulares únicamente cuando el dato tenga un formato cerrado.
- Verificar correos, teléfonos, contraseñas, documentos, fechas y UUID.
- Comprobar fechas civiles y reglas cronológicas con el reloj de PostgreSQL.
- Validar códigos contra enum o tabla maestra activa; no aceptar códigos solo porque tengan el formato correcto.
- En relaciones con maestros, el formulario envía el UUID del registro. El backend no acepta la etiqueta ni guarda el código como sustituto de la FK; además valida grupo y estado del maestro.
- Validar relaciones y jerarquías completas: tenant, país, divisiones administrativas y demás padres.
- Validar reglas entre campos, por ejemplo documento obligatorio salvo `sin_documento`.
- Rechazar una mutación cuando el formulario no contiene cambios reales.

## 6. Base de datos y consultas

- Usar Prisma o consultas parametrizadas.
- Toda consulta de negocio sobre una tabla con baja lógica debe indicar explícitamente el estado esperado. Como regla general, listar, seleccionar, relacionar, modificar o eliminar exige `estado = 1`; un registro con `estado = 0` se considera inexistente para esas acciones.
- Las comprobaciones de existencia, pertenencia, duplicidad y relaciones deben distinguir registros activos e inactivos dentro de la misma transacción. No se debe omitir `estado` suponiendo que otra capa ya lo filtró.
- Si un dato eliminado puede reutilizarse, su restricción de unicidad debe aplicarse únicamente a registros activos mediante un índice único parcial u otra garantía equivalente de base de datos. La validación previa del código no sustituye esa protección frente a concurrencia.
- No concatenar datos del usuario en SQL.
- No utilizar `$queryRawUnsafe` ni `$executeRawUnsafe` con datos externos.
- Respaldar reglas estructurales mediante `NOT NULL`, `CHECK`, `UNIQUE` y FK.
- No usar triggers para lógica de negocio. Validaciones y efectos relacionados deben quedar explícitos en el caso de uso y confirmarse dentro de la misma transacción.
- Usar los UUID y la organización de la sesión en los filtros de actualización.
- Confirmar que la cantidad de filas modificadas sea la esperada.

## 7. Seguridad HTTP y presentación

- Exigir sesión salvo que la ruta sea explícitamente pública.
- Exigir CSRF en POST, PUT, PATCH y DELETE.
- Aplicar rate limit específico; las mutaciones de perfil parten de 20 solicitudes por minuto.
- Mantener CORS restringido, cookies seguras y Helmet.
- No devolver SQL, stack traces, secretos, contraseñas ni tokens.
- Escapar los datos al mostrarlos. No usar `{@html}` con contenido del usuario.
- Si en el futuro se acepta HTML enriquecido, sanitizarlo con una política explícita.
- Para archivos, validar tamaño, extensión, MIME, firma/contenido real, nombre y ubicación final.

## 8. Experiencia del formulario

- Mostrar errores por campo y un mensaje general entendible.
- Traducir códigos de error.
- Deshabilitar Guardar cuando no existen cambios.
- Bloquear el botón durante el envío y mostrar progreso o spinner.
- Manejar 400, 401, 403, 404, 409, 429 y 500.
- No reiniciar ni reemplazar visualmente el formulario después de un guardado exitoso si los valores ya coinciden.

### Iconografía obligatoria

- Todo icono visible debe provenir del catálogo oficial de Lucide instalado en el proyecto (`@lucide/svelte`).
- No dibujar SVG, `path`, emojis, formas CSS ni pictogramas propios para reemplazar un icono. Tampoco inventar nombres que no existan en Lucide.
- Para un icono nuevo, importar el componente oficial o usar `LucideIcon` con un nombre comprobado en el catálogo. El componente liviano `Icon` solo puede reutilizar entradas que reproduzcan un icono oficial de Lucide.
- Si Lucide no contiene el concepto exacto, usar el icono oficial semánticamente más cercano o texto; no crear uno nuevo.
- Logotipos, marcas y miniaturas de formatos aprobadas como recursos del proyecto se consideran imágenes de contenido, no iconos de interfaz. Nunca deben sustituir iconos de botones, acciones o controles, que continúan siendo exclusivamente Lucide.

## 9. Auditoría

- Registrar únicamente eventos funcionales relevantes.
- Auditoría y cambio principal deben confirmarse o revertirse juntos.
- Registrar usuario, organización, entidad y campos modificados.
- No registrar contraseñas, tokens, archivos completos ni información sensible innecesaria.

## 10. Pruebas mínimas obligatorias

Cada formulario debe tener al menos una prueba para:

1. operación válida;
2. ausencia de sesión;
3. usuario inactivo;
4. ausencia de CSRF;
5. campo obligatorio;
6. tipo incorrecto o campo desconocido;
7. longitud máxima;
8. formato inválido;
9. código de catálogo inexistente;
10. relación o tenant incorrecto;
11. regla cruzada entre campos;
12. ausencia de cambios;
13. SQL injection tratada como dato o rechazada;
14. contenido XSS tratado como texto o rechazado;
15. rate limit y respuesta 429;
16. concurrencia sobre el mismo registro;
17. rollback si falla una escritura relacionada o auditoría;
18. creación correcta de auditoría/evento;
19. error inesperado convertido en respuesta controlada sin exponer detalles;
20. persistencia final correcta en la base.

Las pruebas del frontend no sustituyen las pruebas E2E del API. Las reglas críticas deben probarse atravesando la ruta HTTP real.

## 11. Acciones requeridas y contadores

- Una acción requerida no es una preferencia. Debe existir como instancia por usuario y referenciar un maestro activo con código, sección, texto y prioridad estables.
- No guardar un contador duplicado en usuario o preferencias. El total se calcula desde acciones activas; así no puede quedar desincronizado.
- Toda mutación que pueda crear o resolver una acción debe reconciliarla dentro de la misma transacción del cambio funcional.
- La regla se evalúa desde datos confirmados de base, nunca desde un número enviado por frontend.
- El contexto SSR puede exponer únicamente el resumen necesario (`total` y `por_seccion`). Detalle y datos sensibles permanecen en backend.
- Tras una mutación exitosa, backend devuelve el resumen actualizado. Frontend puede sincronizar pestañas abiertas, pero la base sigue siendo autoridad.
- Los datos maestros deben crearse mediante migraciones y consultarse desde PostgreSQL. El seed y el código de aplicación no deben duplicar listas, etiquetas, descripciones u orden; solo pueden conservar identificadores técnicos necesarios para referenciarlos.
- Toda etiqueta visible de `configuracion.parametros` debe tener una fila por idioma activo en `configuracion.parametros_traducciones`. La clave funcional sigue siendo `codigo`; nunca se debe usar el texto traducido para validar, relacionar o guardar negocio.
- Un maestro nuevo debe crear su etiqueta base y sus traducciones en la misma migración. Agregar un idioma nuevo solo agrega filas por `codigo_idioma`; no agrega columnas ni mapas hardcodeados en frontend.
- Las API deben devolver el mapa `traducciones` junto con `codigo` y `etiqueta`. La UI resuelve el idioma mediante el componente/ayudante común y usa `etiqueta` únicamente como fallback.
- Consultar traducciones de forma relacionada o agrupada. No ejecutar una consulta independiente por opción (patrón N+1).
- Pruebas deben cubrir creación, resolución, reapertura, exposición en contexto SSR y rollback conjunto con operación principal.
