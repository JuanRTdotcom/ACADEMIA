---
type: "explain"
date: "2026-07-29T07:34:59.218559+00:00"
question: "Qué significa buscar usuario por organización y correo"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User", "AuthController", "PrismaService"]
---

# Q: Qué significa buscar usuario por organización y correo

## Answer

Expanded from graph vocab: [auth, login, service, user]. Usuario tiene clave única compuesta fidOrganizaciones+correo. El login primero resuelve slug a idOrganizaciones y luego busca la combinación de ese id con el correo normalizado. El mismo correo puede existir en organizaciones distintas, pero no repetirse dentro de una misma organización.

## Outcome

- Signal: useful

## Source Nodes

- User
- AuthController
- PrismaService