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

### RF-09: Notificaciones Web Push y Auto-lectura
- **RF-09.1 (Web Push VAPID en Segundo Plano):** Suscripción segura mediante `pushManager`, almacenamiento en colección `push_subscriptions` (`_id: uuidv7()`), y despacho de notificaciones push para upvotes, citas, respuestas y mensajes directos.
- **RF-09.2 (Auto-marcado de Lectura):** Marcado automático de notificaciones como leídas al ingresar a la vista de notificaciones y de mensajes al abrir una conversación.
- **RF-09.3 (Navegación e Identidad Visual):** Notificaciones con nombre completo, `@username` y avatar dinámico (`/api/members/:username/icon`) con navegación diferenciada al contenido generado o al perfil del emisor.

### RF-10: Sistema de Reportes y Moderación de Staff
- **RF-10.1 (Reporte de Contenido y Usuarios):** Modal interactivo para reportar publicaciones y perfiles con motivos estructurados y detalles opcionales, almacenado en colección `reports` (`_id: uuidv7()`).
- **RF-10.2 (Panel Exclusivo de Moderación):** Vista `/moderation` protegida para roles `admin` y `mod`, además de pestaña integrada en el panel de Administración.
- **RF-10.3 (Acciones de Moderación):** Flujos para resolver o descartar reportes, eliminación directa de publicaciones reportadas y suspensión de cuentas de usuario reportadas.

### RF-11: Arquitectura de Chat Rápida en MongoDB y UI Discord
- **RF-11.1 (Persistencia NoSQL de Chats):** Chats y mensajes migrados a MongoDB (`chats` y `messages`), eliminando locks y contención en PostgreSQL.
- **RF-11.2 (Ordenamiento Reciente):** Conversaciones ordenadas por `updated_at: -1` al registrar mensajes nuevos.
- **RF-11.3 (Diseño de Bloques Discord):** Agrupación temporal de mensajes consecutivos del mismo emisor con cabecera y avatar común, tipografía Inter y scroll fluido.

### RF-12: Experiencia de Hilos y Navegación de Publicaciones
- **RF-12.1 (Enfoque Automático de Hilos):** Scroll automático suave sobre la publicación seleccionada cuando existen publicaciones ancestro.
- **RF-12.2 (Zonas de Clic Precisas):** Avatar y nombres conducen al perfil del autor; imágenes abren exclusivamente el visor de medios; el resto de la tarjeta navega a los detalles del post.
- **RF-12.3 (Auditoría de Sesiones):** Detección de IP real cliente (`trust proxy`) y desglose de Sistema Operativo y Navegador a partir de `User-Agent`.

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
- **Hito 26:** Sincronización Cross-Collection de Datos de Usuario, Aislamiento del Modal de Edición y Avatar en Citas (Completado):
  - *Sincronización Cross-Collection (`UserSyncService`):* Propagación atómica de cambios en nombre, avatar y portada a través de todas las colecciones NoSQL dependientes (`publications`, `follows`, `notifications`), garantizando que al cambiar de nombre u otros datos se actualicen retrospectivamente todas las publicaciones e interacciones históricas.
  - *Aislamiento del Modal de Edición (`EditProfileModal`):* Renderizado restringido al perfil propio (`isOwnProfile && isEditOpen`), clave única por ID de usuario (`key={user.id}`) y sincronización en `useEffect` al abrir el modal, erradicando la persistencia de datos del perfil visitado previamente.
  - *Refresco Reactivo en Perfil:* Invalidación simultánea en React Query (`profile`, `user-posts`, `publications`) para visualización instantánea del nuevo nombre en el timeline.
  - *Avatar en Publicaciones Citadas (`LinkPreviewCard`):* Incorporación de `<PixelAvatar />` en la tarjeta de previsualización de publicaciones citadas, resolviendo correctamente las URLs dinámicas con soporte de iniciales en caso de fallo.
- **Hito 27:** Unificación de Esquema a 'members', Preservación de Medios, Recortador Universal, Cierre de Sesión Móvil y Gestión de Roles (Completado):
  - *Unificación de Esquema PostgreSQL y MongoDB a `members`:*
    - Migración formal `003_rename_oomfy_to_members.sql` para renombrar la tabla `oomfy` y sus índices a `members` de forma idempotente y segura.
    - Creación de vista de compatibilidad `CREATE OR REPLACE VIEW oomfy AS SELECT * FROM members;` garantizando cero rupturas en consultas o dependencias externas.
    - Actualización exhaustiva de consultas en repositorios y servicios SQL (`PostgresUserRepository`, `PostgresChatRepository`, `ResetPasswordService`, `ForgotUsernameService`, `SettingsService`, `ProfileService`, `AdminUserService`, `AdminStatsService`).
  - *Preservación Precisa de Medios y Erradicación de Conflictos NoSQL al Editar Perfil:*
    - Corrección de la mutación involuntaria en `MongoMemberRepository.createOrUpdate` donde valores `undefined` en `$set` causaban la eliminación de `icon_url` y `banner_url`.
    - Eliminación del conflicto de operadores MongoDB (`Updating the path 'name' would create a conflict at 'name'`), garantizando exclusión mutua de campos entre `$set` y `$setOnInsert`.
    - Generación dinámica del objeto de actualización NoSQL y sentencias SQL parametrizadas parciales en `ProfileService`, asegurando que solo los campos explícitamente modificados sean alterados.
  - *Sincronización de Redundancias Cross-Collection en NoSQL (PEAA/POSAD):*
    - Implementación de `CrossCollectionSyncRepository` y actualización de `UserSyncService` para sincronizar atómicamente autores de publicaciones directas y publicaciones citadas/republicadas (`target_publication.author`), así como el rol administrativo (`syncRole`).
  - *Recortador de Imágenes Universal (Image Cropper):*
    - Servicio encapsulado `ImageCropService` para recorte canvas 2D de alta calidad con preservación de formato y nombre original.
    - Modal retro pixel interactivo `<ImageCropperModal />` con soporte de arrastre, zoom táctil/slider y selección de proporciones (1:1, 3:1, 16:9, libre).
    - Hook de cola `useImageCropQueue` e integración en edición de avatar y banner (`EditProfileMedia`), publicaciones (`PublicationCreator`) y respuestas (`ReplyComposer`).
  - *Sección de Cierre de Sesión en Configuración:*
    - Componente `<LogoutSection />` en `/settings` con confirmación modal para usuarios móviles y refactorización de `SettingsView.tsx` dividida en pestañas modulares (`AccountSettingsTab`, `SecuritySettingsTab`, `SessionsSettingsTab`, `AppPwaSettingsTab`) respetando el límite de ~100 líneas por archivo.
  - *Gestión de Roles y Filtros Multicriterio en Panel de Administración:*
    - Selector interactivo de rol en `AdminUserRow` para promover usuarios a administrador o asignar roles con confirmación modal y sincronización reactiva en MongoDB y PostgreSQL.
    - Barra de filtros `<AdminUserFiltersBar />` con búsqueda textual, selección de rol, estado y rango de fechas de creación, respaldada por el patrón `AdminUserQueryBuilder` en backend.
