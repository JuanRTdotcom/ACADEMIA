-- Scripts de este directorio corren UNA vez, al crear el volumen por primera vez.
-- (Si el volumen ya existe, Postgres los ignora.)
-- Prisma manejara las tablas via migraciones; aqui solo va setup a nivel DB.

-- Extension util para ids (gen_random_uuid ya viene en pgcrypto/pg16 core).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
