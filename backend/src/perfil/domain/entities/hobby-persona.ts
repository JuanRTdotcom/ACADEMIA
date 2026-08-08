import type { ParametroTraducible } from "./parametro-traducible";

export type OpcionCatalogoHobby = ParametroTraducible;

export interface HobbyPersona {
  id_personas_hobbies: string;
  codigo_hobby: string;
  hobby_personalizado: string | null;
  hobby: OpcionCatalogoHobby;
  codigo_frecuencia: string;
  frecuencia: OpcionCatalogoHobby;
}

export interface HobbiesPerfil {
  hobbies: HobbyPersona[];
  catalogoHobbies: OpcionCatalogoHobby[];
  catalogoFrecuencias: OpcionCatalogoHobby[];
}

export interface ComandoAgregarHobby {
  codigo_hobby: string;
  hobby_personalizado?: string;
  codigo_frecuencia: string;
}

export interface ComandoEliminarHobby {
  id_personas_hobbies: string;
}

export interface ComandoModificarHobby extends ComandoAgregarHobby {
  id_personas_hobbies: string;
}

export interface ResultadoGestionHobbies {
  ok: true;
  hobbies: HobbyPersona[];
}
