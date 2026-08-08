---
type: "query"
date: "2026-07-30T16:08:58.784895+00:00"
question: "Implementar bloqueo de fila para evitar pérdida de intentos concurrentes en login"
contributor: "graphify"
outcome: "useful"
---

# Q: Implementar bloqueo de fila para evitar pérdida de intentos concurrentes en login

## Answer

Expanded from original query via vocab: [auth, login, prisma, service, transaction, user]. Se reemplazó findUnique por SELECT sobre seguridad.usuarios FOR UPDATE dentro de la transacción de registrarIntentoFallido. La segunda petición espera el commit y lee el contador actualizado. Se mantuvieron cálculo de bloqueo, update y auditoría en la misma transacción. Build y ESLint del archivo correctos. Prueba real con dos logins inválidos concurrentes produjo contador 0→2; luego login válido lo restableció a 0 y se eliminó el dispositivo temporal. ESTADO.md actualizado.

## Outcome

- Signal: useful