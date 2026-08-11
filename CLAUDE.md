# CLAUDE.md

## Memoria compartida del proyecto

Sigue primero [`AGENTS.md`](./AGENTS.md) y [`PROJECT_STATE.md`](./PROJECT_STATE.md).

- `PROJECT_STATE.md` es el contexto operativo breve; no cargues `ESTADO.md` completo salvo que necesites contexto histórico concreto.
- Si existe `graphify-out/graph.json`, consulta `graphify query` solo para arquitectura, módulos, dependencias o flujos; confirma en el código antes de modificar.
- Ejecuta `graphify . --update` únicamente tras cambios estructurales relevantes.
- Conserva `ESTADO.md` como historial: registra allí decisiones, migraciones y pruebas cerradas sin borrar avances previos.
- Cierra y libera cualquier puerto o servidor iniciado para pruebas al finalizar.
