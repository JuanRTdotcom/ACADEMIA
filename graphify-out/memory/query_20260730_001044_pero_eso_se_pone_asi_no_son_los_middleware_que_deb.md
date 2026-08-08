---
type: "query"
date: "2026-07-30T00:10:44.119867+00:00"
question: "pero eso se pone asi no son los middleware que deben hacer eso"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Controller"]
---

# Q: pero eso se pone asi no son los middleware que deben hacer eso

## Answer

Expanded from original query via vocab: [auth, controller, decorator, decorators]. En NestJS middleware se usa para trabajo HTTP general previo como helmet, cookieParser y logging. Autenticacion y autorizacion por ruta corresponden a guards porque conocen el controlador y metodo y pueden leer metadata puesta por Publico, Roles y Permisos. Los decoradores solo declaran; los guardias ejecutan. UsuarioActual es un param decorator de conveniencia.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Controller