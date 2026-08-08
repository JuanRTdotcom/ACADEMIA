---
type: "query"
date: "2026-07-31T16:45:46.795429+00:00"
question: "revisa lo que hice , loq ue actualicé"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: revisa lo que hice , loq ue actualicé

## Answer

Revisión de cambios recientes: tenant por subdominio y 404 funcionan; TypeScript backend y svelte-check pasan. Hallazgos: refresh no es atómico y puede fallar/revocar todo con pestañas concurrentes; refresh permite usuario estado=0/invitado y carga roles/permisos inactivos; SSE queda asociado al sid anterior tras rotación; cache de tenants Map no elimina hosts y puede crecer sin límite; PrismaService sigue registrado en múltiples módulos creando clientes/pools duplicados; no hay tests y hay un error Prettier en autenticacion.service.ts.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User