# CLAUDE.md

## Memoria compartida del proyecto

Antes de analizar o modificar el proyecto:

1. Leer `ESTADO.md`, `LINEAMIENTOS_FORMULARIOS.md`, `.impeccable.md` y los lineamientos del backend.
2. Consultar `graphify-out/graph.json` mediante `graphify query` cuando la tarea involucre arquitectura, módulos, dependencias o flujos.
3. Ejecutar `graphify . --update` después de cambios estructurales relevantes.
4. Registrar en `ESTADO.md` los cambios funcionales, decisiones, migraciones y pruebas realizadas.
5. No tratar Graphify como fuente infalible: confirmar en el código cualquier decisión que vaya a producir modificaciones.
6. Mantener `graphify-out` en la raíz como única memoria Graphify compartida.
7. Cerrar y liberar inmediatamente cualquier puerto o servidor iniciado para pruebas al finalizar la tarea.
