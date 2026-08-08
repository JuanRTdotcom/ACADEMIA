---
type: "query"
date: "2026-07-30T16:02:39.420031+00:00"
question: "Explicar cómo puede perder incrementos concurrentes registrarIntentoFallido"
contributor: "graphify"
outcome: "useful"
---

# Q: Explicar cómo puede perder incrementos concurrentes registrarIntentoFallido

## Answer

Expanded from original query via vocab: [auth, login, prisma, service, transaction, user]. El método hace findUnique, calcula intentos en memoria y luego update. Dos transacciones pueden leer el mismo valor antes de que alguna escriba; ambas guardan el mismo siguiente valor y se pierde un intento. Una transacción da atomicidad interna, pero con READ COMMITTED no bloquea automáticamente la fila al leer. Solución recomendada: bloquear la fila SELECT FOR UPDATE dentro de la transacción o ejecutar un UPDATE condicional atómico que incremente y devuelva el resultado; mantener auditoría en esa misma transacción.

## Outcome

- Signal: useful