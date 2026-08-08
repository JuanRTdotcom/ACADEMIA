---
type: "query"
date: "2026-07-31T04:32:29.978670+00:00"
question: "La sesión nueva del mismo dispositivo debe quedar activa y la anterior cambiarse; por ahora corregir solo el login."
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "prisma", ".login()", ".\\$transaction()"]
---

# Q: La sesión nueva del mismo dispositivo debe quedar activa y la anterior cambiarse; por ahora corregir solo el login.

## Answer

Expanded from original query via vocab: [auth, login, prisma, transaction]. En crearSesionIngreso, el upsert reutiliza el dispositivo. En la misma transacción se revocan sesiones vigentes de ese dispositivo con estado=1, revocada_en null y expira_en mayor que ahora; después se crea la nueva. Access y refresh incluyen el mismo sid para identificar sesión actual. Logout y gestión de sesiones quedan pendientes.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- prisma
- .login()
- .\$transaction()