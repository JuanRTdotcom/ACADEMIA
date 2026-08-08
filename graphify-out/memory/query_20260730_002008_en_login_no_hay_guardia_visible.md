---
type: "query"
date: "2026-07-30T00:20:08.835357+00:00"
question: "en login no hay guardia visible"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Module"]
---

# Q: en login no hay guardia visible

## Answer

Expanded from original query via vocab: [auth, controller, decorator, module, modules]. Los guardias estan registrados globalmente mediante APP_GUARD en app.module.ts. En login corren ThrottlerGuard, GuardiaAcceso, GuardiaRoles y GuardiaPermisos. ThrottlerGuard aplica Throttle 20 por minuto; GuardiaAcceso lee Publico y permite continuar sin JWT; los guardias de roles y permisos permiten porque la ruta no declara requisitos. Luego ValidationPipe valida Body y se ejecuta ingresar. Login no puede exigir JWT; autentica correo y contrasenia en el servicio.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Module