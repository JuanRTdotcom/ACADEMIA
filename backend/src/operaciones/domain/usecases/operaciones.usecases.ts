import { Injectable } from "@nestjs/common";
import type {
  ComandoActor,
  DatosCita,
  DatosComprobante,
  DatosDocumentoMascota,
  DatosLoteProducto,
  DatosMovimientoInventario,
  DatosPagoVenta,
  DatosProducto,
  DatosRecordatorio,
  DatosSerieComprobante,
  DatosVenta,
  FiltrosListadoOperacion,
} from "../entities/operacion";
import { RepositorioOperaciones } from "../repositories/repositorio-operaciones";

@Injectable()
export class CasoUsoObtenerFichaMascota {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(id: string, organizacion: string, sede: string, idioma: string) {
    return this.repo.obtenerFichaMascota(id, organizacion, sede, idioma);
  }
}
@Injectable()
export class CasoUsoListarCatalogosOperacion {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(organizacion: string, idioma: string, sede: string) {
    return this.repo.listarCatalogos(organizacion, idioma, sede);
  }
}
@Injectable()
export class CasoUsoListarProductos {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    return this.repo.listarProductos(organizacion, sede, filtros);
  }
}
@Injectable()
export class CasoUsoCrearProducto {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosProducto, actor: ComandoActor) {
    return this.repo.crearProducto(datos, actor);
  }
}
@Injectable()
export class CasoUsoListarVentas {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    return this.repo.listarVentas(organizacion, sede, filtros);
  }
}
@Injectable()
export class CasoUsoCrearVenta {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosVenta, actor: ComandoActor) {
    return this.repo.crearVenta(datos, actor);
  }
}
export class CasoUsoCrearMovimientoInventario {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosMovimientoInventario, actor: ComandoActor) {
    return this.repo.crearMovimientoInventario(datos, actor);
  }
}
export class CasoUsoCrearLoteProducto {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosLoteProducto, actor: ComandoActor) {
    return this.repo.crearLoteProducto(datos, actor);
  }
}
export class CasoUsoCrearPagoVenta {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosPagoVenta, actor: ComandoActor) {
    return this.repo.crearPagoVenta(datos, actor);
  }
}
@Injectable()
export class CasoUsoListarCitas {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(organizacion: string, sede: string, desde?: string, hasta?: string) {
    return this.repo.listarCitas(organizacion, sede, desde, hasta);
  }
}
@Injectable()
export class CasoUsoCrearCita {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosCita, actor: ComandoActor) {
    return this.repo.crearCita(datos, actor);
  }
}
@Injectable()
export class CasoUsoListarRecordatorios {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(organizacion: string, sede: string, mascota?: string) {
    return this.repo.listarRecordatorios(organizacion, sede, mascota);
  }
}
@Injectable()
export class CasoUsoCrearRecordatorio {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosRecordatorio, actor: ComandoActor) {
    return this.repo.crearRecordatorio(datos, actor);
  }
}
@Injectable()
export class CasoUsoCrearDocumentoMascota {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosDocumentoMascota, actor: ComandoActor) {
    return this.repo.crearDocumentoMascota(datos, actor);
  }
}
@Injectable()
export class CasoUsoObtenerResumenOperacion {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(organizacion: string, sede: string) {
    return this.repo.obtenerResumen(organizacion, sede);
  }
}
@Injectable()
export class CasoUsoListarComprobantes {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    return this.repo.listarComprobantes(organizacion, sede, filtros);
  }
}
@Injectable()
export class CasoUsoCrearSerieComprobante {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosSerieComprobante, actor: ComandoActor) {
    return this.repo.crearSerie(datos, actor);
  }
}
@Injectable()
export class CasoUsoPrepararComprobante {
  constructor(private repo: RepositorioOperaciones) {}
  ejecutar(datos: DatosComprobante, actor: ComandoActor) {
    return this.repo.prepararComprobante(datos, actor);
  }
}
