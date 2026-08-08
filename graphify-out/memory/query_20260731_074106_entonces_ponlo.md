---
type: "implementation"
date: "2026-07-31T07:41:06.413628+00:00"
question: "entonces ponlo"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: entonces ponlo

## Answer

Se añadió await this.gastarTiempoVerificacion(dto.contrasenia) en la rama de bloqueado_hasta vigente, antes de rechazar el ingreso. Mantiene 401 auth.invalidCredentials, audita cuenta_bloqueada internamente e iguala el coste Argon2 con una contraseña incorrecta. Build y ESLint correctos. Documentado en ESTADO.md.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User