---
type: "change"
date: "2026-07-31T18:05:04.500256+00:00"
question: "Persistir menú abierto/cerrado y cargar en login/SSR usuario, roles, permisos, preferencias y validar acceso de cada página"
contributor: "graphify"
outcome: "useful"
source_nodes: ["User,preferencias_usuario,ServicioContextoUsuario,EstrategiaAcceso,ContextoUsuario,Sidebar"]
---

# Q: Persistir menú abierto/cerrado y cargar en login/SSR usuario, roles, permisos, preferencias y validar acceso de cada página

## Answer

Implementado menu_colapsado en preferencias_usuario con migración aplicada y snapshot SQL actualizado. Login y /auth/me devuelven un ContextoUsuario seguro con identidad, persona, organización, roles, permisos y preferencias. ServicioContextoUsuario centraliza la consulta activa. EstrategiaAcceso reconstruye sesión y RBAC desde PostgreSQL en cada petición y reemplaza los claims mutables del JWT; guardias usan permisos vigentes. El layout SSR obtiene el contexto en cada carga, repite /auth/me tras refresh, aplica preferencias antes de renderizar y valida rutas con config/access.ts fail-closed. Sidebar oculta enlaces sin permiso. Menú desktop nace desde SSR, guarda optimistamente y sincroniza entre pestañas; drawer móvil no persiste. Verificado login/me 200 con contrato completo, migración al día, menú persiste tras recarga y dos pestañas, builds y lint correctos.

## Outcome

- Signal: useful

## Source Nodes

- User,preferencias_usuario,ServicioContextoUsuario,EstrategiaAcceso,ContextoUsuario,Sidebar