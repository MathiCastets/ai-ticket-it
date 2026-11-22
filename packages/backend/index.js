import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[AI Ticket It Backend] Servidor iniciado con éxito`);
  console.log(`[AI Ticket It Backend] Escuchando en http://localhost:${env.PORT}`);
  console.log(`[AI Ticket It Backend] API Base: http://localhost:${env.PORT}/api`);
  console.log(`[AI Ticket It Backend] Entorno: ${env.NODE_ENV}`);
});

function gracefulShutdown(signal) {
  console.log(`\n[AI Ticket It Backend] Señal ${signal} recibida. Cerrando servidor ordenadamente...`);
  server.close(() => {
    console.log('[AI Ticket It Backend] Servidor HTTP cerrado.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[AI Ticket It Backend] Forzando cierre del proceso tras timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
