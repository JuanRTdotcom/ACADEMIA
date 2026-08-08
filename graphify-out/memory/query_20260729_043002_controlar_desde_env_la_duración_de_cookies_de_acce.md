---
type: "query"
date: "2026-07-29T04:30:02.367044+00:00"
question: "Controlar desde env la duración de cookies de acceso y refresco"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "config", "Module"]
---

# Q: Controlar desde env la duración de cookies de acceso y refresco

## Answer

Expanded from graph vocab: [auth, config, service, module]. Backend usa JWT_ACCESS_TTL_MINUTES para access JWT y access cookie, y JWT_REFRESH_TTL_DAYS para refresh JWT, sesión persistida y refresh cookie. Se actualizó .env, se agregó .env.example y se eliminó JWT_ACCESS_TTL. Build y tsc correctos.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- config
- Module