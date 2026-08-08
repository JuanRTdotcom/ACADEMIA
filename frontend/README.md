# sv

## Convención obligatoria de fechas y horas

- El API entrega instantes ISO 8601 en UTC (`Z` o `+00:00`). El frontend no modifica el valor original ni resta horas manualmente.
- Para mostrar un instante, usar la zona IANA configurada por el usuario u organización. Para Perú: `America/Lima`.
- En SSR siempre indicar `timeZone`; no depender de la zona configurada en el servidor.
- Fechas civiles sin hora (`fecha_nacimiento`) se tratan como `YYYY-MM-DD` y no se convierten de zona horaria.

```ts
const texto = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Lima",
}).format(new Date(instanteUtc));
```

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.16.6 create --template minimal --types ts --no-install frontend
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
