export class Resenia {
  constructor({
    id,
    comprador,  // Usuario (referencia directa)
    eventoId,   // String id — evita referencia circular con Evento.resenias al serializar
    detalle,
    puntuacion,
    fechaHora = null,
  }) {
    if (!Number.isInteger(puntuacion) || puntuacion < 1 || puntuacion > 5) {
      throw new Error('La puntuación debe ser un número entero entre 1 y 5');
    }
    if (!detalle || !detalle.trim()) {
      throw new Error('El comentario de la reseña no puede estar vacío');
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
}
