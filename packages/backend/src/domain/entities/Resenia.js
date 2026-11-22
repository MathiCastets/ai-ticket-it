export class Resenia {
  constructor({
    id,
    comprador,  // Usuario (referencia directa)
    eventoId,   // String id — evita referencia circular con Evento.resenias al serializar
    detalle,
    puntuacion,
    fechaHora = null,
  }) {
    if (!Number.isInteger(puntuacion * 2) || puntuacion < 0.5 || puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 0.5 y 5 en incrementos de 0.5');
    }
    if (!detalle || !detalle.trim()) {
      throw new Error('El comentario de la reseña no puede estar vacío');
    }
    if (detalle.length > 250) {
      throw new Error('El comentario no puede superar los 250 caracteres');
    }
    if (!comprador) throw new Error('Reseña requiere un comprador (Usuario)');
    if (!eventoId)  throw new Error('Reseña requiere eventoId');

    this.id         = id || `res-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.comprador  = comprador;
    this.eventoId   = eventoId;
    this.detalle    = detalle.trim();
    this.puntuacion = puntuacion;
    this.fechaHora  = fechaHora ? new Date(fechaHora) : new Date();
  }

  toJSON() {
    let compradorJson = this.comprador;
    if (typeof this.comprador?.toJSON === 'function') {
      compradorJson = this.comprador.toJSON();
    } else if (typeof this.comprador === 'object' && this.comprador !== null) {
      const { email: _email, ...resto } = this.comprador;
      compradorJson = resto;
    }

    return {
      id: this.id,
      comprador: compradorJson,
      compradorId: typeof this.comprador === 'object' && this.comprador !== null ? this.comprador.id : this.comprador,
      compradorNombre:
        typeof this.comprador === 'object' && this.comprador !== null
          ? this.comprador.nombreCompleto || this.comprador.nombre
          : '',
      eventoId: this.eventoId,
      detalle: this.detalle,
      puntuacion: this.puntuacion,
      fechaHora: this.fechaHora,
    };
  }
}
