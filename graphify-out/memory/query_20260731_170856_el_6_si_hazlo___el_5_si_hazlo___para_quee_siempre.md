---
type: "query"
date: "2026-07-31T17:08:56.671731+00:00"
question: "el 6 si hazlo , el 5 si hazlo , para quee siempre se tenga esa validacion"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PrismaService", "AuthController", "User"]
---

# Q: el 6 si hazlo , el 5 si hazlo , para quee siempre se tenga esa validacion

## Answer

Aplicado: se creó ModuloPrisma global y único, importado una vez en ModuloAplicacion; se retiró PrismaService de Auth, empresas, dispositivos, inquilinos, reloj, auditoría y push. tenantRegistrado ya no usa Map ni TTL: consulta /tenants/current en cada carga SSR y es fail-closed (200 permite, 404 invalida, otros errores se propagan). Builds, TypeScript, ESLint y svelte-check pasaron; admin.localhost 200 y tenant inexistente 404. ESTADO.md actualizado.

## Outcome

- Signal: useful

## Source Nodes

- PrismaService
- AuthController
- User