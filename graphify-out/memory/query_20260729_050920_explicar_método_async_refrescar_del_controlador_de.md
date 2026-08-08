---
type: "explain"
date: "2026-07-29T05:09:20.038401+00:00"
question: "Explicar método async refrescar del controlador de autenticación"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Explicar método async refrescar del controlador de autenticación

## Answer

Expanded from graph vocab: [auth, controller, service, request, module]. GuardiaRefresco valida el refresh JWT y EstrategiaRefresco coloca sub, sid y token crudo en req.user. UsuarioActual inyecta ese payload. El controlador espera auth.refrescar, que valida sesión y rota tokens; cookies.ponerSesion reemplaza ambas cookies y retorna ok true. Request aporta metadatos y Response permite Set-Cookie con passthrough.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module