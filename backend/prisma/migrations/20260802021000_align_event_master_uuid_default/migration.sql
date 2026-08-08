-- Prisma `@default(uuid())` genera el UUID en el cliente. El default de PostgreSQL
-- solo fue necesario durante la migración anterior para importar filas históricas.
ALTER TABLE eventos.eventos_maestro
  ALTER COLUMN id_eventos_maestro DROP DEFAULT;
