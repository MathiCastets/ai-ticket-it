import { categoriaService } from '../services/CategoriaService.js';

export class CategoriaController {
  constructor(_categoriaService = categoriaService) {
    this.categoriaService = _categoriaService;
  }

  getAll = async (_req, res, next) => {
    try {
      const categorias = await this.categoriaService.listarCategorias();
      res.status(200).json({ data: categorias });
    } catch (error) {
      next(error);
    }
  };
}

export const categoriaController = new CategoriaController();
