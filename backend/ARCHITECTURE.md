# Arquitectura del backend

El backend usa **Clean Architecture dentro de módulos NestJS**. Nest se limita a composición, transporte y adaptadores; cada feature conserva juntas sus reglas y casos de uso.

Los nombres estructurales de carpetas se escriben en inglés. El dominio, las clases, los métodos, los mensajes y la base de datos continúan en español.

## Dirección de dependencias

```text
presentation → domain ← data
                   ↑
             módulo Nest

Módulo Nest = raíz de composición que conecta contratos con implementaciones.
```

- `domain/entities/`: entidades, comandos y resultados del negocio.
- `domain/repositories/`: contratos abstractos que necesita el dominio.
- `domain/usecases/`: una clase por acción del sistema, con método `ejecutar()`.
- `data/datasources/`: consultas y transacciones directas con Prisma u otra fuente.
- `data/models/`: modelos propios de persistencia cuando hace falta transformar datos. No se duplican los tipos ya generados por Prisma sin necesidad.
- `data/repositories/`: implementaciones de los contratos; delegan en uno o más datasources y realizan el mapeo hacia entidades.
- `presentation/controllers/`: rutas y controladores Nest.
- `presentation/dto/`: validación de entradas HTTP.
- `presentation/guards/`, `decorators/` y `strategies/`: componentes HTTP adicionales cuando el feature los necesita.
- `*.module.ts`: único lugar que conoce contrato, implementación y datasource para conectarlos con DI.

No se crean carpetas vacías. Por ejemplo, `data/models/` aparece solo cuando existe un modelo que Prisma no representa adecuadamente o se requiere un mapeo explícito.

## Estructura de un feature

```text
feature/
├── data/
│   ├── datasources/
│   ├── models/          # solo cuando sea necesario
│   └── repositories/
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
├── presentation/
│   ├── controllers/
│   └── dto/
└── feature.module.ts
```

Autenticación agrega adaptadores propios:

```text
autenticacion/
├── data/
│   ├── datasources/
│   ├── repositories/
│   └── security/
└── presentation/
    ├── controllers/
    ├── decorators/
    ├── dto/
    ├── guards/
    └── strategies/
```

## Flujo real de una petición

```text
Controller HTTP
  → adapta Request a ContextoSolicitud
  → ejecuta CasoUso
  → CasoUso llama Repositorio abstracto del dominio
  → Nest resuelve Repositorio de data
  → Repositorio delega al Datasource Prisma
  → consulta/transacción + auditoría/evento
  → respuesta vuelve al Controller
```

El caso de uso nunca recibe `Request` de Express. `crearContextoSolicitud()` extrae únicamente host, IP y agente antes de entrar en dominio.

## Reglas obligatorias

1. Dominio no importa `data` ni `presentation`.
2. DTO y `Request` viven en presentación; el caso de uso recibe comandos propios.
3. Controlador depende de casos de uso, nunca de Prisma, datasources o implementaciones.
4. Caso de uso depende del contrato ubicado en `domain/repositories`.
5. Prisma, SQL y transacciones viven en `data/datasources`.
6. `data/repositories` implementa los contratos y convierte modelos a entidades cuando sea necesario.
7. Módulo Nest enlaza contrato e implementación con `{ provide, useExisting }`.
8. Una ruta nueva normalmente implica un caso de uso nuevo.
9. Código compartido solo pasa a `comun/` cuando lo consumen varios features.
10. No introducir carpetas globales de controllers/services/repositories; cada feature mantiene su cohesión.

## Ejemplo de DI

```ts
providers: [
  FuenteDatosEmpresasPrisma,
  RepositorioEmpresasDatos,
  { provide: RepositorioEmpresas, useExisting: RepositorioEmpresasDatos },
  CasoUsoListarEmpresas,
];
```

`CasoUsoListarEmpresas` conoce únicamente `RepositorioEmpresas`. `RepositorioEmpresasDatos` conoce el datasource. Solo el módulo Nest conecta las piezas.

## Verificación arquitectónica

Antes de cerrar un cambio:

```bash
rg -n 'from ".*(data|presentation)' src/*/domain
rg -n 'from "(express|.*prisma|@prisma)' src/*/domain
rg -n 'PrismaService|\$queryRaw' src/*/domain src/*/presentation
```

Las búsquedas deben quedar vacías. Después ejecutar build, lint dirigido, pruebas unitarias y E2E.
