---
type: "query"
date: "2026-07-31T04:56:00.787990+00:00"
question: "Entonces, ¿qué faltaría corregir del login?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "prisma", ".login()", ".\\$transaction()"]
---

# Q: Entonces, ¿qué faltaría corregir del login?

## Answer

Expanded from original query via vocab: [auth, login, prisma, transaction, user, config, controller]. Flujo central está bien, pero quedan: uid_dispositivo y plataforma son opcionales y el servicio inventa UUID/web por defecto; deben ser obligatorios y plataforma enum. Front valida contraseña solo no vacía mientras backend exige 8 caracteres, y el mapeo convierte HTTP 400 en servicio no disponible. Login frontend redirige al dashboard por mera presencia de cookie, por lo que impide reingreso y falla con cookies vencidas. Sesión anterior queda revocada en DB, pero su access JWT puede funcionar hasta vencer porque guardia no consulta sid. Faltan pruebas del flujo y concurrencia.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- prisma
- .login()
- .\$transaction()