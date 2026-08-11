ALTER TABLE configuracion.modulos
  ADD COLUMN descripcion VARCHAR(250);

UPDATE configuracion.modulos
SET descripcion = CASE codigo
  WHEN 'dashboard' THEN 'Muestra un resumen general de la actividad y los accesos principales del sistema.'
  WHEN 'superadmin.companies' THEN 'Administra las veterinarias registradas en la plataforma.'
  WHEN 'superadmin.users' THEN 'Administra las cuentas de usuario de toda la plataforma.'
  WHEN 'superadmin.roles' THEN 'Define roles y sus permisos base para clasificar usuarios.'
  WHEN 'superadmin.countries' THEN 'Gestiona el catálogo de países utilizado por la plataforma.'
  WHEN 'superadmin.plans' THEN 'Configura los planes y los módulos incluidos en cada uno.'
  WHEN 'superadmin.subscriptions' THEN 'Consulta y administra las suscripciones de las veterinarias.'
  WHEN 'administrator.company.general' THEN 'Administra la información general y profesional de la veterinaria.'
  WHEN 'administrator.company.contact' THEN 'Configura la dirección, ubicación en mapa y datos de contacto.'
  WHEN 'administrator.company.services' THEN 'Define las especies atendidas y el precio de la consulta general.'
  WHEN 'administrator.company.agenda' THEN 'Configura horarios, turnos, duración de citas y disponibilidad de agenda.'
  WHEN 'administrator.company.fiscal' THEN 'Administra los datos fiscales utilizados para facturación.'
  WHEN 'administrator.company.digital_presence' THEN 'Gestiona enlaces, sitio web y presencia digital de la veterinaria.'
  WHEN 'administrator.company.identity' THEN 'Configura logotipos, colores y recursos de identidad visual.'
  WHEN 'administrator.company.login_branding' THEN 'Personaliza la apariencia del inicio de sesión de la veterinaria.'
  WHEN 'administrator.company.communications' THEN 'Configura los medios y datos utilizados para comunicarse con clientes.'
  WHEN 'administrator.company.region' THEN 'Define idioma, zona horaria, región y moneda de trabajo.'
  WHEN 'administrator.company.subscription' THEN 'Consulta el plan contratado y la vigencia de la suscripción.'
  WHEN 'administrator.users' THEN 'Administra cuentas, roles y acceso por módulos del personal.'
  WHEN 'profile.personal' THEN 'Permite consultar y actualizar la información personal del usuario.'
  WHEN 'profile.authentication' THEN 'Permite administrar la contraseña y las opciones de acceso de la cuenta.'
  WHEN 'profile.emails' THEN 'Permite registrar y administrar los correos asociados al usuario.'
  WHEN 'profile.sessions' THEN 'Permite consultar y cerrar las sesiones activas del usuario.'
  WHEN 'profile.privacy' THEN 'Permite administrar las preferencias de privacidad de la cuenta.'
  WHEN 'profile.nationalities' THEN 'Permite registrar y administrar las nacionalidades del profesional.'
  WHEN 'profile.phones' THEN 'Permite registrar y administrar los teléfonos del usuario.'
  WHEN 'profile.documents' THEN 'Permite registrar y administrar los documentos del profesional.'
  WHEN 'profile.studies' THEN 'Permite registrar y administrar los estudios y grados profesionales.'
  WHEN 'profile.appearance' THEN 'Permite personalizar apariencia, idioma y configuración regional.'
  WHEN 'profile.notifications' THEN 'Permite configurar las preferencias de notificaciones.'
  WHEN 'profile.activity' THEN 'Permite consultar la actividad reciente de la cuenta.'
  WHEN 'profile.help' THEN 'Permite acceder a la información de ayuda del sistema.'
  WHEN 'profile.legal' THEN 'Permite consultar la información legal de la plataforma.'
  WHEN 'resources' THEN 'Muestra los recursos y componentes de interfaz disponibles.'
  ELSE 'Permite acceder al módulo ' || nombre || '.'
END;

ALTER TABLE configuracion.modulos
  ALTER COLUMN descripcion SET NOT NULL;
