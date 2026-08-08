# Reglas de Memoria y Desarrollo — Sumaq System

Estas reglas son obligatorias y de aplicación permanente en el workspace:

1. **Lectura previa**: Leer `ESTADO.md` antes de comenzar una tarea importante.
2. **Consultas de arquitectura**: Consultar Graphify antes de responder preguntas sobre arquitectura o relaciones del código.
3. **Verificación de código**: Revisar el código real antes de modificarlo. Nunca suponer que una funcionalidad existe solo porque está documentada.
4. **Clean Architecture**: Mantener la estructura Clean Architecture utilizada dentro de Nest (`domain/entities`, `domain/repositories`, `domain/usecases`, `data/datasources`, `data/repositories`, `presentation`).
5. **Nombres de rutas y carpetas**: Mantener rutas HTTP, rutas SvelteKit y carpetas nuevas en inglés.
6. **Base de datos**: Mantener nombres de esquemas, tablas, columnas, enums, índices y restricciones en `snake_case` y sin mayúsculas en PostgreSQL y Prisma.
7. **SSR preferente**: Priorizar SSR para consultas necesarias antes del render.
8. **Evitar consultas en mount**: No realizar consultas de datos necesarias mediante `onMount`.
9. **Variables de entorno estrictas**: No introducir valores predeterminados para variables de entorno obligatorias. Si falta una variable, la aplicación debe fallar al iniciar de forma descriptiva.
10: **Validación multi-capa**: Mantener validación frontend (Superforms + Valibot), servidor SvelteKit, DTO Nest (class-validator) y restricciones PostgreSQL (`NOT NULL`, `CHECK`, `UNIQUE`, `FK`) cuando corresponda.
11. **Filtro de baja lógica**: Validar registros activos (`estado = 1`) y no eliminados (`eliminado_en IS NULL`) según la lógica de cada módulo.
12. **Transacciones y locks**: Usar transacciones de base de datos para operaciones relacionadas y bloqueo de fila (`FOR UPDATE`) para prevenir condiciones de carrera.
13. **Auditoría**: Registrar auditoría atómica para todas las mutaciones de usuario.
14. **Eventos de negocio**: Registrar eventos únicamente para acciones funcionales explícitamente aprobadas en `ESTADO.md`.
15. **Rate Limiting**: Aplicar rate limit (`@Throttle`) en endpoints según los lineamientos existentes.
16. **i18n bilingüe**: Conservar i18n español/inglés tanto en frontend como en los mensajes traducidos del backend por filtro global.
17. **Reutilización de diseño**: Reutilizar Tailwind CSS v4, shadcn-svelte, componentes base y el diseño Notion "daylight" existente (`frontend/DESIGN2.md`).
18. **Sin CSS custom**: No cambiar el template ni crear CSS personalizado innecesario.
19. **Preservar trabajo no relacionado**: Preservar cambios existentes que no pertenezcan a la tarea actual.
20. **No destructivo**: Nunca limpiar la base de datos, eliminar archivos ni ejecutar acciones destructivas sin autorización explícita del usuario.
21. **Cierre obligatorio de puertos**: Si abres o inicias un servidor o proceso en un puerto para pruebas temporales, es **estrictamente obligatorio detener el proceso y liberar el puerto inmediatamente al terminar**. Nunca dejar servidores de prueba o procesos colgados en segundo plano.
22. **Actualización de memoria viva**: Actualizar `ESTADO.md` después de realizar cambios materiales.
23. **Verificación continua**: Ejecutar pruebas unitarias/E2E, `nest build`, `svelte-check` y verificaciones proporcionales al cambio realizado.
24. **Protección de secretos**: No leer, copiar, imprimir ni exponer secretos de archivos `.env` o credenciales del sistema.
25. **Formateo de fechas consistente (UTC)**: Usar siempre de manera obligatoria las funciones helper de fechas importadas desde `$lib` (`formatLocalDate` y `formatLocalDateTime`) en lugar de formatear fechas localmente con `Intl.DateTimeFormat` u otras librerías, para evitar discrepancias de zona horaria entre el backend y el navegador.
26. **Lineamiento de Fechas y UTC (Timestamptz vs Date)**: 
    * **Eventos del sistema y contratos (Grupo A y B)**: Se deben modelar en base de datos usando `Timestamptz` (por ejemplo, logs de auditoría, expiración de sesiones, vigencia de planes). En el backend se normalizan y almacenan en UTC absoluto (`+00`), y en el frontend se formatean usando la zona horaria del usuario de sesión (ej. `America/Lima`), garantizando que se bloquee o habilite el acceso de manera precisa.
    * **Fechas puras de calendario (Grupo C)**: Aquellas que representan hitos estáticos que no dependen de dónde esté el usuario (cumpleaños, fecha de inicio/fin de estudios de una persona) se deben modelar usando `@db.Date` puro en base de datos. Al presentarlas en el frontend se pintan e interpretan directamente como strings ("YYYY-MM-DD") sin aplicar cálculos de zona horaria o UTC, evitando desfasar el día calendario debido al huso horario local.


