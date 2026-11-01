import { usuarioService } from '../services/UsuarioService.js';
import { ValidationError } from './errors/ValidationError.js';

export class UsuarioController {
  constructor(_usuarioService = usuarioService) {
    this.usuarioService = _usuarioService;
  }

  getAll = async (_req, res, next) => {
    try {
      const usuarios = await this.usuarioService.listarUsuarios();
      res.status(200).json({ data: usuarios });
    } catch (error) {
      next(error);
    }
  };

  getFavorites = async (req, res, next) => {
    try {
      const { id } = req.params;
      const favoritos = await this.usuarioService.obtenerFavoritos(id);
      res.status(200).json({ data: favoritos });
    } catch (error) {
      next(error);
    }
  };

  getReviews = async (req, res, next) => {
    try {
      const { id } = req.params;
      const page = req.query.page === undefined ? 1 : Number(req.query.page);
      const limit = req.query.limit === undefined ? 5 : Number(req.query.limit);
      if (
        (req.query.page !== undefined &&
          (typeof req.query.page !== 'string' || !Number.isInteger(page) || page < 1)) ||
        (req.query.limit !== undefined &&
          (typeof req.query.limit !== 'string' ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 20))
      ) {
        throw new ValidationError('page debe ser positivo y limit debe estar entre 1 y 20');
      }

      const reviews = await this.usuarioService.obtenerResenias(id, { page, limit });
      res.status(200).json({ data: reviews });
    } catch (error) {
      next(error);
    }
  };

  addFavorite = async (req, res, next) => {
    try {
      const { id, eventoId } = req.params;
      if (!eventoId) throw new ValidationError('eventoId es requerido');
      const favoritos = await this.usuarioService.agregarFavorito(id, eventoId);
      res.status(200).json({ data: favoritos });
    } catch (error) {
      next(error);
    }
  };

  removeFavorite = async (req, res, next) => {
    try {
      const { id, eventoId } = req.params;
      if (!eventoId) throw new ValidationError('eventoId es requerido');
      const favoritos = await this.usuarioService.removerFavorito(id, eventoId);
      res.status(200).json({ data: favoritos });
    } catch (error) {
      next(error);
    }
  };
}

export const usuarioController = new UsuarioController();
