# AI Ticket It - Plataforma de Venta de Entradas para Eventos

Trabajo Práctico Individual de Desarrollo con Inteligencia Artificial  
**Desarrollo de Software (DDS) - UTN FRBA - 2C 2026**

---

## 📦 Estructura del Proyecto

Monorepo organizado con `npm workspaces`:

```
.
├── packages/
│   ├── backend/        # Servidor Express.js (Node.js con persistencia en memoria)
│   └── mobile/         # Aplicación Mobile (React Native + Expo)
├── package.json        # Configuración del monorepo (root)
└── README.md           # Guía del proyecto
```

---

## ⚙️ Módulos

### 1. Backend (`packages/backend`)
- **Node.js** con **Express**.
- **CORS** y **dotenv** configurados.
- Persistencia **en memoria** para eventos, tipos de entradas, compras, usuarios y reseñas según las especificaciones del TP.

### 2. Frontend Mobile (`packages/mobile`)
- **React Native** con **Expo SDK 58**.
- Navegación nativa con `@react-navigation`.
- Ejecutable localmente en celular físico mediante la app **Expo Go** (Android/iOS) o en emuladores.

---

## 🚀 Inicio Rápido

### 1. Instalación de Dependencias
Desde la raíz del repositorio:
```bash
npm install
```

### 2. Variables de Entorno del Backend
El archivo `.env` ya se encuentra configurado en `packages/backend/.env`:
```env
SERVER_PORT=8000
ALLOWED_ORIGINS=*
```

### 3. Ejecución

* **Iniciar solo el Backend:**
  ```bash
  npm run dev:backend
  ```
  El servidor escuchará en `http://localhost:8000`.

* **Iniciar solo la App Mobile:**
  ```bash
  npm run start:mobile
  ```
  Abrirá el panel de Expo con el código QR para escanear con la app **Expo Go** en tu celular.

* **Iniciar ambos simultáneamente:**
  ```bash
  npm run start:dev
  ```

## Estados de carga en Mobile

La app muestra skeletons y spinners durante la carga simulada de eventos, tickets, ventas y mensajes. El tiempo se configura en [packages/mobile/src/config/loading.js](./packages/mobile/src/config/loading.js) mediante `MOCK_LOADING_DELAY_MS` (por defecto, 1000 ms); asignale `0` para desactivar la espera cuando se conecte el backend.