- **Hito 28:** Recortador de Selección Libre, Sincronización Asíncrona en Servidor, Caché Instantánea de Publicaciones y Refresco Gestual (Completado):
  - *Recortador de Selección Libre y Manipulable:*
    - Creación de `useCropBox.ts` y `CropBoxView.tsx` para manipular libremente el recuadro de selección mediante 8 tiradores interactivos (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) y desplazamiento interior (`inside`).
    - Acción "Toda la imagen" (`selectAll()`) en `ImageCropperControls.tsx` para expandir el recuadro al 100% de las dimensiones de la imagen sin distorsión, procesando el corte en coordenadas nativas de alta resolución mediante `ImageCropService.cropFromRect`.
    - Guías de composición visual por tercios (`rule-of-thirds`) y preservación de aspect ratios fijos o libres.
  - *Sincronización Desacoplada en Segundo Plano (POSAD Task Dispatcher):*
    - Módulo `BackgroundTaskDispatcher.ts` para ejecutar tareas asíncronas no bloqueantes vía `queueMicrotask` con control resiliente de excepciones.
    - Desacoplamiento de la respuesta HTTP en `ProfileService.ts`, `SettingsService.ts` y `AdminUserService.ts`: el servidor responde inmediatamente con estado 200 OK una vez completadas las escrituras en la entidad primaria `members`, delegando la propagación cross-collection (`UserSyncService`) a segundo plano para erradicar cualquier latencia en la UI del usuario.
  - *Caché Inteligente y Navegación Instantánea a Publicaciones (PEAA Identity Map):*
    - Servicio `PublicationCacheService.ts` para recuperar de forma síncrona publicaciones existentes en las colecciones en memoria de `feed` o `user-posts`.
    - Inyección de datos provisionales (`placeholderData`) en `PublicationDetailView.tsx`: la publicación y su ancestro directo se muestran inmediatamente (0 ms de espera), disparando automáticamente la carga de respuestas e hilos en segundo plano sin requerir ninguna acción ni clic adicional del usuario.
  - *Carga de Hilos y Paginación Ascendente de Ancestros (Scroll Up Thread Pagination):*
    - Implementación de `QueryPublicationService.getAncestors` y ruta `GET /api/publications/:id/ancestors?before_id=...&limit=4`.
    - Al ingresar a una publicación de un hilo se cargan los ancestros inmediatos superiores; si el hilo es largo, se muestra el indicador y botón retro pixel *"Mostrar publicaciones anteriores del hilo (quedan X)"*, con soporte de auto-carga mediante `IntersectionObserver` al hacer scroll hacia arriba y preservación precisa de la posición de scroll (`scrollBy`).
    - Componente modular encapsulado `<ThreadAncestorsList />` para desacoplar la renderización del hilo.
  - *Pull-to-Refresh Gestual y Botón de Refresco en PC:*
    - Hook táctil `usePullToRefresh.ts` con cálculo elástico de resistencia táctil e indicador animado retro pixel `<PullToRefresh />`.
    - Botón de actualización en cabecera `<Header />` para usuarios de escritorio con retroalimentación visual de giro (`RefreshCw`).
    - Implementación transversal en `HomeView`, `ProfileView`, `NotificationsView` y `PublicationDetailView`.
- **Hito 29:** Notificaciones WebPush, Migración de Chats a MongoDB, Reportes de Contenido y Detección de Dispositivos (Completado):
  - *Notificaciones Push en Navegador y Móvil (`WebPushService`):*
    - Servicio push con clave VAPID, endpoints `/api/notifications/push/subscribe` y `/push/vapid-public-key`.
    - Envío automático de notificaciones web push ante nuevos mensajes directos, menciones y respuestas en segundo plano.
  - *Migración de Chats y Mensajes a NoSQL:*
    - Repositorios `MongoChatRepository` y `MongoMessageRepository` con identificación homogénea en `UUIDv7`.
    - Marcado automático de mensajes leídos al entrar a la vista `/chats` y cálculo en tiempo real de no leídos.
  - *Sistema Integral de Reportes de Contenido (`ReportService`, `ReportModal`, `AdminReportsList`):*
    - Endpoints y repositorio para reportar publicaciones y perfiles de usuarios infractores con detalles y motivos estructurados.
    - Pestaña de moderación en panel de administración y vista de Staff (`/moderation`) con acciones resolutivas (eliminar post, suspender usuario, descartar reporte).
  - *Detección de Dispositivo e IP en Sesiones (`ClientInfoParser`):*
    - Parser de cabeceras (`x-forwarded-for`, `user-agent`) para registrar con precisión el dispositivo, navegador e IP de cada sesión activa en PostgreSQL.
- **Hito 30:** Experiencia de Mensajería Directa Avanzada (Estilo Discord, Respuestas, Multimedia y Fijación de Layout) (Completado):
  - *Indicador de Escritura en Tiempo Real Continuo ("Usuario está escribiendo..."):*
    - Emisión periódica de latido de tipeo (`typing-start` cada 1.8s) y cancelación por inactividad (`typing-stop` tras 2.5s o al enviar) en `ChatThread.tsx` y `SocketGateway.ts`.
    - Temporizador dinámico en el receptor que renueva la visibilidad del aviso mientras el remitente continúe digitando sin cortes prematuros.
  - *Atajos de Teclado Diferenciados (PC vs Móvil) y Entrada Expandible:*
    - Reemplazo de input estándar por `<textarea>` autorregulable (`ChatInputBar.tsx`) de altura dinámica.
    - En PC: <kbd>Enter</kbd> envía el mensaje directamente y <kbd>Shift</kbd> + <kbd>Enter</kbd> inserta un salto de línea.
    - En dispositivos táctiles/móviles: la tecla <kbd>Enter</kbd> inserta salto de línea y el envío se ejecuta exclusivamente mediante el botón táctil de envío.
  - *Prevención de Zoom Automático en Dispositivos Móviles:*
    - Dimensionamiento tipográfico base de al menos 16px (`text-base md:text-sm`) en áreas de texto e inputs, erradicando el auto-zoom forzado por navegadores WebKit/Blink en iOS y Android.
    - Configuración en viewport meta `maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content`.
  - *Fijación Inamovible de Cabecera y Controles en Pantallas de Chat:*
    - Estructura `h-[100dvh] overflow-hidden` en `AppLayout.tsx` sobre rutas `/chats` y cabecera `sticky top-0 z-20 flex-shrink-0` con botón de retroceso (`ArrowLeft`).
    - Desplazamiento confinado estrictamente al contenedor interno de mensajes (`overflow-y-auto`), evitando que el scroll desplace el layout global o esconda al usuario con el que se chatea.
  - *Aumento de Escala Visual en Escritorio:*
    - Avatares ampliados (`w-8 h-8 md:w-10 md:h-10`) y tipografía más legible (`text-xs md:text-sm`) con interlineado holgado (`leading-snug md:leading-relaxed`) en `ChatMessageItem.tsx`.
  - *Sistema de Respuestas a Mensajes:*
    - Soporte en modelo y base de datos de referencias `reply_to` anidadas.
    - En PC: botón flotante de respuesta (`<Reply />`) al posar el cursor sobre cualquier mensaje.
    - En móvil: gesto táctil deslizable hacia la izquierda (> 50px) y pulsación prolongada (500ms) para responder rápidamente.
    - Previsualización visual de cita previa en barra de entrada y banner estilo Discord en el mensaje publicado.
  - *Adjuntos Multimedia (Imágenes y GIFs):*
    - Selección de hasta 4 imágenes con previsualización miniatura y botón de descarte.
    - Integración de buscador modal de GIFs (`KlipyGifModal`) para adjuntar animaciones en el chat.
    - Previsualizador ampliable interactivo (`ImageViewerModal`) al hacer clic en cualquier medio adjunto del chat.
  - *Reporte de Mensajes Directos:*
    - Extensión de `ReportTargetType` a `'message'` con acción de reporte en menú de mensaje (`<Flag />`), apertura de `ReportModal` y gestión en `AdminReportsList` con opción de eliminación de mensaje para staff.
- **Hito 31:** Estandarización Universal de Identificadores y Relaciones BSON `UUID` en MongoDB (Completado):
  - *Identificadores y Claves Foráneas Nativas Binarias BSON `UUID` en MongoDB:*
    - Conversión sistemática no solo del campo `_id` sino de **todos los campos de relación y claves UUID** (`publication_id`, `user_id`, `follower_id`, `followed_id`, `chat_id`, `sender_id`, `recipient_id`, `target_publication_id`, `parent_publication_id`, `participant_ids`, etc.) a instancias BSON `UUID("...")` (Subtipo 4) en todas las colecciones (`upvotes`, `chats`, `messages`, `push_subscriptions`, `notifications`, `follows`, `reports`, `publications`, `members`).
    - Verificación exhaustiva de 0 campos UUID residuales en formato string crudo en la base de datos de MongoDB.
    - Preservación transparente del campo `id: string` para garantizar interoperabilidad síncrona con el cliente frontend y contratos de API REST.
  - *Servicio Automatizado de Migración Recursiva (`UuidMigrationService` y `UuidFieldConverter`):*
    - Clases modulares `UuidFieldConverter` (detección y conversión profunda recursiva de UUIDs preservando tipos no UUID) y `UuidMigrationService` (orquestación y sincronización atómica) integradas en `MongoMigrationRunner`.
    - Actualización integral de repositorios (`MongoChatRepository`, `MongoMessageRepository`, `MongoNotificationRepository`, `MongoReportRepository`, `MongoFollowRepository`, `MongoPublicationRepository`, `PublicationInteractionDecorator`) y servicios (`UpvoteService`, `WebPushService`) con `MongoIdHelper.idVariants()`, `MongoIdHelper.toMongoId()` y queries polimórficas seguras.
