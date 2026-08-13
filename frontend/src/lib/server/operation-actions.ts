import { fail, type RequestEvent } from '@sveltejs/kit';
import { companyMessage, companyRequest } from './companies';

export interface OperationCatalogs {
  parametros: Array<{ id_parametros: string; codigo_grupo: string; codigo: string; etiqueta: string }>;
  categorias: Array<{ id_categorias_productos: string; nombre: string }>;
  productos: Array<{ id_productos: string; nombre: string; precio_venta: string; controla_lotes: boolean; lotes: Array<{ id_lotes_productos: string; numero_lote: string; cantidad_disponible: string }> }>;
  servicios: Array<{ id_servicios_veterinaria: string; nombre: string; precio: string | null }>;
  usuarios: Array<{ id_usuarios: string; usuario: string }>;
  propietarios: Array<{ id_propietarios: string; nombre_completo: string; numero_documento: string }>;
  mascotas: Array<{ id_mascotas: string; fid_propietarios: string | null; nombre: string }>;
  series: Array<{ id_series_comprobante: string; serie: string; correlativo_actual: string; tipo: { etiqueta: string } }>;
}

export async function operationMutation(event: RequestEvent, path: string, body: object) {
  const response = await companyRequest(event, path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) return fail(response.status, { operationMessage: await companyMessage(response, 'operations.saveError') });
  return { operationMessage: 'operations.saved' };
}

export async function operationCatalogs(event: RequestEvent): Promise<OperationCatalogs | null> {
  const response = await companyRequest(event, '/operations/catalogs');
  if (!response.ok) return null;
  return response.json() as Promise<OperationCatalogs>;
}
