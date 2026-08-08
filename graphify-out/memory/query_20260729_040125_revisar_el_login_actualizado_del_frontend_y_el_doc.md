---
type: "query"
date: "2026-07-29T04:01:25.663623+00:00"
question: "Revisar el login actualizado del frontend y el documento que indica dónde quedó la revisión del backend"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "Input.svelte", "+page.svelte"]
---

# Q: Revisar el login actualizado del frontend y el documento que indica dónde quedó la revisión del backend

## Answer

Expanded from graph vocab: [auth, login, controller, service, page]. ESTADO.md indica que la revisión quedó en baseCookie del controlador y en decidir ServicioCookies. El frontend agregó superforms+valibot, errores i18n, API_URL obligatoria y guardas SSR. Se detectó que body host no se ignora: ValidationPipe forbidNonWhitelisted lo rechaza porque DtoIngreso solo acepta slugOrganizacion. También hay 1 warning Svelte en superForm(data.form), el formulario sigue monolítico, el mínimo de contraseña no coincide con backend y remember/uidDispositivo no tienen comportamiento real.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- Input.svelte
- +page.svelte