-- Prisma genera @default(uuid()) en el cliente, igual que las PK del proyecto.
-- Se retira el default físico agregado durante el backfill para mantener el esquema alineado.
ALTER TABLE seguridad.sesiones
ALTER COLUMN uid_familia_sesion DROP DEFAULT;

