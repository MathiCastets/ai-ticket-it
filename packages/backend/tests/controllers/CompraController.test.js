import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CompraController } from '../../src/controllers/CompraController.js';
import { ValidationError } from '../../src/controllers/errors/ValidationError.js';
import { ForbiddenError } from '../../src/services/errors/index.js';

describe('CompraController', () => {
  let mockCompraService;
  let mockMensajeService;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    mockCompraService = {
      listarPorComprador: jest.fn(),
      listarPorEvento: jest.fn(),
      listarPorOrganizador: jest.fn(),
      listarTodas: jest.fn(),
      obtenerPorId: jest.fn(),
      realizarCompra: jest.fn(),
      cancelarCompra: jest.fn(),
      marcarUtilizada: jest.fn(),
      calificarCompra: jest.fn(),
    };

    mockMensajeService = {
      enviarMensaje: jest.fn(),
      obtenerMensajes: jest.fn(),
      marcarMensajesLeidos: jest.fn(),
    };

    controller = new CompraController(mockCompraService, mockMensajeService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    test('rechaza si se envían ambos filtros (compradorId y eventoId)', async () => {
      const req = { query: { compradorId: 'u1', eventoId: 'e1' } };
      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockCompraService.listarTodas).not.toHaveBeenCalled();
    });

    test('delega a listarPorComprador cuando solo se envía compradorId', async () => {
      mockCompraService.listarPorComprador.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: { compradorId: 'u1' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorComprador).toHaveBeenCalledWith('u1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'c1' }] });
    });

    test('delega a listarPorEvento cuando solo se envía eventoId', async () => {
      mockCompraService.listarPorEvento.mockResolvedValue([{ id: 'c2' }]);
      const req = { query: { eventoId: 'e1' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorEvento).toHaveBeenCalledWith('e1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('delega a listarTodas cuando no hay filtros', async () => {
      mockCompraService.listarTodas.mockResolvedValue([]);
      const req = { query: {} };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarTodas).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('restringe la consulta al usuario autenticado si es comprador', async () => {
      mockCompraService.listarPorComprador.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: {}, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorComprador).toHaveBeenCalledWith('u1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza con ForbiddenError si el comprador intenta ver compras de otro usuario', async () => {
      const req = { query: { compradorId: 'u2' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockCompraService.listarPorComprador).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si el comprador intenta ver compras de un evento', async () => {
      const req = { query: { eventoId: 'evt-1' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockCompraService.listarPorEvento).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    test('valida y crea una compra devolviendo 201', async () => {
      const datosCompra = {
        compradorId: 'u1',
        eventoId: 'e1',
        tipoEntradaId: 't1',
        cantidad: 2,
      };
      mockCompraService.realizarCompra.mockResolvedValue({ id: 'compra-1', ...datosCompra });
      const req = { body: datosCompra };

      await controller.create(req, res, next);

      expect(mockCompraService.realizarCompra).toHaveBeenCalledWith(datosCompra);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: expect.objectContaining({ id: 'compra-1' }) });
    });

    test('rechaza con ForbiddenError si compradorId no coincide con el usuario autenticado', async () => {
      const datosCompra = {
        compradorId: 'otro-usuario',
        eventoId: 'e1',
        tipoEntradaId: 't1',
        cantidad: 1,
      };
      const req = { body: datosCompra, user: { id: 'u1', rol: 'comprador' } };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('rechaza si falta compradorId sin invocar el servicio', async () => {
      const req = { body: { eventoId: 'e1', tipoEntradaId: 't1', cantidad: 1 } };
      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('rechaza si cantidad no es un entero positivo', async () => {
      const req = {
        body: { compradorId: 'u1', eventoId: 'e1', tipoEntradaId: 't1', cantidad: -1 },
      };
      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    test('cancela una compra y devuelve 200 con mensaje', async () => {
      mockCompraService.cancelarCompra.mockResolvedValue({ id: 'c1', estado: 'REEMBOLSADA' });
      const req = { params: { id: 'c1' }, body: { quien: 'Comprador' } };

      await controller.cancel(req, res, next);

      expect(mockCompraService.cancelarCompra).toHaveBeenCalledWith('c1', 'Comprador', 'Comprador');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Compra cancelada y reembolsada exitosamente' })
      );
    });

    test('pasa el actor autenticado al servicio de cancelación', async () => {
      const user = { id: 'u1', rol: 'comprador', nombre: 'Juan' };
      mockCompraService.cancelarCompra.mockResolvedValue({ id: 'c1', estado: 'REEMBOLSADA' });
      const req = { params: { id: 'c1' }, body: {}, user };

      await controller.cancel(req, res, next);

      expect(mockCompraService.cancelarCompra).toHaveBeenCalledWith('c1', user, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('rate', () => {
    test('valida calificación correcta e invoca servicio', async () => {
      mockCompraService.calificarCompra.mockResolvedValue({ id: 'c1', reseniaRealizada: true });
      const req = {
        params: { id: 'c1' },
        body: { puntuacion: 4.5, comentario: 'Excelente show' },
      };

      await controller.rate(req, res, next);

      expect(mockCompraService.calificarCompra).toHaveBeenCalledWith(
        'c1',
        {
          puntuacion: 4.5,
          comentario: 'Excelente show',
        },
        undefined
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza puntuación no divisible por 0.5', async () => {
      const req = {
        params: { id: 'c1' },
        body: { puntuacion: 4.3, comentario: 'Bueno' },
      };

      await controller.rate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockCompraService.calificarCompra).not.toHaveBeenCalled();
    });

    test('rechaza comentario mayor a 250 caracteres', async () => {
      const req = {
        params: { id: 'c1' },
        body: { puntuacion: 5, comentario: 'a'.repeat(251) },
      };

      await controller.rate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockCompraService.calificarCompra).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    test('valida y envía mensaje devolviendo 201', async () => {
      mockMensajeService.enviarMensaje.mockResolvedValue({ id: 'm1', mensaje: 'Hola' });
      const req = {
        params: { id: 'c1' },
        body: { usuarioId: 'u1', texto: 'Hola' },
      };

      await controller.sendMessage(req, res, next);

      expect(mockMensajeService.enviarMensaje).toHaveBeenCalledWith('c1', {
        usuarioId: 'u1',
        texto: 'Hola',
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('rechaza texto vacío', async () => {
      const req = {
        params: { id: 'c1' },
        body: { usuarioId: 'u1', texto: '   ' },
      };

      await controller.sendMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockMensajeService.enviarMensaje).not.toHaveBeenCalled();
    });
  });
});
