---
type: "explain"
date: "2026-07-29T05:30:14.119039+00:00"
question: "El controlador ejecuta ServicioAutenticacion.ingresar y qué devuelve"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: El controlador ejecuta ServicioAutenticacion.ingresar y qué devuelve

## Answer

Expanded from graph vocab: [auth, controller, login, service, request, module]. Sí: this.auth.ingresar(dto, peticion) llama al método del servicio. Si funciona devuelve Promise resuelta con tokenAcceso, tokenRefresco y usuario público. El controlador separa usuario y tokens, guarda tokens en cookies y responde JSON con usuario. Si falla, lanza excepción y no devuelve objeto de éxito.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module