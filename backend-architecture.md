# Referencia de arquitectura para el TP grupal

> **Alcance:** este archivo conserva la guía de arquitectura del TP grupal y no describe el backend implementado en este repositorio individual. El backend actual está en `packages/backend/`, usa Express y repositorios en memoria; no usa MongoDB/Mongoose ni contiene los módulos de colaboradores mencionados más abajo. Para el estado real de este proyecto, tomá como referencia la sección de arquitectura del `README.md` y el código fuente.

La guía original describe el backend grupal en `app/packages/backend/`, implementado con JavaScript, Express y MongoDB/Mongoose. Sus ejemplos y rutas sirven como referencia conceptual para replicar una arquitectura por capas, no como inventario del backend individual.

> El detalle de `schemas/` queda fuera de este documento. Aunque existe en el backend actual, acá nos enfocamos en controllers, config, domain, middlewares, repositories, routes y services.

## 1. Mapa general

```text
app/packages/backend/
├── index.js                    # Arranque del proceso
├── swagger.js                  # Generación de documentación Swagger
├── src/
│   ├── app.js                  # Configuración de Express
│   ├── config/                 # Entorno, base de datos y configuración compartida
│   ├── controllers/            # Adaptación entre HTTP y casos de uso
│   │   └── errors/
│   ├── domain/                 # Modelo y reglas del negocio
│   │   ├── entities/
│   │   ├── enums/
│   │   ├── errors/
│   │   └── utils/
│   ├── middlewares/            # Comportamiento transversal de Express
│   ├── repositories/           # Acceso y traducción de datos persistidos
│   │   └── errors/
│   ├── routes/                 # Mapeo de paths/métodos HTTP a controladores
│   └── services/               # Casos de uso y coordinación
│       ├── canalesMensajeria/
│       └── errors/
└── tests/                      # Pruebas organizadas principalmente por capa
```

Vista de una petición:

```text
Cliente
  │
  ▼
app.js ── middleware general
  │
  ▼
routes ── selecciona endpoint y controlador
  │
  ▼
controllers ── interpreta HTTP, valida entrada y forma respuesta
  │
  ▼
services ── ejecuta el caso de uso y coordina dependencias
  ├──────────────► domain ── entidades y reglas de negocio
  │
  ▼
repositories ── consultas, persistencia y mapeo
  │
  ▼
MongoDB

Los errores no manejados localmente suben hasta errorHandler y se traducen a HTTP.
```

La dirección conceptual es importante: HTTP conoce los casos de uso, y los casos de uso usan dominio y persistencia a través de repositorios. El dominio no debería depender de Express ni de Mongoose. Las capas superiores tampoco deberían consultar Mongo directamente.

## 2. Responsabilidad de cada parte

### `index.js` y `src/app.js`

No son las carpetas solicitadas, pero son el punto de entrada para entender el ciclo completo.

- [`index.js`](../app/packages/backend/index.js) carga la configuración del entorno, crea la aplicación, levanta el servidor, conecta la base de datos y ejecuta los seeders. También registra el apagado ordenado del proceso.
- [`src/app.js`](../app/packages/backend/src/app.js) crea y configura Express: middleware general, documentación, rutas y manejadores de errores.
- `createApp()` está separado del `listen()`. Así se puede construir la aplicación sin iniciar necesariamente un servidor real, lo cual resulta útil en tests.
- El orden de registro en Express importa: primero se configuran los middleware generales y las rutas; después se agregan el handler de rutas no encontradas y el handler global de errores.

El servidor se inicia aunque la conexión inicial a MongoDB siga intentando reconectarse. El endpoint de health check permite observar si la base está disponible. Este detalle pertenece al arranque concreto de este proyecto; en otro proyecto hay que decidir explícitamente si se quiere atender antes de tener la base lista.

### `config/`

En este repositorio el nombre es `config/` (singular). Su función es centralizar configuración compartida e inicialización técnica:

- [`env.js`](../app/packages/backend/src/config/env.js) carga las variables de entorno y resuelve secretos definidos mediante variables `*_FILE`.
- [`database.js`](../app/packages/backend/src/config/database.js) concentra conexión, reintentos, desconexión, estado y chequeo de MongoDB.
- También se guarda allí el archivo generado de configuración Swagger.

