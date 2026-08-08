---
type: "query"
date: "2026-07-31T08:37:59.595976+00:00"
question: "la 3 , pasa? no se supone que el login siempre devuelve el mismo mensaje? el resto todavia no implementamos, solo quiero ver ahora el login"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: la 3 , pasa? no se supone que el login siempre devuelve el mismo mensaje? el resto todavia no implementamos, solo quiero ver ahora el login

## Answer

Sí pasa: el login devuelve mensajes específicos para organización no especificada, no encontrada e inactiva; solo usuario, contraseña, bloqueo y cuenta inactiva usan Credenciales inválidas. Para respuesta uniforme, esas ramas de organización deben devolver también auth.invalidCredentials y conservar el detalle únicamente en auditoría.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User