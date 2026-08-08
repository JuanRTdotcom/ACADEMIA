---
type: "query"
date: "2026-07-31T17:19:49.489442+00:00"
question: "etonces que hace primero , valida el dominio y despues la ruta?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User"]
---

# Q: etonces que hace primero , valida el dominio y despues la ruta?

## Answer

Sí en el flujo de la aplicación: SvelteKit recibe y reconoce la URL, ejecuta el layout raíz que consulta /tenants/current; si el tenant falla corta con 404 de organización. Solo si el tenant es válido renderiza la ruta encontrada o, si no existe, muestra +error.svelte con 404 de página. No hay cache.

## Outcome

- Signal: useful

## Source Nodes

- User