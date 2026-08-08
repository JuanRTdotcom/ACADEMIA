---
type: "query"
date: "2026-07-31T05:18:07.531275+00:00"
question: "Sí, agrega el carácter especial y completa reset, seed, login y logout."
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Header.svelte", "../Avatar.svelte", "prisma", ".\\$transaction()"]
---

# Q: Sí, agrega el carácter especial y completa reset, seed, login y logout.

## Answer

Expanded via graph vocabulary from prior task: [auth, login, prisma, transaction, user, config, header, avatar, controller, module]. Se agregó ? a la contraseña local autorizada; Prisma reset destruyó solo datos de sumaq_system local y aplicó cinco migraciones. Se instaló tsx faltante y seed creó organización/perfil admin, superadmin admin@admin.sumaq, credencial, rol y seis permisos. Pruebas: login doble mismo dispositivo produjo una activa/una revocada; logout produjo cero activas. DTO rechazó dispositivo ausente y plataforma inválida, aceptó desconocido. UI login, dropdown y logout verificados. Rastros de prueba limpiados.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Header.svelte
- ../Avatar.svelte
- prisma
- .\$transaction()