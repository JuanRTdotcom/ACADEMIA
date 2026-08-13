import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DtoCrearLoteProducto, DtoCrearMovimientoInventario, DtoCrearPagoVenta, DtoCrearVenta } from "./operaciones.dto";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("DTO de operaciones veterinarias", () => {
  it("rechaza ventas sin líneas", async () => {
    const dto = plainToInstance(DtoCrearVenta, { lineas: [] });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("acepta un movimiento negativo y rechaza texto libre como catálogo", async () => {
    const valido = plainToInstance(DtoCrearMovimientoInventario, { fid_productos: UUID, fid_parametros_tipo: UUID, cantidad: "-2.500", costo_unitario: "", observaciones: "merma" });
    const invalido = plainToInstance(DtoCrearMovimientoInventario, { fid_productos: UUID, fid_parametros_tipo: "merma", cantidad: "-2" });
    expect(await validate(valido)).toHaveLength(0);
    expect(await validate(invalido)).not.toHaveLength(0);
  });

  it("valida lotes y pagos con UUID y decimales", async () => {
    const lote = plainToInstance(DtoCrearLoteProducto, { fid_productos: UUID, numero_lote: "L-2026", fecha_vencimiento: "2027-08-12", costo_unitario: "12.50", cantidad_inicial: "10" });
    const pago = plainToInstance(DtoCrearPagoVenta, { fid_ventas: UUID, fid_parametros_metodo: UUID, monto: "25.90", referencia: "OP-1" });
    expect(await validate(lote)).toHaveLength(0);
    expect(await validate(pago)).toHaveLength(0);
  });
});
