---
type: "review"
date: "2026-07-31T08:33:23.605996+00:00"
question: "¿procesarIngreso quedó consistente, sin huérfanos y con seguridad correcta?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User", "PrismaService"]
---

# Q: ¿procesarIngreso quedó consistente, sin huérfanos y con seguridad correcta?

## Answer

Auditoría sin cambios. procesarIngreso y crearSesionIngreso son atómicos: FOR UPDATE revalida usuario/bloqueo; reset, upsert dispositivo, revocación previa, sesión y auditoría van en una transacción. FKs cascade y uniques; DB real: 0 sesiones/dispositivos/roles huérfanos, 0 múltiples sesiones activas por dispositivo, 0 usuarios activos sin rol; build y migraciones OK. No está cerrada toda seguridad: organización revela notFound/inactive y timing; refresh rota fuera de transacción y permite carrera concurrente; access strategy valida firma/iss/aud/exp pero no sid revocado, así logout remoto no corta access inmediatamente; permisos embebidos quedan vigentes hasta exp; faltan MFA, breach-check, idle timeout y tests. Usuarios activos sin rol hoy podrían iniciar con arrays vacíos aunque DB actual no tiene ninguno.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User
- PrismaService