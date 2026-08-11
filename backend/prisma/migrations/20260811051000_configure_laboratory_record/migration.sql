UPDATE configuracion.tipos_registro_atencion
SET campos = '[
  {"clave":"fecha","etiqueta_es":"Fecha","etiqueta_en":"Date","tipo":"date","requerido":true},
  {"clave":"pruebas","etiqueta_es":"Pruebas de laboratorio","etiqueta_en":"Laboratory tests","tipo":"list","requerido":true,"max_items":20,"campos":[
    {"clave":"fid_usuarios_profesional","etiqueta_es":"Profesional","etiqueta_en":"Professional","tipo":"uuid","fuente":"usuarios_organizacion","requerido":true},
    {"clave":"fid_pruebas_laboratorio","etiqueta_es":"Prueba / examen","etiqueta_en":"Test / exam","tipo":"uuid","fuente":"pruebas_laboratorio","requerido":true},
    {"clave":"cantidad","etiqueta_es":"Cantidad","etiqueta_en":"Quantity","tipo":"number","requerido":true,"min":1,"max":999},
    {"clave":"cantidad_adjuntos","etiqueta_es":"Resultados adjuntos","etiqueta_en":"Attached results","tipo":"number","requerido":true,"min":0,"max":5}
  ]},
  {"clave":"diagnostico_presuntivo","etiqueta_es":"Diagnóstico presuntivo","etiqueta_en":"Presumptive diagnosis","tipo":"textarea","requerido":false,"max":4000}
]'::jsonb, acepta_adjuntos = true, max_adjuntos = 10, updated_at = CURRENT_TIMESTAMP, updated_by = 'migration'
WHERE codigo = 'laboratorio';
