---
type: "query"
date: "2026-07-29T23:41:45.378115+00:00"
question: "que son los decoradores del feature de autenticacion y por que hay tantos"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller", "Roles"]
---

# Q: que son los decoradores del feature de autenticacion y por que hay tantos

## Answer

Expanded from original query via vocab: [auth, decorator, decorators, roles]. Un decorador es una etiqueta con instrucciones que NestJS lee alrededor de una clase, metodo o parametro. Publico marca una ruta sin access token; Permisos declara permisos requeridos; Roles declara roles requeridos; UsuarioActual extrae req.user. Los decoradores de metadata no aplican seguridad solos: los guardias la ejecutan. Estan separados porque cada uno tiene una responsabilidad reutilizable. Roles existe pero actualmente las rutas de empresas usan Permisos.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller
- Roles