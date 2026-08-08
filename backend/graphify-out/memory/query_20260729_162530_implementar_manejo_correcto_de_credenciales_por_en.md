---
type: "query"
date: "2026-07-29T16:25:30.968590+00:00"
question: "Implementar manejo correcto de credenciales por enum, una contraseña activa y múltiples passkeys"
contributor: "graphify"
outcome: "useful"
source_nodes: ["type", "User", "AuthController"]
---

# Q: Implementar manejo correcto de credenciales por enum, una contraseña activa y múltiples passkeys

## Answer

Expanded from graph vocab: [auth, service, type, user]. Se mantuvo TipoCredencial como enum cerrado. Se añadió índice parcial único para una CONTRASENIA activa por usuario y un índice de búsqueda por usuario+tipo+estado; PASSKEY queda fuera de la unicidad. Login usa credencial.findFirst activa, no credenciales[0], y filtra roles/permisos activos. Migración aplicada, duplicado rechazado, login/me 200 y snapshot SQL actualizado.

## Outcome

- Signal: useful

## Source Nodes

- type
- User
- AuthController