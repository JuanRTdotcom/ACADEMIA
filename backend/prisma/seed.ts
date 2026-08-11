import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient } from "./generated/client/client";
import { PROCEDIMIENTOS_VETERINARIOS_INICIALES } from "../src/comun/catalogos/procedimientos-veterinarios-iniciales";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: exigirVariable("DATABASE_URL") }),
});

/** El seed tampoco inventa configuración: si falta una variable, se detiene. */
function exigirVariable(nombre: string): string {
  const valor = process.env[nombre]?.trim();
  if (!valor)
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  return valor;
}

/** El seed nunca crea una cuenta cuya clave no cumpla la política del login. */
function exigirContraseniaSegura(nombre: string): string {
  const valor = exigirVariable(nombre);
  const patron = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,20}$/;
  if (!patron.test(valor)) {
    throw new Error(
      `${nombre} debe tener entre 8 y 20 caracteres, mayúscula, minúscula, número y carácter especial`,
    );
  }
  return valor;
}

const ORG_SLUG = exigirVariable("OWNER_ORG_SLUG");
const ORG_NOMBRE = exigirVariable("OWNER_ORG_NAME");
const SUPERADMIN_CORREO = exigirVariable("SUPERADMIN_EMAIL");
const SUPERADMIN_USUARIO = exigirVariable("SUPERADMIN_USERNAME").toUpperCase();
if (!/^[A-Z0-9]{1,20}$/.test(SUPERADMIN_USUARIO)) {
  throw new Error(
    "SUPERADMIN_USERNAME solo admite letras y números, máximo 20",
  );
}
const SUPERADMIN_PASS = exigirContraseniaSegura("SUPERADMIN_PASSWORD");

