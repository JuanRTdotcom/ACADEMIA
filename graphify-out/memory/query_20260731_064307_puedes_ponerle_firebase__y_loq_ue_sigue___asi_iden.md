---
type: "query"
date: "2026-07-31T06:43:07.556293+00:00"
question: "puedes ponerle firebase_ y loq ue sigue , asi identifico que son de firebase. ahora dime, como identifico la sesion actual en la que estos en ese dispositivo tambien"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController"]
---

# Q: puedes ponerle firebase_ y loq ue sigue , asi identifico que son de firebase. ahora dime, como identifico la sesion actual en la que estos en ese dispositivo tambien

## Answer

Expansión del grafo: [auth], pero el grafo estaba desactualizado; se verificó código directo. Se renombraron columnas y contratos a firebase_id_instalacion y firebase_token_fcm mediante migración 20260731070000. La sesión actual ya se identifica con el claim sid del JWT, igual a sesiones.id_sesiones; la relación sesiones.fid_dispositivos apunta al dispositivo. En un listado, backend marca es_actual comparando cada id_sesiones con req.user.sid.

## Outcome

- Signal: useful

## Source Nodes

- AuthController