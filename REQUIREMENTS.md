# Oomfy - Especificación de Requerimientos, Arquitectura y Análisis de Deuda Técnica

> **Versión del Documento:** 2.0.0  
> **Estado:** Fase de Reestructuración y Refactorización Integral  
> **Última Actualización:** Octubre 2026  

---

## 1. Visión y Resumen del Proyecto

**Oomfy** es una plataforma de red social y microblogging en tiempo real (similar a Twitter / X), orientada a la interacción fluida entre usuarios ("oomfies"). Provee funcionalidades de timeline dinámico, publicaciones multimedia con soporte para GIFs y enlaces enriquecidos (Spotify), interacciones sociales (upvotes, citas, respuestas e hilos jerárquicos, republicaciones), perfiles de usuario personalizables, grafo social (seguidores y seguidos), sistema de notificaciones instantáneas y mensajería directa privada en tiempo real mediante WebSockets.

El proyecto experimentó una evolución orgánica que resultó en una arquitectura híbrida parcialmente migrada y en un frontend monolítico en JavaScript Vanilla. El objetivo actual es **rehacer, reorganizar y modernizar la plataforma en su totalidad**, transformándola en una solución desacoplada, fuertemente tipada con **TypeScript**, estructurada como un **Monorepo gestionado por PNPM**, con un frontend en **React + Vite**, un backend modular en **Express + WebSockets (Socket.IO)**, un esquema híbrido robusto con **PostgreSQL + MongoDB** acompañado de migraciones formales, y una cobertura de pruebas exhaustiva.

---

## 2. Diagnóstico del Estado Actual y Deuda Técnica Detectada

Tras una auditoría minuciosa del repositorio existente, se han identificado las siguientes fallas críticas, inconsistencias y fuentes de deuda técnica:

### 2.1. Inconsistencias Críticas en el Modelo de Datos y Bases de Datos
1. **Migración Parcial Incompleta (Postgres vs. MongoDB):**
   - El sistema original operaba 100% sobre PostgreSQL con identificadores autoincrementales enteros (`id_member`, `id_post`, etc.).
   - Se inició una migración a MongoDB para `publications`, `members` y `follows`, introduciendo `UUID v7`.
   - **Estado Roto Resultante:** Existen tablas y endpoints que esperan enteros y otros que usan UUIDs. Por ejemplo:
     - `publications.controller.remove.ts` llama a `postService.remove({ id_post: Number(req.params.id_post) })`, la cual intenta borrar en la tabla `post` de Postgres, mientras que las publicaciones nuevas se crean exclusivamente en la colección `publications` de MongoDB.
     - `upvoteService.ts` y `shareService.ts` validan `isNaN(data.id_post)` y operan contra PostgreSQL, imposibilitando dar upvote o compartir publicaciones creadas en MongoDB.
     - El endpoint `/api/member/update-profile` y los métodos en `memberService.ts` tipifican `id_member: number`, pero en la autenticación se emiten tokens con el UUID de la tabla `oomfy`.
2. **Desincronización de Colecciones en Creación de Usuarios:**
   - En `Signup.ts` y `Verify.ts`, el usuario se registra y activa en la tabla `oomfy` de PostgreSQL, pero **nunca se inserta el documento correspondiente en la colección `members` de MongoDB**.
   - En consecuencia, cuando un usuario nuevo intenta iniciar sesión (`Signin.ts`), el sistema ejecuta `membersCollection.findOne({ _id: new UUID(member.id) })`, el cual retorna `null`, provocando una excepción no controlada (`TypeError: Cannot read properties of null`) al intentar leer `publicMember.icon.delete_url`.
3. **Duplicidad de Clientes PostgreSQL:**
   - Existen dos configuraciones concurrentes para PostgreSQL: `src/database/Postgres.ts` (usando la librería `postgres` de Peter Porsager) y `src/database/postgres/pool.ts` (usando `pg.Pool`). No hay una capa unificada de acceso a datos ni transacciones homogéneas.
4. **Falta de un Sistema de Migraciones Automatizado:**
   - Los cambios de esquema previos se gestionaban mediante scripts manuales sueltos en `scripts/*.ts` (`members_to_oomfies.ts`, `migrate_follows.ts`, `publications_to_mongo.ts`). No hay versionado de base de datos, ni capacidad de rollback, ni ejecución determinista en entornos de CI/CD.

### 2.2. Problemas de Arquitectura y Principios de Diseño
1. **Violación Severa del Principio de Responsabilidad Única (SRP) y Límite de Líneas:**
   - Múltiples módulos superan ampliamente el límite de ~100 líneas por archivo/clase:
     - `src/database/repository/memberRepository.ts`: **621 líneas**.
     - `src/services/memberService.ts`: **246 líneas**.
     - `src/database/repository/chat/Post.ts`: **204 líneas**.
     - `src/database/repository/post/Get.ts`: **197 líneas**.
     - `src/services/authenticationService.ts`: **184 líneas**.
     - `src/Server.ts`: **163 líneas**.
   - Se mezclan lógica de transporte HTTP, validaciones manuales de parámetros, llamadas a APIs externas (ImgBB, Spotify), consultas SQL en crudo y mutaciones de MongoDB dentro de las mismas funciones.
