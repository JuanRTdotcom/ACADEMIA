export interface PaisCatalogo {
  id_admin_level_0: string;
  codigo_iso2: string;
  nombre_es: string;
  nombre_en: string;
}

export interface ZonaHorariaCatalogo {
  id_zonas_horarias: string;
  nombre_iana: string;
  desfase_utc: string;
}

export interface CatalogosApariencia {
  paises: PaisCatalogo[];
  zonas_horarias: ZonaHorariaCatalogo[];
}
