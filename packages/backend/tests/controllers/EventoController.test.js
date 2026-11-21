import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EventoController } from '../../src/controllers/EventoController.js';
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
      [{ categoria: 123 }],
      [{ search: ['concierto'] }],
      [{ search: 123 }],
      [{ sortBy: ['fecha'] }],
      [{ sortBy: 123 }],
    ])('rechaza filtros que no son valores únicos de texto (%o)', async (query) => {
      await controller.getAll({ query }, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/Los filtros de eventos deben ser valores únicos de texto/i),
        })
      );
      expect(mockEventoService.listarEventos).not.toHaveBeenCalled();
    });

    test('rechaza sortBy no soportado sin llamar al servicio', async () => {
      const req = { query: { sortBy: 'invalido' } };
      await controller.getAll(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/sortBy debe ser fecha, precio o rating/i),
        })
      );
      expect(mockEventoService.listarEventos).not.toHaveBeenCalled();
    });

    test.each(['fecha', 'precio', 'rating'])(
      'permite sortBy válido: %s',
      async (sortBy) => {
        await controller.getAll({ query: { sortBy } }, res, next);

        expect(mockEventoService.listarEventos).toHaveBeenCalledWith({
          categoria: undefined,
          search: undefined,
          sortBy,
        });
        expect(res.status).toHaveBeenCalledWith(200);
      }
    );

    test('permite filtrar por categoria y search', async () => {
      await controller.getAll(
        { query: { categoria: 'recitales', search: 'rock' } },
        res,
        next
      );

      expect(mockEventoService.listarEventos).toHaveBeenCalledWith({
        categoria: 'recitales',
        search: 'rock',
        sortBy: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
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

    test('delega error inesperado en getById a next', async () => {
      const error = new Error('Error al obtener evento');
      mockEventoService.obtenerPorId.mockRejectedValue(error);

      await controller.getById({ params: { id: 'e1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/Solo los organizadores pueden crear eventos/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza con ForbiddenError si un organizador intenta crear un evento para otro organizador', async () => {
      const req = {
        is: () => false,
        body: eventoValido,
        user: { id: 'org-otro', rol: 'organizador' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No puedes crear eventos a nombre de otro organizador/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test.each(['', '   ', 123])('rechaza si el nombre no es texto válido (%o)', async (nombre) => {
      const req = {
        is: () => false,
        body: { ...eventoValido, nombre },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/El nombre del evento es requerido/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si falta la fecha del evento', async () => {
      const { fecha: _f, ...sinFecha } = eventoValido;
      const req = {
        is: () => false,
        body: sinFecha,
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/La fecha del evento es requerida/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si la fecha no es válida', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, fecha: 'no-es-fecha' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/La fecha del evento debe ser una fecha válida/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si faltan tanto categoria como categoriaId', async () => {
      const { categoria: _c, categoriaId: _cid, ...sinCategoria } = eventoValido;
      const req = {
        is: () => false,
        body: sinCategoria,
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/La categoría del evento es requerida/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('rechaza si categoria y categoriaId contienen solo espacios', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, categoria: '   ', categoriaId: '   ' },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/La categoría del evento es requerida/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('permite crear indicando solo categoria (sin categoriaId)', async () => {
      const { categoriaId: _cid, ...soloCategoria } = eventoValido;
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-cat', ...soloCategoria, categoria: 'Festivales' });
      const req = {
        is: () => false,
        body: { ...soloCategoria, categoria: 'Festivales' },
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: 'Festivales' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('permite crear indicando solo categoriaId (sin categoria)', async () => {
      const { categoria: _c, ...soloCategoriaId } = eventoValido;
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-cat-id', ...soloCategoriaId });
      const req = {
        is: () => false,
        body: soloCategoriaId,
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 'cat-1' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test.each(['', '   ', 12345])('rechaza si falta o es inválido organizadorId (%o)', async (organizadorId) => {
      const { organizadorId: _org, ...sinOrg } = eventoValido;
      const req = {
        is: () => false,
        body: organizadorId !== undefined ? { ...sinOrg, organizadorId } : sinOrg,
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/organizadorId es requerido/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('crea evento incluyendo imagenes cuando req.files está presente', async () => {
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-files' });
      const files = [{ filename: 'foto.jpg' }];
      const req = {
        is: () => false,
        body: eventoValido,
        files,
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ imagenes: files })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('crea evento con imagenes vacias cuando req.files no está presente', async () => {
      mockEventoService.crearEvento.mockResolvedValue({ id: 'evt-no-files' });
      const req = {
        is: () => false,
        body: eventoValido,
      };

      await controller.create(req, res, next);

      expect(mockEventoService.crearEvento).toHaveBeenCalledWith(
        expect.objectContaining({ imagenes: [] })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('rechaza si no tiene tipos de entrada', async () => {
      const req = {
        is: () => false,
        body: { ...eventoValido, tiposEntrada: [] },
      };

      await controller.create(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/Debe incluir al menos un tipo de entrada con su precio y cupo/i),
        })
      );
      expect(mockEventoService.crearEvento).not.toHaveBeenCalled();
    });

    test('delega error inesperado en create a next', async () => {
      const error = new Error('Error al crear evento');
      mockEventoService.crearEvento.mockRejectedValue(error);

      await controller.create({ is: () => false, body: eventoValido }, res, next);

      expect(next).toHaveBeenCalledWith(error);
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

    test.each([null, [], 'texto', 123])(
      'rechaza en create un cuerpo que no es un objeto JSON (%o)',
      async (body) => {
        await controller.create({ is: () => false, body }, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'ValidationError',
            message: 'El cuerpo de la solicitud debe ser un objeto JSON',
          })
        );
      }
    );
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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/Solo los organizadores pueden modificar eventos/i),
        })
      );
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

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ForbiddenError',
          message: expect.stringMatching(/No puedes modificar eventos a nombre de otro organizador/i),
        })
      );
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
    });

    test('rechaza si falta organizadorId al modificar el evento y no hay actor', async () => {
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { nombre: 'Nuevo Nombre' },
      };
      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/organizadorId es requerido para modificar el evento/i),
        })
      );
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
    });

    test('rechaza si organizadorId solo contiene espacios al modificar el evento', async () => {
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: '   ', nombre: 'Nuevo Nombre' },
      };
      await controller.update(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/organizadorId es requerido para modificar el evento/i),
        })
      );
      expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
    });

    test('delega error inesperado en update a next', async () => {
      const error = new Error('Error al actualizar evento');
      mockEventoService.actualizarEvento.mockRejectedValue(error);

      await controller.update(
        {
          is: () => false,
          params: { id: 'evt-1' },
          body: { organizadorId: 'org-1', nombre: 'Nuevo Nombre' },
        },
        res,
        next
      );

      expect(next).toHaveBeenCalledWith(error);
    });

    test.each([
      ['JSON inválido', '{', 'El campo cambios debe contener un objeto JSON válido'],
      ['un array JSON', '[]', 'El campo cambios debe contener un objeto JSON'],
      ['null', 'null', 'El campo cambios debe contener un objeto JSON'],
      ['un primitivo', '"texto"', 'El campo cambios debe contener un objeto JSON'],
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

    test('actualiza el evento vía multipart/form-data con éxito', async () => {
      const eventoModificado = { id: 'evt-1', nombre: 'Modificado Multipart' };
      mockEventoService.actualizarEvento.mockResolvedValue(eventoModificado);
      const req = {
        is: (tipo) => tipo === 'multipart/form-data',
        params: { id: 'evt-1' },
        body: { cambios: JSON.stringify({ organizadorId: 'org-1', nombre: 'Modificado Multipart' }) },
        user: { id: 'org-1', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(mockEventoService.actualizarEvento).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({ nombre: 'Modificado Multipart', organizadorId: 'org-1' })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: eventoModificado });
    });

    test('actualiza con imagenes cuando req.files está presente', async () => {
      const eventoModificado = { id: 'evt-1', nombre: 'Modificado', imagenes: ['foto1.jpg'] };
      mockEventoService.actualizarEvento.mockResolvedValue(eventoModificado);
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Modificado' },
        files: [{ filename: 'foto1.jpg' }],
        user: { id: 'org-1', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(mockEventoService.actualizarEvento).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({
          nombre: 'Modificado',
          organizadorId: 'org-1',
          imagenes: [{ filename: 'foto1.jpg' }],
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: eventoModificado });
    });

    test('actualiza sin imagenes cuando req.files es undefined', async () => {
      const eventoModificado = { id: 'evt-1', nombre: 'Modificado', imagenes: [] };
      mockEventoService.actualizarEvento.mockResolvedValue(eventoModificado);
      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Modificado' },
        user: { id: 'org-1', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(mockEventoService.actualizarEvento).toHaveBeenCalledWith(
        'evt-1',
        expect.objectContaining({
          nombre: 'Modificado',
          organizadorId: 'org-1',
          imagenes: [],
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: eventoModificado });
    });

    test.each([null, [], 'texto', 123])(
      'rechaza update si body no es un objeto JSON en petición regular (%o)',
      async (body) => {
        await controller.update(
          { is: () => false, body, params: { id: 'evt-1' } },
          res,
          next
        );

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'ValidationError',
            message: 'El cuerpo de la solicitud debe ser un objeto JSON',
          })
        );
        expect(mockEventoService.actualizarEvento).not.toHaveBeenCalled();
      }
    );

    test('pasa el error a next cuando el servicio rechaza la actualización de un evento cerrado', async () => {
      const errorCerrado = new Error('No se puede editar un evento que ya ha finalizado o está cerrado');
      mockEventoService.actualizarEvento.mockRejectedValue(errorCerrado);

      const req = {
        is: () => false,
        params: { id: 'evt-1' },
        body: { organizadorId: 'org-1', nombre: 'Cambio' },
        user: { id: 'org-1', rol: 'organizador' },
      };

      await controller.update(req, res, next);

      expect(next).toHaveBeenCalledWith(errorCerrado);
    });
  });

});
