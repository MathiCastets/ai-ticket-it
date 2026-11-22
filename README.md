# AI Ticket It - Plataforma de Venta de Entradas para Eventos

Trabajo Práctico Individual de Desarrollo con Inteligencia Artificial  
**Desarrollo de Software (DDS) - UTN FRBA - 2C 2026**

---

## 📦 Estructura del Monorepo

Organizado con `npm workspaces`:

```text
ai-ticket-it/
├── packages/
│   ├── backend/        # Servidor Express.js (Node.js en capas con persistencia en memoria)
│   │   ├── index.js                    # Arranque del proceso y graceful shutdown
│   │   ├── stryker.config.json         # Configuración de mutation testing (Stryker)
│   │   ├── tests/                      # Suite de tests modular por capas y concurrencia (Jest)
│   │   ├── uploads/                    # Fotos de eventos guardadas localmente (ignorado por Git)
│   │   └── src/
│   │       ├── app.js                  # Configuración de Express (CORS, JSON, estáticos, routes, errors)
│   │       ├── config/                 # Variables de entorno y configuración de uploads
│   │       ├── controllers/            # Controladores HTTP livianos (adaptación HTTP y delegación a servicios)
│   │       ├── domain/                 # Modelo y reglas del negocio (Entidades puras, enums y errores)
│   │       │   ├── entities/           # Evento, TipoEntrada, Compra, CambioEstadoCompra, Usuario, Categoria, Mensaje, Resenia
│   │       │   ├── enums/              # EstadoCompra (PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA)
│   │       │   └── errors/             # CupoInsuficienteError, EstadoCompraInvalidoError, ReglaNegocioError
│   │       ├── middlewares/            # authHandler, eventImageUpload, errorHandler, notFoundHandler
│   │       ├── repositories/           # Repositorios in-memory desacoplados + seedData
│   │       ├── routes/                 # Enrutadores Express (/eventos, /compras, /categorias, /usuarios)
│   │       └── services/               # Casos de uso (EventoService, CompraService, MensajeService, UsuarioService, CategoriaService, EventoImageStorage)
│   │
│   └── mobile/         # Aplicación Mobile (React Native + Expo SDK 58)
│       ├── App.js                      # Root container con Safe Area, NotificationProvider y shell responsive
│       └── src/
│           ├── components/             # Header, AccessDeniedView, DateTimeSelector, EstadoCompraBadge, NotificationProvider, SearchBar
│           │   ├── eventos/            # EventCard, TicketOptionCard, OrganizerReviewsSection, CompraExitosaModal, EditarEventoModal, OrganizadorEventoCard, PublicacionResultadoModal, SortOptionsModal, TipoEntradaFormCard
│           │   ├── tickets/            # TicketCard, TicketQrModal, CancelCompraModal
│           │   └── loading/            # Skeletons y Spinners
│           ├── config/                 # apiConfig.js (URL base, resolución de imágenes y flag mock)
│           ├── context/AppContext.js   # Estado global, sincronización con API y selector de perfiles
│           ├── data/mockData.js        # Datos locales opcionales solo para modo aislado
│           ├── navigation/             # Tab Navigator dinámico según rol + Stack Navigator
│           ├── screens/                # Explorar, DetalleEvento, MisTickets, Calificar, OrganizadorEventos, CrearEvento, Escanear, PanelVentas, MensajesInbox, Chat
│           ├── services/api.js         # Cliente HTTP centralizado hacia la API Express con header X-User-Id
│           ├── theme/                  # colors.js ("Nocturne Electric") y commonStyles.js
│           └── utils/normalizers.js    # Normalización y formateo de payloads de la API
├── eslint.config.mjs   # Configuración de ESLint para backend y mobile
├── package.json        # Configuración del monorepo (root)
└── README.md           # Guía completa del proyecto
```

---

## 🏛️ Arquitectura del Backend

El backend aplica una arquitectura en capas con persistencia en memoria y dominio rico:

1. **Domain (`src/domain/`)**:
   - Entidades puras de JavaScript independientes de HTTP o librerías de persistencia.
   - Incluye los métodos y reglas definidas en el diagrama conceptual:
     - `TipoEntrada.hayCupoPara(cantidad)`, `descontarCupo(cantidad)` y `restituirCupo(cantidad)`.
     - `Evento.tuPrecioEstaEntre(min, max)`, `precioMinimo()` y `estaCerrado()`.
     - `Compra.actualizarEstado(nuevoEstado, quien, motivo)` con máquina de estados explícita (`TRANSICIONES_PERMITIDAS`) e historial de auditoría (`CambioEstadoCompra`).
     - `Compra.puedeCancelarse()`: permite cancelar **solo** si la entrada no está `UTILIZADA` (ni ya cancelada/reembolsada) y el evento aún no se ha realizado.
     - Serialización segura mediante `toJSON()` que omite datos sensibles (`email`) en todas las respuestas.
