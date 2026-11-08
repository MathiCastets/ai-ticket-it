import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { EventoService } from '../../src/services/EventoService.js';
import { EventoRepository } from '../../src/repositories/inMemory/EventoRepository.js';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { CategoriaRepository } from '../../src/repositories/inMemory/CategoriaRepository.js';
import { CompraRepository } from '../../src/repositories/inMemory/CompraRepository.js';
import { CompraService } from '../../src/services/CompraService.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { Categoria } from '../../src/domain/entities/Categoria.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';
import { BusinessRuleError, ResourceNotFoundError } from '../../src/services/errors/index.js';

describe('EventoService', () => {
  let eventoRepo;
  let usuarioRepo;
  let categoriaRepo;
  let compraRepo;
  let compraService;
  let service;

  let organizador;
  let comprador;
  let categoria;
  let evento;

  const fakeStorage = {
    guardar: async (files) => files.map((f) => `/uploads/${f.filename || 'img.jpg'}`),
    eliminar: async () => {},
  };

  beforeEach(() => {
    organizador = new Usuario({
      id: 'org-1',
      nombre: 'Prod Test',
      rol: 'organizador',
      email: 'org@test.com',
    });
    comprador = new Usuario({
      id: 'comp-1',
      nombre: 'Comprador Test',
      rol: 'comprador',
      email: 'comp@test.com',
    });
    categoria = new Categoria({
      id: 'cat-recitales',
      nombre: 'Recitales',
    });
    evento = new Evento({
      id: 'evt-1',
      nombre: 'Festival Rock',
      fecha: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      organizador,
      categoria,
      tiposEntrada: [new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100 })],
    });

    eventoRepo = new EventoRepository([evento]);
    usuarioRepo = new UsuarioRepository([organizador, comprador]);
    categoriaRepo = new CategoriaRepository([categoria]);
    compraRepo = new CompraRepository([]);
    compraService = new CompraService(compraRepo, eventoRepo, usuarioRepo);

    service = new EventoService(
      eventoRepo,
      usuarioRepo,
      categoriaRepo,
      compraService,
      fakeStorage
    );
  });

  describe('listarEventos y obtenerPorId', () => {
    test('lista todos los eventos', async () => {
      const eventos = await service.listarEventos();
      expect(eventos).toHaveLength(1);
      expect(eventos[0].id).toBe('evt-1');
    });

    test('ordena por rating promediando por organizador y dejando sin reseñas al final', async () => {
      const orgAlto = new Usuario({ id: 'org-alto', nombre: 'Alto', rol: 'organizador' });
      const orgBajo = new Usuario({ id: 'org-bajo', nombre: 'Bajo', rol: 'organizador' });
      const orgSin = new Usuario({ id: 'org-sin', nombre: 'Sin Reseñas', rol: 'organizador' });
      const e1 = new Evento({ id: 'e1', nombre: 'E1', fecha: new Date(Date.now() + 100000).toISOString(), organizador: orgBajo, tiposEntrada: [new TipoEntrada({ id: 't1', nombre: 'T1', precio: 10, cupo: 10 })], resenias: [{ puntuacion: 2 }, { puntuacion: 3 }] });
      const e2 = new Evento({ id: 'e2', nombre: 'E2', fecha: new Date(Date.now() + 200000).toISOString(), organizador: orgAlto, tiposEntrada: [new TipoEntrada({ id: 't2', nombre: 'T2', precio: 10, cupo: 10 })], resenias: [{ puntuacion: 5 }, { puntuacion: 4 }] });
      const e3 = new Evento({ id: 'e3', nombre: 'E3', fecha: new Date(Date.now() + 300000).toISOString(), organizador: orgSin, tiposEntrada: [new TipoEntrada({ id: 't3', nombre: 'T3', precio: 10, cupo: 10 })], resenias: [] });
      eventoRepo.findAll = async () => [e1, e2, e3];
      const ordenados = await service.listarEventos({ sortBy: 'rating' });
      expect(ordenados.map(e => e.id)).toEqual(['e2', 'e1', 'e3']);
    });

    test('obtiene un evento por id', async () => {
      const ev = await service.obtenerPorId('evt-1');
      expect(ev.nombre).toBe('Festival Rock');
    });

    test('lanza ResourceNotFoundError si el evento no existe', async () => {
      await expect(service.obtenerPorId('inexistente')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('crearEvento', () => {
    test('crea un evento válido', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Concierto Jazz',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [{ nombre: 'General', precio: 8000, cupo: 50 }],
      });

      expect(nuevo).toBeDefined();
      expect(nuevo.nombre).toBe('Concierto Jazz');
      expect(nuevo.organizador.id).toBe('org-1');
      expect(nuevo.categoria.id).toBe('cat-recitales');
      expect(nuevo.tiposEntrada).toHaveLength(1);

      const enRepo = await eventoRepo.findById(nuevo.id);
      expect(enRepo).toBe(nuevo);
    });

    test('falla si la fecha del evento es anterior o igual al momento actual', async () => {
      await expect(
        service.crearEvento({
          nombre: 'Evento Pasado',
          fecha: new Date(Date.now() - 10000).toISOString(),
          organizadorId: 'org-1',
          categoriaId: 'cat-recitales',
          tiposEntrada: [{ nombre: 'General', precio: 8000, cupo: 50 }],
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('falla si el usuario no es organizador', async () => {
      await expect(
        service.crearEvento({
          nombre: 'Inválido',
          fecha: new Date(Date.now() + 500000).toISOString(),
          organizadorId: 'comp-1', // rol comprador!
          categoriaId: 'cat-recitales',
          tiposEntrada: [{ nombre: 'General', precio: 8000, cupo: 50 }],
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('falla si la categoría no existe', async () => {
      await expect(
        service.crearEvento({
          nombre: 'Inválido',
          fecha: new Date(Date.now() + 500000).toISOString(),
          organizadorId: 'org-1',
          categoriaId: 'cat-inexistente',
          tiposEntrada: [{ nombre: 'General', precio: 8000, cupo: 50 }],
        })
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('falla si no tiene tipos de entrada', async () => {
      await expect(
        service.crearEvento({
          nombre: 'Inválido',
          fecha: new Date(Date.now() + 500000).toISOString(),
          organizadorId: 'org-1',
          categoriaId: 'cat-recitales',
          tiposEntrada: [],
        })
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('actualizarEvento', () => {
    test('el organizador puede actualizar datos del evento', async () => {
      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        nombre: 'Festival Rock 2026 Remastered',
        ubicacion: 'Estadio Obras',
      });

      expect(actualizado.nombre).toBe('Festival Rock 2026 Remastered');
      expect(actualizado.ubicacion).toBe('Estadio Obras');
    });

    test('rechaza si un usuario ajeno intenta modificar el evento', async () => {
      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'otro-org',
          nombre: 'Hack',
        })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('rechaza si la nueva fecha es en el pasado', async () => {
      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          fecha: new Date(Date.now() - 100000).toISOString(),
        })
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe('validaciones y compensaciones', () => {
    const crearDatosEvento = (overrides = {}) => ({
      nombre: 'Evento nuevo',
      fecha: new Date(Date.now() + 500000).toISOString(),
      organizadorId: 'org-1',
      categoriaId: 'cat-recitales',
      tiposEntrada: [{ id: 'te-nuevo', nombre: 'General', precio: 1000, cupo: 20 }],
      ...overrides,
    });

    test.each([
      ['rechaza imagenes si no es una lista', { imagenes: null }],
      ['rechaza multimedia si no es una lista', { multimedia: null }],
      ['rechaza más de una imagen total', { multimedia: ['/uploads/one.jpg'], imagen: '/uploads/two.jpg' }],
      ['rechaza un nombre vacío', { nombre: '   ' }],
      ['rechaza una fecha ausente', { fecha: '' }],
      ['rechaza una fecha inválida', { fecha: 'no-es-fecha' }],
      ['rechaza una fecha pasada', { fecha: new Date(Date.now() - 1000).toISOString() }],
      ['rechaza una lista de entradas vacía', { tiposEntrada: [] }],
    ])('%s', async (_description, cambios) => {
      await expect(service.crearEvento(crearDatosEvento(cambios))).rejects.toThrow(
        BusinessRuleError
      );
    });

    test('convierte a recurso no encontrado si el organizador no existe', async () => {
      await expect(
        service.crearEvento(crearDatosEvento({ organizadorId: 'org-inexistente' }))
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test('propaga errores inesperados al buscar el organizador', async () => {
      usuarioRepo.findById = async () => {
        throw new Error('Repositorio no disponible');
      };

      await expect(service.crearEvento(crearDatosEvento())).rejects.toThrow(
        'Repositorio no disponible'
      );
    });

    test('acepta resolver la categoría por nombre cuando no se encuentra por id', async () => {
      const creado = await service.crearEvento(
        crearDatosEvento({ categoriaId: undefined, categoria: 'Recitales' })
      );

      expect(creado.categoria).toBe(categoria);
    });

    test('no crea el evento cuando no logra resolver la categoría', async () => {
      categoriaRepo.findByNombre = async () => {
        throw new EntityNotFoundError('Categoria', 'desconocida');
      };

      await expect(
        service.crearEvento(crearDatosEvento({ categoriaId: 'desconocida' }))
      ).rejects.toThrow(ResourceNotFoundError);
    });

    test.each([
      ['entrada no es un objeto', [null]],
      ['nombre de entrada vacío', [{ id: 't1', nombre: ' ', precio: 1, cupo: 1 }]],
      ['precio no es numérico', [{ id: 't1', nombre: 'General', precio: '1', cupo: 1 }]],
      ['precio es negativo', [{ id: 't1', nombre: 'General', precio: -1, cupo: 1 }]],
      ['cupo no es entero positivo', [{ id: 't1', nombre: 'General', precio: 1, cupo: 0 }]],
    ])('rechaza cuando la %s', async (_description, tiposEntrada) => {
      await expect(service.crearEvento(crearDatosEvento({ tiposEntrada }))).rejects.toThrow(
        BusinessRuleError
      );
    });

    test('rechaza identificadores duplicados entre tipos de entrada', async () => {
      const tiposEntrada = [
        { id: 'duplicado', nombre: 'General', precio: 10, cupo: 10 },
        { id: 'duplicado', nombre: 'VIP', precio: 20, cupo: 5 },
      ];

      await expect(
        service.crearEvento(crearDatosEvento({ tiposEntrada }))
      ).rejects.toThrow('deben tener ids únicos');
    });

    test('elimina la imagen cargada si falla el guardado del nuevo evento', async () => {
      const eliminar = jest.fn().mockResolvedValue(undefined);
      service.eventoImageStorage = {
        guardar: jest.fn().mockResolvedValue(['/uploads/nueva.jpg']),
        eliminar,
      };
      eventoRepo.save = async () => {
        throw new Error('No se pudo guardar');
      };

      await expect(
        service.crearEvento(
          crearDatosEvento({ imagenes: [{ filename: 'nueva.jpg' }] })
        )
      ).rejects.toThrow('No se pudo guardar');
      expect(eliminar).toHaveBeenCalledWith(['/uploads/nueva.jpg']);
    });

    test.each([
      ['rechaza nombre vacío', { nombre: ' ' }],
      ['rechaza descripción no textual', { descripcion: 1 }],
      ['rechaza ubicación no textual', { ubicacion: 1 }],
      ['rechaza dirección no textual', { direccion: 1 }],
      ['rechaza imagen no textual', { imagen: 1 }],
      ['rechaza fecha que no es texto', { fecha: Date.now() + 100000 }],
      ['rechaza fecha inválida', { fecha: 'inválida' }],
      ['rechaza fecha pasada', { fecha: new Date(Date.now() - 1000).toISOString() }],
      ['rechaza imagenes no listadas', { imagenes: null }],
      ['rechaza más de una imagen', { imagenes: [{}, {}] }],
    ])('actualizarEvento %s', async (_description, cambios) => {
      await expect(
        service.actualizarEvento('evt-1', { organizadorId: 'org-1', ...cambios })
      ).rejects.toThrow(BusinessRuleError);
    });

    test('elimina imágenes reemplazadas y conserva el evento actualizado', async () => {
      evento.imagen = '/uploads/anterior.jpg';
      evento.multimedia = ['/uploads/anterior.jpg'];
      const eliminar = jest.fn().mockResolvedValue(undefined);
      service.eventoImageStorage = { guardar: jest.fn(), eliminar };

      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagen: '/uploads/nueva.jpg',
      });

      expect(actualizado.imagen).toBe('/uploads/nueva.jpg');
      expect(actualizado.multimedia).toEqual(['/uploads/nueva.jpg']);
      expect(eliminar).toHaveBeenCalledWith(['/uploads/anterior.jpg']);
    });

    test('restaura los valores originales y limpia la imagen si falla el guardado', async () => {
      const nombreOriginal = evento.nombre;
      const eliminar = jest.fn().mockResolvedValue(undefined);
      service.eventoImageStorage = {
        guardar: jest.fn().mockResolvedValue(['/uploads/nueva.jpg']),
        eliminar,
      };
      eventoRepo.save = async () => {
        throw new Error('No se pudo guardar');
      };

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          nombre: 'Nombre temporal',
          imagenes: [{ filename: 'nueva.jpg' }],
        })
      ).rejects.toThrow('No se pudo guardar');
      expect(evento.nombre).toBe(nombreOriginal);
      expect(eliminar).toHaveBeenCalledWith(['/uploads/nueva.jpg']);
    });

    test('expone ambos errores si falla el guardado y su compensación', async () => {
      service.eventoImageStorage = {
        guardar: jest.fn().mockResolvedValue(['/uploads/nueva.jpg']),
        eliminar: jest.fn().mockRejectedValue(new Error('No se pudo limpiar')),
      };
      eventoRepo.save = async () => {
        throw new Error('No se pudo guardar');
      };

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          imagenes: [{ filename: 'nueva.jpg' }],
        })
      ).rejects.toBeInstanceOf(AggregateError);
    });
  });

});
