import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CompraController } from '../../src/controllers/CompraController.js';
import { Compra } from '../../src/domain/entities/Compra.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';

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

  function crearCompraMock({ id = 'c1', compradorId = 'u1', organizadorId = 'org-1' } = {}) {
    const comprador = new Usuario({ id: compradorId, nombre: 'Comprador' });
    const organizador = new Usuario({ id: organizadorId, nombre: 'Organizador', rol: 'organizador' });
    const evento = new Evento({
      id: 'e1',
      nombre: 'Evento',
      fecha: new Date(Date.now() + 10000),
      organizador,
      tiposEntrada: [new TipoEntrada({ id: 't1', nombre: 'Gen', precio: 100, cupo: 10 })],
    });
    return new Compra({
      id,
      comprador,
      evento,
      tipoEntrada: evento.tiposEntrada[0],
    });
  }

  describe('getAll', () => {
    test.each([
      { compradorId: ['u1', 'u2'] },
      { compradorId: 0 },
      { eventoId: ['e1', 'e2'] },
      { eventoId: 0 },
    ])('rechaza filtros que no son texto, incluso si son cero (%o)', async (query) => {
      await controller.getAll({ query }, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          code: 'VALIDATION_ERROR',
          message: 'Los filtros de compra deben ser valores únicos de texto',
        })
      );
      expect(mockCompraService.listarTodas).not.toHaveBeenCalled();
    });

    test('delega errores inesperados del servicio a next', async () => {
      const error = new Error('Servicio de compras no disponible');
      mockCompraService.listarTodas.mockRejectedValue(error);

      await controller.getAll({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('rechaza si se envían ambos filtros (compradorId y eventoId)', async () => {
      const req = { query: { compradorId: 'u1', eventoId: 'e1' } };
      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/Usá compradorId o eventoId, no ambos a la vez/i),
        })
      );
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

    test('permite al comprador listar enviando su propio compradorId', async () => {
      mockCompraService.listarPorComprador.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: { compradorId: 'u1' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorComprador).toHaveBeenCalledWith('u1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza con ForbiddenError si el comprador intenta ver compras de otro usuario', async () => {
      const req = { query: { compradorId: 'u2' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No tienes permiso para ver compras de otros usuarios/i),
        })
      );
      expect(mockCompraService.listarPorComprador).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si el comprador intenta ver compras de un evento', async () => {
      const req = { query: { eventoId: 'evt-1' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/Solo el organizador puede consultar las compras del evento/i),
        })
      );
      expect(mockCompraService.listarPorEvento).not.toHaveBeenCalled();
    });

    test('organizador con ?eventoId= delega el filtrado al servicio con su id de organizador', async () => {
      mockCompraService.listarPorEvento.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: { eventoId: 'e1' }, user: { id: 'org-1', rol: 'organizador' } };
      await controller.getAll(req, res, next);
      expect(mockCompraService.listarPorEvento).toHaveBeenCalledWith('e1', 'org-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'c1' }] });
    });

    test('organizador es rechazado con ForbiddenError si intenta filtrar por otro compradorId', async () => {
      const req = { query: { compradorId: 'u2' }, user: { id: 'org-1', rol: 'organizador' } };

      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No tienes permiso para ver compras de otros usuarios/i),
        })
      );
      expect(mockCompraService.listarPorOrganizador).not.toHaveBeenCalled();
    });

    test('organizador puede listar con su propio compradorId', async () => {
      mockCompraService.listarPorOrganizador.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: { compradorId: 'org-1' }, user: { id: 'org-1', rol: 'organizador' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorOrganizador).toHaveBeenCalledWith('org-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('organizador lista todas sus compras sin pasar eventoId', async () => {
      mockCompraService.listarPorOrganizador.mockResolvedValue([{ id: 'c1' }]);
      const req = { query: {}, user: { id: 'org-1', rol: 'organizador' } };

      await controller.getAll(req, res, next);

      expect(mockCompraService.listarPorOrganizador).toHaveBeenCalledWith('org-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('la respuesta de getAll no expone emails en la respuesta (Ley 25.326)', async () => {
      const comprador = new Usuario({
        id: 'u-priv',
        nombre: 'Comprador Privado',
        email: 'comprador.secreto@correo.com',
      });
      const organizador = new Usuario({
        id: 'org-priv',
        nombre: 'Org Privado',
        rol: 'organizador',
        email: 'org.secreto@correo.com',
      });
      const evento = new Evento({
        id: 'evt-priv',
        nombre: 'Evento Privado',
        fecha: new Date('2026-12-01T20:00:00Z'),
        organizador,
      });
      const compra = new Compra({
        id: 'c-priv',
        comprador,
        evento,
        tipoEntrada: new TipoEntrada({ id: 't1', nombre: 'General', precio: 500, cupo: 20 }),
      });

      mockCompraService.listarPorComprador.mockResolvedValue([compra]);
      const req = { query: {}, user: { id: 'u-priv', rol: 'comprador' } };

      await controller.getAll(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const llamadaJson = res.json.mock.calls[0][0];
      const strRes = JSON.stringify(llamadaJson);
      expect(strRes).not.toContain('comprador.secreto@correo.com');
      expect(strRes).not.toContain('org.secreto@correo.com');
      expect(llamadaJson.data[0].comprador?.email).toBeUndefined();
    });
  });

  describe('getById', () => {
    test('obtiene una compra por id y responde 200 al comprador dueño', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'u1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);
      const req = { params: { id: 'c1' }, user: { id: 'u1', rol: 'comprador' } };

      await controller.getById(req, res, next);

      expect(mockCompraService.obtenerPorId).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza con ForbiddenError si un usuario ajeno intenta ver la compra', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'u1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);
      const req = { params: { id: 'c1' }, user: { id: 'u-intruso', rol: 'comprador' } };

      await controller.getById(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No tienes permiso para ver esta compra/i),
        })
      );
    });

    test('permite consultar la compra sin actor autenticado', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'u1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);

      await controller.getById({ params: { id: 'c1' } }, res, next);

      expect(mockCompraService.obtenerPorId).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('delega error inesperado en getById a next', async () => {
      const error = new Error('Error de base de datos');
      mockCompraService.obtenerPorId.mockRejectedValue(error);

      await controller.getById({ params: { id: 'c1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('permite al organizador relacionado cuando el evento usa organizadorId plano', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'u1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);

      await controller.getById(
        { params: { id: 'c1' }, user: { id: 'org-1', rol: 'organizador' } },
        res,
        next
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('la respuesta de getById no expone el email del comprador ni del organizador (Ley 25.326)', async () => {
      const comprador = new Usuario({
        id: 'u-priv',
        nombre: 'Comprador Privado',
        email: 'comprador.privado@correo.com',
      });
      const organizador = new Usuario({
        id: 'org-priv',
        nombre: 'Org Privado',
        rol: 'organizador',
        email: 'org.privado@correo.com',
      });
      const evento = new Evento({
        id: 'evt-priv',
        nombre: 'Evento Privado',
        fecha: new Date('2026-12-01T20:00:00Z'),
        organizador,
      });
      const compra = new Compra({
        id: 'c-priv-1',
        comprador,
        evento,
        tipoEntrada: new TipoEntrada({ id: 't1', nombre: 'General', precio: 500, cupo: 20 }),
      });

      mockCompraService.obtenerPorId.mockResolvedValue(compra);
      const req = { params: { id: 'c-priv-1' }, user: { id: 'u-priv', rol: 'comprador' } };

      await controller.getById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const llamadaJson = res.json.mock.calls[0][0];
      const strRes = JSON.stringify(llamadaJson);
      expect(strRes).not.toContain('comprador.privado@correo.com');
      expect(strRes).not.toContain('org.privado@correo.com');
      expect(llamadaJson.data.comprador?.email).toBeUndefined();
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

    test('rechaza con ForbiddenError si el actor no tiene rol comprador al intentar comprar', async () => {
      const req = { body: { compradorId: 'org-1', eventoId: 'e1', tipoEntradaId: 't1', cantidad: 1 }, user: { id: 'org-1', rol: 'organizador' } };
      await controller.create(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/Solo los compradores pueden realizar compras/i),
        })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No puedes realizar compras en nombre de otro usuario/i),
        })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('rechaza si falta compradorId sin invocar el servicio', async () => {
      const req = { body: { eventoId: 'e1', tipoEntradaId: 't1', cantidad: 1 } };
      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/compradorId es requerido/i),
        })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('rechaza si cantidad no es un entero positivo', async () => {
      const req = {
        body: { compradorId: 'u1', eventoId: 'e1', tipoEntradaId: 't1', cantidad: -1 },
      };
      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/cantidad debe ser un número entero positivo/i),
        })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test.each(['', null])('rechaza eventoId ausente (%p)', async (eventoId) => {
      await controller.create(
        { body: { compradorId: 'u1', eventoId, tipoEntradaId: 't1', cantidad: 1 } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'eventoId es requerido' })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('rechaza si falta tipoEntradaId sin invocar el servicio', async () => {
      const req = { body: { compradorId: 'u1', eventoId: 'e1', cantidad: 1 } };
      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/tipoEntradaId es requerido/i),
        })
      );
      expect(mockCompraService.realizarCompra).not.toHaveBeenCalled();
    });

    test('delega error inesperado en create a next', async () => {
      const error = new Error('Fallo al crear compra');
      mockCompraService.realizarCompra.mockRejectedValue(error);

      await controller.create(
        { body: { compradorId: 'u1', eventoId: 'e1', tipoEntradaId: 't1', cantidad: 1 } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
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

    test.each([[''], ['   '], [123]])(
      'rechaza un campo quien inválido (%o) con detalle',
      async (quien) => {
        await controller.cancel({ params: { id: 'c1' }, body: { quien } }, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'ValidationError',
            code: 'VALIDATION_ERROR',
            message: 'quien debe ser un texto no vacío',
          })
        );
        expect(mockCompraService.cancelarCompra).not.toHaveBeenCalled();
      }
    );

    test('pasa el actor autenticado al servicio de cancelación', async () => {
      const user = { id: 'u1', rol: 'comprador', nombre: 'Juan' };
      mockCompraService.cancelarCompra.mockResolvedValue({ id: 'c1', estado: 'REEMBOLSADA' });
      const req = { params: { id: 'c1' }, body: {}, user };

      await controller.cancel(req, res, next);

      expect(mockCompraService.cancelarCompra).toHaveBeenCalledWith('c1', user, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('usa el nombre indicado como actor cuando no hay usuario autenticado', async () => {
      mockCompraService.cancelarCompra.mockResolvedValue({ id: 'c1' });

      await controller.cancel(
        { params: { id: 'c1' }, body: { quien: 'Organizador' } },
        res,
        next
      );

      expect(mockCompraService.cancelarCompra).toHaveBeenCalledWith(
        'c1',
        'Organizador',
        'Organizador'
      );
    });

    test('delega error inesperado en cancel a next', async () => {
      const error = new Error('Error al cancelar');
      mockCompraService.cancelarCompra.mockRejectedValue(error);

      await controller.cancel({ params: { id: 'c1' }, body: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('markUsed', () => {
    test('acredita la compra y devuelve el mensaje y resultado esperados', async () => {
      const compra = { id: 'c1', estado: 'UTILIZADA' };
      mockCompraService.marcarUtilizada.mockResolvedValue(compra);
      const user = { id: 'org-1', rol: 'organizador' };

      await controller.markUsed(
        { params: { id: 'c1' }, body: { quien: 'Puerta' }, user },
        res,
        next
      );

      expect(mockCompraService.marcarUtilizada).toHaveBeenCalledWith('c1', user, 'Puerta');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: compra,
        message: 'Entrada acreditada y marcada como UTILIZADA',
      });
    });

    test('acredita la compra sin actor usando quien', async () => {
      const compra = { id: 'c1', estado: 'UTILIZADA' };
      mockCompraService.marcarUtilizada.mockResolvedValue(compra);

      await controller.markUsed(
        { params: { id: 'c1' }, body: { quien: 'Puerta' } },
        res,
        next
      );

      expect(mockCompraService.marcarUtilizada).toHaveBeenCalledWith('c1', 'Puerta', 'Puerta');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('acredita la compra sin actor y sin quien', async () => {
      const compra = { id: 'c1', estado: 'UTILIZADA' };
      mockCompraService.marcarUtilizada.mockResolvedValue(compra);

      await controller.markUsed(
        { params: { id: 'c1' }, body: {} },
        res,
        next
      );

      expect(mockCompraService.marcarUtilizada).toHaveBeenCalledWith('c1', undefined, undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza quien inválido antes de llamar al servicio', async () => {
      await controller.markUsed(
        { params: { id: 'c1' }, body: { quien: 42 } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          code: 'VALIDATION_ERROR',
          message: 'quien debe ser un texto no vacío',
        })
      );
      expect(mockCompraService.marcarUtilizada).not.toHaveBeenCalled();
    });

    test('delega error inesperado en markUsed a next', async () => {
      const error = new Error('Error al acreditar');
      mockCompraService.marcarUtilizada.mockRejectedValue(error);

      await controller.markUsed({ params: { id: 'c1' }, body: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
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
      expect(res.json).toHaveBeenCalledWith({
        data: { id: 'c1', reseniaRealizada: true },
        message: 'Reseña registrada con éxito',
      });
    });

    test('rechaza puntuación no divisible por 0.5', async () => {
      const req = {
        params: { id: 'c1' },
        body: { puntuacion: 4.3, comentario: 'Bueno' },
      };

      await controller.rate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          code: 'VALIDATION_ERROR',
          message: 'La puntuación debe estar entre 0.5 y 5 en incrementos de 0.5',
        })
      );
      expect(mockCompraService.calificarCompra).not.toHaveBeenCalled();
    });

    test('rechaza comentario mayor a 250 caracteres', async () => {
      const req = {
        params: { id: 'c1' },
        body: { puntuacion: 5, comentario: 'a'.repeat(251) },
      };

      await controller.rate(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/comentario no puede superar los 250 caracteres/i),
        })
      );
      expect(mockCompraService.calificarCompra).not.toHaveBeenCalled();
    });

    test.each([0, 5.25, 6])('rechaza puntuación fuera del rango (%p)', async (puntuacion) => {
      await controller.rate(
        { params: { id: 'c1' }, body: { puntuacion, comentario: 'Bueno' } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'La puntuación debe estar entre 0.5 y 5 en incrementos de 0.5',
        })
      );
      expect(mockCompraService.calificarCompra).not.toHaveBeenCalled();
    });

    test('rechaza comentario vacío con mensaje específico', async () => {
      await controller.rate(
        { params: { id: 'c1' }, body: { puntuacion: 5, comentario: '   ' } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'El comentario es requerido' })
      );
    });

    test('delega error inesperado en rate a next', async () => {
      const error = new Error('Error al calificar');
      mockCompraService.calificarCompra.mockRejectedValue(error);

      await controller.rate(
        { params: { id: 'c1' }, body: { puntuacion: 4, comentario: 'Bueno' } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/El texto del mensaje no puede estar vacío/i),
        })
      );
      expect(mockMensajeService.enviarMensaje).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si actor intenta enviar mensaje con usuarioId distinto', async () => {
      await controller.sendMessage(
        {
          params: { id: 'c1' },
          body: { usuarioId: 'u2', texto: 'Hola' },
          user: { id: 'u1', rol: 'comprador' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No puedes enviar mensajes en nombre de otro usuario/i),
        })
      );
      expect(mockMensajeService.enviarMensaje).not.toHaveBeenCalled();
    });

    test('rechaza con ValidationError si falta usuarioId y no hay actor', async () => {
      await controller.sendMessage(
        {
          params: { id: 'c1' },
          body: { texto: 'Hola' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/usuarioId es requerido para enviar un mensaje/i),
        })
      );
      expect(mockMensajeService.enviarMensaje).not.toHaveBeenCalled();
    });

    test('delega error inesperado en sendMessage a next', async () => {
      const error = new Error('Error al enviar mensaje');
      mockMensajeService.enviarMensaje.mockRejectedValue(error);

      await controller.sendMessage(
        {
          params: { id: 'c1' },
          body: { usuarioId: 'u1', texto: 'Hola' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getMessages', () => {
    test('permite al organizador relacionado consultar los mensajes', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'comprador-1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);
      mockMensajeService.obtenerMensajes.mockResolvedValue([{ id: 'm1', texto: 'Hola' }]);

      await controller.getMessages(
        { params: { id: 'c1' }, user: { id: 'org-1', rol: 'organizador' } },
        res,
        next
      );

      expect(mockMensajeService.obtenerMensajes).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'm1', texto: 'Hola' }] });
    });

    test('rechaza a un usuario ajeno y no consulta los mensajes', async () => {
      const compra = crearCompraMock({ id: 'c1', compradorId: 'comprador-1', organizadorId: 'org-1' });
      mockCompraService.obtenerPorId.mockResolvedValue(compra);

      await controller.getMessages(
        { params: { id: 'c1' }, user: { id: 'otro-1', rol: 'comprador' } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No tienes permiso para ver los mensajes de esta compra/i),
        })
      );
      expect(mockMensajeService.obtenerMensajes).not.toHaveBeenCalled();
    });

    test('permite la consulta sin actor autenticado', async () => {
      mockMensajeService.obtenerMensajes.mockResolvedValue([]);

      await controller.getMessages({ params: { id: 'c1' } }, res, next);

      expect(mockCompraService.obtenerPorId).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('delega error inesperado en getMessages a next', async () => {
      const error = new Error('Error al obtener mensajes');
      mockMensajeService.obtenerMensajes.mockRejectedValue(error);

      await controller.getMessages({ params: { id: 'c1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('markMessagesRead', () => {
    test('usa el usuario autenticado y marca los mensajes como leídos', async () => {
      mockMensajeService.marcarMensajesLeidos.mockResolvedValue([{ id: 'm1' }]);

      await controller.markMessagesRead(
        { params: { id: 'c1' }, body: {}, user: { id: 'u1', rol: 'comprador' } },
        res,
        next
      );

      expect(mockMensajeService.marcarMensajesLeidos).toHaveBeenCalledWith('c1', 'u1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza marcar mensajes en nombre de otro usuario', async () => {
      await controller.markMessagesRead(
        {
          params: { id: 'c1' },
          body: { usuarioId: 'u2' },
          user: { id: 'u1', rol: 'comprador' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No puedes marcar mensajes leídos en nombre de otro usuario/i),
        })
      );
      expect(mockMensajeService.marcarMensajesLeidos).not.toHaveBeenCalled();
    });

    test('rechaza cuando no hay un usuario para marcar mensajes', async () => {
      await controller.markMessagesRead({ params: { id: 'c1' }, body: {} }, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/usuarioId es requerido para marcar los mensajes como leídos/i),
        })
      );
      expect(mockMensajeService.marcarMensajesLeidos).not.toHaveBeenCalled();
    });

    test('delega error inesperado en markMessagesRead a next', async () => {
      const error = new Error('Error al marcar leídos');
      mockMensajeService.marcarMensajesLeidos.mockRejectedValue(error);

      await controller.markMessagesRead(
        { params: { id: 'c1' }, body: {}, user: { id: 'u1', rol: 'comprador' } },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