2. **Encapsulamiento Débil:**
   - La mayoría de los servicios y repositorios exportan objetos con funciones flecha o funciones sueltas en lugar de clases bien encapsuladas que permitan inyección de dependencias y pruebas unitarias con mocks.
3. **Nomenclatura Engañosa en Seguridad:**
   - `Authorization.Everyone` en `src/middlewares/Authorization.ts` en realidad requiere un JWT de autenticación válido (`Authorization: Bearer <token>`). No permite acceso a usuarios invitados ("Everyone"), bloqueando endpoints que deberían ser públicos para lectura (como ver un perfil o una publicación).

### 2.3. Frontend Monolítico y Obsoleto
1. **Ausencia de Framework Moderno:**
   - El frontend reside en `/public` y está escrito en JavaScript Vanilla con manipulación directa del DOM, concatenación de cadenas HTML y enrutamiento manual con `Navigo`.
2. **Estado Global Mutable en `window`:**
   - La aplicación depende de variables globales como `window.app.logged`, `window.app.member`, `window.app.socket`, lo que dificulta el rastreo de estados reactivos y causa fugas de memoria.
3. **Acoplamiento Directo al Backend:**
   - El servidor Express sirve los archivos estáticos de `/public` y captura `*` mediante `res.sendFile('public/app.html')`. Esto impide el despliegue independiente del frontend en CDNs (Vercel, Cloudflare Pages, Netlify) y del backend en contenedores o PaaS (Railway, Fly.io, Render).
4. **Dependencias Externas Inyectadas vía CDN sin Control de Versiones:**
   - Se cargan scripts de FontAwesome, Google reCAPTCHA, Socket.IO y librerías de recorte de GIF/imágenes directamente en el HTML.

### 2.4. Ausencia Total de Pruebas Automatizadas
- No existe **ni un solo test unitario, de integración o end-to-end** en el repositorio.
- No hay librerías de testing instaladas (Vitest, Jest, Supertest, etc.).
- Las validaciones manuales y las aserciones se hacen de forma ad-hoc dentro de cada función, generando fragilidad ante cualquier refactorización.

---

## 3. Requerimientos Funcionales (RF)

### RF-01: Gestión de Identidad y Autenticación
- **RF-01.1 (Registro de Usuario):** Registro con `email`, `username`, `name` y `password`. Se valida la unicidad de email y username mediante validación estricta y reCAPTCHA v3. La contraseña debe almacenarse hasheada con `bcrypt`.
- **RF-01.2 (Verificación de Correo):** Envío automático de correo con enlace de activación firmado criptográficamente (JWT) usando el servicio **Resend**. La cuenta permanece en estado `pending` hasta que se valide el token.
- **RF-01.3 (Inicio de Sesión):** Autenticación mediante credenciales (`username`/`password`). Generación de un par de tokens:
  - *Access Token:* JWT de corta duración (15 minutos) enviado en cabeceras o cuerpo para acceso a recursos.
  - *Refresh Token:* JWT de larga duración (30 días) almacenado de forma segura en una cookie `HttpOnly`, `SameSite=Strict` y `Secure`.
- **RF-01.4 (Rotación y Refresco de Sesión):** Endpoint para obtener nuevos Access Tokens utilizando el Refresh Token válido.
- **RF-01.5 (Cierre de Sesión):** Invalidación del Refresh Token y eliminación de la sesión activa en base de datos.
- **RF-01.6 (Recuperación de Credenciales):**
  - Solicitud de restablecimiento de contraseña mediante correo con token de expiración corta (10-15 minutos).
  - Recuperación de nombre de usuario mediante envío al correo registrado.

### RF-02: Gestión de Sesiones y Seguridad
- **RF-02.1 (Auditoría de Sesiones):** Registro en base de datos de cada sesión activa indicando identificador UUID, usuario, IP del cliente, plataforma/agente de usuario y fecha de creación.
- **RF-02.2 (Revocación Remota):** Visualización de todas las sesiones activas y capacidad para cerrar sesiones remotas individuales o todas simultáneamente.

### RF-03: Perfiles de Usuario y Configuración
- **RF-03.1 (Datos de Perfil):** Lectura de perfiles por `username` que incluya: nombre, nombre de usuario, biografía (máx. 500 caracteres), ubicación, enlace web, rol, contador de seguidores, seguidos y publicaciones.
- **RF-03.2 (Personalización Visual):** Actualización de avatar (icono) y portada (banner) con soporte para recorte y carga en servicio de almacenamiento de imágenes (ImgBB / Cloud Storage).
- **RF-03.3 (Actualización de Credenciales):** Modificación de nombre de usuario (previa verificación de unicidad) y actualización de contraseña (validando la contraseña actual).

