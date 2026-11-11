import { describe, it, expect } from '@jest/globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, createEnv } from '../../src/config/env.js';
import {
  UPLOADS_DIRECTORY,
  MAX_EVENT_IMAGES,
  MAX_EVENT_IMAGE_SIZE_BYTES,
  resolveUploadsDirectory,
} from '../../src/config/uploadConfig.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

describe('Configuration Modules', () => {
  describe('env.js', () => {
    it('debe exportar la constante env calculada', () => {
      expect(env).toBeDefined();
      expect(typeof env.PORT).toBe('number');
      expect(Array.isArray(env.ALLOWED_ORIGINS)).toBe(true);
      expect(typeof env.NODE_ENV).toBe('string');
    });

    it('debe usar valores por defecto cuando el entorno está vacío', () => {
      const config = createEnv({});
      expect(config.PORT).toBe(8000);
      expect(config.ALLOWED_ORIGINS).toEqual(['*']);
      expect(config.NODE_ENV).toBe('development');
    });

    it('debe parsear variables provistas correctamente', () => {
      const customRawEnv = {
        SERVER_PORT: '3000',
        ALLOWED_ORIGINS: 'http://localhost:3000, http://localhost:8081',
        NODE_ENV: 'production',
      };
      const config = createEnv(customRawEnv);
      expect(config.PORT).toBe(3000);
      expect(config.ALLOWED_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:8081']);
      expect(config.NODE_ENV).toBe('production');
    });

    it('debe utilizar process.env cuando se invoca sin argumentos', () => {
      const config = createEnv();
      expect(typeof config.PORT).toBe('number');
      expect(Array.isArray(config.ALLOWED_ORIGINS)).toBe(true);
      expect(typeof config.NODE_ENV).toBe('string');
    });
  });

  describe('uploadConfig.js', () => {
    it('debe exportar constantes de configuración de uploads', () => {
      expect(UPLOADS_DIRECTORY).toBeDefined();
      expect(MAX_EVENT_IMAGES).toBe(1);
      expect(MAX_EVENT_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
    });

    it('debe resolver al directorio por defecto si no se especifica UPLOADS_DIRECTORY', () => {
      const resolved = resolveUploadsDirectory({});
      const expectedPath = path.resolve(currentDir, '../../uploads');
      expect(resolved).toBe(expectedPath);
    });

    it('debe resolver al path provisto si se especifica UPLOADS_DIRECTORY', () => {
      const customPath = './custom-uploads';
      const resolved = resolveUploadsDirectory({ UPLOADS_DIRECTORY: customPath });
      expect(resolved).toBe(path.resolve(customPath));
    });

    it('debe utilizar process.env cuando se invoca sin argumentos', () => {
      const resolved = resolveUploadsDirectory();
      expect(typeof resolved).toBe('string');
      expect(resolved.length).toBeGreaterThan(0);
    });
  });
});
