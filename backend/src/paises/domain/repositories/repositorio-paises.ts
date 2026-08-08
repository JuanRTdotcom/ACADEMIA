export abstract class RepositorioPaises {
  abstract listar(q?: string): Promise<any[]>;
  abstract cambiarEstado(id: string, activo: boolean): Promise<any>;
  abstract obtener(id: string): Promise<any | null>;
}
