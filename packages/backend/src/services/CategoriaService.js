import { categoriaRepository } from '../repositories/inMemory/CategoriaRepository.js';

export class CategoriaService {
  constructor(_categoriaRepository = categoriaRepository) {
    this.categoriaRepository = _categoriaRepository;
  }

  async listarCategorias() {
    return this.categoriaRepository.findAll();
  }
}

export const categoriaService = new CategoriaService();
