---
type: "query"
date: "2026-07-29T22:57:34.345860+00:00"
question: "quiero saber algo , en aws se trabaja con una sola puerta que distribuye a los servicios (no recuerdo como se llama ese servicio) pero aqui deberia funcionar igual? ya que son apis todas , seria mejor tener una sola de entrada , para que de aqui vaya a cualqueir otraapi , y asi en esta se pueda poner auditoria y todo? o solo cuando son servicios separados?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Module", "Controller"]
---

# Q: quiero saber algo , en aws se trabaja con una sola puerta que distribuye a los servicios (no recuerdo como se llama ese servicio) pero aqui deberia funcionar igual? ya que son apis todas , seria mejor tener una sola de entrada , para que de aqui vaya a cualqueir otraapi , y asi en esta se pueda poner auditoria y todo? o solo cuando son servicios separados?

## Answer

Expanded from original query via vocab: [auth, controller, module]. El grafo muestra controlador de auth incluido por módulo y por app.module; el backend actual es un monolito modular, con un único Nest en main y rutas /auth y /companies. Recomendación: no introducir API Gateway interno aún. Mantener una sola URL pública y usar reverse proxy/ALB delante al desplegar. Auditoría debe implementarse en el backend/BD para cubrir operaciones y contexto de negocio; gateway solo complementa con logs de acceso. API Gateway se justifica con varios servicios desplegables independientes o clientes/controles de borde.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Module
- Controller