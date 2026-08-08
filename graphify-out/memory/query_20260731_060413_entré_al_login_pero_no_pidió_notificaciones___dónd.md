---
type: "query"
date: "2026-07-31T06:04:13.731937+00:00"
question: "Entré al login pero no pidió notificaciones; ¿dónde se guarda el código?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "config", "module", "User"]
---

# Q: Entré al login pero no pidió notificaciones; ¿dónde se guarda el código?

## Answer

Expanded via available graph vocab: [auth, login, config, module, user]; push vocab absent, verified source and DB directly. Device exists in seguridad.dispositivos, plataforma web, one session, but token_push is NULL. Login only upserts device/session. Dashboard onMount calls initPush, which automatically invokes Notification.requestPermission, gets FCM token and POSTs /push/register. All public Firebase envs and service worker are present. Likely browser blocked automatic permission because request lacked user gesture, permission was previously denied, or getToken failed. Empty catch hides cause and response is not checked. Correct design is explicit Activar notificaciones button after login; on click request permission, register token and show status.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- config
- module
- User