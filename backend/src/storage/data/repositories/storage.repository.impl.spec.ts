import { PayloadTooLargeException } from "@nestjs/common";
jest.mock("../../../comun/prisma.service", () => ({ PrismaService: class {} }));
import { RepositorioAlmacenamientoDatos } from "./storage.repository.impl";

describe("RepositorioAlmacenamientoDatos", () => {
  const organizacion = "11111111-1111-4111-8111-111111111111";
  const clave = `tenants/${organizacion}/tests/object.jpg`;
  const r2 = {
    guardar: jest.fn(),
    eliminar: jest.fn(),
    leer: jest.fn(),
    inspeccionar: jest.fn(),
    crearCargaFirmada: jest.fn(),
    crearDescargaFirmada: jest.fn(),
  };
  const tx = {
    $queryRaw: jest.fn(),
    archivos_organizacion: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (cliente: typeof tx) => unknown) =>
      callback(tx),
    ),
    $executeRaw: jest.fn(),
    archivos_organizacion: {
      update: jest.fn(),
    },
  };
  const repositorio = new RepositorioAlmacenamientoDatos(
    r2 as never,
    prisma as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tx.$queryRaw.mockResolvedValue([{ almacenamiento_max_bytes: null }]);
    tx.archivos_organizacion.aggregate.mockResolvedValue({
      _sum: { bytes: 0n },
    });
    r2.guardar.mockResolvedValue(undefined);
    r2.eliminar.mockResolvedValue(undefined);
    prisma.archivos_organizacion.update.mockResolvedValue({});
  });

  it("reserva, guarda y confirma los bytes del objeto", async () => {
    await repositorio.guardar({
      clave,
      contenido: Buffer.alloc(75),
      tipoContenido: "image/jpeg",
    });

    expect(tx.archivos_organizacion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fid_organizaciones: organizacion,
        clave_objeto: clave,
        bytes: 75n,
        estado: 2,
      }),
    });
    expect(r2.guardar).toHaveBeenCalledTimes(1);
    expect(prisma.archivos_organizacion.update).toHaveBeenCalledWith({
      where: { clave_objeto: clave },
      data: { estado: 1 },
    });
  });

  it("rechaza la carga antes de R2 cuando supera la cuota del plan", async () => {
    tx.$queryRaw.mockResolvedValue([{ almacenamiento_max_bytes: 100n }]);
    tx.archivos_organizacion.aggregate.mockResolvedValue({
      _sum: { bytes: 90n },
    });

    await expect(
      repositorio.guardar({
        clave,
        contenido: Buffer.alloc(20),
        tipoContenido: "image/jpeg",
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(r2.guardar).not.toHaveBeenCalled();
  });
});
