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
│   │   ├── test-backend.js             # Suite de tests de integración end-to-end
│   │   ├── src/
│   │   │   ├── app.js                  # Configuración de Express (CORS, JSON, routes, errors)
│   │   │   ├── config/                 # Variables de entorno y configuración técnica
│   │   │   ├── controllers/            # Controladores HTTP (validación y serialización)
│   │   │   ├── domain/                 # Modelo y reglas del negocio (Entidades puras, enums y errores)
│   │   │   │   ├── entities/           # Evento, TipoEntrada, Compra, Usuario, Categoria, etc.
│   │   │   │   ├── enums/              # EstadoCompra (CONFIRMADA, REEMBOLSADA, UTILIZADA, etc.)
│   │   │   │   └── errors/             # CupoInsuficienteError, EstadoCompraInvalidoError, etc.
│   │   │   ├── middlewares/            # errorHandler (mapeo tipado de códigos HTTP), notFoundHandler
│   │   │   ├── repositories/           # Repositorios en memoria (In-Memory persistencia desacoplada)
│   │   │   ├── routes/                 # Enrutadores Express (/eventos, /compras, /categorias)
│   │   │   └── services/               # Casos de uso y reglas de coordinación (EventoService, CompraService)
│   │   └── uploads/                    # Fotos de eventos guardadas localmente (ignorado por Git)
│   │
│   └── mobile/         # Aplicación Mobile (React Native + Expo SDK 58)
│       ├── App.js                      # Root container con soporte Responsive Web y Safe Area
│       └── src/
│           ├── components/             # Header, Modales, Skeletons, Spinners
│           ├── context/AppContext.js   # Estado global, sincronización con API y perfiles demo
│           ├── navigation/             # Tab Navigator (4 tabs) + Stack Navigator
│           ├── screens/                # Explorar, Detalle, MisTickets, Chat, Calificar, Crear, Panel
│           ├── services/api.js         # Cliente HTTP hacia la API Express
│           └── theme/colors.js         # Paleta "Nocturne Electric" inspirada en Stitch
├── package.json        # Configuración del monorepo (root)
└── README.md           # Guía completa del proyecto
```

---

## 🏛️ Arquitectura del Backend

El backend aplica una arquitectura por capas y persistencia en memoria. [`backend-architecture.md`](./backend-architecture.md) conserva la guía de referencia del TP Grupal; no describe literalmente los archivos ni la persistencia de este repositorio:

1. **Domain (`src/domain/`)**:
   - Entidades puras de JavaScript independientes de HTTP o librerías de persistencia.
   - Contiene los métodos requeridos por el diagrama de clases de la consigna:
     - `TipoEntrada.hayCupoPara(cantidad)` y `descontarCupo(cantidad)`.
     - `Evento.tuPrecioEstaEntre(min, max)`.
     - `Compra.actualizarEstado(nuevoEstado)` con historial de auditoría `CambioEstadoCompra`.
     - `Compra.puedeCancelarse()`: aplica la regla de negocio que **solo** permite cancelación si la entrada no está `UTILIZADA` y el evento aún no ha ocurrido.
2. **Repositories (`src/repositories/inMemory/`)**:
   - Implementación de repositorios desacoplados que comparten una única instancia de los datos semilla para conservar las referencias entre compras, eventos, usuarios y categorías.
3. **Services (`src/services/`)**:
   - Implementa los casos de uso: compra de entradas con mutaciones de stock serializadas y compensación ante fallos de guardado, cancelación con restitución de stock, acreditación en puerta (check-in), reseñas, favoritos por usuario y mensajería en hilo.
   - La compensación protege frente a errores durante la ejecución, pero no equivale a una transacción durable: los datos siguen en memoria y se pierden al detener el backend.
4. **Controllers & Middlewares (`src/controllers/`, `src/middlewares/`)**:
   - `errorHandler` centralizado que traduce los errores tipados del dominio y servicios a sus correspondientes códigos HTTP:
     - `CupoInsuficienteError` / `EstadoCompraInvalidoError` ➔ `409 Conflict`
     - `ResourceNotFoundError` / `EntityNotFoundError` ➔ `404 Not Found`
     - `ValidationError` / `BusinessRuleError` ➔ `400 Bad Request`

---

## 🚀 Inicio Rápido

### 1. Instalación de Dependencias
Desde la raíz del repositorio:
```bash
npm install
```

### 2. Ejecutar Tests de Integración del Backend
Verifica todos los flujos de dominio, cupos, cancelaciones y endpoints:
```bash
npm run test:backend
```

### 3. Ejecutar el Proyecto

* **Iniciar ambos simultáneamente (Backend + Mobile):**
  ```bash
  npm run start:dev
  ```

* **O iniciar por separado:**
  - Backend en puerto 8000:
    ```bash
    npm run dev:backend
    ```
  - Mobile con Expo (Web / Celular Expo Go):
    ```bash
    npm run dev:mobile
    ```
    Presioná `w` en la consola para abrirlo directamente en el navegador web, o escaneá el código QR con la app **Expo Go** en tu celular.

* **Ejecutar Linter:**
  ```bash
  npm run lint
  ```

### Modo de datos del Mobile

La app usa exclusivamente los datos servidos por el backend por defecto, que se inicializan desde `seedData`. Si el backend no está disponible, la app informa el error y no muestra ni modifica datos locales. Para correr Expo Go en un dispositivo físico, copiá [`packages/mobile/.env.example`](./packages/mobile/.env.example) como `packages/mobile/.env.local`, reemplazá `TU_IP_LOCAL` por la IP de tu PC en la red y reiniciá Expo. Los mocks del frontend se habilitan únicamente para pruebas aisladas de la interfaz configurando `EXPO_PUBLIC_USE_MOCK_DATA=true`; en ese modo, las mutaciones se aplican solo localmente.

### Carga de fotos de eventos (API)

El alta `POST /api/eventos` acepta JSON como antes o `multipart/form-data` para incluir una foto. En una solicitud multipart, enviá el evento serializado como JSON en el campo `evento` y adjuntá un archivo en el campo `imagenes`. Se aceptan JPEG, PNG y WebP, con un máximo de 5 MB. El backend verifica el contenido del archivo, genera un nombre propio y guarda la imagen en `packages/backend/uploads/`.

La respuesta mantiene la imagen en `data.multimedia` y `data.imagen`. Las rutas de imagen son relativas (por ejemplo, `/uploads/<id>.jpg`) y el backend las sirve desde esa ruta; el cliente debe anteponer el origen de la API para mostrarlas. Para cambiar el directorio de almacenamiento se puede definir `UPLOADS_DIRECTORY`. El almacenamiento es local y no durable: los archivos no se suben a un servicio externo ni se comparten entre instancias del servidor.

En la app móvil/web, el formulario **Organizar** abre la galería del teléfono o el explorador de archivos de la computadora. Las fotos seleccionadas se previsualizan antes de publicar; la primera queda como portada y se muestra en Explorar, detalle del evento y Mis Tickets.

---

## 📱 Guía para el Video Demostrativo (5 a 10 minutos)

La aplicación incluye un selector de perfiles de demostración al tocar el avatar del Header. Permite cambiar entre compradores y organizadores existentes y probar los flujos desde cada perspectiva:

1. **Flujo de Compra y Control de Cupos (Rol Comprador):**
   - Pantalla **Explorar**: búsqueda, filtrado por categorías y ordenamiento por fecha/precio.
   - Pantalla **Detalle Evento**: selección de tipos de entrada, visualización de cupos disponibles y compra de entradas.
2. **Gestión de Entradas (Mis Tickets):**
   - Pestañas de estado (Todas, Confirmadas, Pendientes, Historial).
   - Apertura del **Código QR** oficial para el acceso al evento.
   - Botón **"Calificar Evento"**: disponible únicamente una vez utilizada la entrada (1 a 5 estrellas + reseña).
   - Botón **"Cancelar Compra"**: demuestra la regla de negocio que restituye el stock y cambia el estado a `REEMBOLSADA`. Si la entrada ya fue utilizada, el sistema bloquea la acción informando la causa.
3. **Canal de Comunicación (Chat):**
   - Hilo de mensajes en tiempo real asociado a la compra entre el comprador y el organizador.
4. **Perspectiva del Organizador:**
   - Cambiar al perfil del organizador del evento desde el avatar del Header.
   - Pestaña **Eventos**: lista los eventos propios, permite editar nombre, ubicación y descripción, y consultar sus ventas.
   - Pestaña **Organizar**: crea un evento con tipos de entrada, fotos y botón de sugerencias inteligentes.
   - Pestaña **Escanear**: acredita entradas buscando el código de orden o el ID de compra. La lectura con cámara/QR queda fuera del alcance actual.
   - Pantalla **Panel de Ventas**: métricas de recaudación, barras de progreso de cupos vendidos y detalle de órdenes.
   - Pantalla **Mensajes**: bandeja de entrada de consultas recibidas.

Las pestañas cambian según el perfil: comprador (**Explorar, Mis Tickets, Mensajes**) u organizador (**Eventos, Organizar, Escanear, Mensajes**). El perfil se cambia desde el avatar, no desde la barra de navegación.
