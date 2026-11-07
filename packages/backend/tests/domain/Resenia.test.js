import { describe, test, expect } from '@jest/globals';
import { Resenia } from '../../src/domain/entities/Resenia.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';

describe('Resenia', () => {
  function crearComprador() {
    return new Usuario({ id: 'comp-1', nombre: 'Comprador', rol: 'comprador' });
  }

  function crearResenia(overrides = {}) {
    return new Resenia({
      comprador: crearComprador(),
      eventoId: 'evt-1',
      puntuacion: 4,
      detalle: 'Muy buen evento, todo organizado',
      ...overrides,
    });
  }

  describe('construcción válida', () => {
    test('crea una reseña con valores correctos', () => {
      const r = crearResenia();
      expect(r.puntuacion).toBe(4);
      expect(r.detalle).toBe('Muy buen evento, todo organizado');
      expect(r.eventoId).toBe('evt-1');
      expect(r.comprador).toBeInstanceOf(Usuario);
    });

    test('genera id automático', () => {
      const r = crearResenia();
      expect(typeof r.id).toBe('string');
      expect(r.id.startsWith('res-')).toBe(true);
    });

    test('acepta puntuación con media estrella', () => {
      const r = crearResenia({ puntuacion: 4.5 });
      expect(r.puntuacion).toBe(4.5);
    });

    test('acepta puntuación mínima 0.5', () => {
      const r = crearResenia({ puntuacion: 0.5 });
      expect(r.puntuacion).toBe(0.5);
    });

    test('acepta puntuación máxima 5', () => {
      const r = crearResenia({ puntuacion: 5 });
      expect(r.puntuacion).toBe(5);
    });

    test('normaliza el detalle con trim', () => {
      const r = crearResenia({ detalle: '  Muy bueno  ' });
      expect(r.detalle).toBe('Muy bueno');
    });
  });

  describe('validaciones de construcción', () => {
    test.each([0, 5.5, 6, -1, 4.3])(
      'lanza error para puntuación inválida: %s',
      (puntuacion) => {
        expect(() => crearResenia({ puntuacion })).toThrow();
      }
    );

    test('lanza error si el detalle está vacío', () => {
      expect(() => crearResenia({ detalle: '' })).toThrow();
    });

    test('lanza error si el detalle supera 250 caracteres', () => {
      expect(() => crearResenia({ detalle: 'x'.repeat(251) })).toThrow();
    });

    test('lanza error si falta comprador', () => {
      expect(() => crearResenia({ comprador: null })).toThrow();
    });

    test('lanza error si falta eventoId', () => {
      expect(() => crearResenia({ eventoId: null })).toThrow();
    });
  });
});
