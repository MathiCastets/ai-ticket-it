import { describe, test, expect, beforeEach } from '@jest/globals';
import { CategoriaService } from '../../src/services/CategoriaService.js';
import { CategoriaRepository } from '../../src/repositories/inMemory/CategoriaRepository.js';
import { Categoria } from '../../src/domain/entities/Categoria.js';

describe('CategoriaService', () => {
  let repository;
  let service;

  beforeEach(() => {
    const cat1 = new Categoria({ id: 'cat-1', nombre: 'Recitales' });
    const cat2 = new Categoria({ id: 'cat-2', nombre: 'Teatro' });
    repository = new CategoriaRepository([cat1, cat2]);
    service = new CategoriaService(repository);
  });

  describe('listarCategorias', () => {
    test('retorna todas las categorías existentes', async () => {
      const categorias = await service.listarCategorias();
      expect(categorias).toHaveLength(2);
      expect(categorias[0].nombre).toBe('Recitales');
      expect(categorias[1].nombre).toBe('Teatro');
    });

    test('retorna una lista vacía si el repositorio no contiene categorías', async () => {
      const emptyRepo = new CategoriaRepository([]);
      const emptyService = new CategoriaService(emptyRepo);
      const categorias = await emptyService.listarCategorias();
      expect(categorias).toEqual([]);
    });

    test('instancia el servicio por defecto con categoriaRepository', async () => {
      const defaultService = new CategoriaService();
      expect(defaultService.categoriaRepository).toBeDefined();
    });
  });
});
