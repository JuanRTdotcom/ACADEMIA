export interface InquilinoPublico {
  slug: string;
  nombre: string;
  region: {
    idioma_por_defecto: "es" | "en";
  };
  marca: {
    color_primario: string | null;
    escudo_version: string | null;
    escudo_oscuro_version: string | null;
    escudo_misma_imagen: boolean;
    imagotipo_version: string | null;
    imagotipo_oscuro_version: string | null;
    imagotipo_misma_imagen: boolean;
    login_escudo_version: string | null;
    login_escudo_oscuro_version: string | null;
    login_escudo_misma_imagen: boolean;
    portadas: Array<{ id: string; version: string; texto_alternativo: string }>;
  };
  interfaz: {
    cabecera_claro: string | null;
    cabecera_oscuro: string | null;
    esquinero_claro: string | null;
    esquinero_oscuro: string | null;
    menu_claro: string | null;
    menu_oscuro: string | null;
    mostrar_escudo_menu: boolean;
    mostrar_nombre_empresa_menu: boolean;
    ocultar_esquinero_expandido: boolean;
    esquinero_fondo_activo: boolean;
    cabecera_ocultar_borde: boolean;
    menu_ocultar_borde: boolean;
    tamano_escudo_menu: number;
  };
  login: {
    usar_filtro_color: boolean;
    mostrar_etiqueta: boolean;
    mostrar_destacados: boolean;
    mostrar_comunidad: boolean;
    etiqueta: string | null;
    titulo: string | null;
    subtitulo: string | null;
    destacado_1: string | null;
    destacado_2: string | null;
    destacado_3: string | null;
    destacado_icono_1: string;
    destacado_icono_2: string;
    destacado_icono_3: string;
    texto_comunidad: string | null;
  };
}