**Criterio:** evitar leer variables de entorno o construir conexiones a la base desde muchos módulos. La configuración de infraestructura debe tener un lugar reconocible y no mezclarse con reglas del dominio.

### `domain/`

Contiene los conceptos del negocio y las reglas que deben seguir siendo válidas sin importar desde qué endpoint se opere.

#### `domain/entities/`

Las entidades representan conceptos del negocio y pueden contener tanto datos como comportamiento. Ejemplos reales del proyecto: `Colaborador`, `Proyecto`, `Colectivo`, `Perfil` y `Colaboracion`.

Por ejemplo, [`Colaborador`](../app/packages/backend/src/domain/entities/colaborador.js):

- comprueba que la entidad cumpla condiciones mínimas al construirse;
- opera sobre sus colecciones y relaciones;
- expone comportamientos como agregar o quitar un medio de contacto y dar de baja al colaborador.

Si una regla debe cumplirse siempre para una entidad, conviene protegerla en el dominio y no confiar únicamente en que un endpoint particular la valide. El servicio puede coordinar el caso de uso, pero la entidad es quien protege la validez de su propio estado.

#### `domain/enums/`

Contiene conjuntos de valores controlados del negocio: por ejemplo, estados, modalidades, tipos de cuenta y unidades de compromiso. Usar estos valores centralizados evita repetir literales y ayuda a mantener consistencia entre capas.

#### `domain/errors/`

Agrupa errores del modelo de dominio, como errores de validación o transiciones de estado no permitidas. La capa que detecta el problema expresa su significado; más adelante el middleware global determina la respuesta HTTP.

#### `domain/utils/`

Funciones pequeñas reutilizables que forman parte de las necesidades del dominio, como normalización o formatos. No debería convertirse en un cajón para lógica de aplicación o infraestructura.

#### `domain/index.js`

El proyecto actual tiene un archivo de exportaciones públicas para algunas entidades y enums. Es una comodidad de importación; no cambia la responsabilidad de esas clases.

**No colocar en el dominio:** objetos `req`/`res`, status HTTP, consultas de Mongoose, variables de entorno o código específico de un proveedor externo.

### `repositories/`

Un repositorio encapsula cómo se leen y guardan los datos. En este proyecto, los repositorios trabajan con modelos Mongoose y MongoDB.

Responsabilidades habituales:

- consultar por identificador o filtros;
- crear, actualizar o eliminar registros;
- traducir criterios de búsqueda del caso de uso a consultas de la base;
- ocultar los detalles del modelo persistido;
- convertir documentos a entidades de dominio y entidades a documentos cuando se persiste.

[`ColaboradorRepository`](../app/packages/backend/src/repositories/ColaboradorRepository.js) es un ejemplo: arma filtros de Mongo, consulta el modelo y devuelve colaboradores, en lugar de entregar a los servicios documentos crudos para que conozcan Mongoose.

#### `repositories/mappers.js`

Este archivo contiene conversiones entre documentos planos de Mongo y entidades del dominio. En la lectura, por ejemplo, adapta `_id` a `id` y vuelve a construir entidades y objetos relacionados. En la escritura, el repositorio transforma la entidad al formato esperado por Mongo.

El objetivo es que un cambio en el formato de almacenamiento no se propague a controladores o entidades. Es también un lugar a revisar cuando se cambia la forma en que una entidad se guarda o se carga con relaciones.

#### `repositories/errors/`

Contiene errores propios de persistencia, como entidad no encontrada o duplicada. El repositorio expresa qué ocurrió en el almacenamiento; el servicio puede convertir esa situación en el error adecuado para el caso de uso.

**Evitar:** que un controlador arme consultas de Mongo, que un servicio dependa de campos internos como `_id` o que el repositorio decida status HTTP.

### `services/`

Los servicios implementan y coordinan casos de uso. Usualmente son el punto que conecta el dominio con uno o más repositorios.

Un servicio puede:

- buscar entidades necesarias para una operación;
- validar condiciones propias del caso de uso;
- construir entidades a partir de datos ya interpretados;
- coordinar varios repositorios o servicios;
- resolver referencias necesarias;
- persistir los cambios;
- lanzar errores semánticos, como “no existe” o “no se puede realizar esta operación”.

