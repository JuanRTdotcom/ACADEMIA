---
type: "query"
date: "2026-07-31T17:34:02.260434+00:00"
question: "¿Tema e idioma son preferencias de usuario? ¿Qué tablas parecidas existen y qué debe guardarse en cada una?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User,preferencias_usuario,configuracion_usuario,usuarios,personas,configuracion_organizacion,perfil_organizacion"]
---

# Q: ¿Tema e idioma son preferencias de usuario? ¿Qué tablas parecidas existen y qué debe guardarse en cada una?

## Answer

El esquema actual separa usuarios (acceso y estado de seguridad), personas (perfil personal), preferencias_usuario (una fila por usuario con tema, idioma, zona_horaria, formato_fecha y notificaciones) y configuracion_usuario (varias filas clave/valor JSON para ajustes extensibles por módulo). También existen perfil_organizacion para identidad y defaults del tenant y configuracion_organizacion para ajustes extensibles del tenant. Actualmente autenticación solo lee preferencias_usuario.idioma; tema e idioma del selector se sincronizan en cookie/localStorage pero todavía no se persisten al cambiar en la base. No deben guardarse roles, contraseñas, sesiones ni tokens FCM en preferencias/configuración.

## Outcome

- Signal: useful

## Source Nodes

- User,preferencias_usuario,configuracion_usuario,usuarios,personas,configuracion_organizacion,perfil_organizacion