---
type: "query"
date: "2026-07-31T17:31:43.481705+00:00"
question: "el lenguaje tambien"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User"]
---

# Q: el lenguaje tambien

## Answer

Implementado: el idioma se sincroniza en tiempo real entre pestañas mediante el evento storage, manteniendo la cookie como fuente de verdad para SSR. También se actualiza document.documentElement.lang, se evita el bucle de eventos y se documentó en ESTADO.md. Verificado en dos pestañas: EN/EN a ES/ES y regreso a EN/EN; npm run check sin errores y npm run build correcto.

## Outcome

- Signal: useful

## Source Nodes

- User