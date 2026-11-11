import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export function resolveUploadsDirectory(rawEnv = process.env) {
  return rawEnv.UPLOADS_DIRECTORY
    ? path.resolve(rawEnv.UPLOADS_DIRECTORY)
    : path.resolve(configDirectory, '../../uploads');
}

export const UPLOADS_DIRECTORY = resolveUploadsDirectory();
export const MAX_EVENT_IMAGES = 1;
export const MAX_EVENT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
