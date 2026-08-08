import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { PrismaClient } from "./generated/client/client";

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
  const [reloj] = await prisma.$queryRaw<{ ahora: Date }[]>`
    SELECT CURRENT_TIMESTAMP AS ahora
  `;
  if (!reloj) throw new Error("PostgreSQL no devolvió su tiempo actual");

  await prisma.$transaction(async (tx) => {
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
    const fechaInicia = new Date("2026-01-01T00:00:00Z");
    const fechaExpira = new Date("2100-12-31T23:59:59Z");
    const organizacion = organizacionExistente
      ? await tx.organizaciones.update({
          where: {
            id_organizaciones: organizacionExistente.id_organizaciones,
          },
          data: {
            nombre: ORG_NOMBRE,
            estado: 1,
            suscripcion_inicia_en: fechaInicia,
            suscripcion_expira_en: fechaExpira,
          },
        })
      : await tx.organizaciones.create({
          data: {
            slug: ORG_SLUG,
            nombre: ORG_NOMBRE,
            suscripcion_inicia_en: fechaInicia,
            suscripcion_expira_en: fechaExpira,
          },
        });

    // Datos base de la empresa propietaria. Pueden ampliarse luego desde Empresas.
    await tx.perfil_organizacion.upsert({
      where: { fid_organizaciones: organizacion.id_organizaciones },
      update: {
        razon_social: ORG_NOMBRE,
        correo_contacto: SUPERADMIN_CORREO,
        idioma_por_defecto: "es",
        zona_horaria_por_defecto: "America/Lima",
        estado: 1,
      },
      create: {
        fid_organizaciones: organizacion.id_organizaciones,
        razon_social: ORG_NOMBRE,
        correo_contacto: SUPERADMIN_CORREO,
        idioma_por_defecto: "es",
        zona_horaria_por_defecto: "America/Lima",
      },
    });

    // SUPERADMIN recibe todo permiso activo definido en PostgreSQL.
    const permisos = await tx.permisos.findMany({ where: { estado: 1 } });
    if (permisos.length === 0) {
      throw new Error("No existen permisos activos en seguridad.permisos");
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
        update: {},
        create: { fid_roles: rol.id_roles, fid_permisos: permiso.id_permisos },
      });
    }

    const permisosEmpresa = permisos.filter(
      (permiso) =>
        ["companyProfile.read", "companyProfile.update"].includes(permiso.codigo) ||
        permiso.codigo.startsWith("profile.") ||
        permiso.codigo.startsWith("administrator.company."),
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

    // 6. Preferencias iniciales del propietario. Los UUID salen de los catálogos
    // globales; no se guardan códigos sueltos que puedan quedar inconsistentes.
    const pais = peru;
    const zonaHoraria = await tx.zonas_horarias.findUnique({
      where: { nombre_iana: "America/Lima" },
      select: { id_zonas_horarias: true, estado: true },
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
  console.log("  maestros:     cargados exclusivamente desde PostgreSQL");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