2. **Repositories (`src/repositories/inMemory/`)**:
   - Repositorios en memoria desacoplados que comparten la instancia inicial de `seedData` para preservar la consistencia referencial entre compras, eventos, usuarios y categorías.
3. **Services (`src/services/`)**:
   - Implementa los casos de uso del sistema: compra de entradas con mutaciones de stock serializadas en una cola de promesas (`#serializarMutacion`) para evitar condiciones de carrera y compensación en memoria (`#revertirMutacion`) ante fallos de persistencia, cancelación con restitución de cupo, acreditación en puerta, reseñas por organizador, favoritos por usuario y mensajería por compra.
   - La compensación protege la consistencia durante la ejecución, pero no equivale a una transacción durable: los datos viven en memoria y se reinician al detener el servidor.
4. **Controllers & Middlewares (`src/controllers/`, `src/middlewares/`)**:
   - Controladores livianos que actúan únicamente como adaptadores HTTP: extraen parámetros de `req`, delegan la operación en el servicio correspondiente y formatean la respuesta HTTP sin contener lógica de negocio.
   - `authHandler` resuelve la identidad del usuario a partir del header `X-User-Id` para validar roles y propiedad de recursos en rutas protegidas.
   - `eventImageUpload` procesa cargas `multipart/form-data` y `EventoImageStorage` valida *magic bytes* (JPEG, PNG y WebP) antes de escribir en disco.
   - `errorHandler` centralizado que traduce los errores tipados a sus códigos HTTP:
     - `CupoInsuficienteError` / `EstadoCompraInvalidoError` ➔ `409 Conflict`
     - `ResourceNotFoundError` / `EntityNotFoundError` ➔ `404 Not Found`
     - `ForbiddenError` ➔ `403 Forbidden`
     - `UnauthorizedError` ➔ `401 Unauthorized`
     - `ValidationError` / `BusinessRuleError` / `DomainError` ➔ `400 Bad Request`

---

## 📱 Arquitectura del Frontend (Mobile)

El módulo frontend en **React Native (Expo)** sigue un flujo de datos unidireccional (`Screen → AppContext → api.js`):

1. **Cliente HTTP Centralizado (`src/services/api.js`)**:
   - Encapsula todas las llamadas `fetch` hacia el backend Express e inyecta automáticamente el header `X-User-Id` del perfil activo.
2. **Estado Global y Sincronización (`src/context/AppContext.js`)**:
   - Administra el usuario activo, el catálogo de eventos, compras, mensajes y favoritos.
   - Sincroniza mutaciones (creación de compras, acreditación, calificación, cancelación y edición de eventos) actualizando de forma consistente el stock restante y las listas visibles según el rol.
3. **Pantallas y Componentes Modulares (`src/screens/`, `src/components/`, `src/theme/`)**:
   - Las pantallas delegan la presentación en componentes reutilizables agrupados por subdominio (`eventos/`, `tickets/`, `loading/`) y comparten tokens visuales desde `colors.js` y `commonStyles.js`.
   - Control de acceso por rol en cada vista mediante `AccessDeniedView` y navegación dinámica en `AppNavigator.js`.

---

## 🚀 Inicio Rápido

### 1. Instalación de Dependencias
Desde la raíz del repositorio:
```bash
npm install
```

### 2. Ejecutar Tests, Coverage y Mutation Testing del Backend
Ejecuta la suite completa de tests unitarios, de integración HTTP y de concurrencia (`657 tests` en Jest):
```bash
npm run test:backend
```

Para generar el reporte de cobertura de código (**Coverage**: `99.58% Statements` | `96.8% Branches` | `100% Functions` | `99.64% Lines`):
```bash
npm run test:coverage --workspace=backend
```

#### Mutation Testing (Stryker)
Stryker evalúa la efectividad de la suite de tests introduciendo mutaciones controladas sobre el código fuente (**Mutation Score**: `89.55% Total` | `90.33% Covered`). Para probarlo primero sobre un servicio puntual:
```bash
npm run test:mutation --workspace=backend -- --mutate src/services/UsuarioService.js
```
Para ejecutarlo sobre todo `src/`:
```bash
npm run test:mutation --workspace=backend
```
Stryker genera además un reporte HTML detallado en `packages/backend/reports/mutation/mutation.html`.

### 3. Ejecutar el Proyecto

* **Iniciar ambos módulos simultáneamente (Backend + Mobile):**
  ```bash
  npm run start:dev
  ```

* **O iniciar por separado:**
  - Backend en puerto 8000:
    ```bash
    npm run dev:backend
    ```
  - Mobile con Expo (Celular Expo Go / Web):
    ```bash
    npm run dev:mobile
    ```
    Escaneá el código QR con la app **Expo Go** en tu celular (o presioná `w` en la consola para abrir la vista web).

