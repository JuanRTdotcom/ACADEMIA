# Sumaq System — Backend

API multi-organización para la plataforma educativa Sumaq System.

## Stack

- NestJS 11 + TypeScript
- Prisma 7 con `@prisma/adapter-pg`
- PostgreSQL 18
- Passport + JWT en cookies HTTP-only
- Argon2id para contraseñas; HMAC-SHA-256 para refresh tokens de alta entropía

## Convenciones de idioma

- Código propio del backend: español, sin tildes en identificadores y `ñ → ni`.
- Rutas HTTP: inglés (`/auth/login`, `/auth/refresh`).
- Perfil/Apariencia: `PATCH /profile/appearance` guarda país y zona horaria obligatorios con sesión, CSRF, rate limit, transacción y auditoría.
- APIs de NestJS, Prisma y librerías: conservan nombres originales en inglés.
- Base de datos: tablas, columnas, enums y schemas en español.

Ver [CONVENTIONS.md](./CONVENTIONS.md).

## Configuración

Crear `backend/.env` con:

```dotenv
DATABASE_URL=postgresql://academia:tu_clave@localhost:5432/sumaq_system
FRONTEND_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=cambia_este_secreto
JWT_REFRESH_SECRET=cambia_este_secreto
REFRESH_TOKEN_HASH_SECRET=cambia_este_tercer_secreto_independiente
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_HOURS=12
SESSION_IDLE_TTL_MINUTES=120
SESSION_ABSOLUTE_TTL_DAYS=30
REFRESH_REUSE_GRACE_SECONDS=10
REFRESH_SESSION_RATE_LIMIT=10
REFRESH_SESSION_RATE_WINDOW_SECONDS=60
PORT=3000
```

Las variables de duración son obligatorias y deben contener enteros mayores que cero. El backend detiene su arranque con un mensaje descriptivo si falta alguna o tiene un valor inválido; no existen valores predeterminados.

## Ejecución

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

API local: `http://localhost:3000`.

## Autenticación

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/auth/login` | Público, máximo 5 intentos/minuto |
| `POST` | `/auth/refresh` | Cookie de refresco válida |
| `POST` | `/auth/logout` | Cookie de refresco válida |
| `GET` | `/auth/me` | Cookie de acceso válida |

El login resuelve organización, usuario, credencial, dispositivo, sesión y contexto seguro completo (persona, organización, roles, permisos y preferencias). En cada petición protegida, la estrategia reconstruye desde PostgreSQL la sesión y autorización vigentes; los roles/permisos mutables del JWT no son la autoridad. Las duraciones provienen obligatoriamente del entorno; el token de refresco rota y detecta reuso.

El refresh tiene dos límites: `20/minuto` por IP mediante Nest y el límite configurable por familia firmada. Access y refresh se firman y verifican exclusivamente con `HS256`. Un replay fuera de gracia marca el incidente una vez y revoca solo la familia comprometida.

## Empresas

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/companies` | Sesión autenticada; autorización granular temporalmente pendiente |
| `POST` | `/companies` | Sesión autenticada; autorización granular temporalmente pendiente |
| `PATCH` | `/companies/:id` | Sesión autenticada; autorización granular temporalmente pendiente |
| `PATCH` | `/companies/:id/status` | Sesión autenticada; autorización granular temporalmente pendiente |
| `DELETE` | `/companies/:id` | Sesión autenticada; autorización granular temporalmente pendiente |
| `GET` | `/company/current/summary` | Sesión autenticada del tenant actual |
| `GET` | `/company/current/sections/:section` | Sesión autenticada del tenant actual |
| `PATCH` | `/company/current/sections/:section` | Sesión autenticada del tenant actual |

Durante la construcción de módulos, el frontend muestra todas las opciones y estos controladores no aplican permisos granulares. Sí conservan sesión, usuario y organización activos, CSRF, DTO estricto, rate limit, transacciones y auditoría. Antes de producción debe restaurarse RBAC. La eliminación global es lógica (`estado = 0`, `eliminado_en`, `eliminado_por`).

Datos demo:

```text
organización: demo
correo: admin@demo.com
contraseña: admin12345
```

## Calidad

```bash
npm run build
npm test
npm run test:e2e
```

La suite de autenticación cubre HMAC, rate limit por familia, rotación, concurrencia, rollback, inactividad, límite absoluto, replay, algoritmo JWT y límite por IP.

## Estructura

```text
src/
  autenticacion/       servicio, controlador, estrategias, guardias y decoradores
  empresas/            listado y baja lógica de organizaciones
  app.module.ts        configuración global y guardias
  main.ts              Helmet, cookies, CORS y validación
  prisma.service.ts    conexión Prisma/PostgreSQL
prisma/
  schema.prisma        modelo de 23 tablas
  migrations/          fuente de verdad del esquema
  seed.ts              organización y administrador demo
```
