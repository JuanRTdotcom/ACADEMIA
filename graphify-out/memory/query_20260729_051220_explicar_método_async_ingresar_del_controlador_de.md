---
type: "explain"
date: "2026-07-29T05:12:20.011308+00:00"
question: "Explicar método async ingresar del controlador de login"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Explicar método async ingresar del controlador de login

## Answer

Expanded from graph vocab: [auth, controller, login, service, request, module]. Body entrega DtoIngreso validado; Request sirve para resolver tenant y metadatos; Response passthrough permite Set-Cookie y return. auth.ingresar devuelve usuario, tokenAcceso y tokenRefresco. La desestructuración extrae usuario y agrupa el resto en tokens; ponerSesion escribe cookies HttpOnly; la respuesta JSON devuelve solo usuario público.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module