### RF-04: Publicaciones (Timeline y Microblogging)
- **RF-04.1 (Creación de Publicaciones):** Creación de posts con contenido de texto (hasta 500 caracteres), hasta 4 imágenes adjuntas, GIFs animados (vía API de Tenor) y previsualización de música/podcasts (vía Spotify oEmbed).
- **RF-04.2 (Tipos de Publicación):**
  - *Default:* Publicación estándar en el timeline.
  - *Reply:* Respuesta a una publicación existente, manteniendo trazabilidad del `parent_publication_id`, `root_publication_id` y array de `thread_ids`.
  - *Quote:* Cita de otra publicación con comentario adicional.
  - *Shared (Repost/Retweet):** Republicación directa sin comentario.
- **RF-04.3 (Eliminación de Publicaciones):** Eliminación por el autor legítimo de la publicación, actualizando contadores de respuestas/citas asociados.
- **RF-04.4 (Eliminación por Moderación):** Capacidad para que usuarios con roles `admin` o `mod` eliminen publicaciones que violen términos.
- **RF-04.5 (Feed y Paginación):** Consulta cronológica inversa basada en cursores (utilizando el orden natural temporal de UUID v7) para garantizar paginación infinita eficiente.

### RF-05: Interacciones Sociales
- **RF-05.1 (Upvotes / Likes):** Capacidad de dar upvote y downvote (quitar upvote) a una publicación de manera idempotente, actualizando el contador global atómicamente.
- **RF-05.2 (Grafo de Seguimiento):** Funcionalidad de seguir (`follow`) y dejar de seguir (`unfollow`) a otros usuarios. Prevención de auto-seguimiento.
- **RF-05.3 (Listas de Seguidores y Seguidos):** Listado paginado de usuarios seguidos y seguidores con estado de seguimiento bidireccional respecto al usuario autenticado.

### RF-06: Notificaciones en Tiempo Real
- **RF-06.1 (Generación de Eventos):** Generación automática de notificaciones ante: nuevo upvote en publicación, nueva respuesta/hilo, nueva mención o nuevo seguidor.
- **RF-06.2 (Entrega Instantánea):** Emisión a través de WebSocket (Socket.IO) al socket conectado del destinatario.
- **RF-06.3 (Historial y Lectura):** Listado paginado de notificaciones y marcado masivo como "leídas" (`seen`).

### RF-07: Mensajería Directa Privada (Chat)
- **RF-07.1 (Salas de Chat 1 a 1):** Creación o recuperación idempotente de salas de chat privadas entre dos usuarios.
- **RF-07.2 (Intercambio en Tiempo Real):** Envío y recepción de mensajes a través de WebSockets con acuse de recibo y persistencia en base de datos.
- **RF-07.3 (Rate Limiting en Chat):** Protección contra spam y flooding de mensajes tanto a nivel de socket como a nivel de capa de aplicación.

### RF-08: Búsqueda y Exploración
- **RF-08.1 (Búsqueda de Usuarios):** Búsqueda por coincidencia en nombre, nombre de usuario y biografía con ponderación y paginación.
- **RF-08.2 (Búsqueda de Publicaciones):** Búsqueda de contenido textual en publicaciones activas.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-01 (Modularidad y Límite de Tamaño):** Cada clase y archivo no deberá exceder aproximadamente las **100 líneas de código**. Los módulos con lógica compleja deben descomponerse en clases especializadas con una única responsabilidad (SRP).
- **RNF-02 (Tipado Estricto de Extremo a Extremo):** Código 100% en TypeScript (`strict: true`), sin uso indiscriminado de `any`. Definición de tipos y esquemas de validación compartidos entre frontend y backend mediante un paquete común.
- **RNF-03 (Arquitectura Monorepo con PNPM Workspaces):** Separación física y de empaquetado entre `apps/api` (backend), `apps/web` (frontend) y `packages/shared` (contratos y DTOs).
- **RNF-04 (Cobertura de Pruebas):** Toda la lógica de negocio (servicios), validaciones (esquemas Zod), adaptadores de infraestructura y componentes reactivos deben contar con pruebas unitarias e integrales (mínimo 80% de cobertura en lógica crítica).
- **RNF-05 (Seguridad en Comunicaciones y Datos):**
  - Hashing robusto con bcrypt (salteo dinámico).
  - Tokens JWT firmados con clave secreta segura, con claims mínimos y expiración forzada.
  - Cabeceras de seguridad estrictas (Helmet, CSP refinado, mitigación CORS con origen verificado).
  - Rate limiting en endpoints públicos críticos (registro, login, envío de correos).
- **RNF-06 (Integridad y Migraciones de Bases de Datos):** Cualquier cambio estructural en PostgreSQL o colecciones en MongoDB debe contar con scripts de migración reversibles (`up` y `down`).
- **RNF-07 (Rendimiento y Paginación Eficiente):** Uso de claves temporales UUID v7 que permiten ordenación por índice B-Tree sin colisiones y sin degradación de rendimiento por escaneo de tablas (`OFFSET` elevado).

