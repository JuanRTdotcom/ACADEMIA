---
type: "explain"
date: "2026-07-29T18:24:14.597114+00:00"
question: "Los enums están solo en Prisma o también en PostgreSQL"
contributor: "graphify"
outcome: "useful"
source_nodes: ["type", "enums.ts", "PrismaService"]
---

# Q: Los enums están solo en Prisma o también en PostgreSQL

## Answer

Expanded from graph vocab: [enum, type, auth, service]. Prisma declara TipoCredencial como fuente del modelo. La migración traduce eso a CREATE TYPE seguridad.TipoCredencial AS ENUM y PostgreSQL almacena físicamente CONTRASENIA y PASSKEY. Las filas de credenciales guardan uno de esos valores en la columna tipo. Para agregar un valor se edita Prisma, se genera migración y se aplica; no se edita producción manualmente.

## Outcome

- Signal: useful

## Source Nodes

- type
- enums.ts
- PrismaService