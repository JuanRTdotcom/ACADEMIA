---
type: "query"
date: "2026-07-30T16:12:27.078939+00:00"
question: "¿Prisma ORM no tiene una forma de hacer SELECT FOR UPDATE sin SQL directo?"
contributor: "graphify"
outcome: "useful"
---

# Q: ¿Prisma ORM no tiene una forma de hacer SELECT FOR UPDATE sin SQL directo?

## Answer

Expanded from original query via vocab: [prisma, transaction, user]. En Prisma 7.9.1 no existe lock/forUpdate en findUnique/findFirst; el cliente generado tampoco expone esa opción. Prisma soporta $queryRaw parametrizado para capacidades SQL no expresables por su API y permite Serializable con reintentos. Para este contador concreto sí puede evitarse SQL: updateMany condicional para limpiar bloqueo vencido seguido de update con intentos_fallidos increment 1, ambos en la transacción; los UPDATE serializan la fila. El raw actual es parametrizado y seguro, pero la variante ORM sería más idiomática.

## Outcome

- Signal: useful