[`ColaboradorService`](../app/packages/backend/src/services/ColaboradorService.js) muestra este patrón: consulta colaboradores a través del repositorio, construye entidades de dominio para crear o actualizar y coordina otros servicios cuando necesita resolver habilidades.

#### `services/errors/`

Agrupa errores de aplicación/casos de uso: por ejemplo, recurso inexistente, conflicto o regla de negocio incumplida. Estos errores son reconocidos por el middleware global y se convierten en códigos HTTP apropiados.

#### Subcarpetas especializadas: `canalesMensajeria/`

El proyecto organiza integraciones de mensajería en una subcarpeta específica. Hay implementaciones por canal/proveedor y un módulo que ayuda a enviar por el canal correspondiente. Esto mantiene detalles de integración separados del flujo principal de los servicios.

**Inyección de dependencias:** varios servicios reciben repositorios u otros servicios en el constructor y ofrecen instancias por defecto para el uso normal. Así se pueden pasar dobles o dependencias controladas en los tests sin cambiar la lógica del caso de uso.

**Evitar:** devolver `res.json()` desde un servicio, leer parámetros HTTP allí o incluir consultas Mongoose directamente. Un servicio debe poder probarse sin simular Express.

### `controllers/`

Un controlador adapta HTTP al lenguaje de la aplicación:

1. Obtiene parámetros, filtros y cuerpo de la petición.
2. Valida que la entrada tenga la forma y los valores esperados para el endpoint.
3. Invoca el servicio correspondiente.
4. Decide el status de éxito y el formato de la respuesta.

Por ejemplo, [`ColaboradorController`](../app/packages/backend/src/controllers/ColaboradorController.js) valida filtros y datos de alta/actualización, llama a `ColaboradorService` y devuelve respuestas con un formato uniforme como `{ data: ... }`. Para una creación responde con `201`; para una baja exitosa sin contenido usa `204`.

El controlador puede rechazar una petición mal formada antes de invocar el servicio. Las reglas de negocio que deben cumplirse independientemente del endpoint también deben estar protegidas en el dominio o expresadas en el servicio, no solo en la validación HTTP.

#### `controllers/errors/`

Contiene errores de la frontera HTTP, como los errores de validación de la petición. El handler global usa esos tipos para decidir la respuesta.

**Evitar:** persistir desde el controlador, replicar lógica de otros endpoints o realizar todo el caso de uso dentro del método HTTP.

### `routes/`

Las rutas asocian un método y un path HTTP con una operación de controlador.

- [`routes/index.js`](../app/packages/backend/src/routes/index.js) agrupa y monta routers por recurso.
- Los archivos por recurso —por ejemplo, `ColaboradorRoutes.js`— declaran endpoints y los conectan con métodos de controlador.
- El router general se monta bajo `/api` en `app.js`; por eso las rutas de recursos quedan bajo ese prefijo.
- En las rutas actuales también se anotan descripciones y respuestas para Swagger.

Las rutas deben ser delgadas: sirven para declarar la interfaz HTTP, no para escribir reglas de negocio o consultas a la base. Si se agrega un router nuevo, hay que importarlo y montarlo en el índice de rutas.

### `middlewares/`

Son funciones de Express para preocupaciones compartidas por más de una ruta.

- [`notFoundHandler.js`](../app/packages/backend/src/middlewares/notFoundHandler.js) convierte una ruta que no coincide con ningún endpoint en un error de no encontrado.
- [`errorHandler.js`](../app/packages/backend/src/middlewares/errorHandler.js) centraliza el tratamiento de errores y su traducción a respuestas HTTP.

El handler global reconoce los tipos de error de las distintas capas. En el proyecto actual, los errores de validación suelen convertirse en `400`, los de recurso inexistente en `404`, los conflictos en `409` y los errores inesperados en `500`. Los errores inesperados se registran; la respuesta no expone el detalle interno.

**Orden:** los middlewares de 404 y de errores deben quedar después de las rutas. Si se agregan middleware de autenticación, logging u otra preocupación transversal, hay que definir en qué rutas aplica y ubicarlo deliberadamente en la cadena.

## 3. Flujo completo de ejemplo

Ejemplo basado en la creación de un colaborador:

