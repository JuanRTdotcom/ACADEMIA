---
type: "query"
date: "2026-07-29T16:16:28.430743+00:00"
question: "Cómo manejar tipos de credencial con enum en aplicaciones grandes"
contributor: "graphify"
outcome: "useful"
source_nodes: ["type", "User", "AuthController"]
---

# Q: Cómo manejar tipos de credencial con enum en aplicaciones grandes

## Answer

Expanded from graph vocab: [auth, service, type, user]. Para mecanismos de autenticación el enum es correcto porque cada tipo requiere código y despliegue. No se crea un enum distinto por tipo; se agrega un valor al mismo TipoCredencial y su estrategia. Para escala y restricciones conviene una tabla base Credencial y tablas detalle por mecanismo: contraseña uno-a-uno por usuario, passkeys uno-a-muchos, identidades externas uno-a-muchos. El modelo ancho actual con campos nullable y credenciales[0] no impone una sola contraseña.

## Outcome

- Signal: useful

## Source Nodes

- type
- User
- AuthController