---
type: "query"
date: "2026-07-30T04:34:36.004142+00:00"
question: "¿No se supone que el DTO ya valida slug_organizacion?"
contributor: "graphify"
outcome: "corrected"
---

# Q: ¿No se supone que el DTO ya valida slug_organizacion?

## Answer

Expanded from original query via vocab: [auth, login, validation]. El código actual fue confirmado directamente porque el grafo está desactualizado. DtoIngreso marca slug_organizacion con IsOptional, por lo que el DTO no exige su presencia; solo valida que sea string cuando llega. El servicio aún debe resolverlo desde subdominio o DTO y comprobar que finalmente exista un valor.

## Outcome

- Signal: corrected