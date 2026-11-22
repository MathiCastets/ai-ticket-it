import { describe, expect, test } from '@jest/globals';
import { Categoria } from '../../src/domain/entities/Categoria.js';

describe('Categoria', () => {
  test('construye una categoría con descripción por defecto', () => {
    const categoria = new Categoria({ id: 'cat-1', nombre: 'Teatro' });

    expect(categoria).toEqual({ id: 'cat-1', nombre: 'Teatro', descripcion: '' });
  });

  test('conserva una descripción provista', () => {
    const categoria = new Categoria({
      id: 'cat-2',
      nombre: 'Música',
      descripcion: 'Conciertos y festivales',
    });

    expect(categoria.descripcion).toBe('Conciertos y festivales');
  });

  test('rechaza una categoría sin nombre', () => {
    expect(() => new Categoria({ id: 'cat-3', nombre: '' })).toThrow(
      'Categoria requiere nombre'
    );
  });
});