---

## 5. Decisiones de Diseño y Arquitectura de Datos

### 5.1. Estrategia de Base de Datos Híbrida: PostgreSQL + MongoDB

Para aprovechar las fortalezas óptimas de cada motor de almacenamiento, se delimitan formalmente las responsabilidades:

```
+---------------------------------------------------------------------------------------+
|                                    SISTEMA OOMFY                                      |
+------------------------------------------+--------------------------------------------+
|        POSTGRESQL (Motor Relacional ACID)|       MONGODB (Motor Documental NoSQL)     |
+------------------------------------------+--------------------------------------------+
| - Usuarios y Credenciales (oomfy)        | - Publicaciones y Microblogging (posts)    |
| - Sesiones Activas (session)             | - Medios, embeds e hilos anidados (embeds) |
| - Tokens de Activación / Reseteo         | - Proyecciones públicas de perfiles        |
| - Mensajes Privados de Chat (message)    | - Grafo social de seguimiento (follows)    |
| - Salas y Participantes de Chat          | - Notificaciones de actividad              |
+------------------------------------------+--------------------------------------------+
```

1. **PostgreSQL:**
   - Garantiza consistencia transaccional estricta (ACID) para identidad, autenticación, control de accesos, sesiones y registros de mensajería privada.
   - Migraciones controladas por código SQL/TypeScript con versionado secuencial.
2. **MongoDB:**
   - Diseñado para alta velocidad de lectura y escritura en contenido semiestructurado y denormalizado (tweets, imágenes dinámicas, embeds de terceros, hilos con arrays de IDs de conversación y contadores sociales).
   - Evita los costos prohibitivos de `JOINs` masivos al recuperar el feed y los hilos de respuestas.
   - Sincronización desacoplada o atómica en eventos clave (como la creación/verificación de usuario).

### 5.2. Arquitectura de Software: Aplicación de PEAA, GoF y POSA

#### Patrones de PEAA (Martin Fowler - Enterprise Application Architecture):
- **Repository Pattern:** Abstracción limpia entre la lógica de negocio y las operaciones de persistencia en PostgreSQL o MongoDB.
- **Service Layer:** Clases orquestadoras de casos de uso (ej. `AuthenticationService`, `PublicationPostService`, `FollowService`) con lógica de negocio pura, independientes del framework Express.
- **Data Mapper / DTOs:** Separación explícita entre los modelos de base de datos y los objetos de transferencia expuestos a través de la API.
- **Unit of Work:** Manejo transaccional explícito para operaciones críticas en PostgreSQL (ej. creación de usuario + generación de sesión + auditoría).

#### Patrones GoF (Gang of Four):
- **Factory Method:** Instanciación controlada de respuestas HTTP estandarizadas, adaptadores y entidades de dominio.
- **Observer Pattern:** Desacoplamiento entre eventos de dominio (ej. "nueva publicación creada") y consumidores en tiempo real (WebSockets, notificaciones push).
- **Strategy Pattern:** Variantes de carga y procesamiento de imágenes (ImgBB, almacenamiento local o Cloud Storage) y validaciones dinámicas.
- **Adapter Pattern:** Encapsulación de proveedores de terceros tras interfaces uniformes:
  - `EmailService` adaptando la API de **Resend**.
  - `ImageStorageService` adaptando **ImgBB**.
  - `EmbedService` adaptando **Spotify oEmbed** y **Tenor API**.

#### Patrones POSA (Pattern-Oriented Software Architecture):
- **Layers Pattern (Arquitectura en Capas):**
  1. *Presentation Layer:* Controladores Express y Gateways de Socket.IO (responsabilidad exclusiva de transporte HTTP/WS, validación de schemas con Zod y serialización de respuestas).
  2. *Application / Service Layer:* Casos de uso y reglas de negocio.
  3. *Domain Layer:* Entidades y Value Objects con invariantes de dominio.
  4. *Infrastructure Layer:* Repositorios de datos, clientes de Postgres/Mongo y adaptadores de servicios externos.
- **Broker / Event Gateway:** Gestión de eventos bidireccionales en tiempo real a través de Socket.IO con salas de usuario aisladas.

---

## 6. Estructura y Organización del Proyecto (Monorepo PNPM)

El proyecto se reorganiza bajo la siguiente estructura modular:

