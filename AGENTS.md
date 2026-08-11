# Instrucciones operativas para agentes

1. Lee `PROJECT_STATE.md` antes de analizar, planificar o modificar el proyecto.
2. Limita la lectura a los archivos del módulo solicitado y sus dependencias directas. Busca en `ESTADO.md` solo el contexto histórico necesario.
3. No implementes trabajo fuera de la petición, no reabras decisiones marcadas como cerradas y no hagas refactors globales por iniciativa propia.
4. Si la petición contradice `PROJECT_STATE.md`, el código actual o una regla vigente, explica la contradicción antes de cambiar nada.
5. Conserva las capas de seguridad, validación, auditoría, accesibilidad, transacciones e i18n. La simplificación nunca las elimina.
6. Mantén los cambios pequeños y verifica solo lo afectado, salvo que el cambio sea transversal.
7. Al completar una funcionalidad, actualiza `PROJECT_STATE.md` con el siguiente estado y registra el detalle en `ESTADO.md`. No borres historia.

## Contexto bajo demanda

- Backend/BD: `backend/CONVENTIONS.md` y `backend/ARCHITECTURE.md`.
- Formularios: `LINEAMIENTOS_FORMULARIOS.md`.
- Frontend: `frontend/frontend.md` y `frontend/DESIGN2.md`.
- Relaciones del repositorio: si existe `graphify-out/graph.json`, usa `graphify query`; si no, inspecciona el código. Confirma siempre antes de editar.
