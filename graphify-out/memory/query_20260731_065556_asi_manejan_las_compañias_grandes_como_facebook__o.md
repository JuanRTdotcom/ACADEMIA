---
type: "query"
date: "2026-07-31T06:55:56.564282+00:00"
question: "asi manejan las compañias grandes como facebook? o whatsapp, veo que se ven las sesiones y los dispositivos, y dices esta es la actual, con esta implemnetacion se peude hacer?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "User"]
---

# Q: asi manejan las compañias grandes como facebook? o whatsapp, veo que se ven las sesiones y los dispositivos, y dices esta es la actual, con esta implemnetacion se peude hacer?

## Answer

Expansión: [auth, user]. El mapa estaba desactualizado; se verificó el código vigente. Sí: JWT.sid identifica sesiones.id_sesiones; sesiones.fid_dispositivos enlaza dispositivos; estado activo se deriva de estado, revocada_en y expira_en. Ya se registran agente, IP, último acceso, plataforma y metadatos Firebase. Faltan únicamente endpoint GET de sesiones, endpoint de revocación remota y UI. Es el patrón general visible en plataformas grandes, aunque sus detalles internos no son públicos.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- User