- **Hito 32:** Gestión de Sesiones Push, Avisos PWA, Formato Semántico y Broadcast Administrativo (Completado):
  - *Desactivación de Notificaciones al Cerrar Sesión y Aislamiento Multicuenta:*
    - Al invocar `logout()`, `PushNotificationService.unsubscribe()` elimina la suscripción local del navegador mediante `pushManager` y despacha `POST /api/notifications/unsubscribe` para erradicar el endpoint de `push_subscriptions`.
    - Al iniciar sesión en otra cuenta en el mismo dispositivo, si existen suscripciones previas, `PushNotificationService.syncSubscription()` reasocia atómicamente el endpoint de la máquina al nuevo usuario autenticado, impidiendo recepción cruzada de notificaciones.
  - *Aviso Automático de Activación Push en PWA Instalada:*
    - Al autenticarse en `SigninView`, si la aplicación está instalada como PWA (`isStandalone`) pero carece de suscripción push activa (`isSubscribed() === false`), se despliega un diálogo emergente modal invitando al usuario a activarlas y redirigiéndolo a `/settings?tab=app`.
  - *Estandarización Semántica de Títulos y Cuerpos de Notificaciones:*
    - Título estandarizado en formato `"@usuario hizo tal cosa"`:
      - Respuestas: `@usuario respondió a tu publicación` y cuerpo con el texto de la respuesta o indicador de imagen.
      - Citas: `@usuario citó tu publicación` y cuerpo con el texto de la cita o indicador de imagen.
      - Mensajes directos: `@usuario te envió un mensaje` y cuerpo con el fragmento del mensaje.
      - Me gusta: `@usuario le dio me gusta a tu publicación` con cuerpo vacío.
      - Seguimientos: `@usuario comenzó a seguirte` con cuerpo vacío.
      - Compartidos: `@usuario compartió tu publicación` con cuerpo vacío.
  - *Herramienta de Envío Manual de Notificaciones en Panel de Administrador:*
    - Pestaña *Notificaciones* en `AdminView` con `<AdminPushTab />` y `<AdminPushForm />`.
    - Endpoint seguro `POST /api/admin/notifications/push/broadcast` gestionado por `AdminPushController` y `WebPushService.broadcastPush` con soporte de difusión masiva o envío selectivo por `@usuario`.
- **Hito 33:** Resolución Determinista de Citas y Publicaciones Compartidas con IDs BSON UUID (Completado):
  - *Desacoplamiento Estricto entre Citas (Quotes) e Hilos de Respuestas (Replies):*
    - En `PublicationThreadResolver`, la búsqueda de ancestros jerárquicos se restringe estrictamente a publicaciones de tipo `reply` (`publication.type === 'reply'`). Las citas (`quote`) son publicaciones de primer nivel independientes con tarjeta embebida que no deben encadenarse como si fueran respuestas de hilo ni arrastrar el árbol de ancestros de la publicación citada en `PublicationDetailView`.
    - La recursión de ancestros para respuestas se detiene de forma determinista al alcanzar una publicación que no sea `reply` (el origen del hilo o cita inicial).
  - *Población y Mapeo Seguro de Publicación Destino (`PublicationTargetPopulator` y `PublicationMapper`):*
    - En `PublicationMapper`, se garantiza que `parent_publication_id` y `root_publication_id` se conviertan de manera uniforme a cadenas al pasar al dominio, impidiendo que referencias de objetos BSON `UUID` rompan las comparaciones en estructuras `Map` de JavaScript.
    - `PublicationTargetPopulator` aísla bajo SRP la resolución de publicaciones referenciadas para tipos `shared` y `quote`, indexando tanto en minúsculas como con variantes BSON `UUID` y resolviendo de forma secundaria citas anidadas dentro de compartidos, erradicando el aviso erróneo de "Publicación original no disponible o eliminada".
- **Hito 34:** Ciclo de Vida Persistente de Suscripciones Push, Transferencia de Dispositivo y Preferencias por Categoría (Completado):
  - *Ciclo de Vida Persistente y Transferencia de Sesión en Dispositivos PWA:*
    - Al cerrar sesión (`logout`), la suscripción en el navegador se mantiene intacta en el Service Worker (`pushManager`) y el cliente notifica al servidor (`POST /api/notifications/unsubscribe`), marcando `is_active: false` y `status: 'inactive'` en la colección `push_subscriptions` sin eliminar nunca el documento, evitando tener que volver a solicitar permisos al usuario.
    - Al iniciar sesión en la PWA, si el dispositivo ya tiene permisos concedidos (`Notification.permission === 'granted'`), la suscripción push se sincroniza y reactiva automáticamente (`PushNotificationService.syncSubscription()` -> `POST /api/notifications/subscribe`), actualizando el `user_id` del documento de la suscripción al nuevo usuario autenticado y marcándolo `is_active: true`.
    - Si el usuario inicia sesión en una cuenta diferente en el mismo dispositivo, la suscripción transfiere de forma transparente su titularidad al nuevo usuario, asegurando que las notificaciones despachadas correspondan únicamente al usuario con sesión activa en ese dispositivo.
    - Si las notificaciones no están concedidas en la PWA, se presenta el diálogo emergente de confirmación para guiar al usuario a la vista de configuración (`/settings?tab=app`).
  - *Control Granular de Preferencias de Notificación Push:*
    - Se introduce el modelo `PushPreferences` (`messages`, `replies`, `quotes`, `upvotes`, `shares`, `follows`), persistido dentro del documento de suscripción en MongoDB con valores por defecto en `true`.
    - Endpoints `GET /api/notifications/preferences` y `PATCH /api/notifications/preferences` implementados en `NotificationController` y expuestos a través de `WebPushService` y `PushSubscriptionRepository`.
    - `WebPushService.sendPushToUser` evalúa la categoría de la notificación (mensajes en chats, respuestas, citas, likes, reposts, follows) filtrando dinámicamente (`preferences.<category>: { $ne: false }`), silenciando las categorías deshabilitadas por el usuario.
    - Componente `<PushPreferencesList />` integrado en `<AppPwaSettingsTab />` para alternar opciones de notificaciones con actualización optimista y diseño pixel-art responsivo.
    - Se extrae `<PwaInstallGuide />` y la arquitectura backend se estructura en `PushSubscriptionRepository` y `WebPushClient` bajo GoF Adapter, Facade y SRP, respetando el límite de 100 líneas por archivo.
- **Hito 35:** Snippets de Contenido en Notificaciones de Likes/Compartidos y Renovación Automática de Suscripciones Caducadas (Completado):
  - *Extracción y Despacho de Snippets de Publicaciones:*
    - Se introduce `PublicationSnippetHelper` bajo SRP para extraer de forma determinista la primera oración o línea de la publicación objetivo (hasta puntuación terminal o salto de línea, truncando a un máximo de 100 caracteres con puntos suspensivos), o en su defecto el indicador `"📷 Imagen adjunta"` cuando la publicación no tiene texto pero contiene imágenes.
    - Se integran los snippets en el cuerpo (`body`) de las notificaciones push para upvotes (`UpvoteService`) y publicaciones compartidas (`ShareService`), permitiendo al usuario previsualizar el contenido interactuado directamente desde la tarjeta de notificación del sistema operativo.
  - *Detección y Renovación Proactiva de Suscripciones Caducadas:*
    - En el backend, las suscripciones invalidadas por servidores push externos (código HTTP 410 Gone o 404 Not Found) son marcadas como `status: 'expired'`, `is_active: false` en `push_subscriptions`.
    - Al consultar el estado del dispositivo (`getPreferences`), se expone el campo `status`. En `PushNotificationService.syncSubscription()`, si el endpoint local fue marcado como caducado o está desactualizado, se invoca automáticamente `renewSubscription()`, la cual desuscribe la clave obsoleta del `pushManager`, genera una nueva suscripción VAPID y la asocia en MongoDB mediante `previous_endpoint` conservando las preferencias del usuario.
    - Se implementa el evento estándar `pushsubscriptionchange` en `sw.js` para renovación desatendida en segundo plano por el Service Worker.
    - En `<AppPwaSettingsTab />`, si una suscripción caduca y no puede autorenovarse (por ejemplo, permisos modificados), se presenta un aviso visual contextual con botón de acción para renovarla manualmente. Se extrae `<PwaInstallCard />` manteniendo el cumplimiento estricto del límite de 100 líneas por archivo.
