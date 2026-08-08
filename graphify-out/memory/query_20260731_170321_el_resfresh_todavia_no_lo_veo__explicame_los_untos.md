---
type: "query"
date: "2026-07-31T17:03:21.549146+00:00"
question: "el resfresh todavia no lo veo. explicame los untos 4 5 6"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "PrismaService", "User"]
---

# Q: el resfresh todavia no lo veo. explicame los untos 4 5 6

## Answer

Punto 4 es una interacción futura: SSE se autentica con sid A al abrirse; si refresh crea sid B, la conexión sigue filtrando por A y no recibe una revocación dirigida a B, aunque cerrar todas y la validación SSR siguen cubriendo. Punto 5: tenantCache guarda un registro por host en un Map; el valor vence a 60 s pero la clave nunca se elimina, puede crecer y además mantiene estado desactualizado hasta 60 s. Punto 6: declarar PrismaService en cada módulo crea varias instancias de PrismaClient y pools; conviene un único ModuloPrisma global exportado.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- PrismaService
- User