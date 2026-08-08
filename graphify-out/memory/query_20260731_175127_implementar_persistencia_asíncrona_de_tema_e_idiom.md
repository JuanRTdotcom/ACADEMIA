---
type: "change"
date: "2026-07-31T17:51:27.231387+00:00"
question: "Implementar persistencia asíncrona de tema e idioma en preferencias_usuario; por ahora son las únicas preferencias activas"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User,preferencias_usuario,ServicioPreferencias,ControladorPreferencias,ThemeStore,I18n"]
---

# Q: Implementar persistencia asíncrona de tema e idioma en preferencias_usuario; por ahora son las únicas preferencias activas

## Answer

Implementado un módulo Nest protegido con GET/PATCH /preferences y upsert parcial en preferencias_usuario. /auth/me devuelve tema e idioma. El frontend aplica el cambio de forma optimista en UI, cookie y localStorage, y una cola serializada lo guarda 200 ms después con hasta 3 intentos, reanudación online y keepalive. sumaq-theme permite restauración antes del primer pintado; sumaq-locale se reenvía como Accept-Language y el JWT queda solo de respaldo. Probado en dos pestañas y PostgreSQL: ambas dark/en, recarga persistente. Solo tema e idioma están activos; zona_horaria, formato_fecha y notificaciones quedan reservados sin UI.

## Outcome

- Signal: useful

## Source Nodes

- User,preferencias_usuario,ServicioPreferencias,ControladorPreferencias,ThemeStore,I18n