- **Hito 36:** Protección Universal de Rutas contra Accesos No Autenticados y Migración de URL Base de API a `/` (Completado):
  - *Bloqueo Total de Acceso y Redirección Obligatoria a `/signin`:*
    - En el frontend (`App.tsx`), toda la jerarquía de rutas principales contenida en `<AppLayout />` (`/`, `/explore`, `/notifications`, `/chats`, `/settings`, `/admin`, `/moderation`, `/publication/:id`, `/external`, `/:username/followers`, `/:username/following`, `/:username`) se encapsula dentro del guardián `<ProtectedRoute>`.
    - Cualquier intento de acceder o navegar a cualquier vista de la plataforma sin una sesión activa redirige de forma inmediata y determinista a `/signin`.
    - En `SigninView` y `SignupView`, los usuarios que ya cuentan con sesión activa son redirigidos automáticamente a `/`.
  - *Protección Estricta de Endpoints de Datos en el Backend:*
    - En la capa de transporte HTTP (`apps/api/src/routes/`), todos los endpoints de contenido y lectura que anteriormente permitían acceso opcional o anónimo fueron elevados a `AuthGuard.requireAuth`:
      - `publication.routes.ts`: `GET /`, `GET /:id/ancestors`, `GET /:id`.
      - `profile.routes.ts`: `GET /:username` (manteniendo exclusivamente públicos los redirects dinámicos de imágenes estáticas `/:username/icon` y `/:username/banner` para renderizado de tags HTML `<img>`).
      - `follow.routes.ts`: `GET /:username/followers`, `GET /:username/followed`, `GET /:username/following`.
      - `auxiliary.routes.ts`: `GET /gifs`, `GET /preview-url`, `GET /online-members`, `GET /suggested-members`, `GET /search-users`.
  - *Migración de la URL Base de la API del Servidor de `/api` a `/`:*
    - Dado que el subdominio de producción ya incluye la palabra `api` (`https://api-oomfy.onrender.com`), se eliminó el prefijo redundante `/api`.
    - En `Server.ts`, las rutas de la API se montan directamente en la raíz `/` (manteniendo `/api` como alias secundario seguro).
    - En el cliente web (`api.ts`), la URL base en desarrollo es `''` y en producción `https://api-oomfy.onrender.com`.
    - En `vite.config.ts`, la regla de proxying local redirige todas las rutas API (`auth`, `members`, `publications`, `interactions`, `follows`, `notifications`, `chats`, `sessions`, `aux`, `settings`, `reports`, `staff`, `admin`, `health`) al puerto 4000 sin prefijo `/api`.
    - En `sw.js`, las llamadas de suscripción push y clave pública VAPID apuntan a `/notifications/vapid-public-key` y `/notifications/subscribe`.
    - En `mediaUrl.ts`, se soportan rutas `/members/${username}/icon` y `/members/${username}/banner`.
    - Se actualizaron todos los archivos de prueba en `apps/api/tests/` para verificar el enrutamiento directo sobre `/`.
- **Hito 37:** Blindaje Anti-Caducidad y Recuperación Pasiva de Notificaciones Push en iOS / Safari PWA (Completado):
  - *Blindaje contra la Regla de los '3 Strikes' de Apple:*
    - En `sw.js`, el listener del evento `push` se encapsula de inmediato dentro de `event.waitUntil()`. Se asegura de forma infalible que cada push recibido termine en la invocación de `self.registration.showNotification(title, options)`.
    - En caso de payloads vacíos, fallos en parsing JSON o errores en red, se utiliza un mecanismo de recuperación inmediata que despacha una notificación visible predeterminada (`title: "oomfy"`, `body: "Tienes una nueva notificación en oomfy."`), evitando que iOS Safari penalice a la aplicación con silent pushes no visibles y revoque la suscripción del dispositivo al tercer intento.
  - *Renovación Automática en Background (`pushsubscriptionchange`):*
    - En `sw.js`, se implementa el soporte completo para rotación de claves e invalidación por parte del navegador (Safari iOS 16.4+).
    - Se detecta si el navegador ya provee `event.newSubscription` o, en su defecto, se solicita la clave pública VAPID mediante `getApiBase()` y se genera la nueva suscripción con `pushManager.subscribe()`.
    - La nueva suscripción se persiste automáticamente en el backend vía `POST /notifications/subscribe` asociando `previous_endpoint`.
  - *Recuperación Pasiva con Gesto de Usuario para iOS:*
    - Debido a que iOS Safari restringe y bloquea `pushManager.subscribe()` si se invoca pasivamente en segundo plano sin interacción explícita del usuario, se implementa `checkSubscriptionHealth()` en `PushNotificationService`.
    - Si el permiso de notificaciones sigue concedido (`Notification.permission === 'granted'`) pero la suscripción local fue purgada o caducó en el backend, se despliega el componente `<PushReconnectBanner />` en la interfaz.
    - El banner alerta al usuario y provee un botón de acción `"Reconectar"` que, al ser accionado mediante clic directo (user gesture legítimo), reestablece la suscripción push sin necesidad de reinstalar la PWA.
    - Se extraen `VapidKeyHelper` y `PushPreferencesApi` bajo SRP manteniendo todos los módulos bajo el límite estricto de 100 líneas por archivo.
- **Hito 38:** Eliminación de Mensajes Propios en Chats, Detección de Enlaces con Enrutamiento Interno, Gestión Completa de Cuentas en Admin y Creación Directa de Chats con Feedback Visual (Completado):
  - *Eliminación de Mensajes Propios en Chats:*
    - En `MessageService.deleteMessage` y `ChatController.deleteMessage`, se verifica autorización estricta (`msg.sender_id === requesterId || requesterRole === 'admin' || requesterRole === 'mod'`).
    - Al eliminarse un mensaje en el backend, `SocketGateway.broadcastDeleteMessage(chatId, messageId)` emite el evento `delete-message` a la sala del chat.
    - En el frontend (`ChatMessageActions` y `ChatMessageItem`), se expone el botón de papelera exclusivamente para mensajes propios (`isMe`). Al pulsarlo, `ChatThread` solicita confirmación mediante `useDialogStore().confirm` y despacha `DELETE /chats/messages/:id`, actualizando el hilo en tiempo real tanto localmente como para el destinatario mediante el listener de WebSockets.
  - *Detección y Clickabilidad de Enlaces en Mensajes:*
    - En `ChatMessageItem`, se reemplazó el texto plano por `<FormattedText />`, permitiendo reconocer automáticamente URLs, menciones (`@usuario`) y hashtags (`#etiqueta`) dentro de los mensajes de chat.
  - *Discriminación Determinista entre Enlaces Internos y Externos (`UrlHelper`):*
    - Se introduce `UrlHelper` bajo SRP para clasificar enlaces según su dominio: rutas relativas, `window.location.hostname`, `oomfy.online`, subdominios `*.oomfy.online`, `localhost` y `*.onrender.com` se identifican como internos.
    - Los enlaces internos navegan de inmediato mediante el enrutador de React (`navigate`), erradicando la pantalla intermedia de advertencia ("Vas a salir de oomfy") para contenido de la propia plataforma.
    - Únicamente enlaces de terceros son dirigidos a `ExternalWarningView`. Además, dicha vista implementa una redirección automática de fallback en caso de recibir por error una URL interna.
  - *Gestión y Activación Completa de Cuentas en el Panel de Administrador:*
    - En el backend, se implementa `AdminUserUpdateService` (`PUT /admin/users/:id`), permitiendo a los administradores modificar manualmente nombre, nombre de usuario, correo electrónico, rol, estado (`active`, `pending`, `suspended`) y contraseña (hasheada de forma segura con `PasswordHasher.hash`).
    - El servicio valida unicidad en PostgreSQL, replica los cambios en MongoDB y despacha sincronizaciones en segundo plano (`UserSyncService.syncUsername`, `syncRole`, `syncProfile`).
    - En el controlador, se segrega `AdminUserController` de `AdminController` para mantener estricto SRP y cumplimiento de líneas.
    - En el frontend, se crea el modal pixel-art `AdminEditUserModal` y en `AdminUserRow` se agregan el badge `PENDIENTE`, botón de activación rápida ("Activar") y botón "Editar".
  - *Botón Directo para Iniciar Chat en Perfiles de Usuario:*
    - En la vista de perfil de otros usuarios (`ProfileInfo`, `ProfileHeaderActions`, `useProfileActions`), se añade el botón "Mensaje" con icono `<MessageSquare />`.
    - Al hacer clic, se inicia automáticamente la conversación con dicho usuario vía `POST /chats/start` y se redirige a `/chats?id=<chatId>`, seleccionando de inmediato el hilo correspondiente mediante el soporte de query params en `ChatsView`.
  - *Feedback Visual Inmediato al Crear Chats (`ChatStartingOverlay`):*
    - Se introduce el componente `ChatStartingOverlay` que despliega un modal centrado con animación spinner pixel-art ("Iniciando conversación...", "Creando bandeja de chat, por favor espera..."), activo durante la creación de un nuevo chat tanto desde `StartChatModal` como desde el perfil de usuario, erradicando la incertidumbre del usuario durante la latencia de red.
  - *Arquitectura y Cumplimiento de Restricciones:*
    - Todas las clases y componentes nuevos y modificados se mantuvieron rigurosamente en `<= 100 líneas por archivo`, encapsulados bajo patrones GoF (Facade, Adapter, Template/Strategy) y PEAA, superando el 100% de la suite de pruebas unitarias e integración en todos los paquetes.
