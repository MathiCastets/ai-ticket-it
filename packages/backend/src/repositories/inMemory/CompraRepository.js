import { seedData } from '../seedData.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';

class CompraRepository {
  constructor(seed = null) {
    this.compras = seed || seedData.compras;
  }

  async findAll() {
    return [...this.compras];
  }

  async findById(id) {
    const compra = this.compras.find((c) => c.id === id);
    if (!compra) throw new EntityNotFoundError('Compra', id);
    return compra;
  }

  async findByCodigo(codigo) {
    return this.compras.find((c) => c.ordenCodigo.toLowerCase() === codigo.toLowerCase()) || null;
  }

  async findByCompradorId(compradorId) {
    return this.compras.filter((c) => c.comprador.id === compradorId);
  }

  async findByEventoId(eventoId) {
    return this.compras.filter((c) => c.evento.id === eventoId);
  }

  async save(compra) {
    const existingIndex = this.compras.findIndex((c) => c.id === compra.id);
    if (existingIndex >= 0) {
      this.compras[existingIndex] = compra;
    } else {
      this.compras.unshift(compra);
    }
    return compra;
  }

  async delete(id) {
    const index = this.compras.findIndex((compra) => compra.id === id);
    if (index < 0) return false;
    this.compras.splice(index, 1);
    return true;
  }
}

export const compraRepository = new CompraRepository();
export { CompraRepository };
