---
type: "query"
date: "2026-07-31T19:19:51.074687+00:00"
question: "Cambiar el menú de usuario superior derecho por el dropdown de shadcn-svelte"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Header.svelte", "../Avatar.svelte", "svelte"]
---

# Q: Cambiar el menú de usuario superior derecho por el dropdown de shadcn-svelte

## Answer

Expanded via graph vocab: [avatar, header, user, svelte]. Header.svelte utiliza UserMenu.svelte. Se sustituyó el widget manual por DropdownMenu Root Trigger Content Label Separator e Item de shadcn-svelte, conservando Avatar, Icon, estilos del header y cerrarSesionLocal. Se verificó con svelte-check, build y navegador.

## Outcome

- Signal: useful

## Source Nodes

- Header.svelte
- ../Avatar.svelte
- svelte