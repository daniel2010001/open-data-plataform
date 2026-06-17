# 📋 PRD - Plataforma de Datos Abiertos UMSS

**Versión:** 1.0  
**Fecha:** 2026-06-16  
**Estado:** Borrador para validación

---

## 1. Resumen Ejecutivo

La Universidad Mayor de San Simón (UMSS) requiere una plataforma digital centralizada para la gestión, publicación y descubrimiento de datos académicos y administrativos. La plataforma permitirá a personal administrativo, docentes e investigadores almacenar, organizar, versionar, colaborar y visualizar conjuntos de datos, garantizando gobernanza, auditoría y acceso controlado. El sistema está diseñado para ser desacoplado del sistema de autenticación central, permitiendo futura integración con SSO/LDAP.

---

## 2. Objetivos

### General
Desarrollar e implementar una plataforma digital centralizada de gestión y publicación de archivos académicos y administrativos en la UMSS, que facilite el almacenamiento, la búsqueda, la colaboración y el intercambio de información de forma segura, auditable y accesible, cumpliendo estándares de datos abiertos (FAIR).

### Específicos (actualizados y priorizados)
1. **Módulo de Organizaciones**: Definir entidades (facultades, departamentos, institutos, unidades) con jerarquía figurativa (sin herencia de permisos). Cada organización tendrá su propia gobernanza sobre datasets.
2. **Carga de recursos**: Permitir subir archivos en múltiples formatos (PDF, CSV, imágenes, JSON, TXT) y enlaces externos, con validación de tamaño y tipo.
3. **Gestión de metadatos**: Implementar un editor de metadatos basado en un esquema mínimo extensible (Dublin Core/DCAT-AP), con historial de versiones y aprobación.
4. **Análisis de datos (core diferencial)**: Procesar archivos CSV, normalizar datos en una base de datos interna, y generar visualizaciones interactivas (gráficos de barras, líneas, mapas) configurables por el usuario, con opción de asistencia por IA (futuro).
5. **Catálogo con búsqueda facetada**: Indexar metadatos en Solr para búsqueda rápida con filtros por organización, etiquetas, visibilidad, fecha, etc.
6. **Previsualización y exportación**: Visor de documentos (PDF, imágenes, TXT, JSON) y tabla simple para CSV; exportación de resultados en formatos estándar (PDF, PNG/JPEG, CSV).
7. **Grupos y colaboración**: Permitir la creación de colecciones de datasets (transversales a organizaciones) y equipos de usuarios, con permisos granulares.

---

## 3. Alcance

### Dentro del alcance (v1)
- Registro y autenticación de usuarios (manual por superadmin y admins de organización).
- Gestión completa de organizaciones (CRUD, jerarquía figurativa).
- Gestión de datasets (CRUD, metadatos, recursos, versionado).
- Control de visibilidad (3 niveles: privado, interno de organización, público).
- Flujo de aprobación para publicación (borrador → revisión → aprobado → publicado).
- Colaboradores con roles (viewer, editor, steward) por dataset.
- Equipos (teams) pertenecientes a una organización, con miembros de distintas orgs.
- Colecciones (grupos de datasets) con publicación condicionada a aprobación de orgs propietarias.
- Auditoría completa de operaciones críticas (CUD, cambios de estado, login).
- Soft-delete y bloqueo (accesible, solo lectura, bloqueado total).
- API REST pública (con API Key) para consulta de datasets públicos.
- Búsqueda facetada con Solr.
- Módulo de análisis de datos: carga de CSV, normalización en tablas, gráficos básicos (barras, líneas) configurables.

### Fuera del alcance (v1)
- Autenticación SSO/LDAP (se integrará en v2).
- Extracción automática de metadatos desde contenido de archivos (OCR, lectura de cabeceras, etc.).
- Edición masiva de metadatos.
- Motor de IA para sugerencia de gráficos o preguntas en lenguaje natural (se contempla como opcional para v2).
- Mapas interactivos (requieren datos geoespaciales, se posponen a v2).
- Integración con repositorios externos (Google Drive, Dropbox, etc.).

---

## 4. Historias de Usuario (por rol)

| Rol | Historia |
|-----|----------|
| **Superadmin** | Como superadmin, quiero crear organizaciones y usuarios, asignar admins de organización, y auditar todas las acciones. |
| **Admin de Organización** | Como admin de organización, quiero gestionar los datasets de mi org, aprobar publicaciones, y asignar colaboradores. |
| **Editor** | Como editor, quiero crear datasets, subir recursos, editar metadatos, y solicitar publicación. |
| **Steward (dataset)** | Como steward, quiero gestionar colaboradores de un dataset y aprobar cambios menores. |
| **Visualizador** | Como visualizador (interno o público), quiero buscar, visualizar y descargar datasets según mi nivel de acceso. |
| **Investigador** | Como investigador, quiero crear colecciones transversales con datasets de diferentes orgs para mi trabajo, y solicitar su publicación si es necesario. |

