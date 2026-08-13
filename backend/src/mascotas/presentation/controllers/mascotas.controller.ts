import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { UsuarioAutenticado } from "../../../autenticacion/domain/entities/tipos";
import { Permisos } from "../../../autenticacion/presentation/decorators/permisos.decorador";
import { UsuarioActual } from "../../../autenticacion/presentation/decorators/usuario-actual.decorador";
import { crearContextoSolicitud } from "../../../comun/presentation/http/crear-contexto-solicitud";
import { CasoUsoGestionarMascotas } from "../../domain/usecases/gestionar-mascotas";
import { DtoGuardarMascota } from "../dto/guardar-mascota.dto";
import { DtoEliminarMascota } from "../dto/eliminar-mascota.dto";
import {
  DtoBuscarPropietariosMascota,
  DtoListarMascotas,
} from "../dto/listar-mascotas.dto";
import { InterceptorErroresFotoMascota } from "../interceptors/interceptor-errores-foto-mascota";
import { ServicioTokenOpaco } from "../../../comun/seguridad/token-opaco.service";
import { leerPosicionCatalogo, protegerPaginacionCatalogo } from "../../../comun/seguridad/paginacion-catalogo";

@Controller("clinic/pets")
export class ControladorMascotas {
  constructor(
    private mascotas: CasoUsoGestionarMascotas,
    private config: ConfigService,
    private tokens: ServicioTokenOpaco,
  ) {}

  @Get()
  @Permisos("clinic.pets.read")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async listar(
    @Query() filtros: DtoListarMascotas,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    const posicion = leerPosicionCatalogo(this.tokens, "clinic-pets", filtros.p, usuario.fid_organizaciones, filtros.q, "pets.invalidCursor");
    const listado = await this.mascotas.listar(
      usuario.fid_organizaciones,
      {
        q: filtros.q,
        despues_de: posicion?.direccion === "siguiente" ? posicion.id : undefined,
        antes_de: posicion?.direccion === "anterior" ? posicion.id : undefined,
      },
      usuario.idioma,
    );
    return protegerPaginacionCatalogo(this.tokens, "clinic-pets", listado, usuario.fid_organizaciones, filtros.q);
  }

  @Get("options")
  @Permisos("clinic.pets.create", "clinic.pets.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  opciones(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.mascotas.opciones(usuario.idioma);
  }

  @Get("owners")
  @Permisos("clinic.pets.create", "clinic.pets.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  buscarPropietarios(
    @Query() filtros: DtoBuscarPropietariosMascota,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.mascotas.buscarPropietarios(
      usuario.fid_organizaciones,
      filtros.q,
    );
  }

  @Get(":id/photo/:version")
  @Permisos("clinic.pets.read", "clinic.pets.create", "clinic.pets.update")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async foto(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("version") version: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!/^[0-9a-f-]{36}\.jpg$/i.test(version))
      throw new BadRequestException("pets.photoNotFound");
    const foto = await this.mascotas.obtenerFoto(
      id,
      version,
      usuario.fid_organizaciones,
    );
    response.setHeader("content-type", foto.tipo_mime);
    response.setHeader(
      "cache-control",
      `private, max-age=${this.config.getOrThrow<number>("AVATAR_CACHE_TTL_SECONDS")}, immutable`,
    );
    response.setHeader("etag", `"${version}"`);
    response.setHeader("x-content-type-options", "nosniff");
    response.setHeader("content-disposition", 'inline; filename="pet.jpg"');
    response.setHeader("cross-origin-resource-policy", "same-origin");
    response.setHeader(
      "content-security-policy",
      "default-src 'none'; sandbox",
    );
    return new StreamableFile(foto.contenido);
  }

  @Get(":id")
  @Permisos("clinic.pets.read", "clinic.pets.update")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  obtener(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.mascotas.obtener(id, usuario.fid_organizaciones);
  }

  @Post()
  @Permisos("clinic.pets.create")
  @HttpCode(201)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseInterceptors(InterceptorErroresFotoMascota, FileInterceptor("foto"))
  async crear(
    @Body() dto: DtoGuardarMascota,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    if (dto.eliminar_foto)
      throw new BadRequestException("pets.invalidPhotoOperation");
    if (Boolean(dto.fid_propietarios) === dto.sin_propietario)
      throw new BadRequestException("pets.ownerDecisionRequired");
    const resultado = await this.mascotas.crear(
      usuario.fid_organizaciones,
      this.datos(dto),
      archivo ? this.archivo(archivo) : null,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true, ...resultado };
  }

  @Patch(":id")
  @Permisos("clinic.pets.update")
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseInterceptors(InterceptorErroresFotoMascota, FileInterceptor("foto"))
  async actualizar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoGuardarMascota,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    if (archivo && dto.eliminar_foto)
      throw new BadRequestException("pets.invalidPhotoOperation");
    if (Boolean(dto.fid_propietarios) === dto.sin_propietario)
      throw new BadRequestException("pets.ownerDecisionRequired");
    await this.mascotas.actualizar(
      id,
      usuario.fid_organizaciones,
      this.datos(dto),
      archivo ? this.archivo(archivo) : null,
      dto.eliminar_foto ?? false,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  @Delete(":id")
  @Permisos("clinic.pets.delete")
  @HttpCode(200)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async eliminar(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: DtoEliminarMascota,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    await this.mascotas.eliminar(
      id,
      usuario.fid_organizaciones,
      dto,
      usuario.sub,
      crearContextoSolicitud(req),
    );
    return { ok: true };
  }

  private datos(dto: DtoGuardarMascota) {
    return {
      fid_propietarios: dto.fid_propietarios ?? null,
      animal_servicio: dto.animal_servicio ?? false,
      apoyo_emocional: dto.apoyo_emocional ?? false,
      nombre: dto.nombre,
      codigo_chip: dto.codigo_chip || null,
      fid_especies_animales: dto.fid_especies_animales,
      fid_subespecies_animales: dto.fid_subespecies_animales ?? null,
      fid_razas_animales: dto.fid_razas_animales ?? null,
      fid_parametros_genero: dto.fid_parametros_genero,
      fid_parametros_color: dto.fid_parametros_color ?? null,
      fecha_nacimiento: dto.fecha_nacimiento ?? null,
      peso: dto.peso ?? null,
      fid_parametros_unidad_peso: dto.fid_parametros_unidad_peso ?? null,
      fid_parametros_talla: dto.fid_parametros_talla ?? null,
      fid_parametros_estado_reproductivo:
        dto.fid_parametros_estado_reproductivo ?? null,
      fid_parametros_temperamento: dto.fid_parametros_temperamento ?? null,
      alimento: dto.alimento || null,
    };
  }
  private archivo(archivo: Express.Multer.File) {
    return {
      contenido: archivo.buffer,
      tipo_mime: archivo.mimetype,
      nombre_original: archivo.originalname,
    };
  }
}
