import { describe, test, expect, beforeEach } from '@jest/globals';
import { UsuarioRepository } from '../../src/repositories/inMemory/UsuarioRepository.js';
import { Usuario } from '../../src/domain/entities/Usuario.js';
import { EntityNotFoundError } from '../../src/repositories/errors/EntityNotFoundError.js';

describe('UsuarioRepository', () => {
  let repository;

  function crearUsuario(overrides = {}) {
    return new Usuario({
      id: `user-${Date.now()}-${Math.random()}`,
      nombre: 'Usuario Test',
      rol: 'comprador',
      email: 'test@test.com',
      ...overrides,
    });
  }

  beforeEach(() => {
    repository = new UsuarioRepository([]);
  });

  describe('save y findById', () => {
    test('guarda y recupera un usuario por id', async () => {
      const usuario = crearUsuario({ id: 'user-fixed-1' });
      await repository.save(usuario);
      const recuperado = await repository.findById('user-fixed-1');
      expect(recuperado).toBe(usuario);
    });

    test('actualiza un usuario existente al hacer save con mismo id', async () => {
      const usuario = crearUsuario({ id: 'user-update' });
      await repository.save(usuario);
      usuario.nombre = 'Nombre Cambiado';
      await repository.save(usuario);

      const todos = await repository.findAll();
      expect(todos.filter((u) => u.id === 'user-update')).toHaveLength(1);
    });

    test('lanza EntityNotFoundError si el usuario no existe', async () => {
      await expect(repository.findById('inexistente')).rejects.toThrow(EntityNotFoundError);
    });
  });

  describe('findAll', () => {
    test('retorna arreglo vacío si no hay usuarios', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    test('retorna todos los usuarios guardados', async () => {
      await repository.save(crearUsuario({ id: 'u-1' }));
      await repository.save(crearUsuario({ id: 'u-2' }));
      const todos = await repository.findAll();
      expect(todos).toHaveLength(2);
    });
  });

  describe('findByEmail', () => {
    test('retorna el usuario con el email indicado (case insensitive)', async () => {
      const usuario = crearUsuario({ id: 'user-email', email: 'Test@Domain.com' });
      await repository.save(usuario);

      const result = await repository.findByEmail('test@domain.com');
      expect(result).toBe(usuario);
    });

    test('retorna null si no existe el email', async () => {
      const result = await repository.findByEmail('no-existe@test.com');
      expect(result).toBeNull();
    });
  });
});