---

## 5. Requerimientos Funcionales (desglosados por módulo)

### Módulo de Usuarios y Autenticación
- RF-01: El sistema tendrá roles: `superadmin`, `org_admin`, `editor`, `viewer` (a nivel de organización) y roles específicos por dataset (`viewer`, `editor`, `steward`).
- RF-02: Los usuarios pertenecen a una organización principal (tabla `user_organizations` para soporte multi-org en el futuro).
- RF-03: La creación de usuarios solo la realiza un `superadmin` o un `org_admin` (para su organización).
- RF-04: Autenticación mediante email y contraseña (hash bcrypt), con sesión JWT.
- RF-05: El login es desacoplado del SSO; se proveerán endpoints estándar para futura integración.

### Módulo de Organizaciones
- RF-06: Las organizaciones tienen: nombre, slug único, descripción, jerarquía (padre opcional, solo figurativa), metadatos de creación.
- RF-07: Cada organización tiene al menos un `org_admin`.
- RF-08: Los datasets pertenecen a una única organización (propietaria).

### Módulo de Datasets
- RF-09: Un dataset tiene: título, descripción (richtext), organización propietaria, estado de ciclo de vida (`draft`, `review`, `approved`, `published`), visibilidad (`private`, `internal`, `public`), metadatos estándar (título, descripción, publicador, fecha de emisión, fecha de modificación, idioma, licencia, palabras clave).
- RF-10: Los metadatos se almacenan en formato JSONB para flexibilidad.
- RF-11: Cada dataset puede tener múltiples **recursos** (archivos o enlaces). Cada recurso tiene: nombre, descripción, tipo (archivo/enlace), tamaño, hash SHA-256 (para archivos), URL (para enlaces), y metadatos de subida.
- RF-12: Tamaño máximo por recurso: 50 MB (configurable).
- RF-13: Un recurso solo puede contener un archivo o un enlace.

### Módulo de Versionado y Aprobación
- RF-14: Los datasets tienen versiones. Una versión se crea explícitamente por el usuario (no automática). Cada versión tiene: número de versión (semántico o etiqueta editable), fecha, autor, estado de aprobación (`pending`, `approved`, `rejected`), y visibilidad propia (hereda de la versión base, pero puede ser distinta).
- RF-15: El flujo de publicación es:
  1. El editor crea/edita un dataset en estado `draft`.
  2. Solicita revisión → estado pasa a `review`.
  3. Un `org_admin` o `steward` con permiso de aprobación revisa y puede: aprobar (pasa a `approved`) o rechazar (vuelve a `draft` con comentarios).
  4. Una vez aprobado, el editor o admin puede solicitar cambio de visibilidad (`private` → `internal` o `public`). Esta solicitud queda registrada en una tabla `publication_requests` y debe ser aprobada por un `org_admin`.
- RF-16: Cada vez que se aprueba o rechaza una revisión, se genera una nueva versión (con su estado) para auditoría.
- RF-17: Cambios menores (edición de título, descripción, metadatos) no generan nueva versión, solo se registran en auditoría.

### Módulo de Colaboradores y Equipos
- RF-18: Un dataset puede tener colaboradores (usuarios) con permisos explícitos: `view`, `edit`, `admin` (steward). La asignación se realiza mediante la tabla `dataset_collaborators`.
- RF-19: Los permisos se asignan directamente a usuarios o a través de **equipos** (teams). Los equipos pertenecen a una organización y pueden contener usuarios de distintas organizaciones.
- RF-20: Los equipos tienen: nombre, descripción, organización propietaria, miembros (con roles dentro del equipo: member, manager).

### Módulo de Colecciones (Grupos de Datasets)
- RF-21: Cualquier usuario registrado puede crear una colección (agrupación de datasets) con: nombre, descripción, visibilidad (`private`, `internal`, `public`).
- RF-22: Una colección puede contener datasets de diferentes organizaciones.
- RF-23: Para que una colección sea pública, todos los datasets incluidos deben estar aprobados y su visibilidad debe ser compatible. Además, se requiere una solicitud de publicación que debe ser aprobada por los `org_admin` de cada dataset involucrado (o por un superadmin).

