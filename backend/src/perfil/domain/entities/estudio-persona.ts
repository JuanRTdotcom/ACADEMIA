import type { ParametroTraducible } from "./parametro-traducible";

export interface EstudioRealizado {
  id_personas_estudios_realizados: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  en_curso: boolean;
  codigo_nivel_instruccion: string;
  codigo_grado_obtenido: string;
  grado_obtenido_otro: string | null;
  codigo_profesion: string;
  profesion_otro: string | null;
  nivel_instruccion: ParametroTraducible;
  grado_obtenido: ParametroTraducible;
  profesion: ParametroTraducible;
}

export interface EstudioComplementario {
  id_personas_estudios_complementarios: string;
  codigo_tipo_estudio: string;
  tipo_estudio_otro: string | null;
  nombre_estudio: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  en_curso: boolean;
  tipo_estudio: ParametroTraducible;
}

export interface EstudiosPerfil {
  realizados: EstudioRealizado[];
  complementarios: EstudioComplementario[];
  catalogos: {
    niveles_instruccion: ParametroTraducible[];
    grados_obtenidos: ParametroTraducible[];
    profesiones: ParametroTraducible[];
    tipos_estudio_complementario: ParametroTraducible[];
  };
}

export interface ComandoGuardarEstudioRealizado {
  codigo_nivel_instruccion: string;
  codigo_grado_obtenido: string;
  grado_obtenido_otro?: string;
  codigo_profesion: string;
  profesion_otro?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  en_curso: boolean;
}

export interface ComandoModificarEstudioRealizado extends ComandoGuardarEstudioRealizado {
  id_personas_estudios_realizados: string;
}

export interface ComandoGuardarEstudioComplementario {
  codigo_tipo_estudio: string;
  tipo_estudio_otro?: string;
  nombre_estudio: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin?: string;
  en_curso: boolean;
}

export interface ComandoModificarEstudioComplementario extends ComandoGuardarEstudioComplementario {
  id_personas_estudios_complementarios: string;
}

export interface ResultadoEstudios {
  ok: true;
  realizados: EstudioRealizado[];
  complementarios: EstudioComplementario[];
}
