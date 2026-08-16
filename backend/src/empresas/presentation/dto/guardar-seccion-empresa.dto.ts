import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsOptional() @IsBoolean() sin_sede_fisica?: boolean;
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

  @IsOptional() @IsString() @Matches(/^$|^-?(?:[1-8]?\d(?:\.\d{1,8})?|90(?:\.0{1,8})?)$/)
  latitud?: string;
  @IsOptional() @IsString() @Matches(/^$|^-?(?:1[0-7]\d|[1-9]?\d)(?:\.\d{1,8})?$/)
  longitud?: string;
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
}

export class DtoGuardarRegionEmpresa {
  @IsDefined() @IsUUID("4") fid_parametros_idioma!: string;
  @IsDefined() @IsUUID("4") fid_zonas_horarias!: string;
  @IsDefined() @IsUUID("4") fid_parametros_moneda!: string;
}

export class DtoGuardarServiciosVeterinaria {
  @IsDefined() @IsArray() @ArrayMaxSize(20) @ArrayUnique() @IsUUID("4", { each: true })
  fid_parametros_especies!: string[];
}

export class DtoHorarioAgendaVeterinaria extends DtoHorarioAtencionEmpresa {
  @IsDefined() @IsInt() @Min(1) @Max(3) turno!: number;
}

export class DtoGuardarAgendaVeterinaria {
  @IsDefined() @IsBoolean() agenda_activa!: boolean;
  @IsDefined() @Type(() => Number) @IsInt() @Min(5) @Max(480) duracion_cita_estimada!: number;
  @IsDefined() @IsArray() @ArrayMaxSize(21) @ValidateNested({ each: true }) @Type(() => DtoHorarioAgendaVeterinaria)
  horarios!: DtoHorarioAgendaVeterinaria[];
}

export class DtoGuardarFiscalVeterinaria {
  @IsOptional() @IsUUID("4") fid_parametros_tipo_persona_fiscal!: string | null;
  @IsOptional() @IsUUID("4") fid_parametros_tipo_documento_fiscal!: string | null;
  @IsDefined() @IsString() @MaxLength(30) @Transform(mayusculas) fiscal_numero_documento!: string;
  @IsDefined() @IsString() @MaxLength(150) @Transform(texto) fiscal_razon_social!: string;
  @IsDefined() @IsBoolean() fiscal_afecto_igv!: boolean;
  @IsOptional() @IsUUID("4") fid_parametros_responsabilidad_fiscal!: string | null;
  @IsDefined() @IsString() @MaxLength(30) @Matches(/^$|^[+0-9()\-\s]+$/) @Transform(texto) fiscal_telefono!: string;
  @IsDefined() @IsString() @MaxLength(120) @Matches(/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/) @Transform(minusculas) fiscal_correo!: string;
  @IsDefined() @IsString() @MaxLength(250) @Transform(texto) fiscal_direccion!: string;
}
