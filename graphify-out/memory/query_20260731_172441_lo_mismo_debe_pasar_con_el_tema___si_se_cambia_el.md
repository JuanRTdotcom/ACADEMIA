---
type: "query"
date: "2026-07-31T17:24:41.374729+00:00"
question: "lo mismo debe pasar con el tema , si se cambia el tema en un tambien en elr esto deberia cambiarse"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Theme", "User"]
---

# Q: lo mismo debe pasar con el tema , si se cambia el tema en un tambien en elr esto deberia cambiarse

## Answer

Implementado en theme.svelte.ts con el evento nativo storage sobre academia-theme. La pestaña que cambia persiste el tema; las otras pestañas del mismo origen actualizan estado reactivo y data-theme sin recargar ni reescribir localStorage. Probado en dos pestañas: dark/dark cambió a light/light y se restauró a dark/dark. Build y svelte-check correctos; ESTADO.md actualizado.

## Outcome

- Signal: useful

## Source Nodes

- Theme
- User