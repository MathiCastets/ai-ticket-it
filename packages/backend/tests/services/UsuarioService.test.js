import { describe, test, expect, beforeEach } from '@jest/globals';
import { UsuarioService } from '../../src/services/UsuarioService.js';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { EventoRepository } from '../../src/repositories/inMemory/EventoRepository.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { Resenia } from '../../src/domain/entities/Resenia.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { BusinessRuleError } from '../../src/services/errors/index.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';

describe('UsuarioService', () => {
  let usuarioRepo;
  let eventoRepo;
  let service;
  let comprador;
  let organizador;
  let evento;

  beforeEach(() => {
    comprador = new Usuario({
      id: 'user-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      rol: 'comprador',
      email: 'juan@test.com',
      favoritos: ['evt-1'],
    });

    organizador = new Usuario({
      id: 'org-1',
      nombre: 'Prod Test',
      rol: 'organizador',
      email: 'prod@test.com',
    });

    evento = new Evento({
      id: 'evt-1',
      nombre: 'Recital Rock',
      fecha: new Date(Date.now() + 100000).toISOString(),
      organizador,
      tiposEntrada: [new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 1000, cupo: 10 })],
    });

    usuarioRepo = new UsuarioRepository([comprador, organizador]);
    eventoRepo = new EventoRepository([evento]);
    service = new UsuarioService(usuarioRepo, eventoRepo);
  });

  describe('listarUsuarios', () => {
    test('lista usuarios excluyendo emails sensibles', async () => {
      const lista = await service.listarUsuarios();
      expect(lista).toHaveLength(2);
      for (const u of lista) {
        expect(u).not.toHaveProperty('email');
        expect(u).toHaveProperty('id');
        expect(u).toHaveProperty('nombre');
      }
    });
  });

  describe('obtenerFavoritos', () => {
    test('obtiene la lista de IDs de favoritos de un usuario', async () => {
      const favs = await service.obtenerFavoritos('user-1');
      expect(favs).toEqual(['evt-1']);
      favs.push('externo');
      expect(comprador.favoritos).toEqual(['evt-1']);
    });

    test('lanza error si el usuario no existe', async () => {
      await expect(service.obtenerFavoritos('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('agregarFavorito', () => {
    test('agrega un nuevo favorito y persiste', async () => {
      const evento2 = new Evento({
        id: 'evt-2',
        nombre: 'Teatro',
        fecha: new Date(Date.now() + 100000).toISOString(),
        organizador,
        tiposEntrada: [new TipoEntrada({ id: 'te-2', nombre: 'Platea', precio: 2000, cupo: 20 })],
      });
      await eventoRepo.save(evento2);

      const favs = await service.agregarFavorito('user-1', 'evt-2');
      expect(favs).toContain('evt-2');

      const guardado = await usuarioRepo.findById('user-1');
      expect(guardado.favoritos).toContain('evt-2');
    });

    test('es idempotente si ya existe en favoritos', async () => {
      const favs = await service.agregarFavorito('user-1', 'evt-1');
      expect(favs.filter((id) => id === 'evt-1')).toHaveLength(1);
    });

    test('lanza error si el evento a agregar no existe', async () => {
      await expect(service.agregarFavorito('user-1', 'evt-inexistente')).rejects.toThrow(EntityNotFoundError);
    });

    test('restaura favoritos si falla la persistencia', async () => {
      usuarioRepo.save = async () => {
        throw new Error('No se pudieron guardar favoritos');
      };

      await expect(service.agregarFavorito('user-1', 'evt-1')).rejects.toThrow(
        'No se pudieron guardar favoritos'
      );
      expect(comprador.favoritos).toEqual(['evt-1']);
    });
  });

  describe('removerFavorito', () => {
    test('remueve un favorito y persiste', async () => {
      const favs = await service.removerFavorito('user-1', 'evt-1');
      expect(favs).not.toContain('evt-1');

      const guardado = await usuarioRepo.findById('user-1');
      expect(guardado.favoritos).not.toContain('evt-1');
    });

    test('lanza error si el evento no existe', async () => {
      await expect(service.removerFavorito('user-1', 'evt-inexistente')).rejects.toThrow(EntityNotFoundError);
    });

    test('restaura favoritos si falla la persistencia', async () => {
      usuarioRepo.save = async () => {
        throw new Error('No se pudieron guardar favoritos');
      };

      await expect(service.removerFavorito('user-1', 'evt-1')).rejects.toThrow(
        'No se pudieron guardar favoritos'
      );
      expect(comprador.favoritos).toEqual(['evt-1']);
    });
  });

  describe('obtenerResenias', () => {
    test('rechaza si el usuario no es organizador', async () => {
      await expect(service.obtenerResenias('user-1')).rejects.toThrow(BusinessRuleError);
    });

    test('retorna estructura paginada y calcula promedio', async () => {
      evento.agregarResenia(
        new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 4, detalle: 'Bueno', fechaHora: new Date('2026-01-01') })
      );
      evento.agregarResenia(
        new Resenia({ comprador, eventoId: 'evt-1', puntuacion: 5, detalle: 'Excelente', fechaHora: new Date('2026-01-02') })
      );

      const resultado = await service.obtenerResenias('org-1', { page: 1, limit: 1 });
      expect(resultado.total).toBe(2);
      expect(resultado.totalPages).toBe(2);
      expect(resultado.promedio).toBe(4.5);
      expect(resultado.resenias).toHaveLength(1);
      expect(resultado.resenias[0].detalle).toBe('Excelente'); // Más reciente primero
    });

    test('devuelve promedio nulo cuando el organizador todavía no tiene reseñas', async () => {
      const resultado = await service.obtenerResenias('org-1');

      expect(resultado).toMatchObject({
        resenias: [],
        total: 0,
        page: 1,
        limit: 5,
        totalPages: 0,
        promedio: null,
      });
    });

    test('normaliza nombre de comprador ausente en una reseña', async () => {
      evento.resenias = [
        {
          id: 'review-1',
          comprador: {},
          detalle: 'Comentario',
          puntuacion: 4,
          fechaHora: new Date('2026-01-01'),
        },
      ];

      const resultado = await service.obtenerResenias('org-1');

      expect(resultado.resenias[0].comprador).toEqual({ nombre: '', apellido: '' });
    });
  });
});
