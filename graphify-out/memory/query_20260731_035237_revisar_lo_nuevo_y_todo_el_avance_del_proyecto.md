---
type: "query"
date: "2026-07-31T03:52:37.962642+00:00"
question: "Revisar lo nuevo y todo el avance del proyecto"
contributor: "graphify"
outcome: "corrected"
---

# Q: Revisar lo nuevo y todo el avance del proyecto

## Answer

Expanded from original query via vocab: [auth, config, environment, login, prisma, service, transaction, user, validation, roles, event, events]. El grafo no tenía push; se revisaron archivos reales. Nuevo: cookie device_id estable, login envía uid, módulo dispositivos, Firebase Admin, service worker, cliente FCM y proxy Svelte. Build/Prisma/front correctos. Hallazgos: token_push puede asociarse a varias cuentas y logout no lo desvincula; endpoint devuelve 200 actualizado=false y proxy lo convierte en éxito; sesiones antiguas sin device_id no registran; permiso/registro se ejecuta en cada layout/reload; Firebase backend opcional contradice fail-fast; SW usa icono inexistente y puede duplicar visualización con notification payload; config SW duplicada; ServicioPush aún no tiene consumidores ni tokens reales; lint 10 errores y 1 warning; README siguen desactualizados. Empresas/refresh/i18n pendientes siguen intactos.

## Outcome

- Signal: corrected