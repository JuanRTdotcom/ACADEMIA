---
type: "query"
date: "2026-07-28T19:31:02.937032+00:00"
question: "Revisar el API de login y sus dependencias antes de limpiar y modularizar"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Module"]
---

# Q: Revisar el API de login y sus dependencias antes de limpiar y modularizar

## Answer

Expanded from original query via graph vocab: [auth, login, controller, service, module, page]. El grafo estaba desactualizado y aún apuntaba a backend/src/auth; la revisión final se contrastó con backend/src/autenticacion. Hallazgos: filtros estado ausentes en credencial, usuario, roles y organización durante refresh; bloqueo expone estado antes de validar contraseña; refresh concurrente no es atómico; cookie access hardcodea 15 minutos; frontend no envía uid estable; prueba E2E heredada no ejecuta por resolución Prisma y aún espera Hello World.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Module