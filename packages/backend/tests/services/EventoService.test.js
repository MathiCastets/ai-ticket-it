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

    test('acumula reseñas de eventos del mismo organizador y admite organizadorId plano', async () => {
      const e1 = {
        id: 'e1',
        organizadorId: 'org-compartido',
        resenias: [{ puntuacion: 5 }],
      };
      const e2 = {
        id: 'e2',
        organizador: { id: 'org-otro' },
        resenias: [{ puntuacion: 1 }, { puntuacion: 1 }],
      };
      const e3 = {
        id: 'e3',
        organizadorId: 'org-compartido',
        resenias: [{ puntuacion: 1 }],
      };
      eventoRepo.findAll = async () => [e1, e2, e3];

      const ordenados = await service.listarEventos({ sortBy: 'rating' });

      expect(ordenados.map((item) => item.id)).toEqual(['e1', 'e3', 'e2']);
    });

    test('deja al final los eventos sin reseñas incluso cuando se comparan entre sí', async () => {
      const sinReseniasA = { id: 'sin-a', organizadorId: 'org-a', resenias: [] };
      const sinReseniasB = { id: 'sin-b', organizadorId: 'org-b' };
      eventoRepo.findAll = async () => [sinReseniasB, sinReseniasA];

      const ordenados = await service.listarEventos({ sortBy: 'rating' });

      expect(ordenados.map((item) => item.id)).toEqual(['sin-b', 'sin-a']);
    });

    test('obtiene un evento por id', async () => {
      const ev = await service.obtenerPorId('evt-1');
      expect(ev.nombre).toBe('Festival Rock');
    });

    test('lanza ResourceNotFoundError si el evento no existe', async () => {
      await expect(service.obtenerPorId('inexistente')).rejects.toThrow(ResourceNotFoundError);
    });

    test('propaga errores inesperados al obtener por id', async () => {
      eventoRepo.findById = async () => {
        throw new Error('Fallo de conexión a base de datos');
      };
      await expect(service.obtenerPorId('evt-1')).rejects.toThrow('Fallo de conexión a base de datos');
    });

    test('ordena por rating manejando empates entre organizadores', async () => {
      const orgA = new Usuario({ id: 'org-a', nombre: 'A', rol: 'organizador' });
      const orgB = new Usuario({ id: 'org-b', nombre: 'B', rol: 'organizador' });
      const eA = new Evento({ id: 'eA', nombre: 'EA', fecha: new Date(Date.now() + 100000).toISOString(), organizador: orgA, tiposEntrada: [new TipoEntrada({ id: 'tA', nombre: 'TA', precio: 10, cupo: 10 })], resenias: [{ puntuacion: 4 }] });
      const eB = new Evento({ id: 'eB', nombre: 'EB', fecha: new Date(Date.now() + 200000).toISOString(), organizador: orgB, tiposEntrada: [new TipoEntrada({ id: 'tB', nombre: 'TB', precio: 10, cupo: 10 })], resenias: [{ puntuacion: 4 }] });
      eventoRepo.findAll = async () => [eA, eB];
      const res = await service.listarEventos({ sortBy: 'rating' });
      expect(res).toHaveLength(2);
      expect(res.map(e => e.id)).toEqual(['eA', 'eB']);
    });

    test('ordena por fecha y precio usando el repositorio', async () => {
      const findAllSpy = jest.spyOn(eventoRepo, 'findAll').mockResolvedValue([evento]);
      const porFecha = await service.listarEventos({ sortBy: 'fecha' });
      expect(findAllSpy).toHaveBeenCalledWith({ sortBy: 'fecha' });
      expect(porFecha).toHaveLength(1);

      const porPrecio = await service.listarEventos({ sortBy: 'precio' });
      expect(findAllSpy).toHaveBeenCalledWith({ sortBy: 'precio' });
      expect(porPrecio).toHaveLength(1);
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

    test('falla con código y mensaje específicos si la fecha ya pasó', async () => {
      await expect(
        service.crearEvento({
          nombre: 'Evento Pasado',
          fecha: new Date(Date.now() - 10000).toISOString(),
          organizadorId: 'org-1',
          categoriaId: 'cat-recitales',
          tiposEntrada: [{ nombre: 'General', precio: 8000, cupo: 50 }],
        })
      ).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'FECHA_PASADA',
        message: 'La fecha y hora del evento deben ser posteriores al momento actual.',
      });
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
      ).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'ORGANIZADOR_INVALIDO',
        message: 'El usuario indicado no tiene rol de organizador',
      });
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
      ).rejects.toMatchObject({
        name: 'ResourceNotFoundError',
        message: expect.stringMatching(/Categoria.*cat-inexistente/),
      });
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
      ).rejects.toThrow('El evento debe ofrecer al menos un tipo de entrada con su precio y cupo');
    });

    test('crea un evento con entrada gratuita (precio 0)', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Charla Gratuita',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [{ nombre: 'General', precio: 0, cupo: 100 }],
      });
      expect(nuevo.tiposEntrada[0].precio).toBe(0);
    });

    test('asigna id generado si el tipo de entrada no tiene id, o preserva el id provisto', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Con Ids',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [
          { id: 'custom-te-id', nombre: 'VIP', precio: 100, cupo: 10 },
          { nombre: 'General', precio: 50, cupo: 20 },
        ],
      });
      expect(nuevo.tiposEntrada[0].id).toBe('custom-te-id');
      expect(nuevo.tiposEntrada[1].id).toMatch(/^te-/);
    });

    test('aplica trim al nombre del tipo de entrada y usa descripcion provista o por defecto vacia', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Con Tipos Trimmed',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [
          { nombre: '  VIP Gold  ', descripcion: 'Acceso Total', precio: 100, cupo: 10 },
          { nombre: '  General  ', precio: 50, cupo: 20 },
        ],
      });
      expect(nuevo.tiposEntrada[0].nombre).toBe('VIP Gold');
      expect(nuevo.tiposEntrada[0].descripcion).toBe('Acceso Total');
      expect(nuevo.tiposEntrada[1].nombre).toBe('General');
      expect(nuevo.tiposEntrada[1].descripcion).toBe('');
    });

    test('aplica trim al nombre del evento', async () => {
      const nuevo = await service.crearEvento({
        nombre: '  Evento Espaciado  ',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [{ nombre: 'General', precio: 10, cupo: 10 }],
      });
      expect(nuevo.nombre).toBe('Evento Espaciado');
    });

    test('resuelve imagen preferentemente desde parametro imagen', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Con Imagen',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        imagen: 'portada.jpg',
        multimedia: ['portada.jpg'],
        tiposEntrada: [{ nombre: 'General', precio: 10, cupo: 10 }],
      });
      expect(nuevo.imagen).toBe('portada.jpg');
    });

    test('resuelve imagen desde eventImages[0] cuando imagen no esta definida', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Con Multimedia',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        multimedia: ['/uploads/m1.jpg'],
        tiposEntrada: [{ nombre: 'General', precio: 10, cupo: 10 }],
      });
      expect(nuevo.imagen).toBe('/uploads/m1.jpg');
    });

    test('resuelve imagen como string vacio cuando no hay imagen ni multimedia', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Sin Imagen',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        tiposEntrada: [{ nombre: 'General', precio: 10, cupo: 10 }],
      });
      expect(nuevo.imagen).toBe('');
      expect(nuevo.multimedia).toEqual([]);
    });

    test('permite imagen cuando coincide con el unico elemento de multimedia', async () => {
      const nuevo = await service.crearEvento({
        nombre: 'Evento Misma Imagen',
        fecha: new Date(Date.now() + 500000).toISOString(),
        organizadorId: 'org-1',
        categoriaId: 'cat-recitales',
        imagen: '/uploads/misma.jpg',
        multimedia: ['/uploads/misma.jpg'],
        tiposEntrada: [{ nombre: 'General', precio: 10, cupo: 10 }],
      });
      expect(nuevo.imagen).toBe('/uploads/misma.jpg');
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

    test('el organizador puede actualizar la fecha del evento a una fecha futura válida', async () => {
      const nuevaFechaIso = new Date(Date.now() + 20 * 86400000).toISOString();
      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        fecha: nuevaFechaIso,
      });
      expect(actualizado.fecha).toEqual(new Date(nuevaFechaIso));
    });

    test('el organizador puede actualizar imágenes usando archivos subidos', async () => {
      evento.imagen = '/uploads/anterior.jpg';
      evento.multimedia = ['/uploads/anterior.jpg'];
      const eliminarSpy = jest.fn().mockResolvedValue(undefined);
      service.eventoImageStorage = {
        guardar: jest.fn().mockResolvedValue(['/uploads/nueva_subida.jpg']),
        eliminar: eliminarSpy,
      };
      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagenes: [{ filename: 'nueva_subida.jpg' }],
      });
      expect(actualizado.imagen).toBe('/uploads/nueva_subida.jpg');
      expect(actualizado.multimedia).toEqual(['/uploads/nueva_subida.jpg']);
      expect(eliminarSpy).toHaveBeenCalledWith(['/uploads/anterior.jpg']);
    });

    test('no intenta eliminar imágenes previas que no provienen de /uploads/', async () => {
      evento.imagen = 'https://externo.com/foto.jpg';
      evento.multimedia = ['https://externo.com/foto.jpg'];
      const eliminarSpy = jest.fn();
      service.eventoImageStorage = { guardar: jest.fn(), eliminar: eliminarSpy };
      await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagen: 'https://otro.com/foto.jpg',
      });
      expect(eliminarSpy).not.toHaveBeenCalled();
    });

    test('no ejecuta eliminación si la imagen previa se conserva', async () => {
      evento.imagen = '/uploads/conservada.jpg';
      evento.multimedia = ['/uploads/conservada.jpg'];
      const eliminarSpy = jest.fn();
      service.eventoImageStorage = { guardar: jest.fn(), eliminar: eliminarSpy };
      await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagen: '/uploads/conservada.jpg',
      });
      expect(eliminarSpy).not.toHaveBeenCalled();
    });

    test('rechaza si un usuario ajeno intenta modificar el evento', async () => {
      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'otro-org',
          nombre: 'Hack',
        })
      ).rejects.toMatchObject({
        name: 'ForbiddenError',
        code: 'ORGANIZADOR_EVENTO_INVALIDO',
        message: 'Solo el organizador del evento puede modificarlo',
      });
    });

    test('aplica trim a campos de texto en actualizarEvento', async () => {
      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        nombre: '  Festival Trimmed  ',
        descripcion: '  Descripcion Trimmed  ',
        ubicacion: '  Estadio Trimmed  ',
        direccion: '  Av Corrientes 123  ',
        imagen: '  https://img.com/rock.jpg  ',
      });
      expect(actualizado.nombre).toBe('Festival Trimmed');
      expect(actualizado.descripcion).toBe('Descripcion Trimmed');
      expect(actualizado.ubicacion).toBe('Estadio Trimmed');
      expect(actualizado.direccion).toBe('Av Corrientes 123');
      expect(actualizado.imagen).toBe('https://img.com/rock.jpg');
      expect(actualizado.multimedia).toEqual(['https://img.com/rock.jpg']);
    });

    test('cuando imagen es solo espacios deja multimedia vacío', async () => {
      const actualizado = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagen: '   ',
      });
      expect(actualizado.imagen).toBe('');
      expect(actualizado.multimedia).toEqual([]);
    });

    test('restaura previousValues cuando save falla sin imagenes subidas', async () => {
      const nombrePrevio = evento.nombre;
      eventoRepo.save = async () => {
        throw new Error('Error al guardar datos');
      };
      const eliminarSpy = jest.fn();
      service.eventoImageStorage = { guardar: jest.fn(), eliminar: eliminarSpy };

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          nombre: 'Nuevo Nombre Fallido',
        })
      ).rejects.toThrow('Error al guardar datos');

      expect(evento.nombre).toBe(nombrePrevio);
      expect(eliminarSpy).not.toHaveBeenCalled();
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
      ['rechaza imagenes si no es una lista', { imagenes: null }, 'La imagen del evento no es válida'],
      ['rechaza multimedia si no es una lista', { multimedia: null }, 'La imagen del evento no es válida'],
      ['rechaza más de una imagen total', { multimedia: ['/uploads/one.jpg'], imagen: '/uploads/two.jpg' }, 'Cada evento puede tener una sola imagen'],
      ['rechaza un nombre vacío', { nombre: '   ' }, 'El evento debe tener al menos nombre y fecha'],
      ['rechaza un nombre no texto', { nombre: 123 }, 'El evento debe tener al menos nombre y fecha'],
      ['rechaza una fecha ausente', { fecha: '' }, 'La fecha del evento no es válida'],
      ['rechaza una fecha inválida', { fecha: 'no-es-fecha' }, 'La fecha del evento no es válida'],
      ['rechaza una fecha pasada', { fecha: new Date(Date.now() - 1000).toISOString() }, 'La fecha y hora del evento deben ser posteriores al momento actual.'],
      ['rechaza una lista de entradas vacía', { tiposEntrada: [] }, 'El evento debe ofrecer al menos un tipo de entrada con su precio y cupo'],
      ['rechaza tiposEntrada si no es un array', { tiposEntrada: 'no-array' }, 'El evento debe ofrecer al menos un tipo de entrada con su precio y cupo'],
    ])('%s', async (_description, cambios, expectedMsg) => {
      await expect(service.crearEvento(crearDatosEvento(cambios))).rejects.toThrow(
        expectedMsg
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

    test('resuelve categoría por nombre aplicándole trim', async () => {
      const creado = await service.crearEvento(
        crearDatosEvento({ categoriaId: undefined, categoria: '  Recitales  ' })
      );
      expect(creado.categoria).toBe(categoria);
    });

    test('falla con (sin categoría) si no se especifica ninguna categoría', async () => {
      await expect(
        service.crearEvento(
          crearDatosEvento({ categoriaId: undefined, categoria: undefined })
        )
      ).rejects.toMatchObject({
        name: 'ResourceNotFoundError',
        message: expect.stringMatching(/Categoria.*\(sin categoría\)/),
      });
    });

    test('falla si categoriaReferencia es solo espacios', async () => {
      await expect(
        service.crearEvento(
          crearDatosEvento({ categoriaId: '   ', categoria: undefined })
        )
      ).rejects.toMatchObject({
        name: 'ResourceNotFoundError',
        message: expect.stringMatching(/Categoria.*' {3}'/),
      });
    });

    test('propaga errores inesperados al buscar categoría por id', async () => {
      categoriaRepo.findById = async () => {
        throw new Error('Fallo categoría id');
      };
      await expect(service.crearEvento(crearDatosEvento())).rejects.toThrow('Fallo categoría id');
    });

    test('propaga errores inesperados al buscar categoría por nombre', async () => {
      categoriaRepo.findById = async () => {
        throw new EntityNotFoundError('Categoria', 'cat-inexistente');
      };
      categoriaRepo.findByNombre = async () => {
        throw new Error('Fallo categoría nombre');
      };
      await expect(
        service.crearEvento(crearDatosEvento({ categoriaId: 'cat-inexistente' }))
      ).rejects.toThrow('Fallo categoría nombre');
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
      ['entrada no es un objeto', [null], 'Tipo de entrada #1 debe ser un objeto'],
      ['entrada es un array', [['entrada']], 'Tipo de entrada #1 debe ser un objeto'],
      ['nombre de entrada vacío', [{ id: 't1', nombre: ' ', precio: 1, cupo: 1 }], 'Tipo de entrada #1 requiere un nombre'],
      ['nombre de entrada no es texto', [{ id: 't1', nombre: 123, precio: 1, cupo: 1 }], 'Tipo de entrada #1 requiere un nombre'],
      ['precio no es numérico', [{ id: 't1', nombre: 'General', precio: '1', cupo: 1 }], 'El precio del tipo de entrada #1 debe ser válido y no negativo'],
      ['precio es NaN', [{ id: 't1', nombre: 'General', precio: NaN, cupo: 1 }], 'El precio del tipo de entrada #1 debe ser válido y no negativo'],
      ['precio es Infinity', [{ id: 't1', nombre: 'General', precio: Infinity, cupo: 1 }], 'El precio del tipo de entrada #1 debe ser válido y no negativo'],
      ['precio es negativo', [{ id: 't1', nombre: 'General', precio: -1, cupo: 1 }], 'El precio del tipo de entrada #1 debe ser válido y no negativo'],
      ['cupo no es entero positivo', [{ id: 't1', nombre: 'General', precio: 1, cupo: 0 }], 'El cupo del tipo de entrada #1 debe ser un entero positivo'],
      ['cupo es decimal', [{ id: 't1', nombre: 'General', precio: 1, cupo: 2.5 }], 'El cupo del tipo de entrada #1 debe ser un entero positivo'],
      ['cupo es negativo', [{ id: 't1', nombre: 'General', precio: 1, cupo: -5 }], 'El cupo del tipo de entrada #1 debe ser un entero positivo'],
    ])('rechaza cuando la %s', async (_description, tiposEntrada, expectedMsg) => {
      await expect(service.crearEvento(crearDatosEvento({ tiposEntrada }))).rejects.toThrow(
        expectedMsg
      );
    });

    test('rechaza un precio negativo con mensaje y código específicos', async () => {
      await expect(
        service.crearEvento(
          crearDatosEvento({
            tiposEntrada: [{ id: 't1', nombre: 'General', precio: -1, cupo: 1 }],
          })
        )
      ).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'El precio del tipo de entrada #1 debe ser válido y no negativo',
      });
    });

    test('rechaza el cupo cero con mensaje y código específicos', async () => {
      await expect(
        service.crearEvento(
          crearDatosEvento({
            tiposEntrada: [{ id: 't1', nombre: 'General', precio: 1, cupo: 0 }],
          })
        )
      ).rejects.toMatchObject({
        name: 'BusinessRuleError',
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'El cupo del tipo de entrada #1 debe ser un entero positivo',
      });
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

    test('no invoca eliminar si no se subieron imágenes cuando save falla en crearEvento', async () => {
      const eliminarSpy = jest.fn();
      service.eventoImageStorage = { guardar: jest.fn(), eliminar: eliminarSpy };
      eventoRepo.save = async () => {
        throw new Error('Fallo al guardar evento');
      };
      await expect(
        service.crearEvento(crearDatosEvento())
      ).rejects.toThrow('Fallo al guardar evento');
      expect(eliminarSpy).not.toHaveBeenCalled();
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
      ['rechaza nombre vacío', { nombre: ' ' }, 'El nombre del evento no puede estar vacío'],
      ['rechaza nombre no texto', { nombre: 123 }, 'El nombre del evento no puede estar vacío'],
      ['rechaza descripción no textual', { descripcion: 1 }, 'descripcion debe ser un texto'],
      ['rechaza ubicación no textual', { ubicacion: 1 }, 'ubicacion debe ser un texto'],
      ['rechaza dirección no textual', { direccion: 1 }, 'direccion debe ser un texto'],
      ['rechaza imagen no textual', { imagen: 1 }, 'La imagen del evento no es válida'],
      ['rechaza fecha que no es texto', { fecha: Date.now() + 100000 }, 'La fecha del evento no es válida'],
      ['rechaza fecha inválida', { fecha: 'inválida' }, 'La fecha del evento no es válida'],
      ['rechaza fecha pasada', { fecha: new Date(Date.now() - 1000).toISOString() }, 'La fecha y hora del evento deben ser posteriores al momento actual.'],
      ['rechaza imagenes no listadas', { imagenes: null }, 'Cada evento puede tener una sola imagen'],
      ['rechaza más de una imagen', { imagenes: [{}, {}] }, 'Cada evento puede tener una sola imagen'],
    ])('actualizarEvento %s', async (_description, cambios, expectedMsg) => {
      await expect(
        service.actualizarEvento('evt-1', { organizadorId: 'org-1', ...cambios })
      ).rejects.toThrow(expectedMsg);
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

    test('registra pero no oculta un error al limpiar una imagen reemplazada', async () => {
      const cleanupError = new Error('No se pudo eliminar la imagen anterior');
      const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
      service.eventoImageStorage = {
        guardar: jest.fn(),
        eliminar: jest.fn().mockRejectedValue(cleanupError),
      };
      evento.imagen = '/uploads/anterior.jpg';
      evento.multimedia = ['/uploads/anterior.jpg'];

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          imagen: '/uploads/nueva.jpg',
        })
      ).resolves.toBe(evento);

      expect(errorLog).toHaveBeenCalledWith(
        '[EventoService] No se pudieron limpiar imágenes reemplazadas:',
        cleanupError
      );
      errorLog.mockRestore();
    });

    test('propaga el error al guardar una imagen nueva sin modificar el evento', async () => {
      const error = new Error('No se pudo guardar la imagen');
      service.eventoImageStorage = {
        guardar: jest.fn().mockRejectedValue(error),
        eliminar: jest.fn(),
      };
      const guardarEvento = jest.spyOn(eventoRepo, 'save');
      const nombreOriginal = evento.nombre;

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          nombre: 'Nombre temporal',
          imagenes: [{ filename: 'nueva.jpg' }],
        })
      ).rejects.toBe(error);

      expect(evento.nombre).toBe(nombreOriginal);
      expect(guardarEvento).not.toHaveBeenCalled();
      expect(service.eventoImageStorage.eliminar).not.toHaveBeenCalled();
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

      const error = await service.actualizarEvento('evt-1', {
        organizadorId: 'org-1',
        imagenes: [{ filename: 'nueva.jpg' }],
      }).catch((caught) => caught);

      expect(error).toBeInstanceOf(AggregateError);
      expect(error.message).toBe(
        'No se pudieron guardar los cambios ni limpiar la imagen cargada.'
      );
      expect(error.errors).toHaveLength(2);
      expect(error.errors[0].message).toBe('No se pudo guardar');
      expect(error.errors[1].message).toBe('No se pudo limpiar');
    });

    test('rechaza con BusinessRuleError si se intenta actualizar un evento cuya fecha ya pasó (cerrado)', async () => {
      evento.fecha = new Date(Date.now() - 3600000);
      const nombreOriginal = evento.nombre;

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          nombre: 'Intento de cambio en evento cerrado',
        })
      ).rejects.toThrow('No se puede editar un evento que ya ha finalizado o está cerrado');

      expect(evento.nombre).toBe(nombreOriginal);
    });

    test('rechaza con BusinessRuleError si se intenta actualizar un evento con estado cerrado o finalizado', async () => {
      evento.estado = 'cerrado';
      const nombreOriginal = evento.nombre;

      await expect(
        service.actualizarEvento('evt-1', {
          organizadorId: 'org-1',
          nombre: 'Intento de cambio en evento cerrado',
        })
      ).rejects.toThrow('No se puede editar un evento que ya ha finalizado o está cerrado');

      expect(evento.nombre).toBe(nombreOriginal);
    });
  });

});
