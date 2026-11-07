import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { UnauthorizedError } from './errors/AuthErrors.js';

export function createAuthHandler(repo = usuarioRepository) {
  return async function authMiddleware(req, res, next) {
    try {
      const headerVal = req.headers['x-user-id'] || req.get?.('x-user-id');
      const userId = typeof headerVal === 'string' ? headerVal.trim() : null;

      if (!userId) {
        throw new UnauthorizedError('Header X-User-Id es requerido para autenticación');
      }

      let user;
      try {
        user = await repo.findById(userId);
      } catch {
        throw new UnauthorizedError(`Usuario con id '${userId}' no encontrado`);
      }

      if (!user) {
        throw new UnauthorizedError(`Usuario con id '${userId}' no encontrado`);
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authHandler = createAuthHandler();
