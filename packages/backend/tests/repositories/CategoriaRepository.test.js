import { describe, test, expect, beforeEach } from '@jest/globals';
import { CategoriaRepository } from '../../src/repositories/inMemory/CategoriaRepository.js';
import { Categoria } from '../../src/domain/entities/Categoria.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';

describe('CategoriaRepository', () => {
  let repository;

  beforeEach(() => {
    repository = new CategoriaRepository([]);
  });

  describe('save y findById', () => {
    test('guarda y recupera una categoría por id', async () => {
      const cat = new Categoria({ id: 'cat-1', nombre: 'Recitales' });
      await repository.save(cat);

      const recuperada = await repository.findById('cat-1');
      expect(recuperada).toBe(cat);
    });

    test('actualiza una categoría existente si ya existe el id', async () => {
      const cat = new Categoria({ id: 'cat-1', nombre: 'Recitales' });
      await repository.save(cat);
      cat.nombre = 'Conciertos';
      await repository.save(cat);

      const todas = await repository.findAll();
      expect(todas).toHaveLength(1);
      expect((await repository.findById('cat-1')).nombre).toBe('Conciertos');
    });

    test('lanza EntityNotFoundError si no existe', async () => {
      await expect(repository.findById('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('findAll', () => {
    test('retorna lista vacía si no hay categorías', async () => {
      expect(await repository.findAll()).toEqual([]);
    });

    test('retorna todas las categorías guardadas', async () => {
      await repository.save(new Categoria({ id: 'c1', nombre: 'Teatro' }));
      await repository.save(new Categoria({ id: 'c2', nombre: 'Cine' }));
      expect(await repository.findAll()).toHaveLength(2);
    });
  });

  describe('findByNombre', () => {
    test('encuentra una categoría por nombre ignorando mayúsculas/minúsculas', async () => {
      const cat = new Categoria({ id: 'c1', nombre: 'Festivales' });
      await repository.save(cat);

      const encontrada = await repository.findByNombre('festivales');
      expect(encontrada).toBe(cat);
    });

    test('retorna null si no existe', async () => {
      expect(await repository.findByNombre('Inexistente')).toBeNull();
    });
  });
});
