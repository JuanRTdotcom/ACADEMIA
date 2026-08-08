---
type: "explain"
date: "2026-07-29T04:59:44.112058+00:00"
question: "Explicar @Publico, @Throttle, @Post y @HttpCode en login"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Explicar @Publico, @Throttle, @Post y @HttpCode en login

## Answer

Expanded from graph vocab: [auth, controller, login, module]. Publico agrega metadata que GuardiaAcceso usa para no exigir JWT; Throttle limita esa ruta a 5 solicitudes por ventana de 60000 ms; Post registra POST /auth/login; HttpCode cambia el éxito predeterminado de 201 a 200. Los guardias se ejecutan antes del método ingresar.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module