```
oomfy/
├── .github/                      # Workflows de CI/CD (Tests, Linter, Build)
├── apps/
│   ├── api/                      # Backend (Node.js, Express, Socket.IO, TS)
│   │   ├── src/
│   │   │   ├── config/           # Configuración de entorno y constantes
│   │   │   ├── controllers/      # Clases controladoras (< 100 LOC por archivo)
│   │   │   ├── domain/           # Entidades y reglas de negocio puras
│   │   │   ├── errors/           # Jerarquía de excepciones de dominio y HTTP
│   │   │   ├── infrastructure/   # Bases de datos, Repositorios, Adaptadores
│   │   │   │   ├── postgres/     # Pool, esquemas y migraciones de Postgres
│   │   │   │   ├── mongo/        # Conexión, colecciones y migraciones de Mongo
│   │   │   │   └── external/     # ResendMailer, ImgBBStorage, SpotifyClient
│   │   │   ├── middlewares/      # Autenticación, validación Zod, rate limit
│   │   │   ├── routes/           # Enrutadores modulares de Express
│   │   │   ├── services/         # Servicios de aplicación y orquestación
│   │   │   ├── socket/           # Handlers y controladores de WebSockets
│   │   │   ├── Server.ts         # Clase de inicialización del servidor
│   │   │   └── index.ts          # Punto de entrada de la aplicación API
│   │   ├── tests/                # Pruebas unitarias e integrales del backend
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                      # Frontend SPA (React, Vite, TypeScript, Tailwind)
│       ├── src/
│       │   ├── assets/           # Iconos, fuentes e imágenes estáticas
│       │   ├── components/       # Componentes atómicos y reutilizables (< 100 LOC)
│       │   ├── context/          # Contextos y stores reactivos (Zustand/Context)
│       │   ├── hooks/            # Custom hooks para lógica y consumo de APIs
│       │   ├── layouts/          # Layouts estructurales (MainLayout, AuthLayout)
│       │   ├── routes/           # Configuración de React Router
│       │   ├── services/         # Clientes HTTP y conexión a Socket.IO
│       │   ├── views/            # Vistas principales de la aplicación
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── tests/                # Pruebas de componentes y hooks (Vitest)
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── packages/
│   └── shared/                   # Código y tipos compartidos entre API y Web
│       ├── src/
│       │   ├── contracts/        # DTOs de petición y respuesta
│       │   ├── models/           # Definiciones de tipos (User, Post, Chat, etc.)
│       │   └── schemas/          # Esquemas de validación Zod compartidos
│       ├── package.json
│       └── tsconfig.json
│
├── pnpm-workspace.yaml           # Definición de workspaces de PNPM
├── package.json                  # Scripts globales de orquestación
├── tsconfig.base.json            # Configuración base estricta de TypeScript
├── REQUERIMIENTOS.md             # Este documento
└── README.md                     # Guía de introducción, ejecución y arquitectura
```

---

## 7. Plan de Pruebas y Aseguramiento de Calidad

Para asegurar la robustez de la aplicación y evitar regresiones:
1. **Tests Unitarios (Vitest):**
   - Validación de cada servicio de negocio con repositorios simulados (mocks).
   - Validación exhaustiva de las reglas de hashing, generación y expiración de tokens JWT.
   - Validación de los esquemas de entrada Zod con casos borde (strings vacíos, SQL injection, XSS).
2. **Tests de Integración (Supertest + Vitest):**
   - Ejecución de suites completas de autenticación: Signup -> Envío de Correo -> Verify -> Signin -> Refresh Token -> Logout.
   - Creación y recuperación de publicaciones, hilos y citas.
   - Flujos de interacción: Upvote/Downvote idempotente y Follow/Unfollow.
3. **Tests de WebSockets:**
   - Conexión autenticada de sockets, emisión y recepción de eventos de chat y notificaciones.
4. **Tests de Frontend (Vitest + React Testing Library):**
   - Pruebas de renderizado y eventos de formularios (Signup, Signin, PostCreator).
   - Renderizado condicional de vistas según autenticación y roles de usuario.

---

## 8. Hoja de Ruta de Implementación (Roadmap)

