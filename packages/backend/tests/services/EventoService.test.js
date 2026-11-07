import { describe, test, expect, beforeEach } from '@jest/globals';
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
import { Compra } from '../../src/domain/entities/Compra.js';
import { EstadoCompra } from '../../src/domain/enums/EstadoCompra.js';
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

  describe('agregarResenia', () => {
    test('agrega una reseña a través de compra calificada', async () => {
      const compra = new Compra({
        id: 'compra-1',
        comprador,
        evento,
        tipoEntrada: evento.tiposEntrada[0],
        cantidad: 1,
        total: 10000,
        estado: EstadoCompra.UTILIZADA,
      });
      await compraRepo.save(compra);

      const resenia = await service.agregarResenia('evt-1', {
        compraId: 'compra-1',
        puntuacion: 4.5,
        detalle: 'Increíble sonido',
      });

      expect(resenia.puntuacion).toBe(4.5);
      expect(resenia.detalle).toBe('Increíble sonido');
      expect(evento.resenias).toHaveLength(1);
    });

    test('rechaza si la compra no pertenece al evento', async () => {
      const otroEvento = new Evento({
        id: 'evt-otro',
        nombre: 'Otro',
        fecha: new Date(Date.now() + 1000).toISOString(),
        organizador,
        tiposEntrada: [new TipoEntrada({ id: 'te-x', nombre: 'X', precio: 10, cupo: 10 })],
      });
      await eventoRepo.save(otroEvento);

      const compraOtro = new Compra({
        id: 'compra-otra',
        comprador,
        evento: otroEvento,
        tipoEntrada: otroEvento.tiposEntrada[0],
        estado: EstadoCompra.UTILIZADA,
      });
      await compraRepo.save(compraOtro);

      await expect(
        service.agregarResenia('evt-1', {
          compraId: 'compra-otra',
          puntuacion: 4,
          detalle: 'Prueba',
        })
      ).rejects.toThrow(BusinessRuleError);
    });
  });
});
