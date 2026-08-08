import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { CasoUsoGestionarPaises } from "../../domain/usecases/gestionar-paises";
import { DtoBuscarPaises } from "../dto/buscar-paises.dto";
import { DtoCambiarEstadoPais } from "../dto/cambiar-estado-pais.dto";

const LIMITE_MUTACIONES = 20;

@Controller("countries")
export class ControladorPaises {
  constructor(private gestionarPaises: CasoUsoGestionarPaises) {}

  @Get()
  @Permisos("superadmin.countries.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  listar(@Query() query: DtoBuscarPaises) {
    return this.gestionarPaises.listar(query.q);
  }

  @Patch(":id/status")
  @Permisos("superadmin.countries.status")
  @Throttle({ default: { limit: LIMITE_MUTACIONES, ttl: 60_000 } })
  @HttpCode(200)
  async cambiarEstado(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoCambiarEstadoPais,
  ) {
    return this.gestionarPaises.cambiarEstado(id, dto.activo);
  }
}
