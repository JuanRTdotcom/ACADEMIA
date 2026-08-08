---
type: "query"
date: "2026-07-29T04:07:16.945032+00:00"
question: "Extraer la política de cookies del controlador de autenticación a un servicio"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Extraer la política de cookies del controlador de autenticación a un servicio

## Answer

Expanded from graph vocab: [auth, controller, service, config, module]. Se creó ServicioCookiesAutenticacion en cookies.service.ts con opcionesBase, ponerSesion y limpiarSesion. El controlador inyecta el servicio y solo decide cuándo escribir o limpiar la sesión. El módulo registra el nuevo provider. Build y tsc sin errores.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module