- **Hito 39:** Visualización Completa de Imágenes/GIFs en Chat, Navegación a Perfiles desde Mensajes, Selector de Emojis en Formularios y Preservación de GIFs Animados en Subidas (Completado):
  - *Visualización Completa de Imágenes y GIFs en Mensajes de Chat:*
    - En `ChatMessageMedia`, se reemplazó el recorte forzado `object-cover` por `object-contain`, contenedores adaptativos con fondo semi-transparente `bg-black/30` y dimensiones máximas elásticas (`max-h-80 sm:max-h-96 max-w-full w-auto h-auto`). Todas las imágenes y GIFs se muestran en su totalidad respetando su relación de aspecto nativa.
  - *Navegación al Perfil desde Avatar y Nombre en Mensajes de Chat:*
    - En `ChatMessageItem`, el avatar (`PixelAvatar`) y la cabecera de autor (nombre en negrita y `@username`) se encapsulan con enlaces `<Link to={'/' + senderUsername}>`. Asimismo, en las referencias de mensajes respondidos (`reply_to`), el autor citado redirige a su perfil.
    - Se extrajo el hook `useSwipeReply` para la gestión táctil manteniendo `ChatMessageItem` en estricto cumplimiento `<= 100 líneas`.
  - *Menú Selector de Emojis en Publicaciones y Mensajes:*
    - Se introdujeron `emojiData.ts` (con categorías estructuradas: Caras, Gestos, Corazones y Varios) y el componente popover `EmojiPickerMenu` con estética pixel-art, navegación por pestañas y cierre por clic externo o Escape.
    - Se integró el botón `<Smile />` con inserción fluida de emojis en:
      - `ChatInputBar`: inserta el emoji en la posición del cursor del área de texto; se extrajeron `ChatReplyBanner` y `ChatAttachmentPreviews`.
      - `PublicationCreator`: inserta el emoji en el cuerpo del post; se extrajeron `PublicationQuotedPreview` y `PublicationAttachmentPreviews`.
      - `ReplyComposer`: inserta el emoji en la respuesta a publicaciones.
  - *Preservación de GIFs Animados en Subidas:*
    - Se erradicó la pérdida de frames de animación causada por el recorte en canvas HTML5 (`drawImage` / `canvas.toBlob`), detectando archivos `image/gif`:
      - En `EditProfileMedia`, los archivos GIF para banner y avatar saltan el recorte en canvas y se conservan como GIFs animados.
      - En `PublicationCreator` y `ReplyComposer`, los archivos seleccionados se particionan de forma transparente: los GIFs se incorporan directamente al formulario sin transcodificación y las imágenes estáticas pasan por `ImageCropperModal`.
      - En `ChatInputBar`, los archivos se transmiten directamente preservando animaciones.
  - *Cumplimiento de Arquitectura y Reglas Estrictas:*
    - Cada archivo modificado o creado cumple estrictamente con el límite de `<= 100 líneas por archivo`, sin comandos git ejecutados (`git add`/`commit` prohibidos), superando el 100% de la suite de pruebas unitarias e integración (45 archivos de prueba, 137 tests pasando) y compilación limpia (`pnpm build`).
- **Hito 40: Untangle Codebase, Sesiones Persistentes con Refresh Token Rotativo, Cola de Sincronización Transversal, UI Optimista en Chat, Remarcado de Notificaciones y Estrategia Integral de SEO (`oomfy.online`):**
  - *Ejecución de `/untangle-codebase` (Desenredo de Código, Comentarios y Tests):*
    - Se eliminó código muerto (`PostgresChatRepository.ts`), se desacoplaron repositorios y vistas monolíticas en módulos de responsabilidad única (`<= 100 líneas`), se limpiaron comentarios redundantes y se reforzaron las suites de pruebas para capturar fallos reales.
  - *Persistencia de Sesión con Access Token (15m) y Refresh Token Rotativo en Base de Datos (30d):*
    - `TokenService`, `SigninService`, `VerifyService` y `TokenRefreshService` vinculan cada sesión a la tabla `session` en PostgreSQL (`PostgresSessionRepository.findByToken`, `updateToken`, `deleteByToken`).
    - Al expirar el access token (`15m`), `ApiClient` deduce llamadas concurrentes mediante una única promesa compartida (`refreshPromise`) contra `POST /auth/refresh`, rotando el refresh token tanto en la DB (`created_at = NOW()`, extendiendo la ventana de inactividad de 30 días) como en cookie `HttpOnly` y almacenamiento seguro del cliente. Si el registro de sesión se elimina de la DB, la sesión queda revocada inmediatamente.
  - *Sincronización Transversal de Datos de Usuario y Cola Secuencial (`BackgroundTaskDispatcher`):*
    - `UserSyncService`, `CrossCollectionSyncRepository` y `ChatAndAuxSyncRepository` sincronizan `name`, `username`, `icon_url`, `banner_url` y `role` en todas las colecciones (`publications`, `chats`, `messages`, `follows`, `notifications`, `reports`, `push_subscriptions`) paso a paso mediante `BackgroundTaskDispatcher.enqueueSteps`.
    - Además, `MongoMessageRepository.listChatMessages` hidrata en vivo los datos del remitente desde `members` y `PixelAvatar` restablece su estado de error cuando cambia `src`, garantizando que los mensajes antiguos reflejen el nuevo avatar al instante.
  - *Envío Optimista de Mensajes y Estado de Error / Reintento Estilo Discord:*
    - `ChatInputBar` limpia instantáneamente el campo de texto al enviar y `useChatMessages` agrega el mensaje optimista de inmediato a la conversación. Si la petición falla, `ChatMessageItem` muestra el mensaje en rojo con botones de **Reintentar** y **Eliminar**.
  - *Layout Móvil en Dos Filas para Botones del Chat y Imágenes Alineadas a la Izquierda sin Contenedor:*
    - En móvil (`ChatInputBar`), los botones de Imagen y GIF se agrupan en una fila superior y el selector de Emojis en una fila inferior para maximizar el ancho del área de escritura.
    - En `ChatMessageMedia`, se eliminó el fondo `bg-black/30` del contenedor y las imágenes/GIFs se muestran completas alineadas a la izquierda (`self-start object-left`) con límite de altura vertical (`max-h-80 sm:max-h-96`).
  - *Notificaciones No Leídas Remarcadas y Marcado Automático:*
    - `NotificationsView` y `NotificationItem` remarcan visualmente las notificaciones pendientes (`bg-brand-500/15 border-l-4 border-l-brand-400` + insignia `NUEVO`) durante la visita actual mientras las marcan automáticamente como leídas en segundo plano (`POST /notifications/read`) para futuras visitas.
  - *Estrategia Integral de SEO Técnico, On-Page, Semántico y Programático (`oomfy.online`):*
    - Rutas de lectura públicas (`optionalAuth` en `GET /publications`, `/members/:username`, `/follows/:username/*`, `/aux/*`) sin muro de login duro, acompañadas de `GuestBottomBanner` no intrusivo para visitantes y cabecera semántica de marca (`<h1>`, `<h2>`, enlaces a temas) en `HomeView`.
    - Generación dinámica de `/robots.txt`, `/sitemap_index.xml`, `/sitemap-static.xml`, `/sitemap-topics.xml`, `/sitemap-users-1.xml` y `/sitemap-posts-1.xml` (`SitemapService`), excluyendo contenido *thin* (`< 15` caracteres sin multimedia o perfiles sin actividad).
    - Tarjetas Open Graph dinámicas `1200x630` en `/og/user/:username` (`OgCardService`), pre-renderizado HTML para bots en `/seo/render`, componente `SeoHead` con etiquetas `canonical`, `og:*`, `twitter:card`, control `noindex, follow` en contenido *thin*, y datos estructurados `JSON-LD` (`WebSite`, `ProfilePage`, `SocialMediaPosting`).
    - Hubs temáticos en `/t/:tag` (`TopicHubView`), enlaces externos con `rel="ugc nofollow noopener noreferrer"` (`FormattedText`, `ProfileMeta`), optimización LCP/CLS (`fetchPriority="high"` y `aspect-ratio` en `MediaGrid`) y enlaces de paginación rastreables (`?page=2`).
