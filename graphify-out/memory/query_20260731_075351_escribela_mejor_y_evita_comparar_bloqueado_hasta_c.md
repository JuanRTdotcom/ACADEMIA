---
type: "implementation"
date: "2026-07-31T07:53:51.332496+00:00"
question: "escribela mejor y evita comparar bloqueado_hasta con new Date por posible inconsistencia de relojes"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User", "PrismaService"]
---

# Q: escribela mejor y evita comparar bloqueado_hasta con new Date por posible inconsistencia de relojes

## Answer

Se reemplazó la comparación con reloj de Nest por tieneBloqueoVigente(), consulta parametrizada que usa CURRENT_TIMESTAMP AT TIME ZONE UTC en PostgreSQL. registrarIntentoFallido obtiene ahora_base del mismo SELECT FOR UPDATE. crearSesionIngreso bloquea la fila y revalida estado y bloqueo con reloj DB antes de crear sesión, cerrando la carrera concurrente. Build/ESLint correctos; prueba transaccional devolvió bloqueo_vigente=true y rollback=true.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User
- PrismaService