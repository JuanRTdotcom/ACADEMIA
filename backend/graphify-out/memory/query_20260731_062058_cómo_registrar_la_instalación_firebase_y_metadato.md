---
type: "implementation"
date: "2026-07-31T06:20:58.554867+00:00"
question: "¿Cómo registrar la instalación Firebase y metadatos del cliente sin solicitar permiso de notificaciones?"
contributor: "graphify"
outcome: "useful"
---

# Q: ¿Cómo registrar la instalación Firebase y metadatos del cliente sin solicitar permiso de notificaciones?

## Answer

Se separó Firebase Installation ID del token FCM. El layout autenticado obtiene getId(getInstallations(app)) y registra FID, tipo, modelo disponible, versión de SO y versión de app mediante SvelteKit y POST /devices/client-info. No llama Notification.requestPermission ni getToken; token_push permanece NULL hasta activación explícita futura. El proxy también reenvía User-Agent real. Migración 20260731063000 aplicada y prueba navegador correcta.

## Outcome

- Signal: useful