---
type: "query"
date: "2026-07-30T00:32:01.483443+00:00"
question: "cuando se abre ModuloAplicacion que hace ahi"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Module", "app.module.ts", "AuthController"]
---

# Q: cuando se abre ModuloAplicacion que hace ahi

## Answer

Expanded from original query via vocab: [app, module, modules, imports, controller, config, auth]. NestFactory.create recibe la clase ModuloAplicacion y Nest lee la metadata de su decorador Module. imports carga ConfigModule con validacion del entorno, ThrottlerModule, ModuloAutenticacion y ModuloEmpresas de forma recursiva. providers registra cuatro APP_GUARD globales en orden: limite, acceso, roles y permisos. La clase esta vacia porque la configuracion vive en el decorador; el modulo arma dependencias, no procesa una peticion.

## Outcome

- Signal: useful

## Source Nodes

- Module
- app.module.ts
- AuthController