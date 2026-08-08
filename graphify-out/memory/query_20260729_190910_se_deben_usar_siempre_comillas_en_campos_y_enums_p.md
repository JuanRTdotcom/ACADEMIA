---
type: "explain"
date: "2026-07-29T19:09:10.973465+00:00"
question: "Se deben usar siempre comillas en campos y enums PostgreSQL"
contributor: "graphify"
outcome: "useful"
source_nodes: ["type", "FieldRef", "models.ts"]
---

# Q: Se deben usar siempre comillas en campos y enums PostgreSQL

## Answer

Expanded from graph vocab: [enum, field, model, schema, type]. No. Las comillas dobles son necesarias aquí porque la convención DB usa camelCase/PascalCase; PostgreSQL pliega identificadores sin comillas a minúsculas. Los valores enum usan comillas simples por ser literales. Para evitar dobles comillas, la DB debe usar nombres snake_case minúsculos; Prisma puede conservar nombres camelCase mediante @map y @@map. Cambiarlo afectaría toda la convención actual.

## Outcome

- Signal: useful

## Source Nodes

- type
- FieldRef
- models.ts