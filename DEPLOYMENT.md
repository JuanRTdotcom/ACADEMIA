# Checklist de despliegue

## Caché HTTP y Cloudflare

- Mantener el bucket R2 privado. El navegador accede a medios únicamente mediante las rutas controladas del sistema.
- No habilitar **Cache Everything** para el dominio completo ni para `/api`, páginas SSR o respuestas `__data.json`.
- HTML SSR, JSON, sesión, roles, permisos, preferencias, formularios, mutaciones y errores deben conservar `Cache-Control: private, no-store`.
- Solo pueden tener caché larga las imágenes 200 con URL inmutable y versionada: avatar, variantes clara/oscura de escudo e imagotipo, y portadas. La versión UUID debe coincidir con una referencia vigente en PostgreSQL.
- Una imagen reemplazada siempre genera una clave R2 y URL nuevas. No sobrescribir objetos existentes; así el navegador/CDN jamás confunde una versión antigua con la vigente.
- Escudo y portadas públicas del login pueden usar `public, max-age=31536000, immutable`. Medios que requieran sesión deben permanecer `private`.
- No cachear 401, 403, 404, 429 ni 5xx. Tampoco respuestas con MIME inesperado o sin versión válida.
- Si en el futuro se configura una regla de Cloudflare, limitarla a la expresión exacta de rutas versionadas `/media/...`; el comportamiento actual ya funciona con las cabeceras de origen y no necesita una regla global.
- Verificación posterior al despliegue: revisar `Cache-Control`, `ETag`, `Age`/`CF-Cache-Status`; confirmar que una URL de imagen repetida reutiliza caché y que una actualización genera otra URL; confirmar que páginas y JSON siguen mostrando siempre datos actuales.

## Medios institucionales

- Variable obligatoria: `COMPANY_MEDIA_MAX_BYTES=3145728` (3 MB de entrada).
- Escudo: entrada y salida PNG, 256 × 256, máximo 40 KB.
- Imagotipo: entrada JPG/JPEG y salida JPG, 640 × 200, máximo 80 KB.
- Portadas del login: salida WebP 1600 × 1000, máximo 250 KB cada una y máximo 6 activas por empresa.
- Formatos de entrada admitidos: JPG, JPEG, PNG y WebP estáticos. SVG, GIF, contenido animado, firmas falsas y archivos con más de 30 megapíxeles se rechazan.
- Confirmar permisos de escritura/lectura/eliminación del token R2 únicamente sobre el bucket previsto. Guardar credenciales en el gestor de secretos del entorno, nunca en PostgreSQL, frontend, logs ni repositorio.

## Red y proxy

- Configurar `adapter-node`, `ADDRESS_HEADER=x-forwarded-for` y `XFF_DEPTH` según la cantidad real de proxies.
- Verificar que auditoría y sesiones registran la IP pública del cliente, no la IP de Cloudflare o del proxy.