- **Hito 1:** Estructuración del Monorepo con PNPM Workspaces y paquete `@oomfy/shared` (Completado).
- **Hito 2:** Unificación y saneamiento del esquema de PostgreSQL y MongoDB con migraciones formales y vinculación de 6.257 publicaciones heredadas (Completado).
- **Hito 3:** Refactorización del Backend a clases modulares con estricto apego a SRP (< 100 LOC por archivo) y patrones PEAA/GoF (Completado).
- **Hito 4:** Suite de pruebas del backend (Vitest) y verificación de cobertura de endpoints de publicaciones e interacciones (Completado).
- **Hito 5:** Construcción del Frontend moderno en React + Vite + TypeScript con estética retro/pixelada y diseño mobile-first completamente responsive (Completado).
- **Hito 6:** Integración completa de tiempo real (Socket.IO) entre Web y API (Completado).
- **Hito 7:** Sistema modal de edición de perfil retro pixel y suite de pruebas frontend con Vitest (Completado).
- **Hito 8:** Mensajería Directa privada en tiempo real con indicador numérico de no leídos, búsqueda instantánea de usuarios y diseño responsivo móvil/escritorio (Completado).
- **Hito 9:** Paginación infinita basada en cursor temporal (`older_id` e IntersectionObserver) en Inicio, Perfiles, Explorar y Notificaciones (Completado).
- **Hito 10:** Sistema completo de notificaciones al estilo Twitter para likes, retweets, comentarios, citas y seguidores, con alertas instantáneas vía WebSocket y contadores en tiempo real (Completado).
- **Hito 11:** Integración de Klipy como proveedor de GIFs animados, detección automática de enlaces y citas estilo Twitter, y menú desplegable de opciones en publicaciones (Completado).
- **Hito 12:** Normalización de mayúsculas en la interfaz en español, preservando estrictamente la marca en minúsculas `oomfy` (Completado).
- **Hito 13:** Visualización fidedigna de miembros en línea exclusivamente conectados mediante sockets e insignias de rol normalizadas `[ADMIN]`, `[MOD]` y `[MEMBER]` (Completado).
- **Hito 14:** Blindaje de rutas privadas (`/chats`, `/notifications`, `/settings`) mediante `<ProtectedRoute>`, formularios protegidos para no autenticados y robustez ante fallos de conexión (Completado).
- **Hito 15:** Saneamiento de compatibilidad BSON Binary UUID v7 / String en el repositorio de seguimiento `MongoFollowRepository`, resolviendo la detección de relaciones de seguimiento para cuentas migradas (Completado).
- **Hito 16:** Población automática y renderizado de publicaciones citadas (`populateTargetPublications`), botón de citar con icono retro pixel (`PixelQuote`), previsualización de citas en el creador y flujo completo de microblogging (Completado).
- **Hito 17:** Sistema integral de diálogos y confirmaciones retro pixel (`useDialogStore` y `PixelDialogModal`), erradicando las ventanas nativas emergentes del navegador para una experiencia estética unificada (Completado).
- **Hito 18:** Auditoría exhaustiva de seguridad y privacidad (tokens de actualización estrictamente en cookies `httpOnly`, enmascaramiento de correos en registros de auditoría) y nueva vista de Configuración (`/settings`) con actualización de nombre de usuario `@`, cambio de contraseña y revocación remota de sesiones activas (Completado).
- **Hito 19:** Pulido integral de experiencia de usuario, multimedia enriquecida y saneamiento de datos (Completado):
  - *Aislamiento de caché en TanStack Query:* Claves disjuntas `['notifications-summary']` y `['notifications-feed']` erradicando colisiones de estructura en React Query.
  - *Saneamiento estricto de tipos UUID en PostgreSQL:* Validación de cadenas UUID y soporte para cookies `refresh_token` en `PostgresSessionRepository.deleteAllExceptCurrent`, evitando el error `invalid input syntax for type uuid: ""`.
  - *Publicaciones citadas con contenido completo:* Despliegue íntegro de texto sin truncamiento y galería multimedia (`MediaGrid`) en previsualización y renderizado de citas.
  - *Respuestas enriquecidas (Rich Replies):* Compositor de respuestas completo con soporte para hasta 4 imágenes, selector de GIFs animados Klipy, miniaturas interactivas y envío multipart.
  - *Componente `PixelAvatar` resiliente:* Fallback automático a iniciales retro en caso de URL nula o error 503/404 de ImgBB, integrado en navegación, hilos de chat y tarjetas de miembros. Sincronización de 80 iconos y 43 banners entre MongoDB y PostgreSQL.
  - *Estado reactivo de seguimiento (`is_following`):* Decoración de relaciones de seguimiento en miembros sugeridos y búsqueda de usuarios, con alternancia visual "Seguir" / "Siguiendo".
  - *Visor de imágenes interactivo (`ImageViewerModal`):* Soporte para zoom con rueda del ratón (50% a 600%), arrastre panorámico libre deshabilitando el arrastre nativo del navegador (`draggable={false}`) y soporte táctil móvil.
  - *Scroll infinito polimórfico en MongoDB:* Filtro `$or` para compatibilidad de tipos BSON `Date` y cadenas ISO `String` en consultas temporales `$lt`, con pre-carga anticipada (`rootMargin: '300px'`).
  - *Inspección a pantalla completa de perfil y banner:* Zoom interactivo mediante modal para fotos de avatar y portadas en perfiles de usuario.
  - *Navegación ergonómica al tope de vista:* Clic en cualquier encabezado (`Header`) para desplazamiento suave automático (`scrollTo({ top: 0, behavior: 'smooth' })`).
