import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs"; // RxJS: flujo de eventos en memoria (pub/sub para SSE)

/** Evento que se empuja a los clientes conectados por SSE. */
export interface EventoSesion {
  fid_usuarios: string; // a qué usuario pertenece el evento
  tipo: "session_revoked"; // por ahora solo revocación; se pueden sumar más
  sid?: string; // si viene, solo afecta a esa sesión; si no, a todas las del usuario
}

/**
 * Bus de eventos de sesión en memoria. El servicio de autenticación emite aquí cuando
 * una sesión se revoca (robo de token, "cerrar sesión en todos", revocación puntual) y
 * el endpoint SSE reenvía el evento al dispositivo correspondiente para botarlo al
 * instante. En una sola instancia basta este Subject; con multi-instancia se cambiaría
 * por un pub/sub compartido (Redis) sin tocar a los llamadores.
 */
@Injectable()
export class ServicioEventosSesion {
  private readonly sujeto = new Subject<EventoSesion>();

  flujo(): Observable<EventoSesion> {
    return this.sujeto.asObservable();
  }

  emitir(evento: EventoSesion): void {
    this.sujeto.next(evento);
  }
}
