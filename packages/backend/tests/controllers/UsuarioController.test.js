import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { UsuarioController } from '../../src/controllers/UsuarioController.js';

describe('UsuarioController', () => {
  let mockUsuarioService;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    mockUsuarioService = {
      listarUsuarios: jest.fn(),
      obtenerFavoritos: jest.fn(),
      obtenerResenias: jest.fn(),
      agregarFavorito: jest.fn(),
      removerFavorito: jest.fn(),
    };

    controller = new UsuarioController(mockUsuarioService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    test('lista usuarios y responde 200', async () => {
      mockUsuarioService.listarUsuarios.mockResolvedValue([{ id: 'u1', nombre: 'Test' }]);
      await controller.getAll({}, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: [{ id: 'u1', nombre: 'Test' }] });
    });

    test('delega error inesperado en getAll a next', async () => {
      const error = new Error('Error al listar usuarios');
      mockUsuarioService.listarUsuarios.mockRejectedValue(error);

      await controller.getAll({}, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getFavorites', () => {
    test('obtiene favoritos del usuario y responde 200', async () => {
      mockUsuarioService.obtenerFavoritos.mockResolvedValue(['evt-1']);
      await controller.getFavorites({ params: { id: 'u1' } }, res, next);

      expect(mockUsuarioService.obtenerFavoritos).toHaveBeenCalledWith('u1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: ['evt-1'] });
    });

    test('delega error inesperado en getFavorites a next', async () => {
      const error = new Error('Error al obtener favoritos');
      mockUsuarioService.obtenerFavoritos.mockRejectedValue(error);

      await controller.getFavorites({ params: { id: 'u1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getReviews', () => {
    test('obtiene reseñas paginadas', async () => {
      mockUsuarioService.obtenerResenias.mockResolvedValue({ total: 1, resenias: [] });
      const req = { params: { id: 'org-1' }, query: { page: '1', limit: '5' } };

      await controller.getReviews(req, res, next);

      expect(mockUsuarioService.obtenerResenias).toHaveBeenCalledWith('org-1', { page: 1, limit: 5 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza si page es menor a 1', async () => {
      const req = { params: { id: 'org-1' }, query: { page: '0', limit: '5' } };

      await controller.getReviews(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/page debe ser positivo y limit debe estar entre 1 y 20/i),
        })
      );
      expect(mockUsuarioService.obtenerResenias).not.toHaveBeenCalled();
    });

    test('rechaza si limit supera 20', async () => {
      const req = { params: { id: 'org-1' }, query: { limit: '25' } };

      await controller.getReviews(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/page debe ser positivo y limit debe estar entre 1 y 20/i),
        })
      );
      expect(mockUsuarioService.obtenerResenias).not.toHaveBeenCalled();
    });

    test('delega error inesperado en getReviews a next', async () => {
      const error = new Error('Error al obtener reseñas');
      mockUsuarioService.obtenerResenias.mockRejectedValue(error);

      await controller.getReviews({ params: { id: 'org-1' }, query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addFavorite y removeFavorite', () => {
    test('agrega favorito y responde 200', async () => {
      mockUsuarioService.agregarFavorito.mockResolvedValue(['evt-1', 'evt-2']);
      const req = { params: { id: 'u1', eventoId: 'evt-2' } };

      await controller.addFavorite(req, res, next);

      expect(mockUsuarioService.agregarFavorito).toHaveBeenCalledWith('u1', 'evt-2');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza addFavorite si falta eventoId', async () => {
      const req = { params: { id: 'u1' } };

      await controller.addFavorite(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/eventoId es requerido/i),
        })
      );
      expect(mockUsuarioService.agregarFavorito).not.toHaveBeenCalled();
    });

    test('delega error inesperado en addFavorite a next', async () => {
      const error = new Error('Error al agregar favorito');
      mockUsuarioService.agregarFavorito.mockRejectedValue(error);

      await controller.addFavorite({ params: { id: 'u1', eventoId: 'evt-1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    test('remueve favorito y responde 200', async () => {
      mockUsuarioService.removerFavorito.mockResolvedValue([]);
      const req = { params: { id: 'u1', eventoId: 'evt-1' } };

      await controller.removeFavorite(req, res, next);

      expect(mockUsuarioService.removerFavorito).toHaveBeenCalledWith('u1', 'evt-1');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('rechaza removeFavorite si falta eventoId', async () => {
      const req = { params: { id: 'u1' } };

      await controller.removeFavorite(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ValidationError',
          message: expect.stringMatching(/eventoId es requerido/i),
        })
      );
      expect(mockUsuarioService.removerFavorito).not.toHaveBeenCalled();
    });

    test('delega error inesperado en removeFavorite a next', async () => {
      const error = new Error('Error al remover favorito');
      mockUsuarioService.removerFavorito.mockRejectedValue(error);

      await controller.removeFavorite({ params: { id: 'u1', eventoId: 'evt-1' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