```text
POST /api/colaboradores
  → app.js analiza la petición y la dirige al router /api
  → routes/index.js monta el router de colaboradores
  → ColaboradorRoutes.js asocia POST / con ColaboradorController.create
  → ColaboradorController valida la entrada y llama al servicio
  → ColaboradorService crea las entidades relacionadas necesarias
  → ColaboradorRepository convierte la entidad a documento y persiste
  → el resultado vuelve al controlador
  → el controlador responde 201 con { data: ... }
```

Si el servicio o el repositorio lanza un error y no se resuelve en una capa intermedia:

```text
error de dominio/servicio/repositorio/controlador
  → errorHandler
  → status y cuerpo HTTP consistentes
```

La idea es no capturar cada error para devolver respuestas genéricas distintas en cada endpoint. Se lanzan errores con significado y se centraliza su traducción.

## 4. Workflow para sumar una funcionalidad

Trabajar desde el caso de uso y avanzar por las capas involucradas evita empezar por el endpoint y terminar con toda la lógica adentro del controlador.

### Paso 1: definir el caso de uso

Antes de editar, aclarar:

- quién inicia la operación y qué recurso/acción necesita;
- entradas, salida y errores esperables;
- reglas de negocio e invariantes;
- si se modifican una o varias entidades;
- qué debe persistirse y qué relaciones se necesitan cargar.

Identificar también qué endpoint y convenciones existentes se parecen al caso nuevo.

### Paso 2: ajustar el dominio

Agregar o modificar entidades, comportamientos, enums y errores de dominio cuando aparecen conceptos o reglas nuevas.

Preguntas útiles:

- ¿La entidad podría quedar en un estado inválido?
- ¿La regla debe cumplirse en todos los flujos que modifiquen esa entidad?
- ¿Una operación tiene una transición de estado restringida?

Si la respuesta es sí, no dejar la protección exclusivamente en un controlador.

### Paso 3: implementar persistencia

Agregar al repositorio las operaciones de lectura/escritura requeridas. Mantener el código específico de Mongo dentro de esa frontera y convertir los documentos a entidades para devolverlos al servicio.

Si cambia el formato de persistencia o de las entidades cargadas, revisar también los mappers. Si una operación requiere varios repositorios, esa coordinación corresponde normalmente al servicio.

### Paso 4: implementar el caso de uso

Agregar el método al servicio. El servicio obtiene lo que necesita, verifica las condiciones de aplicación, construye o modifica entidades de dominio y persiste el resultado mediante repositorios.

Definir qué errores con significado puede producir. Mantener el servicio independiente de `req`, `res` y de los status HTTP.

### Paso 5: exponerlo por HTTP

Agregar o ajustar el controlador:

- validar la entrada de ese endpoint;
- delegar en el servicio;
- devolver el status y formato de éxito apropiados;
- permitir que los errores tipados lleguen al handler global.

Luego declarar el método/path en el router del recurso y agregar el router al índice general si es un recurso nuevo. Actualizar las anotaciones Swagger siguiendo las rutas existentes.

### Paso 6: probar las capas

La organización de pruebas actual separa principalmente:

- `tests/domain/`: invariantes y comportamiento de entidades;
- `tests/services/`: casos de uso, coordinación y errores esperados;
- `tests/repositories/`: consultas, persistencia y conversión a entidades;
- `tests/controllers/`, `tests/middlewares/`, `tests/config/` y `tests/app.test.js`: comportamiento de las fronteras HTTP e infraestructura.

Conviene probar una regla en la capa que la posee. Por ejemplo, la validez de una entidad se prueba en dominio; que un servicio rechace una referencia inexistente se prueba en servicios; que un repositorio convierta un documento correctamente se prueba en repositorios.

El paquete del backend ofrece `npm test` y `npm run mutation`. Para una funcionalidad nueva, empezar por las pruebas focalizadas existentes y ejecutar la suite relevante antes de darla por terminada.

### Paso 7: revisar consistencia transversal

Antes de cerrar, verificar:

- que el endpoint está montado en la ruta correcta;
- que el status y el cuerpo de respuesta coinciden con el resto de la API;
- que los errores conocidos tienen una traducción adecuada;
- que el mapper cubre nuevos campos o relaciones;
- que Swagger refleja el endpoint;
- que los tests cubren éxito, validaciones y errores relevantes;
- que el caso de uso no quedó acoplado a Express o Mongoose.

