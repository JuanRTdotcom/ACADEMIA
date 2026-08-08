---
type: "query"
date: "2026-07-31T06:07:29.338543+00:00"
question: "Dispositivo no tiene modelo, versión, OS ni códigos Firebase; ¿qué pasó?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "config", "module", "User"]
---

# Q: Dispositivo no tiene modelo, versión, OS ni códigos Firebase; ¿qué pasó?

## Answer

Expanded via graph vocab: [auth, login, config, module, user], then verified direct source and DB because graph lacks push terms. Implementation is incomplete: dispositivos has modelo/version_so/version_app/token_push columns, but DtoIngreso and frontend login only send uid_dispositivo and plataforma; upsert only writes those plus ultimo_acceso_en. User-Agent is stored in sesiones, but appears as node because SvelteKit proxy does not forward browser User-Agent. Web cannot reliably expose exact hardware model; it can provide browser/OS/device category, while native mobile can provide model/OS/app versions. Firebase project codes belong in env, not DB. Only per-device FCM token belongs in token_push; it is NULL because automatic permission/getToken/register step failed or was denied and catch silently swallowed error.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- config
- module
- User