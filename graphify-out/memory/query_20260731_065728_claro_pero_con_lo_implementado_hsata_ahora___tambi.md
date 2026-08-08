---
type: "query"
date: "2026-07-31T06:57:28.554751+00:00"
question: "claro pero con lo implementado hsata ahora , tambien se podria cerrar sesiones de los otros dispositivos, verdad?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: claro pero con lo implementado hsata ahora , tambien se podria cerrar sesiones de los otros dispositivos, verdad?

## Answer

Sí, el modelo permite revocar una sesión remota mediante sesiones.revocado_en y su relación fid_dispositivos. Pero aún falta endpoint autorizado que compruebe que la sesión objetivo pertenece a req.user.sub. Además, GuardiaAcceso actualmente solo valida firma/expiración JWT, por lo que el refresh queda invalidado inmediatamente pero el access token ya emitido puede funcionar hasta expirar; para corte inmediato se debe comprobar sid contra DB/cache en cada petición o usar denylist.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User