- **Hito 41: Implementación de Cabeceras de Seguridad HTTP y Protección Web:**
  - *Strict-Transport-Security (HSTS):* Configurada con `max-age=31536000; includeSubDomains` para forzar HTTPS continuo.
  - *Content-Security-Policy-Report-Only (CSP):* Implementada en modo reporte para auditar directivas de orígenes de scripts, estilos, fuentes, imágenes, multimedia y sockets sin romper funcionalidades existentes ni bloquear recursos de terceros (`ImgBB`, `Klipy`, etc.).
  - *X-Frame-Options:* Configurada en `DENY` para mitigar ataques de clickjacking.
  - *X-Content-Type-Options:* Establecida en `nosniff` para evitar la interpretación MIME errónea de archivos.
  - *Referrer-Policy:* Establecida en `strict-origin-when-cross-origin` tanto en las cabeceras HTTP como en la etiqueta `<meta name="referrer">` de `index.html`.
  - *Permissions-Policy:* Configurada como `camera=(), microphone=(), geolocation=()` para restringir el acceso a APIs sensibles del dispositivo.
  - *Set-Cookie Seguro:* Cookies de sesión (`refresh_token`) configuradas estrictamente con `Secure`, `HttpOnly` y `SameSite=Lax`.
  - *Eliminación de Huellas del Servidor:* Se deshabilitó `X-Powered-By` mediante `app.disable('x-powered-by')` y se eliminan activamente los encabezados `Server` y `X-Powered-By` en cada respuesta.
  - *Omisión de Cabeceras Obsoletas:* Se evitó y eliminó `X-XSS-Protection` conforme a los estándares actuales.
  - *Verificación:* Pruebas unitarias en `apps/api/tests/security-headers.test.ts`, 100% de la suite de pruebas pasando (155 tests) y build limpio en todo el monorepo sin git commits automáticos.
