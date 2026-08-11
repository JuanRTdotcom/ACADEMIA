export interface TokensEmitidos {
  tokenAcceso: string;
  tokenRefresco: string;
}

export interface UsuarioPublico {
  id_usuarios: string;
  usuario: string;
  fid_organizaciones: string;
  roles: string[];
  idioma: string;
}
