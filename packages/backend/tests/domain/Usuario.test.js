import { describe, test, expect } from '@jest/globals';
import { Usuario } from '../../src/domain/entities/Usuario.js';

describe('Usuario', () => {
  function crearUsuario(overrides = {}) {
    return new Usuario({ id: 'user-1', nombre: 'Test', rol: 'comprador', ...overrides });
  }

  describe('construcción válida', () => {
    test('crea un usuario comprador con valores correctos', () => {
      const u = crearUsuario({ apellido: 'García', email: 'test@test.com' });
      expect(u.id).toBe('user-1');
      expect(u.nombre).toBe('Test');
      expect(u.apellido).toBe('García');
      expect(u.rol).toBe('comprador');
      expect(u.email).toBe('test@test.com');
      expect(u.favoritos).toEqual([]);
    });

    test('inicializa favoritos vacíos por defecto', () => {
      const u = crearUsuario();
      expect(u.favoritos).toEqual([]);
    });

    test('conserva favoritos provistos', () => {
      const u = crearUsuario({ favoritos: ['evt-1', 'evt-2'] });
      expect(u.favoritos).toEqual(['evt-1', 'evt-2']);
    });
  });

  describe('validaciones de construcción', () => {
    test('lanza error si falta id', () => {
      expect(() => new Usuario({ nombre: 'Sin id' })).toThrow();
    });

    test('lanza error si falta nombre', () => {
      expect(() => new Usuario({ id: 'u-1' })).toThrow();
    });
  });

  describe('nombreCompleto', () => {
    test('combina nombre y apellido', () => {
      const u = crearUsuario({ nombre: 'Juan', apellido: 'Pérez' });
      expect(u.nombreCompleto).toBe('Juan Pérez');
    });

    test('funciona sin apellido', () => {
      const u = crearUsuario({ nombre: 'Juan', apellido: '' });
      expect(u.nombreCompleto).toBe('Juan');
    });
  });

  describe('esOrganizador', () => {
    test('retorna true para rol organizador', () => {
      const u = crearUsuario({ rol: 'organizador' });
      expect(u.esOrganizador()).toBe(true);
    });

    test('retorna false para rol comprador', () => {
      const u = crearUsuario({ rol: 'comprador' });
      expect(u.esOrganizador()).toBe(false);
    });
  });

  describe('favoritos', () => {
    test('agregarFavorito agrega el id', () => {
      const u = crearUsuario();
      u.agregarFavorito('evt-1');
      expect(u.favoritos).toContain('evt-1');
    });

    test('agregarFavorito es idempotente', () => {
      const u = crearUsuario();
      u.agregarFavorito('evt-1');
      u.agregarFavorito('evt-1');
      expect(u.favoritos.filter((id) => id === 'evt-1')).toHaveLength(1);
    });

    test('removerFavorito elimina el id', () => {
      const u = crearUsuario({ favoritos: ['evt-1', 'evt-2'] });
      u.removerFavorito('evt-1');
      expect(u.favoritos).not.toContain('evt-1');
      expect(u.favoritos).toContain('evt-2');
    });

    test('tieneFavorito retorna true si el evento está en favoritos', () => {
      const u = crearUsuario({ favoritos: ['evt-1'] });
      expect(u.tieneFavorito('evt-1')).toBe(true);
    });

    test('tieneFavorito retorna false si el evento no está en favoritos', () => {
      const u = crearUsuario();
      expect(u.tieneFavorito('evt-inexistente')).toBe(false);
    });
  });
});
