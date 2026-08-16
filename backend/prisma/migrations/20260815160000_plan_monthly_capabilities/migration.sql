ALTER TABLE configuracion.planes
  ADD COLUMN maximo_mensajes_mensuales INTEGER,
  ADD COLUMN maximo_uso_ia_mensual INTEGER;

ALTER TABLE configuracion.planes
  ADD CONSTRAINT planes_maximo_mensajes_mensuales_check
    CHECK (maximo_mensajes_mensuales IS NULL OR maximo_mensajes_mensuales > 0),
  ADD CONSTRAINT planes_maximo_uso_ia_mensual_check
    CHECK (maximo_uso_ia_mensual IS NULL OR maximo_uso_ia_mensual > 0);

UPDATE configuracion.planes
SET almacenamiento_max_bytes = 5 * 1024::bigint * 1024 * 1024,
    maximo_mensajes_mensuales = 300,
    maximo_uso_ia_mensual = 50
WHERE id_planes = '40000000-0000-4000-8000-000000000001'::uuid;

UPDATE configuracion.planes
SET almacenamiento_max_bytes = 25 * 1024::bigint * 1024 * 1024,
    maximo_mensajes_mensuales = 2000,
    maximo_uso_ia_mensual = 500
WHERE id_planes = '40000000-0000-4000-8000-000000000002'::uuid;

UPDATE configuracion.planes
SET maximo_mensajes_mensuales = NULL,
    maximo_uso_ia_mensual = NULL
WHERE id_planes = '40000000-0000-4000-8000-000000000003'::uuid;

UPDATE configuracion.planes
SET almacenamiento_max_bytes = 500 * 1024::bigint * 1024,
    maximo_mensajes_mensuales = 100,
    maximo_uso_ia_mensual = 25
WHERE id_planes = '40000000-0000-4000-8000-000000000004'::uuid;

UPDATE configuracion.planes
SET maximo_mensajes_mensuales = NULL,
    maximo_uso_ia_mensual = NULL
WHERE codigo = 'SYSTEM';
