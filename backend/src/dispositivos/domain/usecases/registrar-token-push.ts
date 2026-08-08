import { Injectable } from "@nestjs/common";
import { RepositorioDispositivos } from "../repositories/repositorio-dispositivos";

@Injectable()
export class CasoUsoRegistrarTokenPush {
  constructor(private dispositivos: RepositorioDispositivos) {}

  ejecutar(idUsuario: string, uidDispositivo: string, tokenFcm: string) {
    return this.dispositivos.registrarTokenPush(
      idUsuario,
      uidDispositivo,
      tokenFcm,
    );
  }
}
