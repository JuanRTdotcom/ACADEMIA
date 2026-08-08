---
type: "query"
date: "2026-07-31T19:25:07.021270+00:00"
question: "Corregir UserMenu para usar solamente Dropdown Menu oficial de shadcn-svelte"
contributor: "graphify"
outcome: "corrected"
correction: "Usar únicamente el componente DropdownMenu oficial para el mecanismo del desplegable, sin agregar contenido ni alterar su diseño."
source_nodes: ["Header.svelte", "../Avatar.svelte", "svelte"]
---

# Q: Corregir UserMenu para usar solamente Dropdown Menu oficial de shadcn-svelte

## Answer

Expanded via graph vocab: [avatar, header, user, svelte]. Corrección: se retiraron Label, Separator, estilo destructive y estado adicional. UserMenu usa únicamente Root Trigger Content e Item importados desde $lib/components/ui/dropdown-menu/index.js; el desplegable conserva solo la acción existente Cerrar sesión.

## Outcome

- Signal: corrected
- Correction: Usar únicamente el componente DropdownMenu oficial para el mecanismo del desplegable, sin agregar contenido ni alterar su diseño.

## Source Nodes

- Header.svelte
- ../Avatar.svelte
- svelte