import { seedData } from '../seedData.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';

class CategoriaRepository {
  constructor(seed = null) {
    this.categorias = seed || seedData.categorias;
  }

  async findAll() {
    return [...this.categorias];
  }

  async findById(id) {
    const categoria = this.categorias.find((c) => c.id === id);
    if (!categoria) {
      throw new EntityNotFoundError('Categoria', id);
    }
    return categoria;
  }

  async findByNombre(nombre) {
    return this.categorias.find((c) => c.nombre.toLowerCase() === nombre.toLowerCase()) || null;
  }

  async save(categoria) {
    const existingIndex = this.categorias.findIndex((c) => c.id === categoria.id);
    if (existingIndex >= 0) {
      this.categorias[existingIndex] = categoria;
    } else {
      this.categorias.push(categoria);
    }
    return categoria;
  }
}

export const categoriaRepository = new CategoriaRepository();
export { CategoriaRepository };
