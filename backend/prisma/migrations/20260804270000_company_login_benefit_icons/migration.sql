ALTER TABLE nucleo.perfil_organizacion
  ADD COLUMN login_destacado_icono_1 VARCHAR(40) NOT NULL DEFAULT 'book',
  ADD COLUMN login_destacado_icono_2 VARCHAR(40) NOT NULL DEFAULT 'users',
  ADD COLUMN login_destacado_icono_3 VARCHAR(40) NOT NULL DEFAULT 'award';

ALTER TABLE nucleo.perfil_organizacion
  ADD CONSTRAINT perfil_organizacion_login_destacado_icono_1_check
    CHECK (login_destacado_icono_1 IN ('book', 'book-open', 'graduation-cap', 'users', 'award', 'badge-check', 'library', 'presentation', 'calendar', 'clipboard-check', 'play', 'sparkles')),
  ADD CONSTRAINT perfil_organizacion_login_destacado_icono_2_check
    CHECK (login_destacado_icono_2 IN ('book', 'book-open', 'graduation-cap', 'users', 'award', 'badge-check', 'library', 'presentation', 'calendar', 'clipboard-check', 'play', 'sparkles')),
  ADD CONSTRAINT perfil_organizacion_login_destacado_icono_3_check
    CHECK (login_destacado_icono_3 IN ('book', 'book-open', 'graduation-cap', 'users', 'award', 'badge-check', 'library', 'presentation', 'calendar', 'clipboard-check', 'play', 'sparkles'));
