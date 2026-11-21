import { describe, test, expect, jest } from '@jest/globals';
import multer from 'multer';
import {
  createEventImageUpload,
  receiveEventImages,
} from '../../src/middlewares/eventImageUpload.js';

describe('eventImageUpload middleware', () => {
  test('delega a next() sin argumentos cuando la carga es exitosa', () => {
    const mockUpload = jest.fn((req, res, cb) => cb());
    const middleware = createEventImageUpload(mockUpload);
    const req = {};
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);

    expect(mockUpload).toHaveBeenCalledWith(req, res, expect.any(Function));
    expect(next).toHaveBeenCalledWith();
  });

  test('transforma MulterError LIMIT_FILE_SIZE a error entity.too.large con mensaje específico', () => {
    const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
    const mockUpload = jest.fn((req, res, cb) => cb(multerError));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(multerError);
    expect(multerError.type).toBe('entity.too.large');
    expect(multerError.message).toBe('Cada imagen debe pesar 5 MB o menos');
  });

  test('no asigna entity.too.large si el error tiene code LIMIT_FILE_SIZE pero no es MulterError', () => {
    const genericError = new Error('Otro error');
    genericError.code = 'LIMIT_FILE_SIZE';
    const mockUpload = jest.fn((req, res, cb) => cb(genericError));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        message: 'No se pudieron procesar las imágenes del evento',
      })
    );
  });

  test('transforma MulterError LIMIT_UNEXPECTED_FILE a ValidationError de una sola imagen', () => {
    const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
    const mockUpload = jest.fn((req, res, cb) => cb(multerError));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        message: 'Se permite una sola imagen por evento',
      })
    );
  });

  test('no asigna mensaje de una sola imagen si el error tiene code LIMIT_UNEXPECTED_FILE pero no es MulterError', () => {
    const genericError = new Error('Otro error');
    genericError.code = 'LIMIT_UNEXPECTED_FILE';
    const mockUpload = jest.fn((req, res, cb) => cb(genericError));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        message: 'No se pudieron procesar las imágenes del evento',
      })
    );
  });

  test('transforma otros MulterError a ValidationError genérico', () => {
    const multerError = new multer.MulterError('LIMIT_PART_COUNT');
    const mockUpload = jest.fn((req, res, cb) => cb(multerError));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        message: 'No se pudieron procesar las imágenes del evento',
      })
    );
  });

  test('transforma cualquier error no MulterError a ValidationError genérico', () => {
    const errorGenerico = new Error('Fallo de I/O en disco');
    const mockUpload = jest.fn((req, res, cb) => cb(errorGenerico));
    const middleware = createEventImageUpload(mockUpload);
    const next = jest.fn();

    middleware({}, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ValidationError',
        message: 'No se pudieron procesar las imágenes del evento',
      })
    );
  });

  test('receiveEventImages por defecto es una función middleware', () => {
    expect(typeof receiveEventImages).toBe('function');
  });
});
