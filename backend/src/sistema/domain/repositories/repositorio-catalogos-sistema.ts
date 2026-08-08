import type { CatalogosApariencia } from "../entities/catalogos-apariencia";

export abstract class RepositorioCatalogosSistema {
  abstract obtenerOpcionesApariencia(): Promise<CatalogosApariencia>;
}
