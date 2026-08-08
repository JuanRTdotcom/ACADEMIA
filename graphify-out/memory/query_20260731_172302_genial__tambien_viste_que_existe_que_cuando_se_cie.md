---
type: "query"
date: "2026-07-31T17:23:02.039969+00:00"
question: "genial. tambien viste que existe que cuando se cierra login en una elr esto tamien se cierra"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User"]
---

# Q: genial. tambien viste que existe que cuando se cierra login en una elr esto tamien se cierra

## Answer

Sí. Logout en una pestaña revoca la sesión y limpia cookies, luego BroadcastChannel envía logout y las otras pestañas del mismo navegador/origen navegan inmediatamente a /login. SSE respalda la revocación de esa misma sid. Otros dispositivos no se cierran con logout normal; solo con revocar todas, reutilización detectada o futura acción administrativa global.

## Outcome

- Signal: useful

## Source Nodes

- User