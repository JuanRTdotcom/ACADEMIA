import { Injectable } from "@nestjs/common";
import type { ContextoSolicitud } from "../../../comun/domain/entities/contexto-solicitud";
import type {
  ComandoEliminarMedioEmpresa,
  ComandoGuardarMedioEmpresa,
  ConsultaMedioEmpresa,
} from "../entities/marca-empresa";
import { RepositorioEmpresas } from "../repositories/repositorio-empresas";

@Injectable()
export class CasoUsoGestionarMarcaEmpresa {
  constructor(private empresas: RepositorioEmpresas) {}

  obtener(id: string, organizacionActual: string) {
    return this.empresas.obtenerMarca(id, organizacionActual);
  }

  guardar(
    id: string,
    comando: ComandoGuardarMedioEmpresa,
    organizacionActual: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.guardarMedio(
      id,
      comando,
      organizacionActual,
      usuario,
      contexto,
    );
  }

  eliminar(
    id: string,
    comando: ComandoEliminarMedioEmpresa,
    organizacionActual: string,
    usuario: string,
    contexto: ContextoSolicitud,
  ) {
    return this.empresas.eliminarMedio(
      id,
      comando,
      organizacionActual,
      usuario,
      contexto,
    );
  }

  leer(id: string, consulta: ConsultaMedioEmpresa, organizacionActual: string) {
    return this.empresas.obtenerMedio(id, consulta, organizacionActual);
  }
}
