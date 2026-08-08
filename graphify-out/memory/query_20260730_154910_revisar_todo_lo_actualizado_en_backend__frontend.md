---
type: "query"
date: "2026-07-30T15:49:10.885861+00:00"
question: "Revisar todo lo actualizado en backend, frontend, base de datos y README"
contributor: "graphify"
outcome: "corrected"
---

# Q: Revisar todo lo actualizado en backend, frontend, base de datos y README

## Answer

Expanded from original query via vocab: [auth, config, environment, login, prisma, service, transaction, validation]. El grafo estaba desactualizado y se contrastó con archivos reales. Build backend/frontend y Prisma están correctos. Hallazgos: Empresas sigue comparando slug sumaq-system aunque DB/env usan admin; lockout usa read-modify-write y pierde incrementos concurrentes; refresh revoca antes de crear nueva sesión y acepta usuario/roles/permisos inactivos; i18n no traduce errores Passport ni literales de Empresas; logout frontend no revoca backend; PrismaService se instancia en tres módulos; seed imprime password; lint tiene 8 errores; backend/frontend README y secciones antiguas de ESTADO contradicen el código actual.

## Outcome

- Signal: corrected