* **Ejecutar Linter:**
  ```bash
  npm run lint
  ```

### Modo de Datos del Mobile

Por defecto, la app consume exclusivamente la API Express inicializada con `seedData`. Si el backend no está disponible, la app muestra un estado de error con opción de reintentar y no cae silenciosamente en datos locales.

Para correr Expo Go en un dispositivo físico en red local:
1. Copiá [`packages/mobile/.env.example`](./packages/mobile/.env.example) como `packages/mobile/.env.local`.
2. Reemplazá `TU_IP_LOCAL` por la IP de tu PC en la red Wi-Fi.
3. Reiniciá Expo.

Los mocks de `src/data/mockData.js` se habilitan únicamente para pruebas aisladas de interfaz configurando `EXPO_PUBLIC_USE_MOCK_DATA=true`.

### Carga de Fotos de Eventos (API)

Los endpoints `POST /api/eventos` y `PUT /api/eventos/:id` aceptan tanto JSON como `multipart/form-data` para adjuntar una imagen de portada (campo `evento` o `cambios` con JSON serializado y archivo en el campo `imagenes`). Se acepta **una imagen por evento** en formato JPEG, PNG o WebP de hasta 5 MB. El backend verifica los *magic bytes* del archivo, genera un nombre UUID propio y la almacena en `packages/backend/uploads/`.

Las rutas devueltas en `data.imagen` y `data.multimedia` son relativas (por ejemplo, `/uploads/<uuid>.jpg`) y el cliente mobile las resuelve anteponiendo el origen de la API (`resolverImagen`). Se puede personalizar la carpeta mediante la variable `UPLOADS_DIRECTORY`.

En la app mobile, tanto el alta en **Organizar** como la edición en **Eventos** abren la galería del dispositivo y muestran la vista previa de la portada seleccionada.

---

## 📱 Recorrido Funcional y Perfiles de Demostración

La aplicación incluye un selector de perfiles al tocar el avatar en el `Header`. Esto permite alternar entre compradores y organizadores precargados enviando el header `X-User-Id` correspondiente en cada request:

1. **Exploración y Compra (Rol Comprador):**
   - **Explorar**: búsqueda textual, filtro por categorías y favoritos, y ordenamiento ascendente/descendente por **fecha, precio y ranking (puntaje del organizador)**.
   - **Detalle Evento**: visualización de reseñas previas paginadas del organizador, selección de tipo de entrada y cantidad respetando el cupo disponible, y confirmación de compra.
2. **Gestión de Entradas (Mis Tickets):**
   - Buscador, ordenamiento por fecha y 6 pestañas de estado: **Todas, Confirmadas, Pendientes, Utilizadas, Reembolsadas y Canceladas**.
   - Contador de **días faltantes** visible en compras en estado `CONFIRMADA`.
   - Modal de **Código QR** de la entrada digital.
   - **Cancelar Compra**: restituye el stock y pasa el estado a `REEMBOLSADA` (si estaba `CONFIRMADA`) o `CANCELADA` (si estaba `PENDIENTE`). El backend bloquea la operación si la entrada está `UTILIZADA` o el evento ya ocurrió.
   - **Calificar Evento**: habilitado únicamente sobre entradas `UTILIZADA` y no calificadas previamente (puntuación de **0.5 a 5 estrellas** + comentario de hasta 250 caracteres).
3. **Canal de Comunicación (Mensajes y Chat):**
   - Hilo de mensajes asociado a cada compra entre comprador y organizador, sincronizado contra la API REST con recarga periódica y control de mensajes no leídos.
   - Regla de cierre automático de conversación tras 48 horas de inactividad una vez pasado el evento (visible y filtrable desde la bandeja).
4. **Perspectiva del Organizador:**
   - Cambiar a un perfil organizador desde el avatar del `Header`.
   - **Eventos**: listado propio con filtros (texto, estado Activos/Terminados, rango de fechas y categoría), edición de eventos activos (nombre, ubicación, descripción, fecha/horario y portada) y duplicación de eventos.
   - **Organizar**: alta de nuevos eventos con múltiples tipos de entrada (precio y cupo) y carga de foto de portada.
   - **Escanear**: acreditación de entradas buscando por código de orden (`#TK-...`) o ID de compra, cambiando su estado de `CONFIRMADA` a `UTILIZADA`. *(La lectura con cámara queda fuera del alcance actual).*
   - **Panel de Ventas**: métricas de recaudación total e ingresos recientes, disponibilidad restante por tipo de entrada con barras de progreso y listado de compras asociadas con acceso directo al chat.
   - **Mensajes**: bandeja de entrada agrupada por evento y comprador.

Las pestañas inferiores se adaptan automáticamente al rol activo: **Explorar, Mis Tickets, Mensajes** para comprador, y **Eventos, Organizar, Escanear, Mensajes** para organizador.
