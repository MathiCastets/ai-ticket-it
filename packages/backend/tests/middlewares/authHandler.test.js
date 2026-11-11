import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createAuthHandler } from '../../src/middlewares/authHandler.js';

describe('authHandler middleware', () => {
  let mockUsuarioRepo;
  let authMiddleware;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockUsuarioRepo = {
      findById: jest.fn(),
    };
    authMiddleware = createAuthHandler(mockUsuarioRepo);
    res = {};
    next = jest.fn();
  });

  test('rechaza con UnauthorizedError (401) si falta el header X-User-Id', async () => {
    req = { headers: {} };

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: expect.stringMatching(/Header X-User-Id es requerido para autenticación/i),
      })
    );
    expect(next.mock.calls[0][0].status).toBe(401);
    expect(req.user).toBeUndefined();
  });

  test('rechaza con UnauthorizedError si el header es solo espacios en blanco', async () => {
    req = { headers: { 'x-user-id': '   ' } };

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: expect.stringMatching(/Header X-User-Id es requerido para autenticación/i),
      })
    );
    expect(req.user).toBeUndefined();
  });

  test('rechaza con UnauthorizedError si el repositorio lanza error al buscar usuario', async () => {
    req = { headers: { 'x-user-id': 'user_inexistente' } };
    mockUsuarioRepo.findById.mockRejectedValue(new Error('EntityNotFoundError'));

    await authMiddleware(req, res, next);

    expect(mockUsuarioRepo.findById).toHaveBeenCalledWith('user_inexistente');
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: expect.stringMatching(/Usuario con id 'user_inexistente' no encontrado/i),
      })
    );
    expect(req.user).toBeUndefined();
  });

  test('rechaza con UnauthorizedError si el usuario no existe (retorna null) en el repositorio', async () => {
    req = { headers: { 'x-user-id': 'user_nulo' } };
    mockUsuarioRepo.findById.mockResolvedValue(null);

    await authMiddleware(req, res, next);

    expect(mockUsuarioRepo.findById).toHaveBeenCalledWith('user_nulo');
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'UnauthorizedError',
        message: expect.stringMatching(/Usuario con id 'user_nulo' no encontrado/i),
      })
    );
    expect(req.user).toBeUndefined();
  });

  test('inyecta req.user y llama a next() sin error cuando el usuario es válido', async () => {
    const usuarioValido = { id: 'usr-123', nombre: 'Test User', rol: 'comprador' };
    req = { headers: { 'x-user-id': 'usr-123' } };
    mockUsuarioRepo.findById.mockResolvedValue(usuarioValido);

    await authMiddleware(req, res, next);

    expect(mockUsuarioRepo.findById).toHaveBeenCalledWith('usr-123');
    expect(req.user).toEqual(usuarioValido);
    expect(next).toHaveBeenCalledWith();
  });
});
