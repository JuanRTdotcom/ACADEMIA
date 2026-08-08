/** Datos técnicos mínimos que un caso de uso puede necesitar, sin depender de Express. */
export interface ContextoSolicitud {
  host: string | null;
  host_reenviado: string | null;
  ip: string | null;
  agente_usuario: string | null;
}
