---
type: "query"
date: "2026-07-31T19:12:03.321237+00:00"
question: "con esa validacion de los /me se supone que ahora podremos validar en cada accion lo del usuario verdad? entonces para que quedaria el jwt o quedaria en segundo palno o que pasa? no entienod esa parte"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User", "Controller", "prisma"]
---

# Q: con esa validacion de los /me se supone que ahora podremos validar en cada accion lo del usuario verdad? entonces para que quedaria el jwt o quedaria en segundo palno o que pasa? no entienod esa parte

## Answer

Expanded from original query via vocab: [auth, user, controller, prisma]. /auth/me no valida cada acción. El guardia global valida el JWT en cada petición protegida; la estrategia usa sid y sub del JWT para cargar desde base la sesión y el contexto vigente. Luego los guardias de roles y permisos deciden usando datos actuales de base. /auth/me solo entrega ese contexto al SSR/frontend. JWT sigue siendo la credencial firmada: demuestra autenticación, integridad, expiración e identifica usuario y sesión. La base confirma revocación, estado y permisos vigentes. Es un esquema híbrido y stateful.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User
- Controller
- prisma