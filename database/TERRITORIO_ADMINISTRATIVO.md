# Jerarquía territorial global

La base usa nombres universales y conserva los nombres locales únicamente como etiquetas de presentación.

## Modelo

- `configuracion.admin_level_0`: país identificado por ISO 3166-1 alfa-2.
- `configuracion.admin_level_1`: primera división administrativa del país.
- `configuracion.admin_level_2`: segunda división, cuando el país la utiliza.
- `configuracion.admin_level_3`: división local. `fid_admin_level_2` es nullable para países que pasan directamente de Level 1 a Level 3.

La pertenencia se protege con llaves foráneas jerárquicas. En Level 3, la FK compuesta evita asociar un Level 2 perteneciente a otra rama. Los códigos son únicos dentro de su padre, no globalmente.

## Etiquetas por país

- Perú: Departamento → Provincia → Distrito.
- México: Estado → (sin Level 2) → Municipio/Alcaldía.

Las columnas `etiqueta_admin_level_1`, `etiqueta_admin_level_2` y `etiqueta_admin_level_3` permiten que el frontend muestre estos nombres sin alterar el modelo universal.

## Persona

Se guardan dos ubicaciones independientes:

- procedencia: país y Level 3;
- residencia actual: país, Level 3, dirección y referencia.

Dos restricciones exigen que país y Level 3 estén ambos presentes o ambos vacíos. Los campos usan sufijo `_procedencia` y `_residencia`, sin confundir procedencia con nacimiento. El caso de uso de Datos personales comprueba dentro de su transacción que cada Level 3 activo pertenezca al país activo indicado. No existe trigger territorial: una escritura manual queda bajo responsabilidad explícita de quien la ejecute.

## Consulta

`FuenteDatosCatalogoTerritorialPrisma.listarJerarquiaAdministrativa()` obtiene los cuatro niveles activos. La página de Datos personales la ejecuta durante SSR junto con persona y parámetros; el navegador recibe la vista ya hidratada y no hace una consulta posterior para completar los selectores.

## Datos iniciales

- Perú conserva sus 25 departamentos, 196 provincias y 1892 distritos con los UUID existentes.
- El seed incluye México, Ciudad de México y tres alcaldías de prueba con Level 2 nulo, demostrando el salto soportado por el modelo.

DDL base aplicado en `20260802160000_global_admin_levels_person_locations`; simplificación y nombres finales en `20260802180000_remove_person_city_fields` y `20260802181000_rename_person_origin_fields`.
