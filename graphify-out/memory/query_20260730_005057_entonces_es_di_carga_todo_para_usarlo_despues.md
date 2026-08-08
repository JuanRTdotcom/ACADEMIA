---
type: "query"
date: "2026-07-30T00:50:57.531697+00:00"
question: "entonces es DI carga todo para usarlo despues"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Module", "Injectable", "AuthController"]
---

# Q: entonces es DI carga todo para usarlo despues

## Answer

Expanded from original query via vocab: [app, auth, controller, injectable, module, modules, service]. Si. Module registra y organiza piezas; el contenedor DI crea las instancias singleton por defecto y resuelve sus constructores. En ModuloAutenticacion se registran ServicioAutenticacion y ServicioCookiesAutenticacion; al crear ControladorAutenticacion Nest los inyecta en auth y cookies. Se construyen al arranque, pero sus metodos de negocio no se ejecutan hasta una peticion. No todo es DI: imports organiza modulos, controllers registra rutas y providers alimenta el contenedor.

## Outcome

- Signal: useful

## Source Nodes

- Module
- Injectable
- AuthController