---
type: "explain"
date: "2026-07-29T16:01:31.254767+00:00"
question: "De dónde sale tipo CONTRASENIA en include de credenciales"
contributor: "graphify"
outcome: "useful"
source_nodes: ["type", "AuthController", "PrismaService"]
---

# Q: De dónde sale tipo CONTRASENIA en include de credenciales

## Answer

Expanded from graph vocab: [auth, login, service, type]. CONTRASENIA es un valor del enum Prisma TipoCredencial y una opción del enum PostgreSQL. Se guarda en seguridad.credenciales al crear la credencial; actualmente el seed lo asigna explícitamente junto al hash Argon2. El include del login no crea ni selecciona manualmente ese valor: filtra las credenciales ya guardadas para traer solo la de contraseña y excluir PASSKEY.

## Outcome

- Signal: useful

## Source Nodes

- type
- AuthController
- PrismaService