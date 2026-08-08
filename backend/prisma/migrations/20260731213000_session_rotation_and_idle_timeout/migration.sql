-- Cada cadena de refresh conserva una familia, una ventana deslizante de
-- inactividad y un límite absoluto que ninguna rotación puede superar.
ALTER TABLE seguridad.sesiones
ADD COLUMN uid_familia_sesion UUID,
ADD COLUMN iniciada_en TIMESTAMPTZ(3),
ADD COLUMN ultimo_uso_en TIMESTAMPTZ(3),
ADD COLUMN expira_inactividad_en TIMESTAMPTZ(3),
ADD COLUMN expira_absoluta_en TIMESTAMPTZ(3),
ADD COLUMN rotada_en TIMESTAMPTZ(3);

-- Las sesiones anteriores conservan su vencimiento original como techo. No se
-- inventa una extensión durante la migración y ningún dato queda nulo.
UPDATE seguridad.sesiones
SET
  uid_familia_sesion = id_sesiones,
  iniciada_en = created_at,
  ultimo_uso_en = created_at,
  expira_inactividad_en = expira_en,
  expira_absoluta_en = expira_en;

ALTER TABLE seguridad.sesiones
ALTER COLUMN uid_familia_sesion SET DEFAULT gen_random_uuid(),
ALTER COLUMN uid_familia_sesion SET NOT NULL,
ALTER COLUMN iniciada_en SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN iniciada_en SET NOT NULL,
ALTER COLUMN ultimo_uso_en SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN ultimo_uso_en SET NOT NULL,
ALTER COLUMN expira_inactividad_en SET NOT NULL,
ALTER COLUMN expira_absoluta_en SET NOT NULL;

CREATE INDEX sesiones_uid_familia_sesion_idx
ON seguridad.sesiones(uid_familia_sesion);

CREATE INDEX sesiones_expira_inactividad_en_idx
ON seguridad.sesiones(expira_inactividad_en);

