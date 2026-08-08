---
type: "query"
date: "2026-07-31T07:38:36.025434+00:00"
question: "que valida estado y estado_cuenta en ingresar, y según OWASP qué mensajes/códigos mostrar para inactivo, bloqueado o sin permisos"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: que valida estado y estado_cuenta en ingresar, y según OWASP qué mensajes/códigos mostrar para inactivo, bloqueado o sin permisos

## Answer

La condición usuario.estado !== 1 || usuario.estado_cuenta !== activo valida el soft-state general y el estado funcional; no valida bloqueado_hasta ni permisos. rechazarIngreso audita motivo interno y por defecto lanza 401 auth.invalidCredentials. OWASP recomienda respuesta HTTP/HTML genérica en login para usuario inexistente, contraseña incorrecta y cuenta bloqueada/deshabilitada; códigos diferentes también filtran. Permisos son autorización posterior: usuario autenticado sin permiso recibe 403 auth.noPermission. DTO inválido 400, rate limit 429. Detectado posible timing: cuenta bloqueada se rechaza antes de Argon2 y debe igualarse si se busca anti-enumeración estricta.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User