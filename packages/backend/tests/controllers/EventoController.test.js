import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EventoController } from '../../src/controllers/EventoController.js';
import { ValidationError } from '../../src/controllers/errors/ValidationError.js';

describe('EventoController', () => {
  let mockEventoService;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    mockEventoService = {
      listarEventos: jest.fn().mockResolvedValue([]),
      obtenerPorId: jest.fn(),
      crearEvento: jest.fn(),
      actualizarEvento: jest.fn(),
      agregarResenia: jest.fn(),
    };

    controller = new EventoController(mockEventoService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    test('rechaza sortBy no soportado sin llamar al servicio', async () => {
      const req = { query: { sortBy: 'invalido' } };
      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.listarEventos).not.toHaveBeenCalled();
    });

    test('obtiene y responde con lista de eventos y 200', async () => {
      mockEventoService.listarEventos.mockResolvedValue([
        {
          id: 'e1',
          nombre: 'Evento 1',
          organizador: { id: 'org-1' },
          resenias: [],
        },
      ]);
      const req = { query: {} };

      await controller.getAll(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: 'e1' })]),
        })
      );
    });
  });

  describe('create', () => {
    const eventoValido = {
      nombre: 'Recital Rock',
      fecha: '2026-11-20T20:00:00.000Z',
      categoria: 'Recitales',
      organizadorId: 'org-1',
      tiposEntrada: [{ nombre: 'General', precio: 5000, cupo: 100 }],
    };

    test('valida y crea un evento devolviendo 201', async () => {
      mockEventoService.crearEvento.mockResolvedValue({ id: 'e-nuevo', ...eventoValido });
      const req = {
        is: () => false,
        body: eventoValido,
        files: [],
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Recital Rock' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 'e-nuevo' }) });
    });

    test('rechaza si falta el nombre sin llamar al servicio', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, nombre: '' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si la fecha no es válida', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, fecha: 'no-es-fecha' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si no tiene tipos de entrada', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, tiposEntrada: [] },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });
  });

  describe('addReview', () => {
    test('valida y agrega reseña devolviendo 201', async () => {
      mockEventoService.agregarResenia.mockResolvedValue({ id: 'res-1', puntuacion: 4.5 });
      const req = {
        params: { id: 'evt-1' },
        body: { compraId: 'c1', puntuacion: 4.5, detalle: 'Muy buen evento' },
      };

      await controller.addReview(req, res, next);

      expect(mockEventoService.agregarResenia).toHaveBeenCalledWith('evt-1', {
        compraId: 'c1',
        puntuacion: 4.5,
        detalle: 'Muy buen evento',
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('rechaza puntuación mayor a 5', async () => {
      const req = {
        params: { id: 'evt-1' },
        body: { compraId: 'c1', puntuacion: 6, detalle: 'Super' },
      };

      await controller.addReview(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.agregarResenia).not.toHaveBeenCalled();
    });
  });
});
