import "dotenv/config";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { validarEntorno } from "../src/comun/configuracion/validar-entorno";
import { FuenteDatosAlmacenamientoR2 } from "../src/storage/data/datasources/r2-storage.datasource";

async function verificarAlmacenamiento(): Promise<void> {
  const configuracionValidada = validarEntorno(process.env);
  const almacenamiento = new FuenteDatosAlmacenamientoR2(
    new ConfigService(configuracionValidada),
  );
  const clave = `system/health-check/${randomUUID()}.txt`;
  const contenido = new TextEncoder().encode("sumaq-r2-ok");
  let objetoCreado = false;

  try {
    const carga = await almacenamiento.crearCargaFirmada({
      clave,
      tipoContenido: "text/plain",
      bytes: contenido.byteLength,
    });
    const respuestaCarga = await fetch(carga.url, {
      method: "PUT",
      headers: carga.encabezados,
      body: contenido,
    });
    if (!respuestaCarga.ok) {
      throw new Error(`R2 rechazó la carga con HTTP ${respuestaCarga.status}`);
    }
    objetoCreado = true;

    const objeto = await almacenamiento.inspeccionar(clave);
    if (!objeto || objeto.bytes !== contenido.byteLength) {
      throw new Error("R2 no devolvió los metadatos esperados del objeto");
    }

    const descarga = await almacenamiento.crearDescargaFirmada(clave);
    const respuestaDescarga = await fetch(descarga.url);
    if (!respuestaDescarga.ok) {
      throw new Error(
        `R2 rechazó la descarga con HTTP ${respuestaDescarga.status}`,
      );
    }
    const recibido = new Uint8Array(await respuestaDescarga.arrayBuffer());
    if (!Buffer.from(recibido).equals(Buffer.from(contenido))) {
      throw new Error("El contenido descargado no coincide con el cargado");
    }

    console.log(
      "Cloudflare R2 verificado: carga, lectura y descarga correctas.",
    );
  } finally {
    if (objetoCreado) await almacenamiento.eliminar(clave);
  }
}

void verificarAlmacenamiento().catch((error: unknown) => {
  const mensaje = error instanceof Error ? error.message : "Error desconocido";
  console.error(`No se pudo verificar Cloudflare R2: ${mensaje}`);
  process.exitCode = 1;
});
