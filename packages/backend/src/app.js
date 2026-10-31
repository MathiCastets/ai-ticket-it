import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ValidationError } from './controllers/errors/ValidationError.js';

export function createApp() {
  const app = express();

  // 1. Middlewares generales
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.body === undefined) {
      req.body = {};
      return next();
    }
    if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next(new ValidationError('El cuerpo de la solicitud debe ser un objeto JSON'));
    }
    return next();
  });

  const allowedOrigins = env.ALLOWED_ORIGINS;
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir solicitudes sin origin (como apps móviles, Postman o curl)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Origen ${origin} no permitido por CORS`));
      },
      credentials: true,
    })
  );

  // 2. Ruta raíz de bienvenida
  app.get('/', (req, res) => {
    res.json({
      name: 'AI Ticket It - API Backend',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/health',
        eventos: '/api/eventos',
        compras: '/api/compras',
        categorias: '/api/categorias',
      },
    });
  });

  // 3. Montar rutas de la API bajo /api
  app.use('/api', apiRouter);

  // 4. Manejo de rutas no encontradas (404)
  app.use(notFoundHandler);

  // 5. Manejador global de errores
  app.use(errorHandler);

  return app;
}
