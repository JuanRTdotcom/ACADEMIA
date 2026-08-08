---
type: "query"
date: "2026-07-31T19:32:49.894261+00:00"
question: "Instalar realmente dropdown-menu desde la librería shadcn-svelte y adaptar solo colores Sumaq"
contributor: "graphify"
outcome: "corrected"
correction: "Instalar desde registry oficial mediante CLI, no tratar una copia previa como prueba suficiente; usar defaults visuales y adaptar únicamente tokens de color."
source_nodes: ["Header.svelte", "../Avatar.svelte", "svelte"]
---

# Q: Instalar realmente dropdown-menu desde la librería shadcn-svelte y adaptar solo colores Sumaq

## Answer

Expanded via graph vocab: [avatar, header, user, svelte]. Ejecutado npx shadcn-svelte@latest add dropdown-menu --overwrite --yes con CLI v1.4.2. Componentes oficiales generados quedaron intactos. UserMenu usa Root Trigger Content Item; solo align=end. Sin overrides visuales del panel o item; colores vienen de shadcn-theme.css hacia tokens Sumaq.

## Outcome

- Signal: corrected
- Correction: Instalar desde registry oficial mediante CLI, no tratar una copia previa como prueba suficiente; usar defaults visuales y adaptar únicamente tokens de color.

## Source Nodes

- Header.svelte
- ../Avatar.svelte
- svelte