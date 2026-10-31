import { seedData } from '../seedData.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';

class EventoRepository {
  constructor(seed = null) {
    this.eventos = seed || seedData.eventos;
  }

  // Helpers para extraer nombre de campo que puede ser objeto o string
  #categoriaNombre(e) {
    return typeof e.categoria === 'string' ? e.categoria : (e.categoria?.nombre ?? '');
  }

  #organizadorNombre(e) {
    return typeof e.organizador === 'string' ? e.organizador : (e.organizador?.nombre ?? '');
  }

  async findAll({ categoria, search, sortBy } = {}) {
    let result = [...this.eventos];

    if (categoria && categoria.toLowerCase() !== 'todos') {
      result = result.filter(
        (e) => this.#categoriaNombre(e).toLowerCase() === categoria.toLowerCase()
      );
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.nombre.toLowerCase().includes(q) ||
          e.ubicacion.toLowerCase().includes(q) ||
          this.#organizadorNombre(e).toLowerCase().includes(q) ||
          this.#categoriaNombre(e).toLowerCase().includes(q)
      );
    }

    // Ordenamiento (Requisito TP: precio, fecha, rating)
    if (sortBy === 'precio') {
      result.sort((a, b) => a.precioMinimo() - b.precioMinimo());
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.organizadorRating - a.organizadorRating);
    } else {
      result.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    }

    return result;
  }

  async findById(id) {
    const evento = this.eventos.find((e) => e.id === id);
    if (!evento) throw new EntityNotFoundError('Evento', id);
    return evento;
  }

  async save(evento) {
    const existingIndex = this.eventos.findIndex((e) => e.id === evento.id);
    if (existingIndex >= 0) {
      this.eventos[existingIndex] = evento;
    } else {
      this.eventos.unshift(evento);
    }
    return evento;
  }

  async delete(id) {
    const initialLength = this.eventos.length;
    this.eventos = this.eventos.filter((e) => e.id !== id);
    if (this.eventos.length === initialLength) throw new EntityNotFoundError('Evento', id);
    return true;
  }
}

export const eventoRepository = new EventoRepository();
export { EventoRepository };