- **Hito 20:** Arquitectura integral de publicaciones, hilos multinivel y enriquecimiento de enlaces (Completado):
  - *Consistencia BSON Date en MongoDB:* Normalización de fechas `created_at` a tipo nativo BSON `Date` (`MongoMigrationRunner`), garantizando ordenación cronológica descendente fidedigna en la Timeline (`{ created_at: -1 }`).
  - *Separación estricta de Citas y Respuestas:*
    - Citas (`type: 'quote'`): Publicaciones independientes que incrementan `quotes_count`, sin `root_publication_id` ni inserción en hilos de comentarios, desplegando la tarjeta de cita embebida.
    - Respuestas (`type: 'reply'`): Vinculadas al árbol de conversación mediante `parent_publication_id`, `root_publication_id` y `thread_ids`, incrementando `comments_count`, con cabecera "En respuesta a @usuario" y excluidas del feed general para evitar saturación.
  - *Visualización completa de hilos multinivel (Ancestros y Descendientes):*
    - Recuperación jerárquica de ancestros (`findAncestors`) recorriendo la cadena de respuestas hasta la raíz, conectados visualmente en el frontend mediante línea de hilo vertical retro (`ThreadAncestorCard`).
    - Despliegue de respuestas directas bajo el compositor de respuestas (`ReplyComposer`).
  - *Detección y formateo interactivo de texto (`FormattedText`):* Enlaces, menciones `@usuario` y hashtags `#tag` resaltados en verde (`#00dc65`) y clickeables.
  - *Previsualización enriquecida de enlaces:* Detección e integración automática de metadatos Open Graph, Twitter/X (FxTwitter), TikTok, YouTube y Spotify.
  - *Aviso de seguridad para enlaces externos (`ExternalWarningView`):* Redirección preventiva ante clics en enlaces externos con interfaz retro de advertencia contra phishing, mostrando URL destino y opciones de retorno seguro o continuación.
- **Hito 21:** Desacoplamiento de Despliegue en Render (Servidor y Vista Independientes) (Completado):
  - *Scripts de compilación y ejecución aislados:*
    - Servidor Backend: `pnpm run build:api` y `pnpm run start:api`, asegurando la previa compilación de `@oomfy/shared`.
    - Vista Frontend: `pnpm run build:web`, `pnpm run start:web` (vía `vite preview` con enlace dinámico al puerto `$PORT` de Render y host `0.0.0.0`) y `pnpm run preview:web`.
  - *Compatibilidad con Render Static Sites:* Generación autónoma del artefacto estático en `apps/web/dist` con soporte de rewrites para Single Page Applications (`/* -> /index.html`).





- **Hito 22:** Optimización de Interacción, Enrutamiento SPA en Render, Caché React Query y Vistas de Perfil (Completado):
  - *Enrutamiento SPA en Render:* Inclusión de regla `/* /index.html 200` en `apps/web/public/_redirects` y `base: '/'` en `vite.config.ts`.
  - *Filtrado de Timeline y Botones Ergonómicos:* Muro principal limpio con publicaciones directas y citas; botones de interacción de 20px.
  - *Caché Global:* `staleTime: 5 min` y `gcTime: 30 min` en React Query.
  - *Sugerencias y Pestañas de Perfil:* Exclusión de seguidos y sub-pestañas Publicaciones, Respuestas y Me gusta.
- **Hito 23:** Ergonomía de Interacciones, Identidad de Seguimiento, PWA, Visor Resiliente y Seguridad de Credenciales (Completado):
  - *Distribución Horizontal de Acciones:* Botones de interacción expandidos a lo largo (`w-full`) en `PublicationActions`.
  - *Avatares Ampliados:* Mayor tamaño visual en publicaciones (`w-12 h-12`), hilos (`w-11 h-11`), vista de detalle (`w-14 h-14`) y sugerencias (`w-10 h-10`).
  - *Estados Iluminados y Toggle:* Iconos activos en verde (`#00dc65`) al dar me gusta, compartir o citar; toggle al volver a presionar.
  - *Insignia "Te sigue":* Indicador informativo junto al nombre de usuario en perfiles cuando el usuario visitado sigue al usuario activo.
  - *Ajuste Ergonómico Móvil:* Posicionamiento y márgenes adaptativos para botones de cabecera de perfil en móviles.
  - *Menú de Opciones en Detalle:* Menú desplegable restaurado en `PublicationDetailView` para copiar enlace o eliminar publicación.
  - *Enlaces de Perfil Seguros:* Biografía y sitio web enrutados preventivamente a través de `ExternalWarningView`.
  - *Soporte PWA Completo:* Configuración de `manifest.webmanifest`, `sw.js`, metadatos móviles y sección en Ajustes con botón de instalación e instrucciones por navegador.
  - *Vistas de Seguidores y Siguiendo:* Rutas dedicadas `/:username/followers` y `/:username/following` con paginación infinita y tarjetas de usuario interactivas.
  - *Sesiones Persistentes y Refresco Silencioso:* Recuperación de sesión persistente con reintentos automáticos vía `POST /api/auth/refresh` ante códigos 401.
  - *Visibilidad de Contraseñas:* Botón de visualización con iconos `Eye` / `EyeOff` en todos los formularios de autenticación y ajustes.
  - *Recuperación de Cuenta:* Flujos completos para olvido de contraseña (correo con token hacia `/reset-password`) y recordatorio de usuario por correo.
  - *Resiliencia Multimedia y Paginación:* Límite estricto de hasta 4 elementos multimedia por publicación (1 GIF o 4 imágenes), supresión de placeholders rotos en `MediaGrid` mediante fallback reactivo y aislamiento de clave en `useInfiniteQuery` (`notifications-infinite-list`).