- **Hito 42: Tiempo Relativo en Previews, Selección de Texto/Zoom Sin Navegación Accidental y Cabeceras de Seguridad Activas en Toda la App:**
  - *Tiempo Relativo en Previews y Fecha Exacta con Zona Horaria en Detalles:*
    - Utilidades `formatRelativeTime` y `formatExactDateTime` en `apps/web/src/utils/formatTime.ts` usando unidades completas transcurridas (`1s`, `4m`, `1h`, `1d`, `2d`, `2mes`, `1a`) en `PublicationHeader`, `SharedPublicationCard`, `ThreadAncestorCard`, `PublicationQuotedPreview` y `LinkPreviewCard` (con tooltip exacto al pasar el cursor), y fecha + hora local exacta con zona horaria en `PublicationDetailArticle`.
  - *Selección de Texto y Zoom en Imágenes/GIFs Sin Abrir el Detalle Accidentalmente:*
    - Hook `useCardClickGuard` aplicado en `PublicationCard`, `SharedPublicationCard`, `ThreadAncestorCard` y `LinkPreviewCard`: solo navega ante un clic seco sin movimiento (`<= 4px`), sin texto seleccionado ni interacción con enlaces/botones/multimedia.
    - Eliminación de `select-none` en `ThreadAncestorsList` y protección contra arrastre en `FormattedText`.
    - Refactorización de `ImageViewerModal` usando `useImageViewerZoom` y `createPortal(..., document.body)` junto con `stopPropagation` y `data-no-card-nav="true"` en `MediaGrid` e `ImageViewerModal`, garantizando que abrir o cerrar el zoom en imágenes/GIFs jamás dispare la navegación a la publicación.
  - *Cabeceras de Seguridad Activas en Backend, WebSockets y Frontend:*
    - Paso de `Content-Security-Policy-Report-Only` a **`Content-Security-Policy` activa** (con permisos completos para embeds de Spotify/YouTube/TikTok, Worker PWA `sw.js`, fuentes, ImgBB, Klipy y WebSockets) junto con `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
    - Aplicadas uniformemente en `SecurityHeaders.ts` (API Express), `SocketGateway.ts` (handshake HTTP de Socket.IO), `apps/web/vite.config.ts` (plugin en dev y `vite preview`) y `apps/web/public/_headers` (despliegues estáticos).
- **Hito 43: Formato 24h / Fecha+Hora (> 1 día) en Mensajes y Resaltado Verde Consistente en Chats:**
  - *Marcas de Tiempo en Mensajes (`formatMessageTimestamp`):*
    - Formato de 24 horas (`hourCycle: 'h23'`) en la zona horaria del navegador para `ChatMessageItem` y la vista de conversaciones (`ChatListSidebar`). Si ha pasado más de un día desde el envío, muestra fecha + hora de 24h únicamente en el primer mensaje del bloque (`isFirstInGroup`) y en la barra lateral de chats, manteniendo solo la hora compacta en el margen izquierdo de los mensajes agrupados consecutivos.
  - *Resaltado Verde de Conversación Activa:*
    - Se eliminó `divide-y divide-dark-border` en la lista de chats (cuya regla de especificidad `> * + *` sobrescribía en gris el color del borde verde de cualquier chat que no fuera el primero) sustituyéndola por `border-b border-b-dark-border`, y aplicando `bg-brand-500/15 border-l-4 border-l-brand-500` de forma uniforme en cualquier tarjeta seleccionada.
    - Se modularizó `ChatsView` en `useChatsList`, `ChatListSidebar` y `ChatsView` cumpliendo `<= 100 líneas`.
- **Hito 44: Vistas Legales (Política de Privacidad y Términos y Condiciones), Validación en Registro y Popup para Usuarios Existentes:**
  - *Vistas Legales con Contenido Adaptado al Proyecto:*
    - Nuevas rutas públicas `/privacy` (`PrivacyPolicyView`) y `/terms` (`TermsAndConditionsView`) basadas en `LegalDocumentLayout`, `privacyContent.ts` y `termsContent.ts`, detallando fielmente el almacenamiento en PostgreSQL/MongoDB, `bcrypt`, sesiones JWT de 15m / refresh tokens rotativos de 30d, notificaciones push VAPID, permisos del dispositivo (`Permissions-Policy`), integraciones de terceros (`ImgBB`, `Klipy`, `Resend`, `Spotify`/`YouTube`/`TikTok`), moderación, reportes y reglas de uso.
    - Integración de ambas rutas en el sitemap estático (`SitemapService`) y metadatos (`SeoHead` / `OgCardService`), además de enlaces en `SignupView`, `SigninView` y `SettingsView`.
  - *Obligatoriedad en el Registro (`SignupSchema` y `SignupView`):*
    - `SignupSchema` en `@oomfy/shared` exige `accepted_terms: true`; `SignupView` incluye casilla de verificación obligatoria con enlaces directos a `/terms` y `/privacy` antes de permitir el envío.
    - `SignupService` persiste `terms_accepted: true` y `terms_accepted_at` al crear el registro en MongoDB (`members`).
  - *Campo de Aceptación y Popup para Usuarios Existentes:*
    - Se añadieron `terms_accepted` y `terms_accepted_at` en los tipos compartidos, migración PostgreSQL (`004_terms_acceptance.sql`), `MongoMigrationRunner` (relleno automático `terms_accepted: false` en documentos previos de `members`) y `MongoMemberMapper`/`MongoMemberRepository`.
    - Nuevo endpoint `POST /members/me/accept-terms` (`ProfileController.acceptTerms` / `ProfileService.acceptTerms`).
    - Componente global `TermsAcceptanceModal` montado en `AppLayout`: al iniciar sesión o retomar sesión activa con `terms_accepted === false`, advierte que continuar usando Oomfy implica aceptar todos los términos y políticas (permitiendo leer `/terms` o `/privacy`, aceptar y continuar, o cerrar sesión).
- **Hito 45: Cabeceras de Seguridad con Helmet, Fuente Única Compartida y Saneamiento `/untangle-codebase`:**
  - *Middleware `helmet` en API Backend (`SecurityHeaders.ts`):*
    - Se instala `helmet` en `@oomfy/api` y se configura explícitamente con `hsts` (`maxAge: 31536000`, `includeSubDomains: true`), `frameguard` (`SAMEORIGIN`), `contentSecurityPolicy` activo (`useDefaults: false`, directivas para self, estilos/fuentes Google, imágenes/ImgBB/Klipy, WebSockets y embeds Spotify/YouTube/TikTok con `frame-ancestors 'self'`), `referrerPolicy` (`strict-origin-when-cross-origin`), `crossOriginResourcePolicy` (`cross-origin` para assets consumidos desde `oomfy.online`), `xXssProtection: false` y ocultamiento de `X-Powered-By` / `Server`, más `Permissions-Policy: geolocation=(), microphone=(), camera=()`.
  - *Fuente Única en `@oomfy/shared` (`constants/security.ts`, `constants/site.ts`):*
    - `SecurityHeaders.ts`, `SocketGateway.ts`, `apps/web/vite.config.ts` (dev/preview + emisión de `dist/_headers`) y `apps/web/public/_headers` comparten la misma política de seguridad (`SECURITY_HEADER_VALUES` / `buildCspHeader()`).
    - Se unifican constantes globales (`SITE_URL`, `API_PROD_URL`, `DEFAULT_TOPICS`) y el helper `apps/web/src/utils/apiBase.ts` (`resolveApiBaseUrl`, `getSocketBaseUrl`), eliminando duplicados entre vistas, SEO y servicios.
  - *Saneamiento de Alias y Comentarios Redundantes:*
    - Se elimina el alias redundante `PublicationCacheService.getInitialDetailData` (actualizando sus tests a `getPlaceholderDetailData`) y comentarios redundantes que solo repetían el código.
- **Hito 46: Scroll Independiente y Restaurado por Vista, Identity Maps de Publicaciones/Usuarios, Reducción de Peticiones y Navegación Restringida para Invitados:**
  - *Aislamiento y Restauración de Scroll + Paginación (`routeScrollStore`, `useRouteScroll`, `useCursorFeed`, `NotificationsView`, `ProfileView`, `PublicationDetailView`):*
    - Cada vista (`pathname + search`) mantiene su propia posición de scroll independiente (iniciar sesión en nueva vista arranca en `0` y volver atrás con `POP` o entre pestañas como Home/Notificaciones/Perfil conserva tanto el scroll como todas las páginas ya cargadas sin re-fetching).
    - `ProfileView` sincroniza su pestaña activa (`posts` / `replies` / `likes`) con `?tab=...`, `NotificationsView` conserva las páginas acumuladas al desmontarse (eliminando `invalidateQueries` al salir), y `PublicationDetailView` respeta el scroll restaurado al volver atrás.
  - *Identity Maps y Sincronización Global (`entityRegistryStore`, `usePublicationEntity`, `usePublicationSnapshot`, `useFollowMutation`, `PublicationCacheService`):*
    - Normalización en cliente de publicaciones (`publications`, `inFlightPubs`, `mutatedAt`) y usuarios (`usersByUsername`), sincronizados bidireccionalmente con todos los caches de React Query (`['feed']`, `['user-posts']`, `['explore-posts']`, `['topic-hub']`, `['publication']`, incluyendo `target_publication`, citas, respuestas y compartidos).
    - Dar o quitar *Me gusta* o *Compartir* (así como citar o seguir) actualiza al instante todos los iconos y contadores en TL, detalles de publicación y perfiles sin peticiones adicionales; ante fallos de red realiza rollback automático, y los invitados redirigen directo a `/signin`.
  - *Optimización de Carga al Servidor y DB (`NotificationDispatcher`, `/notifications/unread-count`, `useNavBadges`, `useRealtimeSync`):*
    - Nuevo endpoint ligero `GET /notifications/unread-count` (`countPending` directo sin consultar 20 documentos) compartido vía `navConfig` + `useNavBadges` por `Navbar` y `MobileBottomNav`, alimentado en tiempo real por Socket.IO (`useRealtimeSync`) y polling de respaldo pausado en segundo plano (`60s`).
    - Extracción de `NotificationDispatcher` unificando creación de notificaciones, Socket.IO y WebPush entre `UpvoteService`, `ShareService`, `CreatePublicationService` y `FollowService`.
  - *Restricciones para Usuarios No Logeados (`Navbar`, `MobileBottomNav`, `GuestBottomBanner`, `App`, `Aside`, `HomeView`, `ProfileMeta`):*
    - Se ocultan todos los botones de navegación en desktop (`Navbar`) y móvil (`MobileBottomNav` retorna `null`, desplazando `GuestBottomBanner` a `bottom-0`), y se protegen rutas fuera de TL (`/`), detalle (`/publication/:id`), perfiles (`/:username`), auth y legales.
  - *Limpieza `/untangle-codebase` (Comentarios + Tests + Código muerto):*
    - Eliminado código muerto (`MobileHeader.tsx`), comentarios que solo repetían el código, y corregidos tests débiles/acoplados (`LogoutSection.test.tsx`, `EditProfileModal.test.tsx`, `ThreadAncestorsList.test.tsx`, `ChatMessageItem.test.tsx`, `publications.test.ts`, división de `web-push.test.ts`).
- **Hito 47: Popups de Emotes con Portal, Pegado/GIFs desde Portapapeles y Teclado Móvil, Scroll Inferior Cómodo, Sincronización en Tiempo Real al Volver, Refetch Admin/Moderación y Auditoría Integral de Seguridad (`/untangle-codebase`):**
  - *Panel de Emotes Sin Recortes (`EmojiPickerMenu`, `CreatePostModal`):*
    - Refactorización de `EmojiPickerMenu` con `createPortal(..., document.body)` y posicionamiento `fixed` limitado al viewport (`anchorRef`), eliminando `overflow-hidden` en `CreatePostModal` para que el selector sea accesible en escritorio y móvil.
  - *Pegado de Imágenes/GIFs y Teclado Móvil + Consolidación (`composerMediaHelper`, `useComposerMedia`, `ComposerAttachmentPreviews`, `PublicationCreator`, `ReplyComposer`, `ChatInputBar`):*
    - Soporte unificado de pegado desde portapapeles (`onPaste` de capturas, archivos GIF, HTML `<img>` y URLs directas) e inserción desde selectores de GIF de teclados móviles (`onBeforeInput` `dataTransfer`) en publicaciones, citas, respuestas y mensajes de chat, sustituyendo los componentes duplicados por `ComposerAttachmentPreviews` (con revocación limpia de `URL.createObjectURL`).
  - *Scroll Extra Inferior y Sincronización al Reanudar (`AppLayout`, `PublicationDetailView`, `ChatThread`, `ChatListSidebar`, `useRealtimeSync`, `useChatMessages`, `useChatsList`, `Header`):*
    - Espaciado inferior ampliado para evitar solapamientos con navegación y botón flotante móvil; actualización automática al recibir mensajes/notificaciones o al regresar a la pestaña/reconectar el socket (`visibilitychange`, `focus`, `connect`), marcado como leído en chats abiertos y protección ante bucles de re-fetching por IDs faltantes.
  - *Refetch en Paneles de Administración/Moderación (`AdminView`, `ModerationView`, `AdminReportsList`, `AdminReportCard`, `useAdminReports`, `AdminModerationTab`):*
    - Adición de `Header` con botón de actualización visible en todas las resoluciones, `PullToRefresh`, refetch por visibilidad, invalidación cruzada de métricas/reportes/usuarios y uso de `DELETE /publications/:id` para moderadores al eliminar publicaciones reportadas.
  - *Hardening Integral de Seguridad (`TokenService`, `AuthSessionValidator`, `AuthGuard`, `CorsPolicy`, `RateLimiter`, `FileUploadGuard`, `UrlSecurityHelper`, `HtmlEscapeHelper`, `UrlHelper`, rutas y repositorios):*
    - Separación estricta de tokens `access`/`verification`, revocación activa de sesiones en Postgres + registro en memoria y desconexión WebSocket en suspensión/cambio o restablecimiento de contraseña, validación CORS estricta y rate limiting por IP fiable (`trust proxy: 1`), verificación participante HTTP+Socket y pertenencia de `reply_to_id` al chat, defensa SSRF DNS/IP/redirecciones, firma mágica de imágenes subidas, escape HTML/JSON-LD (`</script>`), bloqueo de redirecciones abiertas (`//`, `.onrender.com` spoofing, `javascript:`), escape RegExp contra ReDoS, aislamiento `user_id` + rechazo NoSQLi en Push y omisión de hashes/tokens secretos (`password`, ImgBB `delete_url`) en respuestas y consultas administrativas.
