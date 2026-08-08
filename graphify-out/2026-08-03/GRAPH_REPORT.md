# Graph Report - .  (2026-07-27)

## Corpus Check
- 70 files · ~60,760 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 439 nodes · 462 edges · 28 communities (19 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Svelte|Frontend Svelte]]
- [[_COMMUNITY_Backend Nest Prisma|Backend Nest Prisma]]
- [[_COMMUNITY_Database|Database]]
- [[_COMMUNITY_Product Requirements|Product Requirements]]
- [[_COMMUNITY_Generated Prisma|Generated Prisma]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]
- [[_COMMUNITY_Project Components|Project Components]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 22 edges
2. `$lib` - 19 edges
3. `UserDelegate` - 18 edges
4. `scripts` - 13 edges
5. `PrismaClient` - 11 edges
6. `compilerOptions` - 11 edges
7. `jest` - 8 edges
8. `PrismaService` - 7 edges
9. `scripts` - 7 edges
10. `$lib/components/Icon.svelte` - 7 edges

## Surprising Connections (you probably didn't know these)
- `RBAC por rol` --semantically_similar_to--> `Roles alumno profesor administrador`  [INFERRED] [semantically similar]
  frontend/frontend.md → Propuesta_Academia_Serumista.docx
- `Sumaq System` --conceptually_related_to--> `Aula virtual web`  [INFERRED]
  frontend/frontend.md → Propuesta_Academia_Serumista.docx
- `bootstrap()` --indirect_call--> `AppModule`  [INFERRED]
  backend/src/main.ts → backend/src/app.module.ts
- `Sumaq System` --conceptually_related_to--> `PostgreSQL Docker`  [EXTRACTED]
  frontend/frontend.md → database/README.md
- `Sumaq System` --conceptually_related_to--> `Prisma migrations`  [EXTRACTED]
  frontend/frontend.md → database/README.md

## Import Cycles
- 3-file cycle: `backend/src/generated/prisma/commonInputTypes.ts -> backend/src/generated/prisma/internal/prismaNamespace.ts -> backend/src/generated/prisma/models.ts -> backend/src/generated/prisma/commonInputTypes.ts`
- 3-file cycle: `backend/src/generated/prisma/internal/prismaNamespace.ts -> backend/src/generated/prisma/models.ts -> backend/src/generated/prisma/models/User.ts -> backend/src/generated/prisma/internal/prismaNamespace.ts`

## Communities (28 total, 9 thin omitted)

### Community 0 - "Frontend Svelte"
Cohesion: 0.02
Nodes (99): Args, At, AtLeast, AtLoose, AtStrict, BatchPayload, Boolean, Bytes (+91 more)

### Community 1 - "Backend Nest Prisma"
Cohesion: 0.04
Nodes (55): AggregateUser, DateTimeFieldUpdateOperationsInput, GetUserAggregateType, GetUserGroupByPayload, NullableStringFieldUpdateOperationsInput, StringFieldUpdateOperationsInput, UserAggregateArgs, UserCountAggregateInputType (+47 more)

### Community 2 - "Database"
Cohesion: 0.09
Nodes (16): svelte/elements, svelte, ../Avatar.svelte, ./Card.svelte, $lib/components/Icon.svelte, ../Logo.svelte, ../ThemeToggle.svelte, NavGroup (+8 more)

### Community 3 - "Product Requirements"
Cohesion: 0.07
Nodes (28): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+20 more)

### Community 4 - "Generated Prisma"
Cohesion: 0.07
Nodes (24): $Enums, User, DateTimeFilter, DateTimeWithAggregatesFilter, NestedDateTimeFilter, NestedDateTimeWithAggregatesFilter, NestedIntFilter, NestedIntNullableFilter (+16 more)

### Community 5 - "Project Components"
Cohesion: 0.08
Nodes (25): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+17 more)

### Community 6 - "Project Components"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 7 - "Project Components"
Cohesion: 0.09
Nodes (21): dependencies, tailwindcss, @tailwindcss/vite, devDependencies, svelte-check, @sveltejs/adapter-auto, @sveltejs/kit, @sveltejs/vite-plugin-svelte (+13 more)

### Community 8 - "Project Components"
Cohesion: 0.12
Nodes (14): dependencies, dotenv, @nestjs/common, @nestjs/core, @nestjs/platform-express, @prisma/adapter-pg, @prisma/client, reflect-metadata (+6 more)

### Community 9 - "Project Components"
Cohesion: 0.15
Nodes (11): AppModule, Module, AuthController, AuthModule, Module, bootstrap(), PrismaModule, Module (+3 more)

### Community 11 - "Project Components"
Cohesion: 0.12
Nodes (4): config, LogOptions, PrismaClient, PrismaClientConstructor

### Community 12 - "Project Components"
Cohesion: 0.15
Nodes (12): compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule, rewriteRelativeImportExtensions (+4 more)

### Community 13 - "Project Components"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 14 - "Project Components"
Cohesion: 0.33
Nodes (6): PostgreSQL Docker, Prisma migrations, Sumaq System, App móvil práctica SERUMS, Aula virtual web, Propuesta Academia Serumista

### Community 16 - "Project Components"
Cohesion: 0.67
Nodes (3): PrismaClientBaseOptions, PrismaClientOptionsWithAccelerateUrl, PrismaClientOptionsWithAdapter

## Knowledge Gaps
- **307 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+302 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Project Components` to `Product Requirements`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Project Components` to `Product Requirements`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _307 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Backend Nest Prisma` be split into smaller, more focused modules?**
  _Cohesion score 0.03571428571428571 - nodes in this community are weakly interconnected._
- **Should `Database` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._
- **Should `Product Requirements` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._