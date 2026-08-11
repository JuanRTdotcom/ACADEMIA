UPDATE configuracion.modulos AS hijo
SET fid_modulos_padre = padre.id_modulos,
    updated_at = CURRENT_TIMESTAMP
FROM configuracion.modulos AS padre
WHERE padre.codigo = 'administrator.company.general'
  AND hijo.codigo LIKE 'administrator.company.%'
  AND hijo.codigo <> padre.codigo;

UPDATE configuracion.modulos
SET descripcion = 'Administra toda la configuración de la veterinaria: información general, ubicación, atención, agenda, perfil fiscal, identidad, comunicaciones, internacionalización y suscripción.',
    updated_at = CURRENT_TIMESTAMP
WHERE codigo = 'administrator.company.general';
