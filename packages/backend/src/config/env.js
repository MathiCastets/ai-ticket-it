import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export function createEnv(rawEnv = process.env) {
  return {
    PORT: rawEnv.SERVER_PORT ? Number(rawEnv.SERVER_PORT) : 8000,
    ALLOWED_ORIGINS: rawEnv.ALLOWED_ORIGINS
      ? rawEnv.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
      : ['*'],
    NODE_ENV: rawEnv.NODE_ENV || 'development',
  };
}

export const env = createEnv();
