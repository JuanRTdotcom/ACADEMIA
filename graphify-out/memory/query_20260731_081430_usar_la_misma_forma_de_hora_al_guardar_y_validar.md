---
type: "implementation"
date: "2026-07-31T08:14:30.576974+00:00"
question: "usar la misma forma de hora al guardar y validar; no usar reloj del servidor, solo base"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "PrismaService", "User"]
---

# Q: usar la misma forma de hora al guardar y validar; no usar reloj del servidor, solo base

## Answer

Se convirtió PostgreSQL en autoridad temporal global. Migración 20260731083000 convierte instantes a timestamptz(3), fecha_nacimiento a date y crea 23 triggers DB para updated_at; Prisma elimina @updatedAt. ServicioRelojBaseDatos entrega now, ventanas JWT y valida exp contra DB. Auth/seed ya no contienen new Date ni Date.now; JWT iat/exp nacen en DB y Passport valida contra DB. Login/me/refresh/logout 200; bloqueo 401 genérico; 56 columnas timestamptz, 23 triggers; migrate diff sin diferencias.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- PrismaService
- User