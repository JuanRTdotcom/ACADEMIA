---
type: "query"
date: "2026-07-30T01:53:31.586194+00:00"
question: "que hace el metodo ingresar completo"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "PrismaService", "User"]
---

# Q: que hace el metodo ingresar completo

## Answer

Expanded from original query via vocab: [auth, login, roles, service, controller, user]. ingresar recibe DTO y Request; resuelve el tenant; valida organizacion activa; busca usuario por organizacion y correo e incluye roles y permisos activos; busca credencial contrasenia activa; usa UUID y hash ficticios para mantener trabajo similar si el usuario no existe; comprueba bloqueo y Argon2; registra intentos fallidos o reinicia el contador; rechaza suspendidos; busca o crea dispositivo; construye UsuarioPublico; emite la sesion y devuelve access token, refresh token y usuario. El controlador mueve los tokens a cookies y responde solo el usuario.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- PrismaService
- User