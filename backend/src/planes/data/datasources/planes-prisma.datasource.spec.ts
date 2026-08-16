import { BadRequestException } from "@nestjs/common";
jest.mock("../../../comun/prisma.service", () => ({ PrismaService: class {} }));
import { FuenteDatosPlanesPrisma } from "./planes-prisma.datasource";

const datos = {
  codigo: "DEMO_PEQUENA",
  nombre: "Demo pequeña",
  almacenamiento_valor: 500,
  fid_parametros_unidad_almacenamiento:
    "8a000000-0000-4000-8000-000000000002",
};

describe("FuenteDatosPlanesPrisma: unidad de almacenamiento", () => {
  const contexto = { ip: null, userAgent: null } as never;

  function preparar(valorEntero: bigint | null) {
    const tx = {
      parametros: {
        findFirst: jest
          .fn()
          .mockResolvedValue(
            valorEntero === null ? null : { valor_entero: valorEntero },
          ),
      },
      planes: {
        create: jest.fn().mockResolvedValue({ id_planes: "plan-id" }),
      },
    };
    const prisma = {
      planes: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    const auditoria = { registrar: jest.fn() };
    return {
      fuente: new FuenteDatosPlanesPrisma(prisma as never, auditoria as never),
      tx,
    };
  }

  it("convierte usando el factor del parámetro activo", async () => {
    const { fuente, tx } = preparar(1_048_576n);
    await fuente.crear(datos, "organizacion", "usuario", contexto);
    expect(tx.planes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          almacenamiento_max_bytes: 524_288_000n,
        }),
      }),
    );
  });

  it("rechaza una unidad que no está disponible en parámetros", async () => {
    const { fuente, tx } = preparar(null);
    await expect(
      fuente.crear(datos, "organizacion", "usuario", contexto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.planes.create).not.toHaveBeenCalled();
  });
});
