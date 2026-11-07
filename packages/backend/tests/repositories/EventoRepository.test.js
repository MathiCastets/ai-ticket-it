import { describe, test, expect, beforeEach } from '@jest/globals';
import { EventoRepository } from '../../src/repositories/inMemory/EventoRepository.js';
import { Evento } from '../../src/domain/entities/Evento.js';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { Categoria } from '../../src/domain/entities/Categoria.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';

describe('EventoRepository', () => {
  let repository;
  let organizador;
  let categoria;

  function crearEvento(overrides = {}) {
    return new Evento({
      id: `evt-test-${Date.now()}-${Math.random()}`,
      nombre: 'Evento Test',
      fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      organizador,
      categoria,
      tiposEntrada: [new TipoEntrada({ id: 'te-1', nombre: 'General', precio: 10000, cupo: 100 })],
      ...overrides,
    });
  }

  beforeEach(() => {
    organizador = new Usuario({ id: 'org-1', nombre: 'Org Test', rol: 'organizador' });
    categoria = new Categoria({ id: 'cat-1', nombre: 'Recitales' });
    repository = new EventoRepository([]);
  });

  describe('save y findById', () => {
    test('guarda y recupera un evento por id', async () => {
      const evento = crearEvento({ id: 'evt-fixed-1' });
      await repository.save(evento);
      const recuperado = await repository.findById('evt-fixed-1');
      expect(recuperado).toBe(evento);
    });

    test('actualiza un evento existente al hacer save con mismo id', async () => {
      const evento = crearEvento({ id: 'evt-update' });
      await repository.save(evento);
      evento.nombre = 'Nombre Actualizado';
      await repository.save(evento);

      const todos = await repository.findAll();
      expect(todos.filter((e) => e.id === 'evt-update')).toHaveLength(1);
      const recuperado = await repository.findById('evt-update');
      expect(recuperado.nombre).toBe('Nombre Actualizado');
    });

    test('lanza EntityNotFoundError si el evento no existe', async () => {
      await expect(repository.findById('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('findAll', () => {
    test('retorna arreglo vacío si no hay eventos', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    test('retorna todos los eventos guardados', async () => {
      await repository.save(crearEvento({ id: 'evt-a' }));
      await repository.save(crearEvento({ id: 'evt-b' }));
      const todos = await repository.findAll();
      expect(todos).toHaveLength(2);
    });

    test('ordena por fecha ascendente por defecto', async () => {
      const fechaCercana = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      const fechaLejana = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const eventoLejano = crearEvento({ id: 'evt-lejano', nombre: 'Lejano', fecha: fechaLejana });
      const eventoCercano = crearEvento({ id: 'evt-cercano', nombre: 'Cercano', fecha: fechaCercana });

      await repository.save(eventoLejano);
      await repository.save(eventoCercano);

      const todos = await repository.findAll();
      expect(todos[0].id).toBe('evt-cercano');
      expect(todos[1].id).toBe('evt-lejano');
    });

    test('filtra por categoría', async () => {
      const catOtra = new Categoria({ id: 'cat-otra', nombre: 'Deportes' });
      const e1 = crearEvento({ id: 'evt-cat-1', categoria });
      const e2 = crearEvento({ id: 'evt-cat-2', categoria: catOtra });
      await repository.save(e1);
      await repository.save(e2);

      const result = await repository.findAll({ categoria: 'Recitales' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('evt-cat-1');
    });

    test('filtra por término de búsqueda en nombre', async () => {
      const e1 = crearEvento({ id: 'evt-s-1', nombre: 'Festival Rock 2026' });
      const e2 = crearEvento({ id: 'evt-s-2', nombre: 'Noche Electrónica' });
      await repository.save(e1);
      await repository.save(e2);

      const result = await repository.findAll({ search: 'rock' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('evt-s-1');
    });

    test('ordena por precio ascendente con sortBy=precio', async () => {
      const teCaro = new TipoEntrada({ id: 'te-caro', nombre: 'VIP', precio: 50000, cupo: 10 });
      const teBarato = new TipoEntrada({ id: 'te-barato', nombre: 'General', precio: 5000, cupo: 100 });

      const eCaro = crearEvento({ id: 'evt-caro', tiposEntrada: [teCaro] });
      const eBarato = crearEvento({ id: 'evt-barato', tiposEntrada: [teBarato] });

      await repository.save(eCaro);
      await repository.save(eBarato);

      const result = await repository.findAll({ sortBy: 'precio' });
      expect(result[0].id).toBe('evt-barato');
      expect(result[1].id).toBe('evt-caro');
    });
  });

  describe('delete', () => {
    test('elimina un evento por id', async () => {
      const evento = crearEvento({ id: 'evt-del' });
      await repository.save(evento);
      await repository.delete('evt-del');
      await expect(repository.findById('evt-del')).rejects.toThrow(EntityNotFoundError);
    });

    test('lanza EntityNotFoundError si el evento no existe', async () => {
      await expect(repository.delete('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });
});
