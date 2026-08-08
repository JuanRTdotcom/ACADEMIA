---
type: "query"
date: "2026-07-30T16:09:29.386352+00:00"
question: "¿En qué otros casos se usa SELECT FOR UPDATE?"
contributor: "graphify"
outcome: "useful"
---

# Q: ¿En qué otros casos se usa SELECT FOR UPDATE?

## Answer

Expanded from original query via vocab: [config, event, events, prisma, roles, transaction, user]. Se usa en flujos leer-decidir-escribir donde varias peticiones sobre la misma fila podrían romper una regla: rotación de refresh token, último cupo de matrícula, saldos/pagos, numeración o versión de eventos y asignación de recursos limitados. No se usa en lecturas normales ni cuando basta UPDATE increment, unique constraint, upsert u optimistic locking. Debe mantenerse corto y bloquear filas en orden consistente.

## Outcome

- Signal: useful