### Módulo de Análisis de Datos
- RF-24: Al subir un archivo CSV como recurso, el usuario puede activar el **análisis** (opcional). El sistema:
  - Lee el CSV y detecta columnas y tipos de datos (texto, número, fecha, booleano).
  - Crea una tabla temporal en la base de datos (con estructura dinámica) asociada al recurso.
  - Genera estadísticas de frecuencia de valores (para detectar calidad de datos).
  - Permite al usuario crear gráficos configurando eje X, eje Y y tipo (barras, líneas, pastel).
- RF-25: Para mapas, se requiere columnas con latitud/longitud o geocodificación (pospuesto a v2).
- RF-26: La IA para sugerencias es opcional y se implementará en versiones posteriores.

### Módulo de Búsqueda y Catálogo
- RF-27: Todos los metadatos (título, descripción, etiquetas, organización, fechas, licencia, visibilidad) se indexan en Solr.
- RF-28: La búsqueda permite filtros por: organización, etiquetas, visibilidad, fecha de creación/actualización, tipo de recurso.
- RF-29: Los resultados muestran facetas de cada filtro.

### Módulo de Previsualización y Exportación
- RF-30: Los archivos PDF, imágenes, TXT y JSON se previsualizan en el navegador.
- RF-31: Para CSV sin análisis, se muestra una tabla con primeras 20 filas.
- RF-32: Los gráficos generados en el módulo de análisis se pueden exportar como PNG o JPEG. Los datos de la tabla subyacente se pueden exportar como CSV.

### Módulo de Auditoría y Seguridad
- RF-33: Se auditan todas las operaciones CUD sobre datasets, recursos, colaboradores, equipos, colecciones, cambios de visibilidad, aprobaciones, logins y logouts.
- RF-34: La auditoría se registra en una tabla `audit_logs` desde el backend, complementada con triggers en la base de datos para mayor seguridad.
- RF-35: Soft-delete: las entidades tienen `deleted_at` (ocultas para todos, excepto superadmin). La eliminación permanente solo la realiza un superadmin bajo instrucción explícita y queda registrada.
- RF-36: Bloqueo: las entidades tienen un estado `access_status` con valores: `accessible`, `readonly` (solo lectura), `locked` (inaccesible). Reversible por usuarios con permisos de administración.

### API Pública
- RF-37: Se expondrá una API REST (documentada con OpenAPI) para consultar datasets públicos, recursos, y realizar búsquedas.
- RF-38: El acceso a la API requerirá una API Key (generada por superadmin) para control de tasa de uso y trazabilidad.

---

## 6. Requerimientos No Funcionales

- **Rendimiento**: Tiempo de carga de páginas < 2 segundos. Búsqueda facetada con respuesta < 1 segundo para hasta 100k datasets.
- **Escalabilidad**: Arquitectura basada en microservicios (separando el módulo de análisis). Base de datos PostgreSQL con replicación para consultas.
- **Seguridad**: Todos los endpoints (excepto login y API pública) requieren autenticación JWT. Cifrado de datos sensibles (no aplica). Política de contraseñas robusta.
- **Disponibilidad**: 99.5% de uptime en horario académico.
- **Auditoría**: Logs retenidos por 5 años (política de la universidad).
- **Usabilidad**: Interfaz responsive (Bootstrap/Tailwind), accesible (WCAG 2.1 AA).

---

## 7. Modelo de Datos Conceptual (Entidades Principales)

- `users` (id, email, name, password_hash, super_admin, created_at)
- `organizations` (id, name, slug, description, parent_id, created_at)
- `user_organizations` (user_id, organization_id, role -> org_admin/editor/viewer)
- `datasets` (id, title, description_rich, organization_id, metadata JSONB, lifecycle_status, visibility, access_status, deleted_at, created_at, updated_at)
- `versions` (id, dataset_id, version_label, metadata_snapshot JSONB, status (pending/approved/rejected), visibility, created_by, created_at)
- `resources` (id, dataset_id, name, description, type (file/link), file_path, file_hash, size, link_url, access_status, deleted_at)
- `dataset_collaborators` (id, dataset_id, user_id, permissions JSONB, role_alias (viewer/editor/steward), granted_by, created_at)
- `teams` (id, organization_id, name, description, created_at)
- `team_members` (team_id, user_id, role (member/manager))
- `collections` (id, name, description, visibility, access_status, created_by, created_at)
- `collection_datasets` (collection_id, dataset_id)
- `publication_requests` (id, dataset_id, requested_visibility, status (pending/approved/rejected), requested_by, approved_by, comments, created_at)
- `audit_logs` (id, actor_id, action, entity_type, entity_id, old_values JSONB, new_values JSONB, ip, user_agent, created_at)

---

## 8. Flujos Clave (Simplificados)

