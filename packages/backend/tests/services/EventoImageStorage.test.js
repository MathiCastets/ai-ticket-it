import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { EventoImageStorage } from '../../src/services/EventoImageStorage.js';

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
});
