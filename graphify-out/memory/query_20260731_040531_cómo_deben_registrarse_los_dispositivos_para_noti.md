---
type: "query"
date: "2026-07-31T04:05:31.524052+00:00"
question: "¿Cómo deben registrarse los dispositivos para notificaciones push y cómo conocer qué sesiones están activas en el flujo actual de autenticación?"
contributor: "graphify"
outcome: "useful"
---

# Q: ¿Cómo deben registrarse los dispositivos para notificaciones push y cómo conocer qué sesiones están activas en el flujo actual de autenticación?

## Answer

El dispositivo debe ser estable por instalación o navegador y reutilizarse, no crearse en cada login. El token push pertenece al dispositivo y debe reasignarse de forma segura al usuario autenticado. Las sesiones deben conservar estado mediante estado, revocada_en y expira_en; activa se calcula, no se guarda como booleano. En el código actual el login reutiliza el dispositivo y crea sesiones, pero un nuevo login en el mismo dispositivo puede dejar sesiones anteriores aparentando estar activas, el logout del frontend solo borra cookies y el access token no lleva sid. Conviene revocar la sesión activa anterior del mismo dispositivo, incluir sid en el access token, cerrar la sesión en backend al salir y exponer un listado que marque activa y actual.

## Outcome

- Signal: useful