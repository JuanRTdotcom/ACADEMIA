# Sumaq System

SaaS multi-tenant para la gestión de veterinarias. El backend usa NestJS, Prisma y PostgreSQL; el frontend usa SvelteKit.

## Política de imágenes

Los límites de salida se aplican después de validar el archivo real, corregir su orientación, retirar metadatos y procesarlo con Sharp. Los originales no se guardan: R2 recibe únicamente la versión normalizada.

| Recurso | Entrada máxima | Formatos de entrada | Salida | Peso final máximo |
| --- | ---: | --- | --- | ---: |
| Avatar de usuario | 3 MB | JPG, JPEG, PNG | JPEG 100×100 px | 10 KB |
| Fotografía de mascota | 3 MB | JPG, JPEG, PNG, WebP | JPEG 130×130 px | 10 KB |
| Adjuntos de consulta | 10 MB por archivo (máximo 10) | JPG, JPEG, PNG, WebP, PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, ODT/ODS/ODP | Imágenes: JPEG con dimensiones originales; documentos: archivo original | Imágenes con calidad 75 % |
| Escudo claro/oscuro | 3 MB | PNG | PNG 256×256 px | 40 KB |
| Logo/imagotipo claro/oscuro | 3 MB | PNG | PNG 640×200 px | 80 KB |
| Escudo de login claro/oscuro | 3 MB | PNG | PNG 256×256 px | 40 KB |
| Portada de login | 3 MB | JPG, JPEG | WebP 1280×1920 px | 100 KB |

`AVATAR_MAX_BYTES=3145728` controla la entrada de avatar y fotografía de mascota. `COMPANY_MEDIA_MAX_BYTES=3145728` controla identidad visual y portada. `ATTENTION_ATTACHMENT_MAX_BYTES=10485760` y `ATTENTION_ATTACHMENT_MAX_FILES=10` controlan los adjuntos clínicos; `ATTENTION_ATTACHMENT_CACHE_TTL_SECONDS=86400` mantiene su caché privada inmutable por un día. Backend y frontend validan los mismos límites y el arranque falla si el entorno no coincide.

## Documentación técnica

- [Backend](backend/README.md)
- [Frontend](frontend/README.md)
- [Estado operativo](PROJECT_STATE.md)
- [Convenciones backend](backend/CONVENTIONS.md)
- [Lineamientos de formularios](LINEAMIENTOS_FORMULARIOS.md)
