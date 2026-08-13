import { BadRequestException } from "@nestjs/common";
import { isUUID } from "class-validator";
import { ServicioTokenOpaco } from "./token-opaco.service";

type Direccion = "anterior" | "siguiente";
interface PosicionCatalogo {
  id: string;
  direccion: Direccion;
  organizacion: string;
  consulta: string | null;
  contexto: string | null;
}

export function leerPosicionCatalogo(
  tokens: ServicioTokenOpaco,
  ambito: string,
  p: string | undefined,
  organizacion: string,
  consulta: string | undefined,
  error: string,
  contexto?: string,
) {
  const posicion = p
    ? tokens.descifrar<PosicionCatalogo>(ambito, p)
    : null;
  if (
    p &&
    (!posicion ||
      posicion.organizacion !== organizacion ||
      posicion.consulta !== (consulta ?? null) ||
      posicion.contexto !== (contexto ?? null) ||
      !isUUID(posicion.id, "4") ||
      !["anterior", "siguiente"].includes(posicion.direccion))
  )
    throw new BadRequestException(error);
  return posicion;
}

export function protegerPaginacionCatalogo<T extends { paginacion: { anterior: string | null; siguiente: string | null } }>(
  tokens: ServicioTokenOpaco,
  ambito: string,
  catalogo: T,
  organizacion: string,
  consulta: string | undefined,
  contexto?: string,
) {
  const token = (id: string | null, direccion: Direccion) =>
    id
      ? tokens.cifrar(ambito, {
          id,
          direccion,
          organizacion,
          consulta: consulta ?? null,
          contexto: contexto ?? null,
        })
      : null;
  return {
    ...catalogo,
    paginacion: {
      anterior: token(catalogo.paginacion.anterior, "anterior"),
      siguiente: token(catalogo.paginacion.siguiente, "siguiente"),
    },
  };
}
