# Perfil profesional, estudios y familia

## Tablas múltiples

El esquema `personas` separa datos repetibles de la fila principal:

- `personas_documentos`: tipo y número; admite varios documentos.
- `personas_nacionalidades`: relación con `configuracion.admin_level_0`.
- `personas_seguros`: compañía y número de seguro.
- `personas_telefonos`: tipo parametrizado, número, titular y uso de emergencia.
- `personas_hobbies`: hobby y frecuencia parametrizada.
- `personas_estudios_realizados`: periodo, estado en curso, nivel, grado y profesión.
- `personas_estudios_complementarios`: tipo parametrizado, institución y periodo.

Documento y teléfonos antiguos se migran antes de retirar sus columnas únicas de `personas.personas`. Fechas de estudios tienen restricciones: en curso exige `fecha_fin` nula; terminado exige fecha final igual o posterior al inicio.

## Parámetros

`configuracion.parametros` contiene `tipos_telefono`, `frecuencias_hobby` y `tipos_estudio_complementario`. Tipos de documento y niveles de instrucción conservan sus grupos existentes.

## Familia propuesta

La UI existe, pero relación aún no se persiste. Modelo recomendado:

- `personas_relaciones`: persona origen, persona destino, tipo de relación, estado, vigencia y aprobación.
- `tipos_relacion_persona` en parámetros: padre, madre, hijo, hija, apoderado, alumno, entre otros.
- Relación apoderado–alumno no concede acceso por sí sola. Una asignación adicional define alcance: ver cursos, asistencia, notas, pagos o comunicaciones.
- Ambas personas deben pertenecer a organización permitida. Altas sensibles requieren invitación o aprobación institucional, auditoría y posibilidad de revocación.
- Relaciones inversas se derivan (`padre` ↔ `hijo`) para evitar dos filas contradictorias.

Así un padre puede entrar con su propio usuario, seleccionar hijo autorizado y operar solo permisos concedidos, sin compartir credenciales.
