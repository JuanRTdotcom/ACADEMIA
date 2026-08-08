---
type: "query"
date: "2026-07-30T03:49:13.124657+00:00"
question: "describir el flujo nuevo del login en frases simples"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "PrismaService", "User"]
---

# Q: describir el flujo nuevo del login en frases simples

## Answer

Expanded from original query via vocab: [auth, login, prisma, roles, service, user, controller]. Peticion entra; Throttler limita por IP; Publico evita exigir JWT; DTO valida; controlador llama servicio; servicio resuelve organizacion, busca usuario minimo y credencial, ejecuta Argon2, responde 401 generico en fallos, incrementa contador solo por contrasenia incorrecta y bloquea al quinto fallo; exige cuenta activa; carga roles y permisos; genera tokens; en transaccion reinicia contador, hace upsert del dispositivo y crea sesion; audita; controlador pone cookies httpOnly y devuelve usuario publico.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- PrismaService
- User