async function main() {
  // Argon2 ocurre antes: la transacción guarda solo escrituras relacionadas.
  const hashContrasenia = await argon2.hash(SUPERADMIN_PASS, {
    type: argon2.argon2id,
  });
  const [reloj] = await prisma.$queryRaw<
    { ahora: Date; vence_en_cien_anios: Date }[]
  >`
    SELECT CURRENT_TIMESTAMP AS ahora,
           CURRENT_TIMESTAMP + INTERVAL '100 years' AS vence_en_cien_anios
  `;
  if (!reloj) throw new Error("PostgreSQL no devolvió su tiempo actual");

  await prisma.$transaction(async (tx) => {
    // Asegurar que existan los planes base para evitar violación de llave foránea (fid_planes)
    await tx.planes.upsert({
      where: { id_planes: "40000000-0000-4000-8000-000000000001" },
      update: {},
      create: {
        id_planes: "40000000-0000-4000-8000-000000000001",
        codigo: "BASIC",
        nombre: "Plan Básico",
        descripcion: "Plan inicial para consultorios.",
        estado: 1,
      },
    });
    await tx.planes.upsert({
      where: { id_planes: "40000000-0000-4000-8000-000000000002" },
      update: {},
      create: {
        id_planes: "40000000-0000-4000-8000-000000000002",
        codigo: "PREMIUM",
        nombre: "Plan Premium",
        descripcion: "Plan intermedio para clínicas.",
        estado: 1,
      },
    });
    await tx.planes.upsert({
      where: { id_planes: "40000000-0000-4000-8000-000000000003" },
      update: {},
      create: {
        id_planes: "40000000-0000-4000-8000-000000000003",
        codigo: "FULL",
        nombre: "Plan Completo",
        descripcion: "Acceso total para grandes cadenas.",
        estado: 1,
      },
    });
    const planSistema = await tx.planes.upsert({
      where: { codigo: "SYSTEM" },
      update: {
        nombre: "Plan del sistema",
        descripcion: "Acceso operativo de la organización propietaria.",
        estado: 1,
      },
      create: {
        codigo: "SYSTEM",
        nombre: "Plan del sistema",
        descripcion: "Acceso operativo de la organización propietaria.",
        estado: 1,
      },
    });

    // Los datos maestros pertenecen a PostgreSQL y se crean mediante
    // migraciones. El seed no mantiene copias de configuracion.parametros.
    // Nivel 0 usa ISO 3166-1 alfa-2. Las etiquetas permiten que la UI hable
    // el idioma administrativo de cada país sin cambiar su modelo interno.
    const peru = await tx.admin_level_0.upsert({
      where: { codigo_iso2: "PE" },
      update: {
        nombre_es: "Perú",
        nombre_en: "Peru",
        etiqueta_admin_level_1: "Departamento",
        etiqueta_admin_level_2: "Provincia",
        etiqueta_admin_level_3: "Distrito",
        estado: 1,
      },
      create: {
        codigo_iso2: "PE",
        nombre_es: "Perú",
        nombre_en: "Peru",
        etiqueta_admin_level_1: "Departamento",
        etiqueta_admin_level_2: "Provincia",
        etiqueta_admin_level_3: "Distrito",
      },
    });

    // Se necesita sembrar al menos un nivel 1 y nivel 3 para Perú para las pruebas de dirección E2E
    const departamentoLima = await tx.admin_level_1.upsert({
      where: {
        fid_admin_level_0_codigo: {
          fid_admin_level_0: peru.id_admin_level_0,
          codigo: "15",
        },
      },
      update: { nombre: "LIMA", estado: 1 },
      create: {
        fid_admin_level_0: peru.id_admin_level_0,
        codigo: "15",
        nombre: "LIMA",
      },
    });

    const provinciaLima = await tx.admin_level_2.upsert({
      where: {
        fid_admin_level_1_codigo: {
          fid_admin_level_1: departamentoLima.id_admin_level_1,
          codigo: "1501",
        },
      },
      update: { nombre: "LIMA", estado: 1 },
      create: {
        fid_admin_level_1: departamentoLima.id_admin_level_1,
        codigo: "1501",
        nombre: "LIMA",
      },
    });

    await tx.admin_level_3.upsert({
      where: {
        fid_admin_level_1_codigo: {
          fid_admin_level_1: departamentoLima.id_admin_level_1,
          codigo: "150101",
        },
      },
      update: {
        nombre: "LIMA",
        fid_admin_level_2: provinciaLima.id_admin_level_2,
        estado: 1,
      },
      create: {
        fid_admin_level_1: departamentoLima.id_admin_level_1,
        fid_admin_level_2: provinciaLima.id_admin_level_2,
        codigo: "150101",
        nombre: "LIMA",
      },
    });

    const mexico = await tx.admin_level_0.upsert({
      where: { codigo_iso2: "MX" },
      update: {
        nombre_es: "México",
        nombre_en: "Mexico",
        etiqueta_admin_level_1: "Estado",
        etiqueta_admin_level_2: null,
        etiqueta_admin_level_3: "Municipio/Alcaldía",
        estado: 1,
      },
      create: {
        codigo_iso2: "MX",
        nombre_es: "México",
        nombre_en: "Mexico",
        etiqueta_admin_level_1: "Estado",
        etiqueta_admin_level_2: null,
        etiqueta_admin_level_3: "Municipio/Alcaldía",
      },
    });

    // México demuestra el salto válido Level 1 -> Level 3 (sin Level 2).
    const ciudadMexico = await tx.admin_level_1.upsert({
      where: {
        fid_admin_level_0_codigo: {
          fid_admin_level_0: mexico.id_admin_level_0,
          codigo: "09",
        },
      },
      update: { nombre: "CIUDAD DE MÉXICO", estado: 1 },
      create: {
        fid_admin_level_0: mexico.id_admin_level_0,
        codigo: "09",
        nombre: "CIUDAD DE MÉXICO",
      },
    });
    for (const alcaldia of [
      { codigo: "09014", nombre: "BENITO JUÁREZ" },
      { codigo: "09015", nombre: "CUAUHTÉMOC" },
      { codigo: "09016", nombre: "MIGUEL HIDALGO" },
    ]) {
      await tx.admin_level_3.upsert({
        where: {
          fid_admin_level_1_codigo: {
            fid_admin_level_1: ciudadMexico.id_admin_level_1,
            codigo: alcaldia.codigo,
          },
        },
        update: { nombre: alcaldia.nombre, fid_admin_level_2: null, estado: 1 },
        create: {
          fid_admin_level_1: ciudadMexico.id_admin_level_1,
          fid_admin_level_2: null,
          codigo: alcaldia.codigo,
          nombre: alcaldia.nombre,
        },
      });
    }

    // 2. Organización propietaria (primera empresa).
    const organizacionExistente = await tx.organizaciones.findFirst({
      where: { slug: ORG_SLUG, eliminado_en: null },
      orderBy: [{ estado: "desc" }, { created_at: "desc" }],
    });
    const fechaInicia = reloj.ahora;
    const fechaExpira = reloj.vence_en_cien_anios;
    const organizacion = organizacionExistente
      ? await tx.organizaciones.update({
          where: {
            id_organizaciones: organizacionExistente.id_organizaciones,
          },
          data: {
            nombre: ORG_NOMBRE,
            estado: 1,
            fid_planes: planSistema.id_planes,
            suscripcion_inicia_en: fechaInicia,
            suscripcion_expira_en: fechaExpira,
          },
        })
      : await tx.organizaciones.create({
          data: {
            slug: ORG_SLUG,
            nombre: ORG_NOMBRE,
            fid_planes: planSistema.id_planes,
            suscripcion_inicia_en: fechaInicia,
            suscripcion_expira_en: fechaExpira,
          },
        });

    await tx.$executeRaw`
      INSERT INTO nucleo.vacunas
        (fid_organizaciones, nombre, estado, created_by, updated_by)
      SELECT ${organizacion.id_organizaciones}::uuid, vacuna.nombre, 1, 'seed', 'seed'
      FROM (VALUES
        ('Antirrábica'), ('Triple canina'), ('Cuádruple canina'),
        ('Quíntuple canina'), ('Séxtuple canina'), ('Óctuple canina'),
        ('Bordetella'), ('Triple felina'), ('Cuádruple felina'),
        ('Leucemia felina')
      ) vacuna(nombre)
      ON CONFLICT (fid_organizaciones, upper(btrim(nombre)))
        WHERE eliminado_en IS NULL
      DO UPDATE SET estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    await tx.$executeRaw`
      INSERT INTO nucleo.tipos_hospitalizacion
        (fid_organizaciones, nombre, estado, created_by, updated_by)
      SELECT ${organizacion.id_organizaciones}::uuid, tipo.nombre, 1, 'seed', 'seed'
      FROM (VALUES ('Hospitalización'), ('Ambulatorio')) tipo(nombre)
      ON CONFLICT (fid_organizaciones, upper(btrim(nombre)))
        WHERE eliminado_en IS NULL
      DO UPDATE SET estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    await tx.procedimientos_veterinarios.createMany({
      data: PROCEDIMIENTOS_VETERINARIOS_INICIALES.map((procedimiento) => ({
        ...procedimiento,
        fid_organizaciones: organizacion.id_organizaciones,
        created_by: "seed",
        updated_by: "seed",
      })),
      skipDuplicates: true,
    });

    await tx.$executeRaw`
      INSERT INTO nucleo.pruebas_laboratorio
        (fid_organizaciones, fid_categorias_pruebas_laboratorio, nombre, estado, created_by, updated_by)
      SELECT ${organizacion.id_organizaciones}::uuid, base.fid_categorias_pruebas_laboratorio, base.nombre, 1, 'seed', 'seed'
      FROM configuracion.catalogo_pruebas_laboratorio_base base
      WHERE base.estado = 1
      ON CONFLICT (fid_organizaciones, fid_categorias_pruebas_laboratorio, upper(btrim(nombre)))
        WHERE eliminado_en IS NULL
      DO UPDATE SET estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    const [idiomaPredeterminado, zonaPredeterminada, monedaPredeterminada] =
      await Promise.all([
        tx.parametros.findUniqueOrThrow({
          where: {
            codigo_grupo_codigo: { codigo_grupo: "idiomas", codigo: "es" },
          },
        }),
        tx.zonas_horarias.findUniqueOrThrow({
          where: { nombre_iana: "America/Lima" },
        }),
        tx.parametros.findUniqueOrThrow({
          where: {
            codigo_grupo_codigo: { codigo_grupo: "monedas", codigo: "PEN" },
          },
        }),
      ]);

    // Datos base de la empresa propietaria. Pueden ampliarse luego desde Empresas.
    await tx.perfil_organizacion.upsert({
      where: { fid_organizaciones: organizacion.id_organizaciones },
      update: {
        razon_social: ORG_NOMBRE,
        correo_contacto: SUPERADMIN_CORREO,
        fid_parametros_idioma: idiomaPredeterminado.id_parametros,
        fid_zonas_horarias: zonaPredeterminada.id_zonas_horarias,
        fid_parametros_moneda: monedaPredeterminada.id_parametros,
        estado: 1,
      },
      create: {
        fid_organizaciones: organizacion.id_organizaciones,
        razon_social: ORG_NOMBRE,
        correo_contacto: SUPERADMIN_CORREO,
        fid_parametros_idioma: idiomaPredeterminado.id_parametros,
        fid_zonas_horarias: zonaPredeterminada.id_zonas_horarias,
        fid_parametros_moneda: monedaPredeterminada.id_parametros,
      },
    });

    // Autocrear eventos maestros necesarios
    const eventosNecesarios = [
      {
        codigo: "autenticacion.ingreso.exito",
        agregado: "usuarios",
        nombre: "Inicio de sesión exitoso",
      },
      {
        codigo: "autenticacion.cierre.exito",
        agregado: "sesiones",
        nombre: "Cierre de sesión",
      },
      {
        codigo: "perfil.apariencia.actualizada",
        agregado: "preferencias_usuario",
        nombre: "Apariencia actualizada",
      },
      {
        codigo: "perfil.datos_personales.actualizados",
        agregado: "personas",
        nombre: "Datos personales actualizados",
      },
      {
        codigo: "perfil.avatar.actualizado",
        agregado: "personas",
        nombre: "Avatar actualizado",
      },
      {
        codigo: "perfil.avatar.eliminado",
        agregado: "personas",
        nombre: "Avatar eliminado",
      },
      {
        codigo: "perfil.contrasenia.actualizada",
        agregado: "credenciales",
        nombre: "Contraseña actualizada",
      },
      {
        codigo: "perfil.correo.agregado",
        agregado: "personas_correos",
        nombre: "Correo agregado",
      },
      {
        codigo: "perfil.correo.modificado",
        agregado: "personas_correos",
        nombre: "Correo modificado",
      },
      {
        codigo: "perfil.correo.eliminado",
        agregado: "personas_correos",
        nombre: "Correo eliminado",
      },
      {
        codigo: "perfil.correo.uso_seleccionado",
        agregado: "personas_correos_usos",
        nombre: "Uso de correo asignado",
      },
      {
        codigo: "perfil.nacionalidad.agregada",
        agregado: "personas_nacionalidades",
        nombre: "Nacionalidad agregada",
      },
      {
        codigo: "perfil.nacionalidad.eliminada",
        agregado: "personas_nacionalidades",
        nombre: "Nacionalidad eliminada",
      },
      {
        codigo: "perfil.documento.agregado",
        agregado: "personas_documentos",
        nombre: "Documento agregado",
      },
      {
        codigo: "perfil.documento.modificado",
        agregado: "personas_documentos",
        nombre: "Documento modificado",
      },
      {
        codigo: "perfil.documento.eliminado",
        agregado: "personas_documentos",
        nombre: "Documento eliminado",
      },
      {
        codigo: "perfil.telefono.agregado",
        agregado: "personas_telefonos",
        nombre: "Teléfono agregado",
      },
      {
        codigo: "perfil.telefono.modificado",
        agregado: "personas_telefonos",
        nombre: "Teléfono modificado",
      },
      {
        codigo: "perfil.telefono.eliminado",
        agregado: "personas_telefonos",
        nombre: "Teléfono eliminado",
      },
      {
        codigo: "perfil.estudio_realizado.agregado",
        agregado: "personas_estudios_realizados",
        nombre: "Estudio agregado",
      },
      {
        codigo: "perfil.estudio_realizado.modificado",
        agregado: "personas_estudios_realizados",
        nombre: "Estudio modificado",
      },
      {
        codigo: "perfil.estudio_realizado.eliminado",
        agregado: "personas_estudios_realizados",
        nombre: "Estudio eliminado",
      },
      {
        codigo: "perfil.estudio_complementario.agregado",
        agregado: "personas_estudios_complementarios",
        nombre: "Estudio complementario agregado",
      },
      {
        codigo: "perfil.estudio_complementario.modificado",
        agregado: "personas_estudios_complementarios",
        nombre: "Estudio complementario modificado",
      },
      {
        codigo: "perfil.estudio_complementario.eliminado",
        agregado: "personas_estudios_complementarios",
        nombre: "Estudio complementario eliminado",
      },
    ];
    for (const e of eventosNecesarios) {
      await tx.eventos_maestro.upsert({
        where: { codigo_version: { codigo: e.codigo, version: 1 } },
        update: {
          tipo_agregado: e.agregado,
          nombre: e.nombre,
          visible_actividad: true,
          estado: 1,
        },
        create: {
          codigo: e.codigo,
          tipo_agregado: e.agregado,
          nombre: e.nombre,
          version: 1,
          visible_actividad: true,
          estado: 1,
        },
      });
    }

    // Catálogos base: deben existir en cualquier instalación, incluso cuando
    // una base se haya creado a partir de un historial de migraciones ya aplicado.
    const parametrosNecesarios = [
      { grupo: "idiomas", codigo: "es", etiqueta: "Español", orden: 10 },
      { grupo: "idiomas", codigo: "en", etiqueta: "Inglés", orden: 20 },
      {
        grupo: "monedas",
        codigo: "PEN",
        etiqueta: "Sol peruano (PEN)",
        orden: 10,
      },
      {
        grupo: "monedas",
        codigo: "USD",
        etiqueta: "Dólar estadounidense (USD)",
        orden: 20,
      },
      { grupo: "monedas", codigo: "EUR", etiqueta: "Euro (EUR)", orden: 30 },
      {
        grupo: "monedas",
        codigo: "MXN",
        etiqueta: "Peso mexicano (MXN)",
        orden: 40,
      },
      {
        grupo: "tipos_persona_fiscal",
        codigo: "persona_natural",
        etiqueta: "Persona natural",
        orden: 10,
      },
      {
        grupo: "tipos_persona_fiscal",
        codigo: "persona_juridica",
        etiqueta: "Empresa",
        orden: 20,
      },
      {
        grupo: "responsabilidades_fiscales",
        codigo: "nuevo_rus",
        etiqueta: "Nuevo RUS",
        orden: 10,
      },
      {
        grupo: "responsabilidades_fiscales",
        codigo: "regimen_especial_renta",
        etiqueta: "Régimen Especial de Renta",
        orden: 20,
      },
      {
        grupo: "responsabilidades_fiscales",
        codigo: "regimen_mype_tributario",
        etiqueta: "Régimen MYPE Tributario",
        orden: 30,
      },
      {
        grupo: "responsabilidades_fiscales",
        codigo: "regimen_general",
        etiqueta: "Régimen General",
        orden: 40,
      },
      {
        grupo: "responsabilidades_fiscales",
        codigo: "otro",
        etiqueta: "Otra",
        orden: 50,
      },
      { grupo: "tipos_documento", codigo: "dni", etiqueta: "DNI", orden: 10 },
      {
        grupo: "tipos_documento",
        codigo: "carnet_extranjeria",
        etiqueta: "Carnet de extranjería",
        orden: 20,
      },
      {
        grupo: "tipos_documento",
        codigo: "pasaporte",
        etiqueta: "Pasaporte",
        orden: 30,
      },
      {
        grupo: "tipos_documento",
        codigo: "cedula",
        etiqueta: "Cédula",
        orden: 40,
      },
      {
        grupo: "tipos_documento",
        codigo: "permiso_permanencia_temporal",
        etiqueta: "Permiso de permanencia temporal",
        orden: 50,
      },
      { grupo: "sexos", codigo: "masculino", etiqueta: "Masculino", orden: 10 },
      { grupo: "sexos", codigo: "femenino", etiqueta: "Femenino", orden: 20 },
      {
        grupo: "sexos",
        codigo: "no_especificado",
        etiqueta: "No especificado",
        orden: 30,
      },
      {
        grupo: "estados_civiles",
        codigo: "soltero",
        etiqueta: "Soltero(a)",
        orden: 10,
      },
      {
        grupo: "estados_civiles",
        codigo: "casado",
        etiqueta: "Casado(a)",
        orden: 20,
      },
      {
        grupo: "estados_civiles",
        codigo: "conviviente",
        etiqueta: "Conviviente",
        orden: 30,
      },
      {
        grupo: "estados_civiles",
        codigo: "separado",
        etiqueta: "Separado(a)",
        orden: 40,
      },
      {
        grupo: "estados_civiles",
        codigo: "divorciado",
        etiqueta: "Divorciado(a)",
        orden: 50,
      },
      {
        grupo: "estados_civiles",
        codigo: "viudo",
        etiqueta: "Viudo(a)",
        orden: 60,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "sin_instruccion",
        etiqueta: "Sin instrucción",
        orden: 10,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "primaria",
        etiqueta: "Primaria",
        orden: 20,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "secundaria",
        etiqueta: "Secundaria",
        orden: 30,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "tecnico",
        etiqueta: "Técnico",
        orden: 40,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "universitario",
        etiqueta: "Universitario",
        orden: 50,
      },
      {
        grupo: "niveles_instruccion",
        codigo: "posgrado",
        etiqueta: "Posgrado",
        orden: 60,
      },
      {
        grupo: "tipos_telefono",
        codigo: "movil",
        etiqueta: "Móvil",
        orden: 10,
      },
      { grupo: "tipos_telefono", codigo: "fijo", etiqueta: "Fijo", orden: 20 },
      {
        grupo: "tipos_telefono",
        codigo: "trabajo",
        etiqueta: "Trabajo",
        orden: 30,
      },
      { grupo: "tipos_telefono", codigo: "otro", etiqueta: "Otro", orden: 40 },
      {
        grupo: "grados_obtenidos",
        codigo: "primaria_completa",
        etiqueta: "Primaria completa",
        orden: 10,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "secundaria_completa",
        etiqueta: "Secundaria completa",
        orden: 20,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "egresado_tecnico",
        etiqueta: "Egresado técnico",
        orden: 30,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "titulo_tecnico",
        etiqueta: "Título técnico",
        orden: 40,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "bachiller",
        etiqueta: "Bachiller",
        orden: 50,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "titulo_profesional",
        etiqueta: "Título profesional",
        orden: 60,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "segunda_especialidad",
        etiqueta: "Segunda especialidad",
        orden: 70,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "maestro",
        etiqueta: "Maestro",
        orden: 80,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "doctor",
        etiqueta: "Doctor",
        orden: 90,
      },
      {
        grupo: "grados_obtenidos",
        codigo: "otro",
        etiqueta: "Otro",
        orden: 100,
      },
      {
        grupo: "profesiones",
        codigo: "administracion",
        etiqueta: "Administración",
        orden: 10,
      },
      {
        grupo: "profesiones",
        codigo: "arquitectura",
        etiqueta: "Arquitectura",
        orden: 20,
      },
      {
        grupo: "profesiones",
        codigo: "contabilidad",
        etiqueta: "Contabilidad",
        orden: 30,
      },
      {
        grupo: "profesiones",
        codigo: "derecho",
        etiqueta: "Derecho",
        orden: 40,
      },
      {
        grupo: "profesiones",
        codigo: "economia",
        etiqueta: "Economía",
        orden: 50,
      },
      {
        grupo: "profesiones",
        codigo: "educacion",
        etiqueta: "Educación",
        orden: 60,
      },
      {
        grupo: "profesiones",
        codigo: "enfermeria",
        etiqueta: "Enfermería",
        orden: 70,
      },
      {
        grupo: "profesiones",
        codigo: "ingenieria_civil",
        etiqueta: "Ingeniería civil",
        orden: 80,
      },
      {
        grupo: "profesiones",
        codigo: "ingenieria_industrial",
        etiqueta: "Ingeniería industrial",
        orden: 90,
      },
      {
        grupo: "profesiones",
        codigo: "ingenieria_sistemas",
        etiqueta: "Ingeniería de sistemas",
        orden: 100,
      },
      {
        grupo: "profesiones",
        codigo: "medicina",
        etiqueta: "Medicina",
        orden: 110,
      },
      {
        grupo: "profesiones",
        codigo: "obstetricia",
        etiqueta: "Obstetricia",
        orden: 120,
      },
      {
        grupo: "profesiones",
        codigo: "odontologia",
        etiqueta: "Odontología",
        orden: 130,
      },
      {
        grupo: "profesiones",
        codigo: "psicologia",
        etiqueta: "Psicología",
        orden: 140,
      },
      {
        grupo: "profesiones",
        codigo: "trabajo_social",
        etiqueta: "Trabajo social",
        orden: 150,
      },
      { grupo: "profesiones", codigo: "otro", etiqueta: "Otra", orden: 160 },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "curso",
        etiqueta: "Curso",
        orden: 10,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "taller",
        etiqueta: "Taller",
        orden: 20,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "seminario",
        etiqueta: "Seminario",
        orden: 30,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "diplomado",
        etiqueta: "Diplomado",
        orden: 40,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "certificacion",
        etiqueta: "Certificación",
        orden: 50,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "congreso",
        etiqueta: "Congreso",
        orden: 60,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "especializacion",
        etiqueta: "Especialización",
        orden: 70,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "maestria",
        etiqueta: "Maestría",
        orden: 80,
      },
      {
        grupo: "tipos_estudio_complementario",
        codigo: "otro",
        etiqueta: "Otro",
        orden: 90,
      },
      {
        grupo: "especies_animales",
        codigo: "perros",
        etiqueta: "Perros",
        orden: 10,
      },
      {
        grupo: "especies_animales",
        codigo: "gatos",
        etiqueta: "Gatos",
        orden: 20,
      },
      {
        grupo: "especies_animales",
        codigo: "aves",
        etiqueta: "Aves",
        orden: 30,
      },
      {
        grupo: "especies_animales",
        codigo: "conejos",
        etiqueta: "Conejos",
        orden: 40,
      },
      {
        grupo: "especies_animales",
        codigo: "roedores",
        etiqueta: "Roedores",
        orden: 50,
      },
      {
        grupo: "especies_animales",
        codigo: "reptiles",
        etiqueta: "Reptiles",
        orden: 60,
      },
      {
        grupo: "especies_animales",
        codigo: "peces",
        etiqueta: "Peces",
        orden: 70,
      },
      {
        grupo: "especies_animales",
        codigo: "equinos",
        etiqueta: "Equinos",
        orden: 80,
      },
      {
        grupo: "especies_animales",
        codigo: "bovinos",
        etiqueta: "Bovinos",
        orden: 90,
      },
      {
        grupo: "especies_animales",
        codigo: "ovinos_caprinos",
        etiqueta: "Ovinos y caprinos",
        orden: 100,
      },
      {
        grupo: "especies_animales",
        codigo: "otros",
        etiqueta: "Otros",
        orden: 110,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "redes_sociales",
        etiqueta: "Redes sociales",
        orden: 10,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "recomendacion_cliente",
        etiqueta: "Recomendación de otro cliente",
        orden: 20,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "referido_veterinaria",
        etiqueta: "Referido por otra veterinaria",
        orden: 30,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "busqueda_internet",
        etiqueta: "Búsqueda en internet",
        orden: 40,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "publicidad_fisica",
        etiqueta: "Publicidad física",
        orden: 50,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "evento_campana",
        etiqueta: "Evento o campaña veterinaria",
        orden: 60,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "ubicacion_cercania",
        etiqueta: "Ubicación o cercanía",
        orden: 70,
      },
      {
        grupo: "como_conocio_veterinaria",
        codigo: "otro",
        etiqueta: "Otro",
        orden: 80,
      },
      {
        grupo: "generos_mascota",
        codigo: "macho",
        etiqueta: "Macho",
        orden: 10,
      },
      {
        grupo: "generos_mascota",
        codigo: "hembra",
        etiqueta: "Hembra",
        orden: 20,
      },
      {
        grupo: "generos_mascota",
        codigo: "desconocido",
        etiqueta: "Desconocido",
        orden: 30,
      },
      {
        grupo: "unidades_peso_mascota",
        codigo: "kg",
        etiqueta: "Kilogramos (kg)",
        orden: 10,
      },
      {
        grupo: "unidades_peso_mascota",
        codigo: "g",
        etiqueta: "Gramos (g)",
        orden: 20,
      },
      {
        grupo: "unidades_peso_mascota",
        codigo: "lb",
        etiqueta: "Libras (lb)",
        orden: 30,
      },
      {
        grupo: "unidades_peso_mascota",
        codigo: "oz",
        etiqueta: "Onzas (oz)",
        orden: 40,
      },
      {
        grupo: "tallas_mascota",
        codigo: "miniatura",
        etiqueta: "Miniatura",
        orden: 10,
      },
      {
        grupo: "tallas_mascota",
        codigo: "pequeno",
        etiqueta: "Pequeño",
        orden: 20,
      },
      {
        grupo: "tallas_mascota",
        codigo: "mediano",
        etiqueta: "Mediano",
        orden: 30,
      },
      {
        grupo: "tallas_mascota",
        codigo: "grande",
        etiqueta: "Grande",
        orden: 40,
      },
      {
        grupo: "tallas_mascota",
        codigo: "gigante",
        etiqueta: "Gigante",
        orden: 50,
      },
      {
        grupo: "tallas_mascota",
        codigo: "desconocido",
        etiqueta: "Desconocido",
        orden: 60,
      },
      {
        grupo: "estados_reproductivos_mascota",
        codigo: "esterilizado",
        etiqueta: "Esterilizado",
        orden: 10,
      },
      {
        grupo: "estados_reproductivos_mascota",
        codigo: "no_esterilizado",
        etiqueta: "No esterilizado",
        orden: 20,
      },
      {
        grupo: "estados_reproductivos_mascota",
        codigo: "desconocido",
        etiqueta: "Desconocido",
        orden: 30,
      },
      {
        grupo: "tipos_desparasitacion",
        codigo: "interna",
        etiqueta: "Interna",
        orden: 10,
      },
      {
        grupo: "tipos_desparasitacion",
        codigo: "externa",
        etiqueta: "Externa",
        orden: 20,
      },
      {
        grupo: "tipos_desparasitacion",
        codigo: "mixta_amplio_espectro",
        etiqueta: "Mixta / amplio espectro",
        orden: 30,
      },
      {
        grupo: "tipos_desparasitacion",
        codigo: "otro",
        etiqueta: "Otro",
        orden: 40,
      },
      {
        grupo: "temperamentos_mascota",
        codigo: "muy_docil",
        etiqueta: "Muy dócil",
        orden: 10,
      },
      {
        grupo: "temperamentos_mascota",
        codigo: "docil",
        etiqueta: "Dócil",
        orden: 20,
      },
      {
        grupo: "temperamentos_mascota",
        codigo: "reservado",
        etiqueta: "Reservado",
        orden: 30,
      },
      {
        grupo: "temperamentos_mascota",
        codigo: "reactivo",
        etiqueta: "Reactivo",
        orden: 40,
      },
      {
        grupo: "temperamentos_mascota",
        codigo: "agresivo",
        etiqueta: "Agresivo",
        orden: 50,
      },
      {
        grupo: "colores_mascota",
        codigo: "negro",
        etiqueta: "Negro",
        orden: 10,
      },
      {
        grupo: "colores_mascota",
        codigo: "blanco",
        etiqueta: "Blanco",
        orden: 20,
      },
      { grupo: "colores_mascota", codigo: "gris", etiqueta: "Gris", orden: 30 },
      {
        grupo: "colores_mascota",
        codigo: "marron",
        etiqueta: "Marrón",
        orden: 40,
      },
      {
        grupo: "colores_mascota",
        codigo: "beige",
        etiqueta: "Beige",
        orden: 50,
      },
      {
        grupo: "colores_mascota",
        codigo: "crema",
        etiqueta: "Crema",
        orden: 60,
      },
      {
        grupo: "colores_mascota",
        codigo: "dorado",
        etiqueta: "Dorado",
        orden: 70,
      },
      {
        grupo: "colores_mascota",
        codigo: "amarillo",
        etiqueta: "Amarillo",
        orden: 80,
      },
      {
        grupo: "colores_mascota",
        codigo: "naranja",
        etiqueta: "Naranja",
        orden: 90,
      },
      {
        grupo: "colores_mascota",
        codigo: "rojizo",
        etiqueta: "Rojizo",
        orden: 100,
      },
      {
        grupo: "colores_mascota",
        codigo: "canela",
        etiqueta: "Canela",
        orden: 110,
      },
      {
        grupo: "colores_mascota",
        codigo: "azul_gris",
        etiqueta: "Azul grisáceo",
        orden: 120,
      },
      {
        grupo: "colores_mascota",
        codigo: "otro",
        etiqueta: "Otro / multicolor",
        orden: 999,
      },
      { grupo: "seguros", codigo: "essalud", etiqueta: "EsSalud", orden: 10 },
      { grupo: "seguros", codigo: "sis", etiqueta: "SIS", orden: 20 },
      { grupo: "seguros", codigo: "otro", etiqueta: "Otro", orden: 30 },
    ];
    for (const p of parametrosNecesarios) {
      await tx.parametros.upsert({
        where: {
          codigo_grupo_codigo: { codigo_grupo: p.grupo, codigo: p.codigo },
        },
        update: { etiqueta: p.etiqueta, orden: p.orden, estado: 1 },
        create: {
          codigo_grupo: p.grupo,
          codigo: p.codigo,
          etiqueta: p.etiqueta,
          orden: p.orden,
          estado: 1,
        },
      });
    }

    await tx.$executeRaw`
      UPDATE configuracion.parametros
      SET color_hex = CASE codigo
        WHEN 'muy_docil' THEN '#16A34A'
        WHEN 'docil' THEN '#65A30D'
        WHEN 'reservado' THEN '#CA8A04'
        WHEN 'reactivo' THEN '#EA580C'
        WHEN 'agresivo' THEN '#DC2626'
      END,
      updated_by = 'seed'
      WHERE codigo_grupo = 'temperamentos_mascota'
    `;

    await tx.$executeRaw`
      UPDATE configuracion.parametros
      SET color_hex = CASE codigo
        WHEN 'negro' THEN '#1F2937' WHEN 'blanco' THEN '#F8FAFC'
        WHEN 'gris' THEN '#6B7280' WHEN 'marron' THEN '#7C4A2D'
        WHEN 'beige' THEN '#D6B98C' WHEN 'crema' THEN '#F3E2B3'
        WHEN 'dorado' THEN '#D4A72C' WHEN 'amarillo' THEN '#EAB308'
        WHEN 'naranja' THEN '#EA580C' WHEN 'rojizo' THEN '#B45309'
        WHEN 'canela' THEN '#B7791F' WHEN 'azul_gris' THEN '#64748B'
        WHEN 'otro' THEN '#94A3B8'
      END,
      updated_by = 'seed'
      WHERE codigo_grupo = 'colores_mascota'
    `;

    await tx.$executeRaw`
      WITH etiquetas(grupo, codigo, etiqueta_es, etiqueta_en) AS (
        VALUES
          ('generos_mascota', 'macho', 'Macho', 'Male'),
          ('generos_mascota', 'hembra', 'Hembra', 'Female'),
          ('generos_mascota', 'desconocido', 'Desconocido', 'Unknown'),
          ('unidades_peso_mascota', 'kg', 'Kilogramos (kg)', 'Kilograms (kg)'),
          ('unidades_peso_mascota', 'g', 'Gramos (g)', 'Grams (g)'),
          ('unidades_peso_mascota', 'lb', 'Libras (lb)', 'Pounds (lb)'),
          ('unidades_peso_mascota', 'oz', 'Onzas (oz)', 'Ounces (oz)'),
          ('tallas_mascota', 'miniatura', 'Miniatura', 'Miniature'),
          ('tallas_mascota', 'pequeno', 'Pequeño', 'Small'),
          ('tallas_mascota', 'mediano', 'Mediano', 'Medium'),
          ('tallas_mascota', 'grande', 'Grande', 'Large'),
          ('tallas_mascota', 'gigante', 'Gigante', 'Giant'),
          ('tallas_mascota', 'desconocido', 'Desconocido', 'Unknown'),
          ('estados_reproductivos_mascota', 'esterilizado', 'Esterilizado', 'Sterilized'),
          ('estados_reproductivos_mascota', 'no_esterilizado', 'No esterilizado', 'Not sterilized'),
          ('estados_reproductivos_mascota', 'desconocido', 'Desconocido', 'Unknown'),
          ('tipos_desparasitacion', 'interna', 'Interna', 'Internal'),
          ('tipos_desparasitacion', 'externa', 'Externa', 'External'),
          ('tipos_desparasitacion', 'mixta_amplio_espectro', 'Mixta / amplio espectro', 'Combined / broad-spectrum'),
          ('tipos_desparasitacion', 'otro', 'Otro', 'Other'),
          ('temperamentos_mascota', 'muy_docil', 'Muy dócil', 'Very docile'),
          ('temperamentos_mascota', 'docil', 'Dócil', 'Docile'),
          ('temperamentos_mascota', 'reservado', 'Reservado', 'Reserved'),
          ('temperamentos_mascota', 'reactivo', 'Reactivo', 'Reactive'),
          ('temperamentos_mascota', 'agresivo', 'Agresivo', 'Aggressive'),
          ('colores_mascota', 'negro', 'Negro', 'Black'),
          ('colores_mascota', 'blanco', 'Blanco', 'White'),
          ('colores_mascota', 'gris', 'Gris', 'Gray'),
          ('colores_mascota', 'marron', 'Marrón', 'Brown'),
          ('colores_mascota', 'beige', 'Beige', 'Beige'),
          ('colores_mascota', 'crema', 'Crema', 'Cream'),
          ('colores_mascota', 'dorado', 'Dorado', 'Golden'),
          ('colores_mascota', 'amarillo', 'Amarillo', 'Yellow'),
          ('colores_mascota', 'naranja', 'Naranja', 'Orange'),
          ('colores_mascota', 'rojizo', 'Rojizo', 'Reddish'),
          ('colores_mascota', 'canela', 'Canela', 'Cinnamon'),
          ('colores_mascota', 'azul_gris', 'Azul grisáceo', 'Blue-gray'),
          ('colores_mascota', 'otro', 'Otro / multicolor', 'Other / multicolor')
      ), traducciones AS (
        SELECT parametro.id_parametros, idioma.codigo_idioma, idioma.etiqueta
        FROM etiquetas
        JOIN configuracion.parametros parametro
          ON parametro.codigo_grupo = etiquetas.grupo AND parametro.codigo = etiquetas.codigo
        CROSS JOIN LATERAL (VALUES ('es', etiquetas.etiqueta_es), ('en', etiquetas.etiqueta_en)) idioma(codigo_idioma, etiqueta)
      )
      INSERT INTO configuracion.parametros_traducciones
        (id_parametros_traducciones, fid_parametros, codigo_idioma, etiqueta, created_by, updated_by)
      SELECT gen_random_uuid(), id_parametros, codigo_idioma, etiqueta, 'seed', 'seed'
      FROM traducciones
      ON CONFLICT (fid_parametros, codigo_idioma) DO UPDATE SET
        etiqueta = EXCLUDED.etiqueta, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    await tx.$executeRaw`
      INSERT INTO configuracion.especies_animales
        (id_especies_animales, codigo, nombre_es, nombre_en, nombre_cientifico, orden, estado, created_by, updated_by)
      VALUES
        (gen_random_uuid(), 'canino', 'Canino', 'Canine', 'Canis lupus familiaris', 10, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'felino', 'Felino', 'Feline', 'Felis catus', 20, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'ave', 'Ave', 'Bird', NULL, 30, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'lagomorfo', 'Lagomorfo', 'Lagomorph', NULL, 40, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'roedor', 'Roedor', 'Rodent', NULL, 50, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'reptil', 'Reptil', 'Reptile', NULL, 60, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'anfibio', 'Anfibio', 'Amphibian', NULL, 70, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'pez', 'Pez', 'Fish', NULL, 80, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'mustelido', 'Mustélido', 'Mustelid', NULL, 90, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'equino', 'Equino', 'Equine', 'Equus', 100, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'bovino', 'Bovino', 'Bovine', 'Bos taurus', 110, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'ovino', 'Ovino', 'Ovine', 'Ovis aries', 120, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'caprino', 'Caprino', 'Caprine', 'Capra hircus', 130, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'porcino', 'Porcino', 'Porcine', 'Sus scrofa domesticus', 140, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'camelido', 'Camélido sudamericano', 'South American camelid', NULL, 150, 1, 'seed', 'seed'),
        (gen_random_uuid(), 'otro', 'Otro', 'Other', NULL, 999, 1, 'seed', 'seed')
      ON CONFLICT (codigo) DO UPDATE SET
        nombre_es = EXCLUDED.nombre_es, nombre_en = EXCLUDED.nombre_en,
        nombre_cientifico = EXCLUDED.nombre_cientifico, orden = EXCLUDED.orden,
        estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    await tx.$executeRaw`
      WITH tipos(especie, codigo, nombre_es, nombre_en, nombre_cientifico, orden) AS (
        VALUES
          ('canino', 'perro_domestico', 'Perro doméstico', 'Domestic dog', 'Canis lupus familiaris', 10),
          ('felino', 'gato_domestico', 'Gato doméstico', 'Domestic cat', 'Felis catus', 10),
          ('ave', 'psitacido', 'Loro, perico o guacamayo', 'Parrot, parakeet or macaw', 'Psittaciformes', 10),
          ('ave', 'canario', 'Canario', 'Canary', 'Serinus canaria domestica', 20),
          ('ave', 'pinzon', 'Pinzón', 'Finch', 'Fringillidae', 30),
          ('ave', 'paloma', 'Paloma', 'Pigeon or dove', 'Columbidae', 40),
          ('ave', 'ave_corral', 'Ave de corral', 'Poultry', 'Galliformes / Anseriformes', 50),
          ('lagomorfo', 'conejo_domestico', 'Conejo doméstico', 'Domestic rabbit', 'Oryctolagus cuniculus domesticus', 10),
          ('roedor', 'cobayo', 'Cobayo / cuy', 'Guinea pig', 'Cavia porcellus', 10),
          ('roedor', 'hamster', 'Hámster', 'Hamster', 'Cricetinae', 20),
          ('roedor', 'chinchilla', 'Chinchilla', 'Chinchilla', 'Chinchilla lanigera', 30),
          ('roedor', 'rata', 'Rata doméstica', 'Domestic rat', 'Rattus norvegicus domestica', 40),
          ('roedor', 'raton', 'Ratón doméstico', 'Domestic mouse', 'Mus musculus', 50),
          ('roedor', 'jerbo', 'Jerbo', 'Gerbil', 'Meriones unguiculatus', 60),
          ('reptil', 'tortuga', 'Tortuga', 'Turtle or tortoise', 'Testudines', 10),
          ('reptil', 'serpiente', 'Serpiente', 'Snake', 'Serpentes', 20),
          ('reptil', 'lagarto', 'Lagarto', 'Lizard', 'Lacertilia', 30),
          ('reptil', 'iguana', 'Iguana', 'Iguana', 'Iguana iguana', 40),
          ('anfibio', 'rana', 'Rana', 'Frog', 'Anura', 10),
          ('anfibio', 'sapo', 'Sapo', 'Toad', 'Bufonidae', 20),
          ('anfibio', 'salamandra', 'Salamandra', 'Salamander', 'Caudata', 30),
          ('pez', 'agua_dulce', 'Pez de agua dulce', 'Freshwater fish', NULL, 10),
          ('pez', 'agua_marina', 'Pez marino', 'Marine fish', NULL, 20),
          ('mustelido', 'huron_domestico', 'Hurón doméstico', 'Domestic ferret', 'Mustela putorius furo', 10),
          ('equino', 'caballo', 'Caballo', 'Horse', 'Equus caballus', 10),
          ('equino', 'burro', 'Burro', 'Donkey', 'Equus asinus', 20),
          ('equino', 'mula', 'Mula', 'Mule', NULL, 30),
          ('bovino', 'ganado_vacuno', 'Ganado vacuno', 'Cattle', 'Bos taurus', 10),
          ('ovino', 'oveja', 'Oveja', 'Sheep', 'Ovis aries', 10),
          ('caprino', 'cabra', 'Cabra', 'Goat', 'Capra hircus', 10),
          ('porcino', 'cerdo', 'Cerdo', 'Pig', 'Sus scrofa domesticus', 10),
          ('porcino', 'minipig', 'Cerdo miniatura', 'Miniature pig', 'Sus scrofa domesticus', 20),
          ('camelido', 'alpaca', 'Alpaca', 'Alpaca', 'Vicugna pacos', 10),
          ('camelido', 'llama', 'Llama', 'Llama', 'Lama glama', 20),
          ('otro', 'otro', 'Otro', 'Other', NULL, 999)
      )
      INSERT INTO configuracion.subespecies_animales
        (id_subespecies_animales, fid_especies_animales, codigo, nombre_es, nombre_en,
         nombre_cientifico, orden, estado, created_by, updated_by)
      SELECT gen_random_uuid(), especie.id_especies_animales, tipos.codigo,
             tipos.nombre_es, tipos.nombre_en, tipos.nombre_cientifico, tipos.orden,
             1, 'seed', 'seed'
      FROM tipos
      JOIN configuracion.especies_animales especie ON especie.codigo = tipos.especie
      ON CONFLICT (fid_especies_animales, codigo) DO UPDATE SET
        nombre_es = EXCLUDED.nombre_es, nombre_en = EXCLUDED.nombre_en,
        nombre_cientifico = EXCLUDED.nombre_cientifico, orden = EXCLUDED.orden,
        estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    await tx.$executeRaw`
      WITH razas(especie, codigo, nombre_es, nombre_en, orden) AS (
        VALUES
          ('canino', 'mestizo', 'Mestizo', 'Mixed breed', 10),
          ('canino', 'sin_raza_definida', 'Sin raza definida', 'Unknown breed', 20),
          ('canino', 'labrador_retriever', 'Labrador retriever', 'Labrador Retriever', 30),
          ('canino', 'golden_retriever', 'Golden retriever', 'Golden Retriever', 40),
          ('canino', 'pastor_aleman', 'Pastor alemán', 'German Shepherd Dog', 50),
          ('canino', 'bulldog_frances', 'Bulldog francés', 'French Bulldog', 60),
          ('canino', 'caniche', 'Caniche / poodle', 'Poodle', 70),
          ('canino', 'schnauzer', 'Schnauzer', 'Schnauzer', 80),
          ('canino', 'shih_tzu', 'Shih tzu', 'Shih Tzu', 90),
          ('canino', 'chihuahua', 'Chihuahua', 'Chihuahua', 100),
          ('canino', 'beagle', 'Beagle', 'Beagle', 110),
          ('canino', 'rottweiler', 'Rottweiler', 'Rottweiler', 120),
          ('canino', 'boxer', 'Bóxer', 'Boxer', 130),
          ('canino', 'husky_siberiano', 'Husky siberiano', 'Siberian Husky', 140),
          ('canino', 'dachshund', 'Dachshund / perro salchicha', 'Dachshund', 150),
          ('canino', 'yorkshire_terrier', 'Yorkshire terrier', 'Yorkshire Terrier', 160),
          ('canino', 'pug', 'Pug', 'Pug', 170),
          ('canino', 'border_collie', 'Border collie', 'Border Collie', 180),
          ('canino', 'perro_sin_pelo_peru', 'Perro sin pelo del Perú', 'Peruvian Hairless Dog', 190),
          ('felino', 'mestizo', 'Mestizo', 'Mixed breed', 10),
          ('felino', 'sin_raza_definida', 'Sin raza definida', 'Unknown breed', 20),
          ('felino', 'persa', 'Persa', 'Persian', 30),
          ('felino', 'siames', 'Siamés', 'Siamese', 40),
          ('felino', 'maine_coon', 'Maine coon', 'Maine Coon', 50),
          ('felino', 'bengala', 'Bengala', 'Bengal', 60),
          ('felino', 'britanico_pelo_corto', 'Británico de pelo corto', 'British Shorthair', 70),
          ('felino', 'ragdoll', 'Ragdoll', 'Ragdoll', 80),
          ('felino', 'sphynx', 'Sphynx', 'Sphynx', 90),
          ('felino', 'abisinio', 'Abisinio', 'Abyssinian', 100)
      )
      INSERT INTO configuracion.razas_animales
        (id_razas_animales, fid_especies_animales, codigo, nombre_es, nombre_en,
         orden, estado, created_by, updated_by)
      SELECT gen_random_uuid(), especie.id_especies_animales, razas.codigo,
             razas.nombre_es, razas.nombre_en, razas.orden, 1, 'seed', 'seed'
      FROM razas
      JOIN configuracion.especies_animales especie ON especie.codigo = razas.especie
      ON CONFLICT (fid_especies_animales, codigo) DO UPDATE SET
        nombre_es = EXCLUDED.nombre_es, nombre_en = EXCLUDED.nombre_en,
        orden = EXCLUDED.orden, estado = 1,
        updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    // PostgreSQL ya publica el catálogo IANA instalado en el servidor. Lo usamos
    // como fuente de verdad para no mantener una lista parcial de zonas horarias.
    await tx.$executeRaw`
      INSERT INTO system.zonas_horarias (id_zonas_horarias, nombre_iana, estado, created_by, updated_by)
      SELECT gen_random_uuid(), name, 1, 'seed', 'seed'
      FROM pg_timezone_names
      WHERE name !~ '^(posix|right)/'
        AND name NOT IN ('Factory', 'localtime', 'posixrules')
      ON CONFLICT (nombre_iana) DO UPDATE
      SET estado = 1, updated_at = CURRENT_TIMESTAMP, updated_by = 'seed'
    `;

    // Permisos y módulos son datos maestros de las migraciones: el seed solo
    // los asigna. Así no puede iniciar una base con un catálogo incompleto.
    const permisos = await tx.permisos.findMany({ where: { estado: 1 } });
    const modulos = await tx.modulos.findMany({
      where: { estado: 1 },
      select: { id_modulos: true },
    });
    if (permisos.length === 0 || modulos.length === 0) {
      throw new Error(
        "Falta el catálogo de módulos o permisos; ejecuta las migraciones antes del seed",
      );
    }

    // El plan SYSTEM se construye desde el catálogo vigente, no desde una lista
    // en código. El resto de planes conserva su configuración comercial propia.
    await tx.planes_modulos.updateMany({
      where: { fid_planes: planSistema.id_planes },
      data: { estado: 0 },
    });
    for (const modulo of modulos) {
      await tx.planes_modulos.upsert({
        where: {
          fid_planes_fid_modulos: {
            fid_planes: planSistema.id_planes,
            fid_modulos: modulo.id_modulos,
          },
        },
        update: { estado: 1 },
        create: {
          fid_planes: planSistema.id_planes,
          fid_modulos: modulo.id_modulos,
          estado: 1,
        },
      });
    }

    // 4. Rol SUPERADMIN global, con TODOS los permisos.
    const rolExistente = await tx.roles.findFirst({
      where: {
        codigo: "SUPERADMIN",
        eliminado_en: null,
      },
      select: { id_roles: true },
    });
    const datosSuperadministrador = {
      nombre: "Superadministrador",
      icono: "shield-check",
      descripcion: "Administra la configuración global de la plataforma.",
      asignable_por_empresa: false,
      estado: 1,
    };
    const rol = rolExistente
      ? await tx.roles.update({
          where: { id_roles: rolExistente.id_roles },
          data: datosSuperadministrador,
        })
      : await tx.roles.create({
          data: {
            codigo: "SUPERADMIN",
            ...datosSuperadministrador,
          },
        });

    for (const permiso of permisos) {
      await tx.roles_permisos.upsert({
        where: {
          fid_roles_fid_permisos: {
            fid_roles: rol.id_roles,
            fid_permisos: permiso.id_permisos,
          },
        },
        // El seed es idempotente: un permiso que se desactivó antes vuelve a
        // quedar asignado al SUPERADMIN al ejecutar el seed.
        update: { estado: 1 },
        create: {
          fid_roles: rol.id_roles,
          fid_permisos: permiso.id_permisos,
          estado: 1,
        },
      });
    }

    const permisosEmpresa = permisos.filter(
      (permiso) =>
        ["companyProfile.read", "companyProfile.update"].includes(
          permiso.codigo,
        ) ||
        permiso.codigo.startsWith("profile.") ||
        permiso.codigo.startsWith("administrator.company.") ||
        permiso.codigo.startsWith("administrator.services.") ||
        permiso.codigo.startsWith("administrator.consultation_reasons.") ||
        permiso.codigo.startsWith("administrator.vaccines.") ||
        permiso.codigo.startsWith("administrator.hospitalization_types.") ||
        permiso.codigo.startsWith("administrator.procedures.") ||
        permiso.codigo.startsWith("administrator.laboratory_tests.") ||
        permiso.codigo.startsWith("clinic."),
    );
    const administradorExistente = await tx.roles.findFirst({
      where: {
        codigo: "ADMIN",
        eliminado_en: null,
      },
      select: { id_roles: true },
    });
    const datosAdministrador = {
      nombre: "Administrador",
      icono: "user-cog",
      descripcion: "Administra únicamente su propia organización.",
      asignable_por_empresa: true,
      estado: 1,
    };
    const rolAdministrador = administradorExistente
      ? await tx.roles.update({
          where: { id_roles: administradorExistente.id_roles },
          data: datosAdministrador,
        })
      : await tx.roles.create({
          data: {
            codigo: "ADMIN",
            ...datosAdministrador,
          },
        });
    for (const permiso of permisosEmpresa) {
      await tx.roles_permisos.upsert({
        where: {
          fid_roles_fid_permisos: {
            fid_roles: rolAdministrador.id_roles,
            fid_permisos: permiso.id_permisos,
          },
        },
        update: { estado: 1 },
        create: {
          fid_roles: rolAdministrador.id_roles,
          fid_permisos: permiso.id_permisos,
        },
      });
    }

    // 5. Primer usuario (superadmin) con su persona, credencial y rol.
    const existente = await tx.usuarios.findFirst({
      where: {
        fid_organizaciones: organizacion.id_organizaciones,
        usuario: SUPERADMIN_USUARIO,
        eliminado_en: null,
      },
    });

    let usuario = existente;
    if (!usuario) {
      const persona = await tx.personas.create({
        data: {
          fid_organizaciones: organizacion.id_organizaciones,
          nombres: "Super",
          apellido_paterno: "Admin",
        },
      });

      usuario = await tx.usuarios.create({
        data: {
          fid_personas: persona.id_personas,
          fid_organizaciones: organizacion.id_organizaciones,
          usuario: SUPERADMIN_USUARIO,
          estado_cuenta: "activo",
        },
      });
    } else {
      await tx.personas.update({
        where: { id_personas: usuario.fid_personas },
        data: { nombres: "Super", apellido_paterno: "Admin", estado: 1 },
      });
      usuario = await tx.usuarios.update({
        where: { id_usuarios: usuario.id_usuarios },
        data: {
          usuario: SUPERADMIN_USUARIO,
          estado_cuenta: "activo",
          intentos_fallidos: 0,
          bloqueado_hasta: null,
          estado: 1,
        },
      });
    }

    const correoNormalizado = SUPERADMIN_CORREO.toLowerCase();
    let correoPropietario = await tx.personas_correos.findFirst({
      where: {
        fid_organizaciones: organizacion.id_organizaciones,
        correo: correoNormalizado,
        estado: 1,
      },
    });
    if (
      correoPropietario &&
      correoPropietario.fid_personas !== usuario.fid_personas
    ) {
      throw new Error(
        "SUPERADMIN_EMAIL ya pertenece a otra persona activa de la organización",
      );
    }
    correoPropietario ??= await tx.personas_correos.findFirst({
      where: {
        fid_personas: usuario.fid_personas,
        fid_organizaciones: organizacion.id_organizaciones,
        correo: correoNormalizado,
        estado: 0,
      },
      orderBy: { updated_at: "desc" },
    });
    if (correoPropietario) {
      correoPropietario = await tx.personas_correos.update({
        where: { id_personas_correos: correoPropietario.id_personas_correos },
        data: {
          verificado_en: reloj.ahora,
          estado: 1,
          updated_by: usuario.id_usuarios,
        },
      });
    } else {
      correoPropietario = await tx.personas_correos.create({
        data: {
          fid_personas: usuario.fid_personas,
          fid_organizaciones: organizacion.id_organizaciones,
          correo: correoNormalizado,
          verificado_en: reloj.ahora,
          created_by: usuario.id_usuarios,
          updated_by: usuario.id_usuarios,
        },
      });
    }

    await tx.personas_correos_usos.upsert({
      where: {
        fid_personas_tipo: {
          fid_personas: usuario.fid_personas,
          tipo: "principal",
        },
      },
      update: {
        fid_personas_correos: correoPropietario.id_personas_correos,
        estado: 1,
        updated_by: usuario.id_usuarios,
      },
      create: {
        fid_personas: usuario.fid_personas,
        fid_personas_correos: correoPropietario.id_personas_correos,
        tipo: "principal",
        created_by: usuario.id_usuarios,
        updated_by: usuario.id_usuarios,
      },
    });
    await tx.personas_correos_usos.updateMany({
      where: {
        fid_personas: usuario.fid_personas,
        tipo: { in: ["mensajes", "respaldo"] },
        estado: 1,
      },
      data: { estado: 0, updated_by: usuario.id_usuarios },
    });

    const credencial = await tx.credenciales.findFirst({
      where: { fid_usuarios: usuario.id_usuarios, tipo: "contrasenia" },
      select: { id_credenciales: true },
    });
    if (credencial) {
      await tx.credenciales.update({
        where: { id_credenciales: credencial.id_credenciales },
        data: { hash_contrasenia: hashContrasenia, estado: 1 },
      });
    } else {
      await tx.credenciales.create({
        data: {
          fid_usuarios: usuario.id_usuarios,
          tipo: "contrasenia",
          hash_contrasenia: hashContrasenia,
        },
      });
    }

    // El seed establece una credencial base conocida; su historial anterior ya no
    // representa esa línea de cambios y se limpia para mantener una base coherente.
    await tx.historial_contrasenias.deleteMany({
      where: { fid_usuarios: usuario.id_usuarios },
    });

    await tx.usuarios_roles.upsert({
      where: {
        fid_usuarios_fid_roles: {
          fid_usuarios: usuario.id_usuarios,
          fid_roles: rol.id_roles,
        },
      },
      update: { estado: 1 },
      create: { fid_usuarios: usuario.id_usuarios, fid_roles: rol.id_roles },
    });

    // SUPERADMIN hereda el catálogo desde su rol. Esta tabla conserva solo
    // excepciones personales, por lo que el seed retira cualquier excepción.
    await tx.usuarios_permisos.updateMany({
      where: { fid_usuarios: usuario.id_usuarios },
      data: { estado: 0, updated_by: "seed" },
    });

    // La vigencia resumida de la organización siempre tiene su respaldo en el
    // historial de renovaciones. El seed conserva un único registro técnico.
    const renovacionSistema = await tx.renovaciones.findFirst({
      where: {
        fid_organizaciones: organizacion.id_organizaciones,
        metodo_pago: "sistema",
      },
      orderBy: { created_at: "desc" },
      select: { id_renovaciones: true },
    });
    const datosRenovacionSistema = {
      fid_planes: planSistema.id_planes,
      fecha_inicio: fechaInicia,
      fecha_fin: fechaExpira,
      monto: null,
      metodo_pago: "sistema",
      created_by: usuario.id_usuarios,
    };
    if (renovacionSistema) {
      await tx.renovaciones.update({
        where: { id_renovaciones: renovacionSistema.id_renovaciones },
        data: datosRenovacionSistema,
      });
    } else {
      await tx.renovaciones.create({
        data: {
          fid_organizaciones: organizacion.id_organizaciones,
          ...datosRenovacionSistema,
        },
      });
    }

    // 6. Preferencias iniciales del propietario. Los UUID salen de los catálogos
    // globales; no se guardan códigos sueltos que puedan quedar inconsistentes.
    const pais = peru;
    const zonaHoraria = await tx.zonas_horarias.upsert({
      where: { nombre_iana: "America/Lima" },
      update: { estado: 1 },
      create: { nombre_iana: "America/Lima", estado: 1 },
    });
    if (
      !pais ||
      pais.estado !== 1 ||
      !zonaHoraria ||
      zonaHoraria.estado !== 1
    ) {
      throw new Error("Faltan los catálogos activos de Perú o America/Lima");
    }

    await tx.preferencias_usuario.upsert({
      where: { fid_usuarios: usuario.id_usuarios },
      update: {
        fid_admin_level_0: pais.id_admin_level_0,
        fid_zonas_horarias: zonaHoraria.id_zonas_horarias,
        estado: 1,
        updated_by: usuario.id_usuarios,
      },
      create: {
        fid_usuarios: usuario.id_usuarios,
        fid_admin_level_0: pais.id_admin_level_0,
        fid_zonas_horarias: zonaHoraria.id_zonas_horarias,
        created_by: usuario.id_usuarios,
        updated_by: usuario.id_usuarios,
      },
    });
  });

  console.log(`✔ seed listo`);
  console.log(`  organización: ${ORG_SLUG}`);
  console.log(`  superadmin:   ${SUPERADMIN_USUARIO}`);
  console.log("  maestros:     parámetros y zonas horarias restaurados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
