import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../../../prisma/generated/client/client";
import { ServicioAuditoria } from "../../../comun/auditoria/servicio-auditoria";
import { PrismaService } from "../../../comun/prisma.service";
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
} from "../../domain/entities/operacion";

type Tx = Prisma.TransactionClient;

@Injectable()
export class FuenteDatosOperacionesPrisma {
  constructor(
    private prisma: PrismaService,
    private auditoria: ServicioAuditoria,
  ) {}

  private async validarActor(tx: Tx, actor: ComandoActor) {
    await tx.$queryRaw`SELECT id_organizaciones FROM nucleo.organizaciones WHERE id_organizaciones = ${actor.organizacion}::uuid AND estado = 1 AND eliminado_en IS NULL FOR UPDATE`;
    const usuario = await tx.usuarios.findFirst({
      where: {
        id_usuarios: actor.usuario,
        fid_organizaciones: actor.organizacion,
        estado: 1,
        estado_cuenta: "activo",
        eliminado_en: null,
      },
      select: { id_usuarios: true },
    });
    if (!usuario) throw new NotFoundException("operations.unavailable");
    const asignacion = await tx.usuarios_sedes.findFirst({
      where: {
        fid_usuarios: actor.usuario,
        fid_organizaciones: actor.organizacion,
        fid_sedes: actor.sede,
        estado: 1,
        sede: { estado: 1, eliminado_en: null },
      },
      select: {
        sede: {
          select: {
            id_sedes: true,
            fid_entidades_legales: true,
            zona_horaria: { select: { nombre_iana: true } },
            almacenes: {
              where: { estado: 1, eliminado_en: null, es_principal: true },
              take: 1,
              select: { id_almacenes: true },
            },
          },
        },
      },
    });
    const almacen = asignacion?.sede.almacenes[0];
    if (!asignacion || !almacen)
      throw new BadRequestException("operations.invalidBranch");
    return {
      sede: asignacion.sede.id_sedes,
      entidadLegal: asignacion.sede.fid_entidades_legales,
      zonaHoraria: asignacion.sede.zona_horaria.nombre_iana,
      almacen: almacen.id_almacenes,
    };
  }

  private async parametro(tx: Tx, id: string, grupo: string) {
    const valor = await tx.parametros.findFirst({
      where: { id_parametros: id, codigo_grupo: grupo, estado: 1 },
      select: { id_parametros: true, codigo: true, etiqueta: true },
    });
    if (!valor) throw new BadRequestException("operations.invalidCatalog");
    return valor;
  }

  private async mascota(
    tx: Tx,
    id: string,
    organizacion: string,
    sede: string,
  ) {
    const mascota = await tx.mascotas.findFirst({
      where: {
        id_mascotas: id,
        fid_organizaciones: organizacion,
        fid_sedes_registro: sede,
        estado: 1,
        eliminado_en: null,
      },
      select: { id_mascotas: true, fid_propietarios: true },
    });
    if (!mascota) throw new BadRequestException("operations.invalidPet");
    return mascota;
  }

  private async instante(tx: Tx, valor: string) {
    const [resultado] = await tx.$queryRaw<
      Array<{ instante: Date }>
    >`SELECT ${valor}::timestamptz AS instante`;
    if (!resultado?.instante)
      throw new BadRequestException("operations.invalidDate");
    return resultado.instante;
  }

  async obtenerFichaMascota(
    id: string,
    organizacion: string,
    sede: string,
    idioma: string,
  ) {
    const mascota = await this.prisma.mascotas.findFirst({
      where: {
        id_mascotas: id,
        fid_organizaciones: organizacion,
        fid_sedes_registro: sede,
        estado: 1,
        eliminado_en: null,
        organizacion: { estado: 1, eliminado_en: null },
      },
      select: {
        id_mascotas: true,
        nombre: true,
        foto_url: true,
        codigo_chip: true,
        animal_servicio: true,
        apoyo_emocional: true,
        fecha_nacimiento: true,
        peso: true,
        alimento: true,
        created_at: true,
        propietario: {
          select: {
            id_propietarios: true,
            nombre_completo: true,
            celular: true,
            correo: true,
            direccion: true,
          },
        },
        especie: { select: { nombre_es: true, nombre_en: true } },
        raza: { select: { nombre_es: true, nombre_en: true } },
        subespecie: { select: { nombre_es: true, nombre_en: true } },
        genero: { select: { etiqueta: true } },
        color: { select: { etiqueta: true, color_hex: true } },
        unidad_peso: { select: { etiqueta: true } },
        talla: { select: { etiqueta: true } },
        estado_reproductivo: { select: { etiqueta: true } },
        temperamento: { select: { etiqueta: true, color_hex: true } },
        ventas: {
          where: { eliminado_en: null, estado: 1 },
          orderBy: [{ created_at: "desc" }, { id_ventas: "desc" }],
          select: {
            id_ventas: true,
            numero: true,
            total: true,
            saldo: true,
            created_at: true,
            estado_venta: { select: { etiqueta: true } },
            detalles: {
              where: { estado: 1 },
              select: { descripcion: true, cantidad: true, total: true },
            },
          },
        },
        recordatorios: {
          where: { eliminado_en: null, estado: 1 },
          orderBy: [{ programado_para: "desc" }, { id_recordatorios: "desc" }],
          select: {
            id_recordatorios: true,
            titulo: true,
            detalle: true,
            programado_para: true,
            tipo: { select: { etiqueta: true } },
            estado_recordatorio: { select: { etiqueta: true } },
          },
        },
        documentos: {
          where: { eliminado_en: null, estado: 1 },
          orderBy: [
            { realizado_en: "desc" },
            { id_documentos_mascota: "desc" },
          ],
          select: {
            id_documentos_mascota: true,
            titulo: true,
            entidad_emisora: true,
            realizado_en: true,
            observaciones: true,
            tipo: { select: { etiqueta: true } },
            archivo: {
              select: {
                id_archivos_organizacion: true,
                tipo_mime: true,
                bytes: true,
              },
            },
          },
        },
        _count: {
          select: {
            atenciones: { where: { eliminado_en: null, estado: 1 } },
            ventas: { where: { eliminado_en: null, estado: 1 } },
            documentos: { where: { eliminado_en: null, estado: 1 } },
            recordatorios: { where: { eliminado_en: null, estado: 1 } },
          },
        },
      },
    });
    if (!mascota) throw new NotFoundException("pets.notFound");
    const clasificacion = mascota.raza ?? mascota.subespecie;
    return {
      mascota: {
        ...mascota,
        peso: mascota.peso?.toString() ?? null,
        foto_version: mascota.foto_url?.split("/").at(-1) ?? null,
        especie:
          idioma === "en"
            ? mascota.especie.nombre_en
            : mascota.especie.nombre_es,
        clasificacion: clasificacion
          ? idioma === "en"
            ? clasificacion.nombre_en
            : clasificacion.nombre_es
          : null,
        ventas: mascota.ventas.map((venta) => ({
          ...venta,
          numero: venta.numero.toString(),
          total: venta.total.toString(),
          saldo: venta.saldo.toString(),
          detalles: venta.detalles.map((d) => ({
            ...d,
            cantidad: d.cantidad.toString(),
            total: d.total.toString(),
          })),
        })),
      },
    };
  }