- **Hito 24:** Panel de Administración, Moderación, Onboarding PWA, Paginación de Mensajes y Optimización de TL Móvil (Completado):
  - *Popup y Guía PWA:* Onboarding al iniciar sesión invitando a instalar la PWA si la página no se ejecuta en standalone, vinculada a `/settings?tab=app`.
  - *Saneamiento de Paginación en Seguidores/Siguiendo:* Búsqueda fidedigna de cursor temporal en `MongoFollowRepository` por la relación de seguimiento del usuario precedente en lugar de su `_id` de miembro.
  - *Tipografía Inter en Mensajes:* Aplicación de `font-sans` en el input de redacción y en los cuerpos de mensaje.
  - *Ergonomía de Vista Chat:* Encabezado único con interlocutor y botón de retorno; vista sin scroll de página y contenedor de mensajes con anclaje inferior (`mt-auto`) y paginación por lotes de 30 mensajes.
  - *Creador de Publicaciones en TL Móvil:* Oculto en pantallas pequeñas (`hidden md:block`), preservando el botón flotante como canal principal.
  - *Visibilidad Condicional del Botón Flotante:* Excluido de `/settings`, `/chats` y `/admin`.
  - *Panel de Administración Exclusivo (`/admin`):* Módulo protegido para rol `admin` con métricas, kill-switches (creación de posts, edición de perfiles, registro de usuarios), suspensión/reactivación de miembros y eliminación de posts por moderación.
  - *Ajuste de Imagen Única:* Visualización no recortada con ancho natural adaptable y `object-contain` en `MediaGrid`.
- **Hito 25:** Identidad Visual Oficial, Control de Sesiones en Administración, Optimización Batch de Rendimiento y URLs Dinámicas de Medios (Completado):
  - *Identidad de Marca y PWA:* Incorporación de los logotipos oficiales en `apps/web/public/assets/`, favicon en `index.html`, icono de acceso directo para la PWA instalada en `manifest.webmanifest` y soporte gráfico en `<PixelLogo />`.
  - *Saneamiento de Renderizado de Logo:* Eliminación de `image-rendering: pixelated` y estilos de botón en `<PixelLogo />`, habilitando renderizado anti-aliasing de alta resolución para que el isotipo mantenga sus bordes y curvas íntegros sin recortes.
  - *Ajustes Globales y Revocación de Sesiones:*
    - Inclusión de la configuración `disable_signins` en `SystemSettings` y validación en `SigninService` para bloquear logins de usuarios regulares durante mantenimientos.
    - Revocación global de sesiones (`POST /api/admin/sessions/revoke-all` y `AdminSessionService`) para invalidar simultáneamente todas las sesiones activas en PostgreSQL.
    - Revocación puntual de sesiones por usuario (`POST /api/admin/users/:id/revoke-sessions`) con confirmación modal e integración en `AdminUsersTab` y `AdminUserRow`.
  - *Optimización de Consultas y Erradicación del Problema N+1:*
    - Reemplazo de los bucles secuenciales de búsqueda en `FollowService` por consultas batch en MongoDB (`findManyByIds` y `filterFollowing`), reduciendo el número de round-trips de red de 40 a solo 2.
    - Creación de índices compuestos en MongoDB mediante `MongoMigrationRunner` para consultas frecuentes sobre `publications` y `upvotes`.
  - *Saneamiento de Estado `is_following` y Paginación por Offset:*
    - Normalización de identificadores BSON UUID a cadenas de texto (`String(id)`) en `FollowService` y `MongoFollowRepository`, asegurando el emparejamiento exacto en el conjunto `followingSet` y resolviendo la visualización errónea de "Seguir" en usuarios que ya son seguidos.
    - Sincronización reactiva del botón de seguimiento en `UserSearchCard` ante cambios de propiedades.
    - Paginación secuencial por `offset` en `FollowListView`, `FollowController` y `MongoFollowRepository`, erradicando el bloqueo de carga de páginas sucesivas causado por registros con marcas de tiempo idénticas heredadas de migraciones batch.
  - *URLs Dinámicas para Fotos de Perfil y Banners:*
    - Rutas en backend `/api/members/:username/icon` y `/api/members/:username/banner` que redirigen con código 302 y cabecera `Cache-Control: public, max-age=300`.
    - Caché en memoria en `ProfileService` para minimizar llamadas a la base de datos e invalidación inmediata al editar perfil.
    - Mapeo dinámico en `PublicationMapper`, garantizando que las publicaciones no queden desactualizadas ni requieran migraciones masivas en base de datos cuando un autor modifique su foto o portada.
    - Utilidad cliente `resolveMediaUrl` con reglas de redirección en `apps/web/public/_redirects`.
