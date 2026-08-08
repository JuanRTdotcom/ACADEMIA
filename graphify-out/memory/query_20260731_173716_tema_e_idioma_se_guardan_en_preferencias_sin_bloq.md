---
type: "query"
date: "2026-07-31T17:37:16.494593+00:00"
question: "¿Tema e idioma se guardan en preferencias sin bloquear la interfaz?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User,preferencias_usuario"]
---

# Q: ¿Tema e idioma se guardan en preferencias sin bloquear la interfaz?

## Answer

Actualmente no: los cambios del selector se guardan en cookie y localStorage, mientras preferencias_usuario.idioma solo se lee durante autenticación. La solución recomendada es actualización optimista: aplicar tema/idioma inmediatamente en UI y cookie/localStorage, después enviar PATCH /me/preferencias de forma asíncrona y hacer upsert en preferencias_usuario. La promesa debe capturar errores y reintentar; no debe dejarse sin manejar. Para idioma, evitar depender del idioma incluido en JWT porque queda obsoleto: la petición debería enviar cookie o Accept-Language y el backend resolver el idioma actual desde ahí.

## Outcome

- Signal: useful

## Source Nodes

- User,preferencias_usuario