  async listarCatalogos(organizacion: string, idioma: string, sede: string) {
    const grupos = [
      "tipos_producto",
      "tipos_movimiento_inventario",
      "estados_venta",
      "metodos_pago",
      "estados_cita",
      "tipos_recordatorio",
      "estados_recordatorio",
      "tipos_documento_mascota",
      "tipos_comprobante_electronico",
      "estados_comprobante_electronico",
      "tipos_documento",
    ];
    const [
      parametros,
      categorias,
      productos,
      servicios,
      usuarios,
      propietarios,
      mascotas,
      series,
    ] = await Promise.all([
      this.prisma.parametros.findMany({
        where: { codigo_grupo: { in: grupos }, estado: 1 },
        orderBy: [{ codigo_grupo: "asc" }, { orden: "asc" }],
        include: { traducciones: { where: { codigo_idioma: idioma } } },
      }),
      this.prisma.categorias_productos.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ created_at: "desc" }, { id_categorias_productos: "desc" }],
      }),
      this.prisma.productos.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ created_at: "desc" }, { id_productos: "desc" }],
        select: {
          id_productos: true,
          nombre: true,
          precio_venta: true,
          controla_lotes: true,
          lotes: {
            where: {
              almacen: { fid_sedes: sede },
              estado: 1,
              eliminado_en: null,
              cantidad_disponible: { gt: 0 },
            },
            orderBy: { fecha_vencimiento: "asc" },
            select: {
              id_lotes_productos: true,
              numero_lote: true,
              cantidad_disponible: true,
            },
          },
        },
      }),
      this.prisma.servicios_veterinaria.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
          sedesServiciosVeterinarias: {
            some: { fid_sedes: sede, estado: 1 },
          },
        },
        orderBy: { nombre: "asc" },
        select: { id_servicios_veterinaria: true, nombre: true, precio: true },
      }),
      this.prisma.usuarios.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          estado_cuenta: "activo",
          eliminado_en: null,
          usuarios_sedes: { some: { fid_sedes: sede, estado: 1 } },
        },
        orderBy: { usuario: "asc" },
        select: {
          id_usuarios: true,
          usuario: true,
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      }),
      this.prisma.propietarios.findMany({
        where: {
          fid_organizaciones: organizacion,
          fid_sedes_registro: sede,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ created_at: "desc" }, { id_propietarios: "desc" }],
        select: {
          id_propietarios: true,
          nombre_completo: true,
          numero_documento: true,
        },
      }),
      this.prisma.mascotas.findMany({
        where: {
          fid_organizaciones: organizacion,
          fid_sedes_registro: sede,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ created_at: "desc" }, { id_mascotas: "desc" }],
        select: { id_mascotas: true, fid_propietarios: true, nombre: true },
      }),
      this.prisma.series_comprobante.findMany({
        where: {
          fid_organizaciones: organizacion,
          estado: 1,
          eliminado_en: null,
        },
        orderBy: [{ created_at: "desc" }, { id_series_comprobante: "desc" }],
        select: {
          id_series_comprobante: true,
          serie: true,
          correlativo_actual: true,
          tipo: { select: { etiqueta: true } },
        },
      }),
    ]);
    return {
      parametros: parametros.map((p) => ({
        id_parametros: p.id_parametros,
        codigo_grupo: p.codigo_grupo,
        codigo: p.codigo,
        etiqueta: p.traducciones[0]?.etiqueta ?? p.etiqueta,
      })),
      categorias,
      productos: productos.map((p) => ({
        ...p,
        precio_venta: p.precio_venta.toString(),
        lotes: p.lotes.map((l) => ({
          ...l,
          cantidad_disponible: l.cantidad_disponible.toString(),
        })),
      })),
      servicios: servicios.map((s) => ({
        ...s,
        precio: s.precio?.toString() ?? null,
      })),
      usuarios,
      propietarios,
      mascotas,
      series: series.map((s) => ({
        ...s,
        correlativo_actual: s.correlativo_actual.toString(),
      })),
    };
  }

  async listarProductos(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    const q = filtros.q?.trim();
    const base: Prisma.productosWhereInput = {
      fid_organizaciones: organizacion,
      eliminado_en: null,
      organizacion: { estado: 1, eliminado_en: null },
      ...(q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { descripcion: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { codigo_barras: { contains: q, mode: "insensitive" } },
              { categoria: { nombre: { contains: q, mode: "insensitive" } } },
              { tipo: { etiqueta: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    const atras = Boolean(filtros.antes_de),
      cursorId = filtros.antes_de ?? filtros.despues_de;
    const cursor = cursorId
      ? await this.prisma.productos.findFirst({
          where: { AND: [base, { id_productos: cursorId }] },
          select: { created_at: true, id_productos: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("operations.invalidCursor");
    const condicion: Prisma.productosWhereInput = cursor
      ? {
          OR: atras
            ? [
                { created_at: { gt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_productos: { gt: cursor.id_productos },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_productos: { lt: cursor.id_productos },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.productos.findMany({
        where: { AND: [base, condicion] },
        orderBy: atras
          ? [{ created_at: "asc" }, { id_productos: "asc" }]
          : [{ created_at: "desc" }, { id_productos: "desc" }],
        take: 11,
        include: {
          categoria: { select: { nombre: true } },
          tipo: { select: { etiqueta: true } },
          movimientos: {
            where: { estado: 1, almacen: { fid_sedes: sede } },
            select: { cantidad: true },
          },
          lotes: {
            where: {
              estado: 1,
              eliminado_en: null,
              almacen: { fid_sedes: sede },
            },
            orderBy: { fecha_vencimiento: "asc" },
            select: {
              id_lotes_productos: true,
              numero_lote: true,
              fecha_vencimiento: true,
              cantidad_disponible: true,
            },
          },
        },
      }),
      this.prisma.productos.count({ where: base }),
    ]);
    const hayMas = filas.length > 10;
    if (hayMas) filas.pop();
    if (atras) filas.reverse();
    const productos = filas;
    return {
      productos: productos.map(({ movimientos, ...p }) => ({
        ...p,
        precio_venta: p.precio_venta.toString(),
        costo_referencia: p.costo_referencia?.toString() ?? null,
        stock_minimo: p.stock_minimo.toString(),
        stock: movimientos
          .reduce((n, m) => n.plus(m.cantidad), new Prisma.Decimal(0))
          .toString(),
        lotes: p.lotes.map((l) => ({
          ...l,
          cantidad_disponible: l.cantidad_disponible.toString(),
        })),
      })),
      total,
      paginacion: {
        anterior:
          productos.length && (atras ? hayMas : Boolean(filtros.despues_de))
            ? productos[0]!.id_productos
            : null,
        siguiente:
          productos.length && (atras || hayMas)
            ? productos.at(-1)!.id_productos
            : null,
      },
    };
  }

  async crearProducto(datos: DatosProducto, actor: ComandoActor) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, actor);
      await this.parametro(tx, datos.fid_parametros_tipo, "tipos_producto");
      if (datos.fid_categorias_productos) {
        const categoria = await tx.categorias_productos.findFirst({
          where: {
            id_categorias_productos: datos.fid_categorias_productos,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            eliminado_en: null,
          },
        });
        if (!categoria)
          throw new BadRequestException("operations.invalidCategory");
      }
      const producto = await tx.productos.create({
        data: {
          fid_organizaciones: actor.organizacion,
          ...datos,
          precio_venta: new Prisma.Decimal(datos.precio_venta),
          costo_referencia: datos.costo_referencia
            ? new Prisma.Decimal(datos.costo_referencia)
            : null,
          stock_minimo: new Prisma.Decimal(datos.stock_minimo),
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        select: { id_productos: true },
      });
      await this.auditoria.registrar(
        {
          accion: "productos.creado",
          entidad: "productos",
          id_entidad: producto.id_productos,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
          metadatos: { nombre: datos.nombre },
        },
        tx,
      );
      return producto;
    });
  }

  async crearLoteProducto(datos: DatosLoteProducto, actor: ComandoActor) {
    return this.prisma.$transaction(
      async (tx) => {
        const contextoSede = await this.validarActor(tx, actor);
        await tx.$queryRaw`SELECT id_productos FROM nucleo.productos WHERE id_productos=${datos.fid_productos}::uuid AND fid_organizaciones=${actor.organizacion}::uuid AND estado=1 AND eliminado_en IS NULL FOR UPDATE`;
        const producto = await tx.productos.findFirst({
          where: {
            id_productos: datos.fid_productos,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            eliminado_en: null,
            controla_lotes: true,
          },
          select: { id_productos: true },
        });
        if (!producto)
          throw new BadRequestException("operations.batchProductRequired");
        const cantidad = new Prisma.Decimal(datos.cantidad_inicial);
        if (cantidad.lte(0))
          throw new BadRequestException("operations.invalidMovementAmount");
        const [fecha] = datos.fecha_vencimiento
          ? await tx.$queryRaw<
              Array<{ valor: Date }>
            >`SELECT ${datos.fecha_vencimiento}::date AS valor`
          : [];
        const tipo = await tx.parametros.findFirst({
          where: {
            codigo_grupo: "tipos_movimiento_inventario",
            codigo: "entrada",
            estado: 1,
          },
          select: { id_parametros: true },
        });
        if (!tipo) throw new BadRequestException("operations.catalogMissing");
        const costo = datos.costo_unitario
          ? new Prisma.Decimal(datos.costo_unitario)
          : null;
        const lote = await tx.lotes_productos.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_almacenes: contextoSede.almacen,
            fid_productos: producto.id_productos,
            numero_lote: datos.numero_lote,
            fecha_vencimiento: fecha?.valor ?? null,
            costo_unitario: costo,
            cantidad_inicial: cantidad,
            cantidad_disponible: cantidad,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
          select: { id_lotes_productos: true },
        });
        await tx.movimientos_inventario.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_almacenes: contextoSede.almacen,
            fid_productos: producto.id_productos,
            fid_lotes_productos: lote.id_lotes_productos,
            fid_parametros_tipo: tipo.id_parametros,
            cantidad,
            costo_unitario: costo,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "inventario.lote_creado",
            entidad: "lotes_productos",
            id_entidad: lote.id_lotes_productos,
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            peticion: actor.contexto,
            metadatos: {
              producto: producto.id_productos,
              cantidad: cantidad.toString(),
            },
          },
          tx,
        );
        return lote;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async crearMovimientoInventario(
    datos: DatosMovimientoInventario,
    actor: ComandoActor,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const contextoSede = await this.validarActor(tx, actor);
        const tipo = await this.parametro(
          tx,
          datos.fid_parametros_tipo,
          "tipos_movimiento_inventario",
        );
        await tx.$queryRaw`SELECT id_productos FROM nucleo.productos WHERE id_productos=${datos.fid_productos}::uuid AND fid_organizaciones=${actor.organizacion}::uuid AND estado=1 AND eliminado_en IS NULL FOR UPDATE`;
        const producto = await tx.productos.findFirst({
          where: {
            id_productos: datos.fid_productos,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: { id_productos: true, controla_lotes: true },
        });
        if (!producto)
          throw new BadRequestException("operations.invalidProduct");
        const cantidad = new Prisma.Decimal(datos.cantidad);
        if (cantidad.isZero())
          throw new BadRequestException("operations.invalidMovementAmount");
        if (datos.fid_lotes_productos) {
          await tx.$queryRaw`SELECT id_lotes_productos FROM nucleo.lotes_productos WHERE id_lotes_productos=${datos.fid_lotes_productos}::uuid AND fid_organizaciones=${actor.organizacion}::uuid FOR UPDATE`;
          const lote = await tx.lotes_productos.findFirst({
            where: {
              id_lotes_productos: datos.fid_lotes_productos,
              fid_organizaciones: actor.organizacion,
              fid_almacenes: contextoSede.almacen,
              fid_productos: producto.id_productos,
              estado: 1,
              eliminado_en: null,
            },
            select: { id_lotes_productos: true, cantidad_disponible: true },
          });
          if (!lote) throw new BadRequestException("operations.invalidBatch");
          if (lote.cantidad_disponible.plus(cantidad).lt(0))
            throw new ConflictException("operations.insufficientStock");
        } else if (producto.controla_lotes)
          throw new BadRequestException("operations.batchRequired");
        const stock = await tx.movimientos_inventario.aggregate({
          where: {
            fid_productos: producto.id_productos,
            fid_organizaciones: actor.organizacion,
            fid_almacenes: contextoSede.almacen,
            estado: 1,
          },
          _sum: { cantidad: true },
        });
        if ((stock._sum.cantidad ?? new Prisma.Decimal(0)).plus(cantidad).lt(0))
          throw new ConflictException("operations.insufficientStock");
        const movimiento = await tx.movimientos_inventario.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_almacenes: contextoSede.almacen,
            fid_productos: producto.id_productos,
            fid_lotes_productos: datos.fid_lotes_productos,
            fid_parametros_tipo: tipo.id_parametros,
            cantidad,
            costo_unitario: datos.costo_unitario
              ? new Prisma.Decimal(datos.costo_unitario)
              : null,
            observaciones: datos.observaciones,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
          select: { id_movimientos_inventario: true },
        });
        if (datos.fid_lotes_productos)
          await tx.lotes_productos.update({
            where: { id_lotes_productos: datos.fid_lotes_productos },
            data: {
              cantidad_disponible: { increment: cantidad },
              updated_by: actor.usuario,
            },
          });
        await this.auditoria.registrar(
          {
            accion: "inventario.movimiento_creado",
            entidad: "movimientos_inventario",
            id_entidad: movimiento.id_movimientos_inventario,
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            peticion: actor.contexto,
            metadatos: {
              producto: producto.id_productos,
              tipo: tipo.codigo,
              cantidad: cantidad.toString(),
            },
          },
          tx,
        );
        return movimiento;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listarVentas(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    const q = filtros.q?.trim(),
      numero = q && /^\d+$/.test(q) ? BigInt(q) : null;
    const base: Prisma.ventasWhereInput = {
      fid_organizaciones: organizacion,
      fid_sedes: sede,
      eliminado_en: null,
      organizacion: { estado: 1, eliminado_en: null },
      ...(q
        ? {
            OR: [
              ...(numero !== null ? [{ numero }] : []),
              {
                propietario: {
                  nombre_completo: { contains: q, mode: "insensitive" },
                },
              },
              {
                propietario: {
                  numero_documento: { contains: q, mode: "insensitive" },
                },
              },
              { mascota: { nombre: { contains: q, mode: "insensitive" } } },
              {
                detalles: {
                  some: {
                    descripcion: { contains: q, mode: "insensitive" },
                    estado: 1,
                  },
                },
              },
              {
                estado_venta: {
                  etiqueta: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };
    const atras = Boolean(filtros.antes_de),
      cursorId = filtros.antes_de ?? filtros.despues_de;
    const cursor = cursorId
      ? await this.prisma.ventas.findFirst({
          where: { AND: [base, { id_ventas: cursorId }] },
          select: { created_at: true, id_ventas: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("operations.invalidCursor");
    const condicion: Prisma.ventasWhereInput = cursor
      ? {
          OR: atras
            ? [
                { created_at: { gt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_ventas: { gt: cursor.id_ventas },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_ventas: { lt: cursor.id_ventas },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.ventas.findMany({
        where: { AND: [base, condicion] },
        orderBy: atras
          ? [{ created_at: "asc" }, { id_ventas: "asc" }]
          : [{ created_at: "desc" }, { id_ventas: "desc" }],
        take: 11,
        include: {
          propietario: { select: { nombre_completo: true } },
          mascota: { select: { nombre: true } },
          estado_venta: { select: { etiqueta: true } },
          detalles: { where: { estado: 1 } },
          pagos: {
            where: { estado: 1, eliminado_en: null },
            include: { metodo: { select: { etiqueta: true } } },
          },
        },
      }),
      this.prisma.ventas.count({ where: base }),
    ]);
    const hayMas = filas.length > 10;
    if (hayMas) filas.pop();
    if (atras) filas.reverse();
    const ventas = filas;
    return {
      ventas: ventas.map((v) => ({
        ...v,
        numero: v.numero.toString(),
        subtotal: v.subtotal.toString(),
        descuento: v.descuento.toString(),
        impuesto: v.impuesto.toString(),
        total: v.total.toString(),
        saldo: v.saldo.toString(),
        detalles: v.detalles.map((d) => ({
          ...d,
          cantidad: d.cantidad.toString(),
          precio_unitario: d.precio_unitario.toString(),
          descuento: d.descuento.toString(),
          impuesto: d.impuesto.toString(),
          total: d.total.toString(),
        })),
        pagos: v.pagos.map((p) => ({ ...p, monto: p.monto.toString() })),
      })),
      total,
      paginacion: {
        anterior:
          ventas.length && (atras ? hayMas : Boolean(filtros.despues_de))
            ? ventas[0]!.id_ventas
            : null,
        siguiente:
          ventas.length && (atras || hayMas) ? ventas.at(-1)!.id_ventas : null,
      },
    };
  }

  async crearVenta(datos: DatosVenta, actor: ComandoActor) {
    if (!datos.lineas.length)
      throw new BadRequestException("operations.saleLinesRequired");
    return this.prisma.$transaction(
      async (tx) => {
        const contextoSede = await this.validarActor(tx, actor);
        const estado = await tx.parametros.findFirst({
          where: {
            codigo_grupo: "estados_venta",
            codigo: "pendiente",
            estado: 1,
          },
        });
        if (!estado) throw new BadRequestException("operations.catalogMissing");
        let mascota: { fid_propietarios: string | null } | null = null;
        if (datos.fid_mascotas)
          mascota = await this.mascota(
            tx,
            datos.fid_mascotas,
            actor.organizacion,
            actor.sede,
          );
        if (datos.fid_propietarios) {
          const propietario = await tx.propietarios.findFirst({
            where: {
              id_propietarios: datos.fid_propietarios,
              fid_organizaciones: actor.organizacion,
              fid_sedes_registro: actor.sede,
              estado: 1,
              eliminado_en: null,
            },
          });
          if (!propietario)
            throw new BadRequestException("operations.invalidOwner");
        }
        if (
          mascota?.fid_propietarios &&
          datos.fid_propietarios !== mascota.fid_propietarios
        )
          throw new BadRequestException("operations.ownerPetMismatch");
        if (datos.fid_atenciones) {
          const atencion = await tx.atenciones.findFirst({
            where: {
              id_atenciones: datos.fid_atenciones,
              fid_organizaciones: actor.organizacion,
              fid_sedes: contextoSede.sede,
              estado: 1,
              eliminado_en: null,
              ...(datos.fid_mascotas
                ? { fid_mascotas: datos.fid_mascotas }
                : {}),
            },
          });
          if (!atencion)
            throw new BadRequestException("operations.invalidAttention");
        }
        const normalizadas: Array<{
          fid_productos: string | null;
          fid_lotes_productos: string | null;
          fid_servicios_veterinaria: string | null;
          descripcion: string;
          cantidad: Prisma.Decimal;
          precio: Prisma.Decimal;
          descuento: Prisma.Decimal;
          total: Prisma.Decimal;
        }> = [];
        for (const linea of datos.lineas) {
          if (
            Boolean(linea.fid_productos) ===
            Boolean(linea.fid_servicios_veterinaria)
          )
            throw new BadRequestException("operations.invalidSaleLine");
          const cantidad = new Prisma.Decimal(linea.cantidad),
            precio = new Prisma.Decimal(linea.precio_unitario),
            descuento = new Prisma.Decimal(linea.descuento);
          if (cantidad.lte(0) || precio.lt(0) || descuento.lt(0))
            throw new BadRequestException("operations.invalidAmounts");
          let descripcion = "";
          if (linea.fid_productos) {
            await tx.$queryRaw`SELECT id_productos FROM nucleo.productos WHERE id_productos=${linea.fid_productos}::uuid AND fid_organizaciones=${actor.organizacion}::uuid AND estado=1 AND eliminado_en IS NULL FOR UPDATE`;
            const producto = await tx.productos.findFirst({
              where: {
                id_productos: linea.fid_productos,
                fid_organizaciones: actor.organizacion,
                estado: 1,
                eliminado_en: null,
              },
            });
            if (!producto)
              throw new BadRequestException("operations.invalidProduct");
            descripcion = producto.nombre;
            if (producto.controla_lotes && !linea.fid_lotes_productos)
              throw new BadRequestException("operations.batchRequired");
            if (linea.fid_lotes_productos) {
              await tx.$queryRaw`SELECT id_lotes_productos FROM nucleo.lotes_productos WHERE id_lotes_productos=${linea.fid_lotes_productos}::uuid AND fid_organizaciones=${actor.organizacion}::uuid FOR UPDATE`;
              const lote = await tx.lotes_productos.findFirst({
                where: {
                  id_lotes_productos: linea.fid_lotes_productos,
                  fid_productos: producto.id_productos,
                  fid_organizaciones: actor.organizacion,
                  fid_almacenes: contextoSede.almacen,
                  estado: 1,
                  eliminado_en: null,
                },
                select: { cantidad_disponible: true },
              });
              if (!lote)
                throw new BadRequestException("operations.invalidBatch");
              if (lote.cantidad_disponible.lt(cantidad))
                throw new ConflictException("operations.insufficientStock");
            }
            const stock = await tx.movimientos_inventario.aggregate({
              where: {
                fid_productos: producto.id_productos,
                fid_organizaciones: actor.organizacion,
                fid_almacenes: contextoSede.almacen,
                estado: 1,
              },
              _sum: { cantidad: true },
            });
            if ((stock._sum.cantidad ?? new Prisma.Decimal(0)).lt(cantidad))
              throw new ConflictException("operations.insufficientStock");
          } else {
            if (linea.fid_lotes_productos)
              throw new BadRequestException("operations.invalidBatch");
            const disponibilidad =
              await tx.sedes_servicios_veterinaria.findFirst({
                where: {
                  fid_sedes: contextoSede.sede,
                  fid_organizaciones: actor.organizacion,
                  fid_servicios_veterinaria: linea.fid_servicios_veterinaria!,
                  estado: 1,
                },
                include: { servicio: true },
              });
            if (
              !disponibilidad ||
              disponibilidad.servicio.estado !== 1 ||
              disponibilidad.servicio.eliminado_en
            )
              throw new BadRequestException("operations.invalidService");
            descripcion = disponibilidad.servicio.nombre;
          }
          normalizadas.push({
            ...linea,
            descripcion,
            cantidad,
            precio,
            descuento,
            total: cantidad.mul(precio).minus(descuento),
          });
        }
        const subtotal = normalizadas.reduce(
          (n, l) => n.plus(l.cantidad.mul(l.precio)),
          new Prisma.Decimal(0),
        );
        const descuento = normalizadas.reduce(
          (n, l) => n.plus(l.descuento),
          new Prisma.Decimal(0),
        );
        const total = subtotal.minus(descuento);
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizacion}, 0))`;
        const [secuencia] = await tx.$queryRaw<
          Array<{ numero: bigint }>
        >`SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM nucleo.ventas WHERE fid_organizaciones = ${actor.organizacion}::uuid`;
        const venta = await tx.ventas.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_sedes: contextoSede.sede,
            fid_propietarios: datos.fid_propietarios,
            fid_mascotas: datos.fid_mascotas,
            fid_atenciones: datos.fid_atenciones,
            fid_usuarios_responsable: actor.usuario,
            fid_parametros_estado: estado.id_parametros,
            numero: secuencia!.numero,
            subtotal,
            descuento,
            impuesto: 0,
            total,
            saldo: total,
            observaciones: datos.observaciones,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
          select: { id_ventas: true, numero: true },
        });
        for (const linea of normalizadas) {
          const detalle = await tx.detalles_venta.create({
            data: {
              fid_organizaciones: actor.organizacion,
              fid_ventas: venta.id_ventas,
              fid_productos: linea.fid_productos,
              fid_servicios_veterinaria: linea.fid_servicios_veterinaria,
              descripcion: linea.descripcion,
              cantidad: linea.cantidad,
              precio_unitario: linea.precio,
              descuento: linea.descuento,
              impuesto: 0,
              total: linea.total,
              created_by: actor.usuario,
              updated_by: actor.usuario,
            },
            select: { id_detalles_venta: true },
          });
          if (linea.fid_productos) {
            const tipoSalida = await tx.parametros.findFirst({
              where: {
                codigo_grupo: "tipos_movimiento_inventario",
                codigo: "venta",
                estado: 1,
              },
            });
            if (!tipoSalida)
              throw new BadRequestException("operations.catalogMissing");
            await tx.movimientos_inventario.create({
              data: {
                fid_organizaciones: actor.organizacion,
                fid_almacenes: contextoSede.almacen,
                fid_productos: linea.fid_productos,
                fid_lotes_productos: linea.fid_lotes_productos,
                fid_parametros_tipo: tipoSalida.id_parametros,
                fid_detalles_venta: detalle.id_detalles_venta,
                cantidad: linea.cantidad.neg(),
                created_by: actor.usuario,
                updated_by: actor.usuario,
              },
            });
            if (linea.fid_lotes_productos)
              await tx.lotes_productos.update({
                where: { id_lotes_productos: linea.fid_lotes_productos },
                data: {
                  cantidad_disponible: { decrement: linea.cantidad },
                  updated_by: actor.usuario,
                },
              });
          }
        }
        await this.auditoria.registrar(
          {
            accion: "ventas.creada",
            entidad: "ventas",
            id_entidad: venta.id_ventas,
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            peticion: actor.contexto,
            metadatos: {
              numero: venta.numero.toString(),
              total: total.toString(),
              lineas: normalizadas.length,
            },
          },
          tx,
        );
        return { id_ventas: venta.id_ventas, numero: venta.numero.toString() };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async crearPagoVenta(datos: DatosPagoVenta, actor: ComandoActor) {
    return this.prisma.$transaction(
      async (tx) => {
        const contextoSede = await this.validarActor(tx, actor);
        await this.parametro(tx, datos.fid_parametros_metodo, "metodos_pago");
        await tx.$queryRaw`SELECT id_ventas FROM nucleo.ventas WHERE id_ventas=${datos.fid_ventas}::uuid AND fid_organizaciones=${actor.organizacion}::uuid AND estado=1 AND eliminado_en IS NULL FOR UPDATE`;
        const venta = await tx.ventas.findFirst({
          where: {
            id_ventas: datos.fid_ventas,
            fid_organizaciones: actor.organizacion,
            fid_sedes: contextoSede.sede,
            estado: 1,
            eliminado_en: null,
          },
          select: { id_ventas: true, saldo: true },
        });
        if (!venta) throw new BadRequestException("operations.invalidSale");
        const monto = new Prisma.Decimal(datos.monto);
        if (monto.lte(0) || monto.gt(venta.saldo))
          throw new BadRequestException("operations.invalidPaymentAmount");
        const nuevoSaldo = venta.saldo.minus(monto);
        const estado = await tx.parametros.findFirst({
          where: {
            codigo_grupo: "estados_venta",
            codigo: nuevoSaldo.isZero() ? "pagada" : "parcial",
            estado: 1,
          },
          select: { id_parametros: true },
        });
        if (!estado) throw new BadRequestException("operations.catalogMissing");
        const pago = await tx.pagos_venta.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_ventas: venta.id_ventas,
            fid_parametros_metodo: datos.fid_parametros_metodo,
            monto,
            referencia: datos.referencia,
            created_by: actor.usuario,
            updated_by: actor.usuario,
          },
          select: { id_pagos_venta: true },
        });
        await tx.ventas.update({
          where: { id_ventas: venta.id_ventas },
          data: {
            saldo: nuevoSaldo,
            fid_parametros_estado: estado.id_parametros,
            updated_by: actor.usuario,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "ventas.pago_creado",
            entidad: "pagos_venta",
            id_entidad: pago.id_pagos_venta,
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            peticion: actor.contexto,
            metadatos: {
              venta: venta.id_ventas,
              monto: monto.toString(),
              saldo: nuevoSaldo.toString(),
            },
          },
          tx,
        );
        return { ...pago, saldo: nuevoSaldo.toString() };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async listarCitas(
    organizacion: string,
    sede: string,
    desde?: string,
    hasta?: string,
  ) {
    const [inicio, fin] = await Promise.all([
      desde ? this.instante(this.prisma, desde) : null,
      hasta ? this.instante(this.prisma, hasta) : null,
    ]);
    const citas = await this.prisma.citas.findMany({
      where: {
        fid_organizaciones: organizacion,
        fid_sedes: sede,
        eliminado_en: null,
        ...(inicio || fin
          ? {
              inicia_en: {
                ...(inicio ? { gte: inicio } : {}),
                ...(fin ? { lte: fin } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ inicia_en: "asc" }, { id_citas: "asc" }],
      include: {
        mascota: { select: { nombre: true } },
        propietario: { select: { nombre_completo: true, celular: true } },
        responsable: { select: { usuario: true } },
        estado_cita: { select: { etiqueta: true } },
      },
    });
    return { citas };
  }
  async crearCita(datos: DatosCita, actor: ComandoActor) {
    return this.prisma.$transaction(async (tx) => {
      const contextoSede = await this.validarActor(tx, actor);
      await this.parametro(tx, datos.fid_parametros_estado, "estados_cita");
      const [rango] = await tx.$queryRaw<
        Array<{ valido: boolean; inicio: Date; fin: Date }>
      >`SELECT ${datos.termina_en}::timestamptz > ${datos.inicia_en}::timestamptz AS valido, ${datos.inicia_en}::timestamptz AS inicio, ${datos.termina_en}::timestamptz AS fin`;
      if (!rango?.valido)
        throw new BadRequestException("operations.invalidAppointmentRange");
      if (datos.fid_mascotas)
        await this.mascota(
          tx,
          datos.fid_mascotas,
          actor.organizacion,
          actor.sede,
        );
      if (datos.fid_usuarios_responsable) {
        const responsable = await tx.usuarios_sedes.count({
          where: {
            fid_usuarios: datos.fid_usuarios_responsable,
            fid_sedes: contextoSede.sede,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            usuario: { estado: 1, estado_cuenta: "activo", eliminado_en: null },
          },
        });
        if (responsable !== 1)
          throw new BadRequestException("operations.invalidAssignee");
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.organizacion + datos.fid_usuarios_responsable}, 0))`;
      }
      const cruce = await tx.citas.findFirst({
        where: {
          fid_organizaciones: actor.organizacion,
          fid_sedes: contextoSede.sede,
          fid_usuarios_responsable: datos.fid_usuarios_responsable,
          estado: 1,
          eliminado_en: null,
          inicia_en: { lt: rango.fin },
          termina_en: { gt: rango.inicio },
        },
      });
      if (cruce) throw new ConflictException("operations.appointmentOverlap");
      const cita = await tx.citas.create({
        data: {
          fid_organizaciones: actor.organizacion,
          fid_sedes: contextoSede.sede,
          ...datos,
          inicia_en: rango.inicio,
          termina_en: rango.fin,
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        select: { id_citas: true },
      });
      await this.auditoria.registrar(
        {
          accion: "citas.creada",
          entidad: "citas",
          id_entidad: cita.id_citas,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
        },
        tx,
      );
      return cita;
    });
  }
  async listarRecordatorios(
    organizacion: string,
    sede: string,
    mascota?: string,
  ) {
    return {
      recordatorios: await this.prisma.recordatorios.findMany({
        where: {
          fid_organizaciones: organizacion,
          mascota: { fid_sedes_registro: sede },
          eliminado_en: null,
          ...(mascota ? { fid_mascotas: mascota } : {}),
        },
        orderBy: [{ created_at: "desc" }, { id_recordatorios: "desc" }],
        include: {
          mascota: { select: { nombre: true } },
          propietario: { select: { nombre_completo: true } },
          tipo: { select: { etiqueta: true } },
          estado_recordatorio: { select: { etiqueta: true } },
        },
      }),
    };
  }
  async crearRecordatorio(datos: DatosRecordatorio, actor: ComandoActor) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, actor);
      const mascota = await this.mascota(
        tx,
        datos.fid_mascotas,
        actor.organizacion,
        actor.sede,
      );
      await Promise.all([
        this.parametro(tx, datos.fid_parametros_tipo, "tipos_recordatorio"),
        this.parametro(tx, datos.fid_parametros_estado, "estados_recordatorio"),
      ]);
      if (
        datos.fid_propietarios &&
        datos.fid_propietarios !== mascota.fid_propietarios
      )
        throw new BadRequestException("operations.ownerPetMismatch");
      const programado_para = await this.instante(tx, datos.programado_para);
      const recordatorio = await tx.recordatorios.create({
        data: {
          fid_organizaciones: actor.organizacion,
          ...datos,
          programado_para,
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        select: { id_recordatorios: true },
      });
      await this.auditoria.registrar(
        {
          accion: "recordatorios.creado",
          entidad: "recordatorios",
          id_entidad: recordatorio.id_recordatorios,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
        },
        tx,
      );
      return recordatorio;
    });
  }
  async crearDocumentoMascota(
    datos: DatosDocumentoMascota,
    actor: ComandoActor,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.validarActor(tx, actor);
      await this.mascota(
        tx,
        datos.fid_mascotas,
        actor.organizacion,
        actor.sede,
      );
      await this.parametro(
        tx,
        datos.fid_parametros_tipo,
        "tipos_documento_mascota",
      );
      const realizado_en = await this.instante(tx, datos.realizado_en);
      const documento = await tx.documentos_mascota.create({
        data: {
          fid_organizaciones: actor.organizacion,
          ...datos,
          realizado_en,
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        select: { id_documentos_mascota: true },
      });
      await this.auditoria.registrar(
        {
          accion: "documentos_mascota.creado",
          entidad: "documentos_mascota",
          id_entidad: documento.id_documentos_mascota,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
        },
        tx,
      );
      return documento;
    });
  }
  async obtenerResumen(organizacion: string, sede: string) {
    const [ventas, citasResultado, stockBajo, recordatorios] =
      await Promise.all([
        this.prisma.ventas.aggregate({
          where: {
            fid_organizaciones: organizacion,
            fid_sedes: sede,
            estado: 1,
            eliminado_en: null,
          },
          _count: true,
          _sum: { total: true, saldo: true },
        }),
        this.prisma.$queryRaw<
          Array<{ total: bigint }>
        >`SELECT COUNT(*)::bigint AS total FROM nucleo.citas WHERE fid_organizaciones=${organizacion}::uuid AND fid_sedes=${sede}::uuid AND estado=1 AND eliminado_en IS NULL AND inicia_en >= CURRENT_DATE`,
        this.prisma.$queryRaw<
          Array<{ total: bigint }>
        >`SELECT COUNT(*)::bigint AS total FROM nucleo.productos p LEFT JOIN nucleo.movimientos_inventario m ON m.fid_productos=p.id_productos AND m.estado=1 LEFT JOIN nucleo.almacenes a ON a.id_almacenes=m.fid_almacenes AND a.fid_organizaciones=m.fid_organizaciones WHERE p.fid_organizaciones=${organizacion}::uuid AND p.estado=1 AND p.eliminado_en IS NULL AND (a.fid_sedes=${sede}::uuid OR a.id_almacenes IS NULL) GROUP BY p.id_productos HAVING COALESCE(SUM(m.cantidad),0)<=p.stock_minimo`,
        this.prisma.recordatorios.count({
          where: {
            fid_organizaciones: organizacion,
            mascota: { fid_sedes_registro: sede },
            estado: 1,
            eliminado_en: null,
            enviado_en: null,
          },
        }),
      ]);
    return {
      ventas: ventas._count,
      ingresos: ventas._sum.total?.toString() ?? "0",
      por_cobrar: ventas._sum.saldo?.toString() ?? "0",
      citas: Number(citasResultado[0]?.total ?? 0),
      stock_bajo: stockBajo.length,
      recordatorios,
    };
  }
  async listarComprobantes(
    organizacion: string,
    sede: string,
    filtros: FiltrosListadoOperacion,
  ) {
    const q = filtros.q?.trim(),
      correlativo = q && /^\d+$/.test(q) ? BigInt(q) : null;
    const base: Prisma.comprobantes_electronicosWhereInput = {
      fid_organizaciones: organizacion,
      fid_sedes: sede,
      eliminado_en: null,
      organizacion: { estado: 1, eliminado_en: null },
      ...(q
        ? {
            OR: [
              { serie: { contains: q, mode: "insensitive" } },
              ...(correlativo !== null ? [{ correlativo }] : []),
              { cliente_nombre: { contains: q, mode: "insensitive" } },
              {
                cliente_numero_documento: { contains: q, mode: "insensitive" },
              },
              { tipo: { etiqueta: { contains: q, mode: "insensitive" } } },
              {
                estado_comprobante: {
                  etiqueta: { contains: q, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };
    const atras = Boolean(filtros.antes_de),
      cursorId = filtros.antes_de ?? filtros.despues_de;
    const cursor = cursorId
      ? await this.prisma.comprobantes_electronicos.findFirst({
          where: { AND: [base, { id_comprobantes_electronicos: cursorId }] },
          select: { created_at: true, id_comprobantes_electronicos: true },
        })
      : null;
    if (cursorId && !cursor)
      throw new BadRequestException("operations.invalidCursor");
    const condicion: Prisma.comprobantes_electronicosWhereInput = cursor
      ? {
          OR: atras
            ? [
                { created_at: { gt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_comprobantes_electronicos: {
                    gt: cursor.id_comprobantes_electronicos,
                  },
                },
              ]
            : [
                { created_at: { lt: cursor.created_at } },
                {
                  created_at: cursor.created_at,
                  id_comprobantes_electronicos: {
                    lt: cursor.id_comprobantes_electronicos,
                  },
                },
              ],
        }
      : {};
    const [filas, total] = await Promise.all([
      this.prisma.comprobantes_electronicos.findMany({
        where: { AND: [base, condicion] },
        orderBy: atras
          ? [{ created_at: "asc" }, { id_comprobantes_electronicos: "asc" }]
          : [{ created_at: "desc" }, { id_comprobantes_electronicos: "desc" }],
        take: 11,
        include: {
          tipo: { select: { etiqueta: true } },
          estado_comprobante: { select: { etiqueta: true } },
          moneda: { select: { codigo: true, etiqueta: true } },
          venta: { select: { numero: true } },
        },
      }),
      this.prisma.comprobantes_electronicos.count({ where: base }),
    ]);
    const hayMas = filas.length > 10;
    if (hayMas) filas.pop();
    if (atras) filas.reverse();
    const comprobantes = filas;
    return {
      comprobantes: comprobantes.map((c) => ({
        ...c,
        correlativo: c.correlativo.toString(),
        subtotal: c.subtotal.toString(),
        igv: c.igv.toString(),
        total: c.total.toString(),
        venta: { numero: c.venta.numero.toString() },
      })),
      total,
      paginacion: {
        anterior:
          comprobantes.length && (atras ? hayMas : Boolean(filtros.despues_de))
            ? comprobantes[0]!.id_comprobantes_electronicos
            : null,
        siguiente:
          comprobantes.length && (atras || hayMas)
            ? comprobantes.at(-1)!.id_comprobantes_electronicos
            : null,
      },
    };
  }
  async crearSerie(datos: DatosSerieComprobante, actor: ComandoActor) {
    return this.prisma.$transaction(async (tx) => {
      const contextoSede = await this.validarActor(tx, actor);
      await this.parametro(
        tx,
        datos.fid_parametros_tipo,
        "tipos_comprobante_electronico",
      );
      const serie = await tx.series_comprobante.create({
        data: {
          fid_organizaciones: actor.organizacion,
          fid_entidades_legales: contextoSede.entidadLegal,
          fid_sedes: contextoSede.sede,
          ...datos,
          serie: datos.serie.toUpperCase(),
          created_by: actor.usuario,
          updated_by: actor.usuario,
        },
        select: { id_series_comprobante: true },
      });
      await this.auditoria.registrar(
        {
          accion: "facturacion.serie_creada",
          entidad: "series_comprobante",
          id_entidad: serie.id_series_comprobante,
          fid_organizaciones: actor.organizacion,
          fid_usuarios: actor.usuario,
          peticion: actor.contexto,
        },
        tx,
      );
      return serie;
    });
  }
  async prepararComprobante(datos: DatosComprobante, actor: ComandoActor) {
    return this.prisma.$transaction(
      async (tx) => {
        const contextoSede = await this.validarActor(tx, actor);
        const venta = await tx.ventas.findFirst({
          where: {
            id_ventas: datos.fid_ventas,
            fid_organizaciones: actor.organizacion,
            fid_sedes: contextoSede.sede,
            estado: 1,
            eliminado_en: null,
          },
          include: { detalles: { where: { estado: 1 } } },
        });
        if (!venta) throw new BadRequestException("operations.invalidSale");
        const serie = await tx.series_comprobante.findFirst({
          where: {
            id_series_comprobante: datos.fid_series_comprobante,
            fid_organizaciones: actor.organizacion,
            fid_entidades_legales: contextoSede.entidadLegal,
            fid_sedes: contextoSede.sede,
            estado: 1,
            eliminado_en: null,
          },
          include: { tipo: true },
        });
        if (!serie) throw new BadRequestException("operations.invalidSeries");
        await this.parametro(
          tx,
          datos.fid_parametros_tipo_documento_cliente,
          "tipos_documento",
        );
        const estado = await tx.parametros.findFirst({
          where: {
            codigo_grupo: "estados_comprobante_electronico",
            codigo: "borrador",
            estado: 1,
          },
        });
        const entidadLegal = await tx.entidades_legales.findFirst({
          where: {
            id_entidades_legales: contextoSede.entidadLegal,
            fid_organizaciones: actor.organizacion,
            estado: 1,
            eliminado_en: null,
          },
          select: {
            fid_parametros_moneda: true,
            fid_proveedores_fiscales: true,
          },
        });
        if (!estado || !entidadLegal)
          throw new BadRequestException("operations.catalogMissing");
        const [numeracion] = await tx.$queryRaw<
          Array<{ correlativo: bigint }>
        >`UPDATE facturacion.series_comprobante SET correlativo_actual=correlativo_actual+1,updated_by=${actor.usuario},updated_at=CURRENT_TIMESTAMP WHERE id_series_comprobante=${serie.id_series_comprobante}::uuid AND fid_organizaciones=${actor.organizacion}::uuid AND estado=1 AND eliminado_en IS NULL RETURNING correlativo_actual AS correlativo`;
        if (!numeracion)
          throw new BadRequestException("operations.invalidSeries");
        const correlativo = numeracion.correlativo;
        const [reloj] = await tx.$queryRaw<
          Array<{ hoy: Date }>
        >`SELECT (CURRENT_TIMESTAMP AT TIME ZONE ${contextoSede.zonaHoraria})::date AS hoy`;
        const comprobante = await tx.comprobantes_electronicos.create({
          data: {
            fid_organizaciones: actor.organizacion,
            fid_entidades_legales: contextoSede.entidadLegal,
            fid_sedes: contextoSede.sede,
            fid_proveedores_fiscales: entidadLegal.fid_proveedores_fiscales,
            fid_ventas: venta.id_ventas,
            fid_series_comprobante: serie.id_series_comprobante,
            fid_parametros_tipo: serie.fid_parametros_tipo,
            fid_parametros_estado: estado.id_parametros,
            fid_parametros_moneda: entidadLegal.fid_parametros_moneda,
            serie: serie.serie,
            correlativo,
            fecha_emision: reloj!.hoy,
            fid_parametros_tipo_documento_cliente:
              datos.fid_parametros_tipo_documento_cliente,
            cliente_numero_documento: datos.cliente_numero_documento,
            cliente_nombre: datos.cliente_nombre,
            cliente_direccion: datos.cliente_direccion,
            subtotal: venta.subtotal,
            igv: venta.impuesto,
            total: venta.total,
            created_by: actor.usuario,
            updated_by: actor.usuario,
            detalles: {
              create: venta.detalles.map((d) => ({
                fid_organizaciones: actor.organizacion,
                fid_detalles_venta: d.id_detalles_venta,
                descripcion: d.descripcion,
                cantidad: d.cantidad,
                precio_unitario: d.precio_unitario,
                valor_venta: d.total.minus(d.impuesto),
                igv: d.impuesto,
                total: d.total,
                created_by: actor.usuario,
                updated_by: actor.usuario,
              })),
            },
          },
          select: {
            id_comprobantes_electronicos: true,
            serie: true,
            correlativo: true,
          },
        });
        await this.auditoria.registrar(
          {
            accion: "facturacion.comprobante_preparado",
            entidad: "comprobantes_electronicos",
            id_entidad: comprobante.id_comprobantes_electronicos,
            fid_organizaciones: actor.organizacion,
            fid_usuarios: actor.usuario,
            peticion: actor.contexto,
            metadatos: {
              numero: `${comprobante.serie}-${comprobante.correlativo.toString()}`,
              estado: "borrador",
            },
          },
          tx,
        );
        return {
          ...comprobante,
          correlativo: comprobante.correlativo.toString(),
          envio_habilitado: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