- **Hito 48: Gestos Pinch-to-Zoom Móvil y Liberación Fiable de Arrastre en Vista Ampliada (`ImageViewerModal`, `useImageViewerZoom`, `touchPinchMath`):**
  - *Zoom con Dos Dedos en Móvil:*
    - Soporte multi-táctil (`touches.length === 2`) con cálculo proporcional de escala y centrado en el punto medio (`computePinchPosition`), transición continua a paneo de 1 dedo al levantar uno de los dedos, bloqueo de zoom nativo del navegador (`touch-action: none` y `{ passive: false }` en `touchmove`/`gesturestart`) en `ImageViewerModal` y `useImageViewerZoom`.
  - *Arrastre PC Sin Quedarse Pegado:*
    - Registro inmediato en fase de captura (`mouseup`, `pointerup`, `blur`, `contextmenu`) y en JSX (`onMouseUp`, `onPointerUp`) mediante `stopDragging` sincronizado con refs (sin esperar al `useEffect` post-render tras clics rápidos), filtro estricto de botón principal (`e.button === 0`) y validación de botón activo `(e.buttons & 1) === 0` en `mousemove`.

- **Hito 49: Auditoría Profunda de Seguridad, Migración a Dominio API Propio (`api.oomfy.online`), Actualización de Dependencias, Ciclo de Vida y Portabilidad de Cuenta, y Desenredo `/untangle-codebase` (Completado):**
  - *Alineación de Dominios y CSP Estricto (`site.ts`, `security.ts`, `CorsPolicy.ts`, `UrlHelper.ts`, `vite.config.ts`, `_headers`, `_redirects`, `sw.js`):*
    - Se actualizó `API_PROD_URL` a `https://api.oomfy.online`, eliminando comodines y rutas heredadas de `.onrender.com` en CORS (`CorsPolicy`), cliente (`UrlHelper`), redirecciones y Service Worker (`sw.js`).
    - Se endureció la CSP de producción eliminando `'unsafe-inline'` de `scriptSrc`, `'http:'` de `imgSrc` y comodines genéricos `'https:'`/`'ws:'` de `connectSrc` (acotando a `'self'` y `*.oomfy.online`), manteniendo las relajaciones de desarrollo exclusivamente en `vite serve` (`buildDevCspHeader`).
  - *Configuración Fail-Closed y Base de Datos (`Environment.ts`, `PostgresPool.ts`, `005_security_token_hashes.sql`):*
    - Fallo temprano en producción (`Environment.assertProductionSecrets`) si faltan `JWT_SECRET` o `JWT_REFRESH_SECRET`, usan valores por defecto, tienen `< 32` caracteres o coinciden entre sí.
    - Habilitación por defecto de validación de certificados TLS en PostgreSQL (`PG_SSL_REJECT_UNAUTHORIZED !== 'false'`).
    - Nueva migración PostgreSQL `005_security_token_hashes.sql` para tabla `verification_token`, hashes de un solo uso, `previous_token_hash`, índices en minúsculas y purga de registros caducos.
  - *Autenticación, Criptografía y Cookies de Primera Parte (`PasswordHasher`, `TokenService`, `PostgresSessionRepository`, `AuthSessionValidator`, `AuthController`, `authStore`, `ApiClient`, `useSessionInitializer`):*
    - Aumento de coste `bcrypt` a `SALT_ROUNDS = 12`; comparación en tiempo constante ante usuario inexistente (`SigninService`); tokens opacos CSPRNG de 256 bits almacenados como hash `SHA-256` en verificación (`SignupService`/`VerifyService`) y recuperación (`ForgotPasswordService`/`ResetPasswordService` en transacción PG), con correos escapados y despachados de forma asíncrona.
    - Exclusividad de verificación vía `POST /auth/verify`, separación estricta `tokenType: 'access'` vs `'refresh'`, rotación de refresh token con detección de reutilización y revocación inmediata de sesión, validación obligatoria de `sessionId` y sesión activa en PostgreSQL (`AuthSessionValidator`), y revocación/desconexión de WebSockets en cambios de rol, contraseña o estado (`UserStatusEnforcementHelper`).
    - Emisión de cookie `refresh_token` first-party (`HttpOnly; Secure; SameSite=Lax; Domain=.oomfy.online`), eliminación del refresh token del JSON de respuesta y de `localStorage` (`sessionTokenMemory.ts` en memoria + restauración silenciosa al arranque en `useSessionInitializer` + guard de carga en `ProtectedRoute`).
  - *Validación Zod, Rate Limiting, Anti-SSRF, Limpieza EXIF y Portabilidad/Borrado de Cuenta (`ImageMetadataStripper`, `UrlSecurityHelper`, `AccountLifecycleService`, `AccountLifecycleSection`):*
    - Validación integral Zod v4 en rutas administrativas, reportes, seguimiento, sesiones, notificaciones, chats, auxiliares y perfil (`ValidateRequest.body/query/params`), cobertura del limitador global sobre `/` y `/api`, límite JSON reducido a `1mb`, manejo seguro de errores `MulterError` / PostgreSQL (`22P02`, `22007`, `23505`), validación estricta de host en `UrlPreviewAdapter` (preservando `iframe_url` de Spotify) y bloqueo ampliado CIDR/IPv6 en `UrlSecurityHelper`.
    - Limpieza binaria automática de metadatos EXIF/IPTC/tEXt/XMP en imágenes JPEG/PNG/WebP subidas (`ImageMetadataStripper`), eliminación remota segura de activos ImgBB (`UPSERT` PG en `ProfileMediaService` y limpieza al eliminar publicaciones/cuenta), exclusión de usuarios suspendidos/pendientes en búsquedas, sugerencias, sitemaps y chat, y eliminación de sincronización de `email` hacia Mongo `members`.
    - Nuevos endpoints `GET /members/me/export` (descarga JSON de datos personales) y `DELETE /members/me` (borrado irreversible verificado por contraseña con limpieza en PostgreSQL, MongoDB, ImgBB y sesiones activas), integrados en `<AccountLifecycleSection />` dentro de Ajustes.
  - *Dependencias y `/untangle-codebase` (Código Muerto, Comentarios y Tests):*
    - Eliminado `package-lock.json` duplicado, activos duplicados en `public/assets/assets` y `public/fonts/fonts`, y código muerto (`TenorAdapter.ts`, `findThread`, `removeSubscription`). Actualizadas dependencias (`zod@4.6.7`, `bcrypt@6.0.0`, `resend@6.38.0`, `react-router-dom@7.18.5`, `vitest@4.1.12`) reduciendo las vulnerabilidades de `pnpm audit` de 21 (3 críticas, 9 altas, 8 moderadas, 1 baja) a 0 críticas/altas/moderadas.
    - Consolidada la barra de herramientas de compositores (`PublicationComposerToolbar`), corregido estado obsoleto en `AdminEditUserModal`, alineados los límites con `@oomfy/shared` en `EditProfileModal`, saneados comentarios redundantes y fortalecida la suite de pruebas verificando invariantes reales de seguridad y ciclo de vida.
