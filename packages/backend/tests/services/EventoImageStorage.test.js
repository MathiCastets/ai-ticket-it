import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventoImageStorage } from '../../src/services/EventoImageStorage.js';
import { UPLOADS_DIRECTORY } from '../../src/config/uploadConfig.js';

describe('EventoImageStorage', () => {
  let directory;
  let storage;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'ai-ticket-it-images-'));
    storage = new EventoImageStorage(directory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test.each([
    ['image/jpeg', '.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
    [
      'image/png',
      '.png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    ],
    ['image/webp', '.webp', Buffer.from('RIFF0000WEBP', 'ascii')],
  ])('guarda una imagen %s y devuelve su ruta pública', async (mimetype, extension, buffer) => {
    const [imagePath] = await storage.guardar([{ mimetype, buffer }]);
    const filename = path.basename(imagePath);

    expect(imagePath).toMatch(new RegExp(`^/uploads/.+\\${extension}$`));
    await expect(readFile(path.join(directory, filename))).resolves.toEqual(buffer);
  });

  test('rechaza contenido que no coincide con un formato de imagen permitido', async () => {
    await expect(
      storage.guardar([{ mimetype: 'image/jpeg', buffer: Buffer.from('not an image') }])
    ).rejects.toMatchObject({ code: 'FORMATO_IMAGEN_INVALIDO' });
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  test('elimina imágenes ya escritas si falla una imagen posterior', async () => {
    await expect(
      storage.guardar([
        { mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) },
        { mimetype: 'image/png', buffer: Buffer.from('invalid png') },
      ])
    ).rejects.toMatchObject({ code: 'FORMATO_IMAGEN_INVALIDO' });

    await expect(readdir(directory)).resolves.toEqual([]);
  });

  test('eliminar acepta rutas ausentes y elimina las existentes', async () => {
    const [imagePath] = await storage.guardar([
      { mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) },
    ]);

    await expect(
      storage.eliminar([imagePath, '/uploads/already-removed.jpg'])
    ).resolves.toBeUndefined();
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  test('eliminar relanza errores que no sean ENOENT (por ejemplo al intentar unlink de un subdirectorio)', async () => {
    await mkdir(path.join(directory, 'subdir'));
    await expect(storage.eliminar(['/uploads/subdir'])).rejects.toThrow();
  });

  test.each([
    ['image/jpeg con primer byte alterado', 'image/jpeg', Buffer.from([0x00, 0xd8, 0xff])],
    ['image/jpeg con segundo byte alterado', 'image/jpeg', Buffer.from([0xff, 0x00, 0xff])],
    ['image/jpeg con tercer byte alterado', 'image/jpeg', Buffer.from([0xff, 0xd8, 0x00])],
    ['image/webp sin header WEBP', 'image/webp', Buffer.from('RIFF0000WAVE', 'ascii')],
    ['image/webp sin header RIFF', 'image/webp', Buffer.from('XXXX0000WEBP', 'ascii')],
    ['image/png con byte final alterado', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x00])],
  ])('rechaza magic bytes invalidos para %s', async (_desc, mimetype, buffer) => {
    await expect(
      storage.guardar([{ mimetype, buffer }])
    ).rejects.toMatchObject({
      name: 'BusinessRuleError',
      code: 'FORMATO_IMAGEN_INVALIDO',
      message: 'Solo se permiten imágenes JPEG, PNG o WebP válidas',
    });
  });

  test('instanciacion sin argumentos usa el directorio por defecto UPLOADS_DIRECTORY', () => {
    const defaultStorage = new EventoImageStorage();
    expect(defaultStorage.directory).toBe(UPLOADS_DIRECTORY);
  });
});