### Publicación de un dataset
1. Editor crea dataset en `draft` con metadatos básicos.
2. Agrega recursos (archivos/enlaces).
3. Solicita revisión → estado `review`.
4. Org_admin o steward aprueba → estado `approved` (se genera versión).
5. Editor (o admin) solicita cambio de visibilidad a `internal` o `public`.
6. Org_admin aprueba la solicitud de publicación → visibilidad actualizada.

### Colaboración en un dataset
1. Steward del dataset invita a un usuario (por email) o agrega un equipo.
2. El colaborador recibe notificación (correo) y acepta (opcional).
3. Se le asignan permisos según rol elegido.

### Creación de una colección pública
1. Usuario crea colección y agrega datasets (pueden ser de distintas orgs).
2. Solicita publicación de la colección.
3. El sistema verifica que todos los datasets estén aprobados y con visibilidad compatible.
4. Se notifica a los org_admins de cada dataset para que aprueben la inclusión.
5. Una vez todas las aprobaciones recibidas, la colección se publica.

---

## 9. Matriz de Permisos (RBAC simplificado)

| Acción | Viewer | Editor | Steward | Org Admin | Superadmin |
|--------|--------|--------|---------|-----------|------------|
| Ver dataset (según visibilidad) | Sí | Sí | Sí | Sí | Sí |
| Editar metadatos (si no está bloqueado) | No | Sí | Sí | Sí | Sí |
| Agregar/editar/eliminar recursos | No | Sí | Sí | Sí | Sí |
| Crear versión | No | Sí | Sí | Sí | Sí |
| Solicitar revisión/publicación | No | Sí | Sí | Sí | Sí |
| Aprobar revisión (dataset propio) | No | No | Sí (si permiso) | Sí | Sí |
| Aprobar cambio de visibilidad | No | No | No | Sí | Sí |
| Gestionar colaboradores | No | No | Sí | Sí | Sí |
| Eliminar lógicamente (soft-delete) | No | No | No | No (solo superadmin) | Sí |
| Cambiar bloqueo (readonly/locked) | No | No | No | Sí (sobre sus datasets) | Sí |

---

## 10. Consideraciones Técnicas

- **Backend**: Node.js (NestJS) o Python (Django) con API REST.
- **Base de datos**: PostgreSQL (JSONB para metadatos, tablas EAV para normalización de CSV).
- **Búsqueda**: Solr (o Elasticsearch) con indexación asíncrona.
- **Almacenamiento de archivos**: Sistema de archivos local o S3-compatible (MinIO) con rutas organizadas por hash.
- **Colas de trabajo**: Bull/Redis para procesamiento de CSV y normalización.
- **Frontend**: React con componentes reutilizables (Material UI o Tailwind).
- **Autenticación**: JWT con refresh tokens.
- **Despliegue**: Docker + Kubernetes (opcional) para escalabilidad.

---

## 11. Criterios de Aceptación (por feature principal)

- **Carga de CSV con análisis**: Al subir un CSV, el sistema crea una tabla en la DB, muestra estadísticas y permite crear al menos un gráfico de barras en menos de 30 segundos para 10k filas.
- **Búsqueda facetada**: Los filtros se actualizan dinámicamente y devuelven resultados en < 1 segundo.
- **Versionado**: Cada cambio de versión queda registrado y se puede navegar entre versiones históricas.
- **Auditoría**: Todas las acciones críticas se registran y son visibles para superadmin.
- **API pública**: Endpoints de listado, detalle y búsqueda funcionan con API Key y devuelven JSON.

---

## 12. Riesgos y Supuestos

| Riesgo | Mitigación |
|--------|------------|
| Complejidad del módulo de análisis (normalización en DB) | Priorizar funcionalidad básica (tabla + gráficos simples), diferir IA y optimizaciones. |
| Curva de aprendizaje de Solr | Considerar Elasticsearch o pg_search si el equipo tiene más experiencia en PostgreSQL. |
| Integración SSO futura | Diseñar la autenticación con una capa de abstracción (interfaz de proveedor) para cambiar fácilmente. |
| Carga de archivos grandes | Limitar tamaño a 50 MB en v1; implementar subida por partes si se requiere. |
| Gobernanza de colecciones públicas | Automatizar notificaciones y flujo de aprobación; si una org no responde, escalar a superadmin. |

---

## 📌 Próximos pasos (post-PRD)

1. **Validación con stakeholders**: Presentar el PRD y ajustar según feedback.
2. **Desglose técnico**: Crear historias de usuario en Jira/Trello y estimar esfuerzo.
3. **Definir el stack final** (lenguaje, base de datos, etc.) según perfil del equipo.
4. **Diseño de UI/UX**: Crear wireframes y prototipos.
5. **Configurar entorno de desarrollo** con pipelines CI/CD.

