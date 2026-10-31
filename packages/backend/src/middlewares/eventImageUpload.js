import multer from 'multer';
import { MAX_EVENT_IMAGES, MAX_EVENT_IMAGE_SIZE_BYTES } from '../config/uploadConfig.js';
import { ValidationError } from '../controllers/errors/ValidationError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EVENT_IMAGE_SIZE_BYTES,
    files: MAX_EVENT_IMAGES,
  },
});

export function receiveEventImages(req, res, next) {
  upload.array('imagenes', MAX_EVENT_IMAGES)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      error.type = 'entity.too.large';
      error.message = 'Cada imagen debe pesar 5 MB o menos';
      return next(error);
    }

    return next(
      new ValidationError(
        error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Se permite una sola imagen por evento'
          : 'No se pudieron procesar las imágenes del evento'
      )
    );
  });
}
