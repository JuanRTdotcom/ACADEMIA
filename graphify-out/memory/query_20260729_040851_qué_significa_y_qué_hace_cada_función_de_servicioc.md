---
type: "explain"
date: "2026-07-29T04:08:51.432419+00:00"
question: "Qué significa y qué hace cada función de ServicioCookiesAutenticacion"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Qué significa y qué hace cada función de ServicioCookiesAutenticacion

## Answer

Expanded from graph vocab: [auth, controller, service, config, module]. constructor recibe ConfigService por DI; opcionesBase reúne seguridad común de cookies; ponerSesion escribe access_token de 15 minutos y refresh_token configurable; limpiarSesion expira ambas cookies. El controlador llama ponerSesion en login/refresh y limpiarSesion en logout.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module