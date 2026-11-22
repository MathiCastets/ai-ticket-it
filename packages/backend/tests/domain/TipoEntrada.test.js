import { describe, test, expect } from '@jest/globals';
import { TipoEntrada } from '../../src/domain/entities/TipoEntrada.js';
import { CupoInsuficienteError, ReglaNegocioError } from '../../src/domain/errors/index.js';

describe('TipoEntrada', () => {
  function crearTipoValido(overrides = {}) {
    return new TipoEntrada({
      id: 'te-1',
      nombre: 'General',
      precio: 15000,
      cupo: 100,
      ...overrides,
    });
  }

  describe('construcción válida', () => {
    test('crea un tipo de entrada con valores correctos', () => {
      const te = crearTipoValido();

      expect(te.id).toBe('te-1');
      expect(te.nombre).toBe('General');
      expect(te.precio).toBe(15000);
      expect(te.cupo).toBe(100);
      expect(te.disponibles).toBe(100);
    });

    test('usa cupo como disponibles si no se pasa disponibles', () => {
      const te = crearTipoValido({ cupo: 50 });
      expect(te.disponibles).toBe(50);
    });

    test('acepta disponibles menor al cupo (parcialmente vendido)', () => {
      const te = crearTipoValido({ cupo: 100, disponibles: 80 });
      expect(te.disponibles).toBe(80);
    });

    test('acepta disponibles en cero (agotado)', () => {
      const te = crearTipoValido({ cupo: 100, disponibles: 0 });
      expect(te.disponibles).toBe(0);
    });

    test('normaliza el nombre con trim', () => {
      const te = crearTipoValido({ nombre: '  VIP  ' });
      expect(te.nombre).toBe('VIP');
    });
  });

  describe('validaciones de construcción', () => {
    test('lanza error si el nombre está vacío', () => {
      expect(() => crearTipoValido({ nombre: '' })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el nombre es solo espacios', () => {
      expect(() => crearTipoValido({ nombre: '   ' })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el precio es negativo', () => {
      expect(() => crearTipoValido({ precio: -100 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el precio no es número', () => {
      expect(() => crearTipoValido({ precio: 'gratis' })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el cupo es cero', () => {
      expect(() => crearTipoValido({ cupo: 0 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si el cupo es negativo', () => {
      expect(() => crearTipoValido({ cupo: -1 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si disponibles supera el cupo', () => {
      expect(() => crearTipoValido({ cupo: 10, disponibles: 11 })).toThrow(ReglaNegocioError);
    });

    test('lanza error si disponibles es negativo', () => {
      expect(() => crearTipoValido({ cupo: 10, disponibles: -1 })).toThrow(ReglaNegocioError);
    });
  });

  describe('hayCupoPara', () => {
    test('retorna true si hay cupo suficiente', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 5 });
      expect(te.hayCupoPara(5)).toBe(true);
    });

    test('retorna true para cantidad exactamente igual a disponibles', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 3 });
      expect(te.hayCupoPara(3)).toBe(true);
    });

    test('retorna false si la cantidad supera el disponible', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 2 });
      expect(te.hayCupoPara(3)).toBe(false);
    });

    test('retorna false para cantidad cero', () => {
      const te = crearTipoValido();
      expect(te.hayCupoPara(0)).toBe(false);
    });

    test('retorna false para cantidad negativa', () => {
      const te = crearTipoValido();
      expect(te.hayCupoPara(-1)).toBe(false);
    });

    test('retorna false para cantidad decimal', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 10 });
      expect(te.hayCupoPara(1.5)).toBe(false);
    });
  });

  describe('descontarCupo', () => {
    test('descuenta la cantidad del disponible', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 10 });
      te.descontarCupo(3);
      expect(te.disponibles).toBe(7);
    });

    test('puede descontar hasta llegar a cero disponibles', () => {
      const te = crearTipoValido({ cupo: 5, disponibles: 5 });
      te.descontarCupo(5);
      expect(te.disponibles).toBe(0);
    });

    test('lanza CupoInsuficienteError si no hay cupo', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 2 });
      expect(() => te.descontarCupo(5)).toThrow(CupoInsuficienteError);
    });

    test('no modifica disponibles si lanza error', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 2 });
      try { te.descontarCupo(10); } catch { /* esperado */ }
      expect(te.disponibles).toBe(2);
    });
  });

  describe('restituirCupo', () => {
    test('aumenta el disponible al restituir', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 5 });
      te.restituirCupo(3);
      expect(te.disponibles).toBe(8);
    });

    test('no supera el cupo total al restituir', () => {
      const te = crearTipoValido({ cupo: 10, disponibles: 9 });
      te.restituirCupo(5);
      expect(te.disponibles).toBe(10);
    });

    test('lanza error si la cantidad a restituir es cero', () => {
      const te = crearTipoValido();
      expect(() => te.restituirCupo(0)).toThrow(ReglaNegocioError);
    });

    test('lanza error si la cantidad a restituir es negativa', () => {
      const te = crearTipoValido();
      expect(() => te.restituirCupo(-1)).toThrow(ReglaNegocioError);
    });
  });
});
