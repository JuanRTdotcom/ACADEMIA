---
type: "query"
date: "2026-07-29T04:32:59.372232+00:00"
question: "Eliminar valores por defecto de las duraciones y fallar si falta configuración"
contributor: "graphify"
outcome: "useful"
source_nodes: ["config", "Module", "AuthController"]
---

# Q: Eliminar valores por defecto de las duraciones y fallar si falta configuración

## Answer

Expanded from graph vocab: [auth, config, service, module]. Se agregó validarEntorno al ConfigModule para exigir JWT_ACCESS_TTL_MINUTES y JWT_REFRESH_TTL_DAYS como enteros positivos. Los servicios usan getOrThrow sin defaults. El arranque falla con mensajes que nombran la variable ausente o inválida. Build, tsc y tres casos de validación correctos.

## Outcome

- Signal: useful

## Source Nodes

- config
- Module
- AuthController