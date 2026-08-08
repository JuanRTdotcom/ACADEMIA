---
type: "query"
date: "2026-07-31T19:35:58.000864+00:00"
question: "Por qué dropdown shadcn no tenía la misma animación que demo oficial"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Header.svelte", "svelte"]
---

# Q: Por qué dropdown shadcn no tenía la misma animación que demo oficial

## Answer

Expanded via graph vocab: [header, svelte, user, avatar]. Causa: componente oficial sí contenía animate-in/out fade zoom slide, pero faltaban dependencia e import global tw-animate-css requeridos por shadcn-svelte con Tailwind v4. Instalado tw-animate-css como devDependency e importado tras tailwindcss. Build confirmó keyframes enter/exit y reglas data-open/data-closed.

## Outcome

- Signal: useful

## Source Nodes

- Header.svelte
- svelte