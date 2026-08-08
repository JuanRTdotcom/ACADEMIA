# Sumaq System — Base de datos local

PostgreSQL 18 para desarrollo, levantado con Docker Compose. Prisma administra el esquema y sus migraciones.

## Levantar

```bash
cd database
docker compose up -d
```

Postgres queda en `localhost:5432`.

## Parar

```bash
docker compose down          # para, conserva datos
docker compose down -v       # para y BORRA datos (volumen)
```

## Conexion

Cadena (en `.env`):

```
postgresql://academia:academia_dev@localhost:5432/sumaq_system
```

| Dato     | Valor (dev)  |
| -------- | ------------ |
| host     | localhost    |
| puerto   | 5432         |
| usuario  | academia     |
| password | academia_dev |
| base     | sumaq_system |

## Estado / entrar

```bash
docker compose ps
docker exec -it academia_postgres psql -U academia -d sumaq_system
```

## Notas

- Datos persisten en el volumen `academia_pgdata` (sobreviven a `down`, mueren con `down -v`).
- `init/*.sql` corre solo la PRIMERA vez que se crea el volumen.
- Las tablas las gestiona Prisma (migraciones), no scripts de `init`.
- `.env` NO se sube al repo (ver `.gitignore`). Usa `.env.example` como plantilla.
- La fuente de verdad es `backend/prisma/schema.prisma` + `backend/prisma/migrations/`.
- `sumaq_system.sql` es una fotografía del esquema sin datos; no reemplaza las migraciones.
- Todas las PK y referencias `fid*` se almacenan como UUID nativo PostgreSQL; Prisma las expone como `string` mediante `@db.Uuid`.

## Esquemas PostgreSQL

| Schema          | Responsabilidad                                    |
| --------------- | -------------------------------------------------- |
| `nucleo`        | Organizaciones y perfil                            |
| `personas`      | Datos personales                                   |
| `seguridad`     | Usuarios, auth, sesiones y RBAC                    |
| `configuracion` | Módulos, parámetros y preferencias                 |
| `system`        | Catálogos globales de países y zonas horarias IANA |
| `eventos`       | Maestro de contratos e historial funcional         |
