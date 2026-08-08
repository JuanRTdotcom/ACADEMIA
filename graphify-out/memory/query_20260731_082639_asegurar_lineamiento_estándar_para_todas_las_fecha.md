---
type: "implementation"
date: "2026-07-31T08:26:39.823944+00:00"
question: "asegurar lineamiento estándar para todas las fechas y explicar +00 y presentación en zona Perú"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PrismaService", "User"]
---

# Q: asegurar lineamiento estándar para todas las fechas y explicar +00 y presentación en zona Perú

## Answer

Se reforzó backend/CONVENTIONS.md, frontend/README.md y ESTADO.md: instantes timestamptz(3), CURRENT_TIMESTAMP DB, API ISO 8601 con Z/+00:00, frontend con zona IANA explícita, SSR sin zona implícita, fechas civiles date sin conversión. +00 significa UTC; America/Lima convierte el mismo instante a hora peruana mediante Intl.DateTimeFormat, sin restar horas manualmente.

## Outcome

- Signal: useful

## Source Nodes

- PrismaService
- User