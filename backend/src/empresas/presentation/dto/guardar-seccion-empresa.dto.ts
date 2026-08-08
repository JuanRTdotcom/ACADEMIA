import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

const texto = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : value;
const minusculas = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;
const mayusculas = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim().toUpperCase() : value;
const ICONOS_BENEFICIO = [
  "book",
  "book-open",
  "graduation-cap",
  "users",
  "award",
  "badge-check",
  "library",
  "presentation",
  "calendar",
  "clipboard-check",
  "play",
  "sparkles",
] as const;

export class DtoGuardarGeneralEmpresa {
  @IsDefined()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  nombre!: string;

  @IsDefined()
  @IsString()
  @MinLength(3)
  @MaxLength(63)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @Transform(minusculas)
  slug!: string;

  @IsDefined()
  @IsString()
  @MaxLength(150)
  @Matches(/^$|^[\p{L}\p{N}][\p{L}\p{N}\s&.,'()\-/]*$/u)
  @Transform(texto)
  razon_social!: string;

  @IsDefined()
  @IsString()
  @MaxLength(20)
  @Matches(/^$|^[A-Z0-9.\-]+$/)
  @Transform(mayusculas)
  ruc_nif!: string;
}

export class DtoGuardarContactoEmpresa {
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Transform(texto)
  direccion!: string;

  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Transform(texto)
  referencia!: string;

  @IsDefined()
  @IsString()
  @Matches(
    /^$|^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
  fid_admin_level_0!: string;

  @IsDefined()
  @IsString()
  @MaxLength(20)
  @Matches(/^$|^[A-Za-z0-9.-]+$/)
  codigo_admin_level_3!: string;

  @IsDefined()
  @IsString()
  @MaxLength(30)
  @Matches(/^$|^[+0-9()\-\s]+$/)
  @Transform(texto)
  telefono!: string;

  @IsDefined()
  @IsString()
  @MaxLength(30)
  @Matches(/^$|^[+0-9()\-\s]+$/)
  @Transform(texto)
  telefono_secundario!: string;

  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(minusculas)
  correo_contacto!: string;

  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(minusculas)
  correo_contacto_secundario!: string;
}

export class DtoGuardarDigitalEmpresa {
  @IsDefined()
  @IsString()
  @MaxLength(150)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  sitio_web!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  facebook_url!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  instagram_url!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  tiktok_url!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  youtube_url!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  linkedin_url!: string;
  @IsDefined()
  @IsString()
  @MaxLength(200)
  @Matches(/^$|^https?:\/\/[^\s]+$/)
  @Transform(texto)
  x_url!: string;
}

export class DtoGuardarIdentidadEmpresa {
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  color_primario!: string;

  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_cabecera_claro!: string;
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_cabecera_oscuro!: string;
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_esquinero_claro!: string;
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_esquinero_oscuro!: string;
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_menu_claro!: string;
  @IsDefined()
  @IsString()
  @Matches(/^$|^#[0-9A-Fa-f]{6}$/)
  ui_menu_oscuro!: string;
  @IsDefined()
  @IsBoolean()
  ui_mostrar_escudo_menu!: boolean;
  @IsDefined()
  @IsBoolean()
  ui_mostrar_nombre_empresa_menu!: boolean;
  @IsDefined()
  @IsBoolean()
  ui_ocultar_esquinero_expandido!: boolean;
  @IsDefined()
  @IsBoolean()
  ui_esquinero_fondo_activo!: boolean;
  @IsDefined()
  @IsBoolean()
  ui_cabecera_ocultar_borde!: boolean;
  @IsDefined()
  @IsBoolean()
  ui_menu_ocultar_borde!: boolean;
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(200)
  ui_tamano_escudo_menu!: number;
}

export class DtoGuardarLoginEmpresa {
  @IsDefined() @IsBoolean() login_usar_filtro_color!: boolean;
  @IsDefined() @IsBoolean() login_mostrar_etiqueta!: boolean;
  @IsDefined() @IsBoolean() login_mostrar_destacados!: boolean;
  @IsDefined() @IsBoolean() login_mostrar_comunidad!: boolean;

  @IsDefined()
  @IsString()
  @MaxLength(60)
  @Transform(texto)
  login_etiqueta!: string;
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Transform(texto)
  login_titulo!: string;
  @IsDefined()
  @IsString()
  @MaxLength(240)
  @Transform(texto)
  login_subtitulo!: string;
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Transform(texto)
  login_destacado_1!: string;
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Transform(texto)
  login_destacado_2!: string;
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Transform(texto)
  login_destacado_3!: string;
  @IsDefined() @IsString() @IsIn(ICONOS_BENEFICIO)
  login_destacado_icono_1!: string;
  @IsDefined() @IsString() @IsIn(ICONOS_BENEFICIO)
  login_destacado_icono_2!: string;
  @IsDefined() @IsString() @IsIn(ICONOS_BENEFICIO)
  login_destacado_icono_3!: string;
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Transform(texto)
  login_texto_comunidad!: string;
}

export class DtoActualizarFiltroColorLoginEmpresa {
  @IsDefined()
  @IsBoolean()
  login_usar_filtro_color!: boolean;
}

export class DtoHorarioAtencionEmpresa {
  @IsDefined() @IsInt() @Min(1) @Max(7) dia_semana!: number;
  @IsDefined() @IsBoolean() cerrado!: boolean;
  @IsOptional()
  @IsString()
  @Matches(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/)
  hora_apertura!: string | null;
  @IsOptional()
  @IsString()
  @Matches(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/)
  hora_cierre!: string | null;
}

export class DtoGuardarComunicacionesEmpresa {
  @IsDefined()
  @IsString()
  @MaxLength(120)
  @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(minusculas)
  soporte_correo!: string;

  @IsDefined()
  @IsString()
  @MaxLength(30)
  @Matches(/^$|^[+0-9()\-\s]+$/)
  @Transform(texto)
  soporte_telefono!: string;

  @IsDefined()
  @IsString()
  @MaxLength(30)
  @Matches(/^$|^[+0-9()\-\s]+$/)
  @Transform(texto)
  soporte_whatsapp!: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => DtoHorarioAtencionEmpresa)
  horarios!: DtoHorarioAtencionEmpresa[];
}

export class DtoGuardarRegionEmpresa {
  @IsDefined()
  @IsString()
  @IsIn(["es", "en"])
  idioma_por_defecto!: string;

  @IsDefined()
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9_+\-/]+$/)
  zona_horaria_por_defecto!: string;
}