## 5. Errores y límites entre capas

Los errores se organizan por la capa que los origina:

| Capa | Ejemplo de significado | Quién suele traducirlo |
|---|---|---|
| Controller | La petición no cumple el contrato del endpoint | `errorHandler` a `400` |
| Domain | La entidad viola una regla o transición | Servicio si debe contextualizarlo; luego `errorHandler` |
| Service | Falta una entidad o no se cumple una regla del caso de uso | `errorHandler` a `404`, `409` o el status correspondiente |
| Repository | No se encontró un registro al persistir o hay duplicación | Servicio puede contextualizarlo; luego `errorHandler` |
| No tipado/inesperado | Falla no prevista | `errorHandler` registra y responde `500` |

No se debe convertir cualquier error en “éxito” ni ocultar fallas. Tampoco conviene acoplar los errores de dominio a códigos HTTP: la traducción a protocolo se hace en la frontera HTTP.

## 6. Reglas prácticas para mantener el estilo

1. **Seguir el camino de dependencias:** rutas → controladores → servicios → repositorios, con entidades y reglas en dominio.
2. **Mantener cada responsabilidad en su capa:** HTTP en controladores/rutas, casos de uso en servicios, reglas e invariantes en dominio, Mongo en repositorios.
3. **Devolver entidades desde repositorios:** no dejar que `_id`, documentos Mongoose o `populate` se filtren innecesariamente hacia arriba.
4. **Usar errores específicos:** el significado permite tratarlos de forma coherente y probarlos.
5. **Inyectar dependencias donde ya hay un patrón equivalente:** facilita aislar los tests.
6. **Mantener el formato de módulos del proyecto:** usa `import`/`export` y normalmente incluye `.js` en imports relativos.
7. **Evitar abstracciones prematuras:** crear la estructura necesaria para el caso de uso sin sumar capas o helpers que no aportan.
8. **Hacer cambios verticales completos:** una operación no está terminada solo porque exista el método del servicio; hay que conectarla al endpoint, documentarla y probarla.
9. **No asumir que la validación de entrada reemplaza el dominio:** la entidad debe proteger sus invariantes aunque en el futuro aparezca otro punto de entrada.
10. **Respetar el patrón existente antes de introducir uno nuevo:** inspeccionar un recurso parecido, sus errores y sus tests.

## 7. Guía corta para pedirle cambios a otra AI

Al encargar una funcionalidad, pasarle a la AI:

- el caso de uso y los criterios de aceptación;
- las entidades y reglas de negocio involucradas;
- los endpoints esperados y ejemplos de entrada/salida;
- qué errores se esperan;
- qué recursos existentes puede tomar como referencia;
- la instrucción de implementar y probar todas las capas relevantes, no solo el endpoint.

Una instrucción útil es pedir primero que localice un recurso equivalente y siga sus convenciones de nombres, inyección de dependencias, errores, mappers, rutas, documentación y tests.

## Contexto breve para copiar y pegar

> Este backend sigue una arquitectura por capas. `routes/` declara paths y métodos HTTP, y los conecta con `controllers/`. Los controladores interpretan y validan la entrada HTTP, llaman a `services/` y forman la respuesta. Los servicios implementan casos de uso y coordinan dominio y repositorios. `domain/` contiene entidades, enums, errores y reglas de negocio; no debe depender de Express ni de Mongoose. `repositories/` encapsula Mongo/Mongoose y devuelve entidades usando los mappers, sin filtrar detalles de persistencia a las capas superiores. `config/` centraliza entorno y base de datos; `middlewares/` se ocupa de preocupaciones transversales, rutas no encontradas y errores globales. El arranque del proceso está en `index.js`; Express se configura en `src/app.js`. Al implementar, inspeccioná un recurso parecido y seguí el flujo dominio → repositorio → servicio → controlador → ruta; actualizá Swagger y agregá pruebas por capa. Mantené errores tipados, convenciones de módulos ES (`import`/`export`, imports relativos con `.js`) e inyección de dependencias donde el proyecto ya la use. No concentres reglas de negocio en controladores ni consultas Mongoose en servicios.
