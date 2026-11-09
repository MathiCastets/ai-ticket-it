import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EventoController } from '../../src/controllers/EventoController.js';
import { ValidationError } from '../../src/controllers/errors/ValidationError.js';
import { ForbiddenError } from '../../src/services/errors/index.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';

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
    };

    controller = new EventoController(mockEventoService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    test('delega errores inesperados del servicio a next', async () => {
      const error = new Error('Servicio de eventos no disponible');
      mockEventoService.listarEventos.mockRejectedValue(error);

      await controller.getAll({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test.each([
      [{ categoria: ['cat-1'] }],
      [{ search: ['concierto'] }],
      [{ sortBy: ['fecha'] }],
    ])('rechaza filtros que no son valores únicos de texto (%o)', async (query) => {
      await controller.getAll({ query }, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockEventoService.listarEventos).not.toHaveBeenCalled();
    });

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

    test('serializa eventos que exponen toJSON', async () => {
      const serializado = { id: 'e-serializado', nombre: 'Evento serializado' };
      mockEventoService.listarEventos.mockResolvedValue([
        { toJSON: jest.fn().mockReturnValue(serializado) },
      ]);

      await controller.getAll({ query: {} }, res, next);

      expect(res.json).toHaveBeenCalledWith({ data: [serializado] });
    });

    test('la respuesta de getAll no expone el email del organizador (Ley 25.326)', async () => {
      const organizador = new Usuario({
        id: 'org-priv',
        nombre: 'Teatro',
        rol: 'organizador',
        email: 'secreto.organizador@teatro.com',
      });
      const evento = new Evento({
        id: 'e-priv',
        nombre: 'Concierto',
        fecha: new Date('2026-12-15T20:00:00Z'),
        organizador,
      });

      mockEventoService.listarEventos.mockResolvedValue([evento]);
      const req = { query: {} };

      await controller.getAll(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const jsonLlamada = res.json.mock.calls[0][0];
      const resString = JSON.stringify(jsonLlamada);
      expect(resString).not.toContain('secreto.organizador@teatro.com');
      expect(jsonLlamada.data[0].organizador?.email).toBeUndefined();
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

    test('la respuesta de getById no expone el email del organizador (Ley 25.326)', async () => {
      const organizador = new Usuario({
        id: 'org-priv',
        nombre: 'Teatro Colón',
        rol: 'organizador',
        email: 'entradas.privadas@teatrocolon.org.ar',
      });
      const evento = new Evento({
        id: 'e-priv-id',
        nombre: 'Ópera',
        fecha: new Date('2026-12-15T20:00:00Z'),
        organizador,
      });

      mockEventoService.obtenerPorId.mockResolvedValue(evento);
      const req = { params: { id: 'e-priv-id' } };

      await controller.getById(req, res, next);

      expect(mockEventoService.obtenerPorId).toHaveBeenCalledWith('e-priv-id');
      expect(mockEventoService.listarEventos).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      const jsonLlamada = res.json.mock.calls[0][0];
      const resString = JSON.stringify(jsonLlamada);
      expect(resString).not.toContain('entradas.privadas@teatrocolon.org.ar');
      expect(jsonLlamada.data.organizador?.email).toBeUndefined();
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

    test.each([
      ['JSON inválido', '{', 'El campo evento debe contener un objeto JSON válido'],
      ['un array JSON', '[]', 'El campo evento debe contener un objeto JSON'],
      ['null', 'null', 'El campo evento debe contener un objeto JSON'],
    ])('rechaza multipart con %s', async (_caso, evento, mensaje) => {
      const req = {
        is: (tipo) => tipo === 'multipart/form-data',
        body: { evento },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ValidationError', code: 'VALIDATION_ERROR', message: mensaje })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
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

    test('usa el organizador autenticado cuando el payload no indica organizadorId', async () => {
      const { organizadorId: _organizadorId, ...payloadSinOrganizador } = eventoValido;
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-actor' });

      await controller.create(
        {
          is: () => false,
          body: payloadSinOrganizador,
          user: { id: 'org-1', rol: 'organizador' },
          files: [],
        },
        res,
        next
      );

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ organizadorId: 'org-1', imagenes: [] })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('rechaza un cuerpo que no es un objeto JSON', async () => {
      await controller.create({ is: () => false, body: [] }, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: 'El cuerpo de la solicitud debe ser un objeto JSON',
        })
      );
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

    test.each([
      ['JSON inválido', '{', 'El campo cambios debe contener un objeto JSON válido'],
      ['un array JSON', '[]', 'El campo cambios debe contener un objeto JSON'],
    ])('rechaza multipart con %s', async (_caso, cambios, mensaje) => {
      await controller.update(
        {
          is: (tipo) => tipo === 'multipart/form-data',
          body: { cambios },
          params: { id: 'evt-1' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: mensaje }));
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
    });
  });

});
