UPDATE configuracion.tipos_registro_atencion
SET descripcion_es = 'Diagnóstico presuntivo, medicamentos indicados y observaciones.',
    descripcion_en = 'Presumptive diagnosis, prescribed medications and observations.',
    campos = '[
      {
        "clave":"diagnostico_presuntivo",
        "etiqueta_es":"Diagnóstico presuntivo",
        "etiqueta_en":"Presumptive diagnosis",
        "tipo":"textarea",
        "requerido":true,
        "max":4000
      },
      {
        "clave":"medicamentos",
        "etiqueta_es":"Medicamentos",
        "etiqueta_en":"Medications",
        "tipo":"list",
        "requerido":false,
        "max_items":30,
        "campos":[
          {"clave":"medicamento","etiqueta_es":"Medicamento","etiqueta_en":"Medication","tipo":"text","requerido":true,"max":160},
          {"clave":"presentacion","etiqueta_es":"Presentación","etiqueta_en":"Presentation","tipo":"text","requerido":false,"max":120},
          {"clave":"cantidad","etiqueta_es":"Cantidad","etiqueta_en":"Quantity","tipo":"text","requerido":false,"max":80},
          {"clave":"posologia","etiqueta_es":"Posología","etiqueta_en":"Dosage instructions","tipo":"textarea","requerido":false,"max":1000}
        ]
      },
      {
        "clave":"observaciones",
        "etiqueta_es":"Observaciones",
        "etiqueta_en":"Observations",
        "tipo":"textarea",
        "requerido":false,
        "max":4000
      }
    ]'::jsonb,
    acepta_adjuntos = false,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 'migration'
WHERE codigo = 'formula_medica';
