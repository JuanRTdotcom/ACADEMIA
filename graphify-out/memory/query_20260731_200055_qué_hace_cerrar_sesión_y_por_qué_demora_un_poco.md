---
type: "query"
date: "2026-07-31T20:00:55.018594+00:00"
question: "Qué hace cerrar sesión y por qué demora un poco"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User", "Controller", "prisma"]
---

# Q: Qué hace cerrar sesión y por qué demora un poco

## Answer

Expanded via graph vocab: [auth, user, controller, prisma]. Flujo actual espera POST Svelte /logout; este llama Nest /auth/logout; guard valida refresh; backend abre transacción, obtiene hora DB, busca sesión, la revoca, borra FCM del dispositivo, inserta auditoría y confirma; emite SSE; limpia cookies; responde redirect 303. El fetch sigue redirect a login y luego session-client ejecuta goto login con invalidateAll, posible doble carga. Además SSE de la misma sesión puede invocar cerrarSesionLocal otra vez, generando logout duplicado. Es seguro pero tiene trabajo secuencial y redundante.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User
- Controller
- prisma