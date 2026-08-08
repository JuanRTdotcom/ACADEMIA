---
type: "query"
date: "2026-07-31T19:55:14.600090+00:00"
question: "Investigar por qué DropdownMenu aparece y desaparece sin fade aunque Tailwind y shadcn están instalados"
contributor: "graphify"
outcome: "corrected"
correction: "Verificar atributos DOM y estilos calculados; no asumir que presencia de clases/keyframes significa que los selectores coinciden."
source_nodes: ["Header.svelte", "svelte"]
---

# Q: Investigar por qué DropdownMenu aparece y desaparece sin fade aunque Tailwind y shadcn están instalados

## Answer

Expanded via graph vocab: [header, svelte, user, avatar]. Causa raíz: shadcn registry usa variantes data-open/data-closed, pero Bits UI 2.18 emite data-state=open/closed. Tailwind generaba selectores que nunca coincidían; runtime confirmó animation none, duration 0s. Agregadas custom variants globales que mapean data-open y data-closed a data-state. Luego runtime confirmó enter 0.1s y build genera exit para estado closed. Sin editar componente oficial.

## Outcome

- Signal: corrected
- Correction: Verificar atributos DOM y estilos calculados; no asumir que presencia de clases/keyframes significa que los selectores coinciden.

## Source Nodes

- Header.svelte
- svelte