import type {
  ArchivoMedioEmpresa,
  MedioEmpresa,
  TipoMarcaEmpresa,
  TipoMedioEmpresa,
} from "./medio-empresa";

export interface PortadaLoginEmpresa {
  id: string;
  version: string;
  orden: number;
  texto_alternativo: string;
}

export interface MarcaEmpresa {
  escudo_version: string | null;
  escudo_oscuro_version: string | null;
  escudo_misma_imagen: boolean;
  imagotipo_version: string | null;
  imagotipo_oscuro_version: string | null;
  imagotipo_misma_imagen: boolean;
  login_escudo_version: string | null;
  login_escudo_oscuro_version: string | null;
  login_escudo_misma_imagen: boolean;
  portadas: PortadaLoginEmpresa[];
}

export interface ComandoCompartirMedioEmpresa {
  tipo: TipoMarcaEmpresa;
  usar_misma_imagen: boolean;
}

export interface ComandoGuardarMedioEmpresa {
  tipo: TipoMedioEmpresa;
  archivo: ArchivoMedioEmpresa;
  texto_alternativo?: string;
}

export interface ComandoEliminarMedioEmpresa {
  tipo: TipoMedioEmpresa;
  id_portada?: string;
}

export interface ConsultaMedioEmpresa {
  tipo: TipoMedioEmpresa;
  version: string;
  id_portada?: string;
}

export type { MedioEmpresa };
