import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EventoController } from '../../src/controllers/EventoController.js';
import { ValidationError } from '../../src/controllers/errors/ValidationError.js';
import { ForbiddenError } from '../../src/services/errors/index.js';

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

      expect(mockEventoService.listarEventos).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([expect.objectContaining({ id: 'e1' })]),
        })
      );
    });
  });

  describe('getById', () => {
    test('obtiene un evento por id devolviendo 200', async () => {
      mockEventoService.obtenerPorId.mockResolvedValue({
        id: 'e1',
        nombre: 'Evento 1',
        organizador: { id: 'org-1' },
        resenias: [],
      });
      const req = { params: { id: 'e1' } };

      await controller.getById(req, res, next);

      expect(mockEventoService.obtenerPorId).toHaveBeenCalledWith('e1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('create', () => {
    const eventoValido = {
      nombre: 'Nuevo Evento',
      fecha: '2026-12-01T20:00:00.000Z',
      categoriaId: 'cat-1',
      organizadorId: 'org-1',
      tiposEntrada: [{ nombre: 'General', precio: 1000, cupo: 100 }],
    };

    test('crea evento válido y responde 201', async () => {
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-creado', ...eventoValido });
      const req = {
        is: () => false,
        body: eventoValido,
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Nuevo Evento' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({ id: 'evt-creado' }),
      });
    });

    test('rechaza con ForbiddenError si un usuario con rol comprador intenta crear un evento', async () => {
      const req = {
        is: () => false,
        body: eventoValido,
        user: { id: 'comp-1', rol: 'comprador' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si un organizador intenta crear un evento para otro organizador', async () => {
      const req = {
        is: () => false,
        body: eventoValido,
        user: { id: 'org-otro', rol: 'organizador' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
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

  describe('update', () => {
    test('actualiza el evento y devuelve 200 cuando el organizador es el dueño', async () => {
      mockEventoService.actualizarEvento.mockResolvedValue({ id: 'evt-1', nombre: 'Modificado' });
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Modificado' },
        user: { id: 'org-1', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(mockEventoService.actualizarEvento).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({ nombre: 'Modificado', organizadorId: 'org-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza con ForbiddenError si un comprador intenta modificar un evento', async () => {
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Hacked' },
        user: { id: 'comp-1', rol: 'comprador' },
      };

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si un organizador intenta modificar el evento de otro', async () => {
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Hacked' },
        user: { id: 'org-otro', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
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
