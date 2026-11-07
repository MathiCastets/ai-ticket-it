import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CategoriaController } from '../../src/controllers/CategoriaController.js';

describe('CategoriaController', () => {
  let mockCategoriaService;
  let controller;
  let res;
  let next;

  beforeEach(() => {
    mockCategoriaService = {
      listarCategorias: jest.fn(),
    };

    controller = new CategoriaController(mockCategoriaService);

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('getAll', () => {
    test('obtiene y responde con lista de categorías y 200', async () => {
      const mockCategorias = [
        { id: 'cat-1', nombre: 'Recitales' },
        { id: 'cat-2', nombre: 'Teatro' },
      ];
      mockCategoriaService.listarCategorias.mockResolvedValue(mockCategorias);

      await controller.getAll({}, res, next);

      expect(mockCategoriaService.listarCategorias).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockCategorias });
      expect(next).not.toHaveBeenCalled();
    });

    test('llama a next con el error si el servicio lanza excepción', async () => {
      const error = new Error('Error al listar categorías');
      mockCategoriaService.listarCategorias.mockRejectedValue(error);

      await controller.getAll({}, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('instancia el controlador por defecto con categoriaService', () => {
      const defaultController = new CategoriaController();
      expect(defaultController.categoriaService).toBeDefined();
    });
  });
});
