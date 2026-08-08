export interface ActividadUsuario {
  id_eventos: string;
  tipo_evento: string;
  ocurrido_en: Date;
  agente_usuario: string | null;
}

export interface PaginaActividadUsuario {
  eventos: ActividadUsuario[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    total_paginas: number;
  };
  zona_horaria: string;
  ahora: Date;
}
