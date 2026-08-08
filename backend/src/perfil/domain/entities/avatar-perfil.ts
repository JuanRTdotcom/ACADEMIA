export interface ArchivoAvatarEntrada {
  contenido: Buffer;
  tipo_mime: string;
  nombre_original: string;
}

export interface AvatarPerfil {
  contenido: Buffer;
  tipo_mime: "image/jpeg";
  version: string;
}
