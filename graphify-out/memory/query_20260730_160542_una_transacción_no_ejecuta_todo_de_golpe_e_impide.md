---
type: "query"
date: "2026-07-30T16:05:42.947692+00:00"
question: "¿Una transacción no ejecuta todo de golpe e impide la concurrencia?"
contributor: "graphify"
outcome: "useful"
---

# Q: ¿Una transacción no ejecuta todo de golpe e impide la concurrencia?

## Answer

Expanded from original query via vocab: [login, prisma, transaction, user]. Una transacción garantiza principalmente atomicidad: sus cambios se confirman todos o se revierten todos. No convierte varias consultas en una instrucción indivisible ni impide por defecto que otra transacción intercale lecturas. Con el aislamiento habitual READ COMMITTED, dos transacciones pueden leer el mismo contador antes de actualizar; el bloqueo de UPDATE llega después de que ambas calcularon el valor. Se necesita UPDATE atómico, SELECT FOR UPDATE o aislamiento serializable con reintentos.

## Outcome

- Signal: useful