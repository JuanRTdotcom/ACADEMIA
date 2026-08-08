---
type: "query"
date: "2026-07-31T19:49:47.092498+00:00"
question: "Explicar por qué animación no se percibe y restaurar UserMenu de Menubar a DropdownMenu"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Header.svelte", "../Avatar.svelte", "svelte"]
---

# Q: Explicar por qué animación no se percibe y restaurar UserMenu de Menubar a DropdownMenu

## Answer

Expanded via graph vocab: [header, svelte, user, avatar]. Instalación está correcta. Animación oficial dura 100ms, escala 95 a 100 y desplaza 8px; con panel de una fila se percibe casi instantánea, a diferencia del demo grande. Menubar no corresponde a menú de cuenta y solo anima entrada. UserMenu restaurado a DropdownMenu oficial.

## Outcome

- Signal: useful

## Source Nodes

- Header.svelte
- ../Avatar.svelte
- svelte