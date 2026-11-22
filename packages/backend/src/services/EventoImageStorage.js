import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { UPLOADS_DIRECTORY } from '../config/uploadConfig.js';
import { BusinessRuleError } from './errors/index.js';

const IMAGE_TYPES = [
  {
    mimeType: 'image/jpeg',
    extension: '.jpg',
    matches: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  {
    mimeType: 'image/png',
    extension: '.png',
    matches: (buffer) =>
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: 'image/webp',
    extension: '.webp',
    matches: (buffer) =>
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP',
  },
];

export class EventoImageStorage {
  constructor(directory = UPLOADS_DIRECTORY) {
    this.directory = directory;
  }

  async guardar(files) {
    await mkdir(this.directory, { recursive: true });
    const storedPaths = [];

    try {
      for (const file of files) {
        const imageType = IMAGE_TYPES.find(
          (type) => type.mimeType === file.mimetype && type.matches(file.buffer)
        );
        if (!imageType) {
          throw new BusinessRuleError(
            'Solo se permiten imágenes JPEG, PNG o WebP válidas',
            'FORMATO_IMAGEN_INVALIDO'
          );
        }

        const filename = `${randomUUID()}${imageType.extension}`;
        const destination = path.join(this.directory, filename);
        await writeFile(destination, file.buffer, { flag: 'wx' });
        storedPaths.push(`/uploads/${filename}`);
      }

      return storedPaths;
    } catch (error) {
      await this.eliminar(storedPaths);
      throw error;
    }
  }

  async eliminar(imagePaths) {
    await Promise.all(
      imagePaths.map((imagePath) =>
        unlink(path.join(this.directory, path.basename(imagePath))).catch((error) => {
          if (error.code !== 'ENOENT') throw error;
        })
      )
    );
  }
}

export const eventoImageStorage = new EventoImageStorage();
