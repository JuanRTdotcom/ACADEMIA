WITH procedimientos(nombre, descripcion_guia) AS (
  VALUES
    ('Abdominocentesis ecoguiada', 'Registrar la técnica empleada en abdominocentesis ecoguiada, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Ablación del conducto auditivo externo bilateral', 'Registrar la técnica empleada en ablación del conducto auditivo externo bilateral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Ablación del conducto auditivo externo unilateral', 'Registrar la técnica empleada en ablación del conducto auditivo externo unilateral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Abscesos o quistes prostáticos', 'Registrar la técnica empleada en abscesos o quistes prostáticos, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Adenopexia en sobre bilateral', 'Registrar la técnica empleada en adenopexia en sobre bilateral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Adenopexia en sobre unilateral', 'Registrar la técnica empleada en adenopexia en sobre unilateral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Amputación de cola no electiva', 'Registrar la técnica empleada en amputación de cola no electiva, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Amputación del pene', 'Registrar la técnica empleada en amputación del pene, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Amputación de falanges no electiva por causa patológica', 'Registrar la técnica empleada en amputación de falanges no electiva por causa patológica, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Artrocentesis con sedación', 'Registrar la técnica empleada en artrocentesis con sedación, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Artroscopia', 'Registrar la técnica empleada en artroscopia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Avulsión de cresta tibial', 'Registrar la técnica empleada en avulsión de cresta tibial, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia de cavidad oral', 'Registrar la técnica empleada en biopsia de cavidad oral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia de ganglio linfático', 'Registrar la técnica empleada en biopsia de ganglio linfático, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia de órgano abdominal', 'Registrar la técnica empleada en biopsia de órgano abdominal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia de piel con anestesia general', 'Registrar la técnica empleada en biopsia de piel con anestesia general, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia de piel con anestesia local', 'Registrar la técnica empleada en biopsia de piel con anestesia local, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Biopsia ósea con anestesia y aguja de Jamshidi', 'Registrar la técnica empleada en biopsia ósea con anestesia y aguja de jamshidi, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Blefaropexia temporal', 'Registrar la técnica empleada en blefaropexia temporal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Blefaroplastia unilateral de ambos párpados', 'Registrar la técnica empleada en blefaroplastia unilateral de ambos párpados, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Blefaroplastia bilateral de ambos párpados', 'Registrar la técnica empleada en blefaroplastia bilateral de ambos párpados, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Blefaroplastia bilateral de un párpado por ojo', 'Registrar la técnica empleada en blefaroplastia bilateral de un párpado por ojo, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Blefaroplastia de un párpado', 'Registrar la técnica empleada en blefaroplastia de un párpado, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Broncoscopia', 'Registrar la técnica empleada en broncoscopia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cirugía de cauda equina', 'Registrar la técnica empleada en cirugía de cauda equina, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cauterización de papilomas no orales', 'Registrar la técnica empleada en cauterización de papilomas no orales, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cesárea con ovariohisterectomía', 'Registrar la técnica empleada en cesárea con ovariohisterectomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cirugía de encía hipertrófica tumoral (épulis)', 'Registrar la técnica empleada en cirugía de encía hipertrófica tumoral (épulis), los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cistocentesis ecoguiada', 'Registrar la técnica empleada en cistocentesis ecoguiada, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Cistoscopia', 'Registrar la técnica empleada en cistoscopia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Colecistotomía', 'Registrar la técnica empleada en colecistotomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Colonoscopia', 'Registrar la técnica empleada en colonoscopia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Colopexia', 'Registrar la técnica empleada en colopexia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Colostomía', 'Registrar la técnica empleada en colostomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Corrección de torsión-vólvulo gástrico', 'Registrar la técnica empleada en corrección de torsión-vólvulo gástrico, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Corrección de paladar hendido', 'Registrar la técnica empleada en corrección de paladar hendido, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Corrección quirúrgica de prolapso vaginal con ovariohisterectomía', 'Registrar la técnica empleada en corrección quirúrgica de prolapso vaginal con ovariohisterectomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Craneotomía', 'Registrar la técnica empleada en craneotomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Criptorquidectomía abdominal', 'Registrar la técnica empleada en criptorquidectomía abdominal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extracción de cuerpo extraño en laringe', 'Registrar la técnica empleada en extracción de cuerpo extraño en laringe, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Derivación ventriculoperitoneal', 'Registrar la técnica empleada en derivación ventriculoperitoneal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Desinfección de herida (curación o limpieza)', 'Registrar la técnica empleada en desinfección de herida (curación o limpieza), los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Desinfección de herida con sedación', 'Registrar la técnica empleada en desinfección de herida con sedación, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Detartraje (profilaxis)', 'Registrar la técnica empleada en detartraje (profilaxis), los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Detartraje con enfermedad periodontal', 'Registrar la técnica empleada en detartraje con enfermedad periodontal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Drenaje de absceso de origen dental', 'Registrar la técnica empleada en drenaje de absceso de origen dental, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Drenaje del conducto nasolagrimal con sedación', 'Registrar la técnica empleada en drenaje del conducto nasolagrimal con sedación, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Endoscopia', 'Registrar la técnica empleada en endoscopia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Enteroanastomosis', 'Registrar la técnica empleada en enteroanastomosis, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Episiotomía', 'Registrar la técnica empleada en episiotomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Episiotomía y retiro de masa vaginal', 'Registrar la técnica empleada en episiotomía y retiro de masa vaginal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Esofagotomía', 'Registrar la técnica empleada en esofagotomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Eutanasia', 'Registrar la técnica empleada en eutanasia, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Excisión artroplástica de cabeza femoral en caninos', 'Registrar la técnica empleada en excisión artroplástica de cabeza femoral en caninos, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Excisión artroplástica de cabeza femoral en felinos', 'Registrar la técnica empleada en excisión artroplástica de cabeza femoral en felinos, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Excisión del paladar blando', 'Registrar la técnica empleada en excisión del paladar blando, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Excisión del paladar blando y corrección de narinas', 'Registrar la técnica empleada en excisión del paladar blando y corrección de narinas, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Excisión de masa en cavidad oral', 'Registrar la técnica empleada en excisión de masa en cavidad oral, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Exploración de senos paranasales', 'Registrar la técnica empleada en exploración de senos paranasales, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extirpación bilateral de glándulas adanales', 'Registrar la técnica empleada en extirpación bilateral de glándulas adanales, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extirpación unilateral de glándula adanal', 'Registrar la técnica empleada en extirpación unilateral de glándula adanal, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extirpación de quiste dermoide conjuntival', 'Registrar la técnica empleada en extirpación de quiste dermoide conjuntival, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extirpación de tejido linfoide del tercer párpado', 'Registrar la técnica empleada en extirpación de tejido linfoide del tercer párpado, los hallazgos, materiales utilizados, resultado y cuidados indicados.'),
    ('Extirpación de quiste dermoide con queratectomía', 'Registrar la técnica empleada en extirpación de quiste dermoide con queratectomía, los hallazgos, materiales utilizados, resultado y cuidados indicados.')
)
INSERT INTO nucleo.procedimientos_veterinarios (
  fid_organizaciones, nombre, descripcion_guia, estado, created_by, updated_by
)
SELECT organizacion.id_organizaciones, procedimiento.nombre,
       procedimiento.descripcion_guia, 1, 'migration', 'migration'
FROM nucleo.organizaciones organizacion
CROSS JOIN procedimientos procedimiento
WHERE organizacion.estado = 1
  AND organizacion.eliminado_en IS NULL
ON CONFLICT (fid_organizaciones, upper(btrim(nombre)))
  WHERE eliminado_en IS NULL
DO UPDATE SET
  descripcion_guia = EXCLUDED.descripcion_guia,
  estado = 1,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = 'migration';
