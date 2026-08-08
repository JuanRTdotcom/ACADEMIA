---
type: "query"
date: "2026-07-30T02:37:20.427205+00:00"
question: "aplicar mejoras al login separando rate limit e intentos fallidos sin distribuido ni tests"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "PrismaService", "User"]
---

# Q: aplicar mejoras al login separando rate limit e intentos fallidos sin distribuido ni tests

## Answer

Expanded from original query via vocab: [auth, login, prisma, roles, service, user]. Se mantuvo ThrottlerGuard en memoria por IP y usuarios.intentos_fallidos en PostgreSQL por cuenta. Login ahora usa dos fases, respuesta 401 uniforme, exige cuenta activa, incremento atomico y bloqueo transaccional, carga RBAC despues de Argon2, registra auditoria y guarda reset de contador, upsert de dispositivo y sesion en una transaccion corta. Firma JWT y hash se calculan fuera. Build, lint focalizado, Prisma validate y smoke manual pasaron. Tests y Redis quedaron aplazados.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- PrismaService
- User