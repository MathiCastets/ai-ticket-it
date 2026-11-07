import { TipoEntrada } from './TipoEntrada.js';

export class Evento {
  constructor({
    id,
    nombre,
    descripcion = '',
    categoria,      // Categoria (referencia directa o string para compatibilidad)
    fecha,
    apertura = '',
    ubicacion = '',
    direccion = '',
    tiposEntrada = [],
    multimedia = [],
    imagen = '',
    destacado = false,
    organizador,    // Usuario (referencia directa)
    resenias = [],
  }) {
    if (!nombre || !fecha) {
      throw new Error('Evento requiere nombre y fecha válidos');
    }

    this.id          = id || `evt-${Date.now()}`;
    this.nombre      = nombre;
    this.descripcion = descripcion;
    this.categoria   = categoria;   // Categoria
    this.fecha       = new Date(fecha);
    this.apertura    = apertura;
    this.ubicacion   = ubicacion;
    this.direccion   = direccion;
    this.multimedia  = Array.isArray(multimedia) ? multimedia : [];
    this.imagen      = imagen || (this.multimedia[0] || '');
    this.destacado   = Boolean(destacado);
    this.organizador = organizador; // Usuario
    this.resenias    = Array.isArray(resenias) ? resenias : [];

    // Tipos de entrada como entidades TipoEntrada
    this.tiposEntrada = tiposEntrada.map((t) =>
      t instanceof TipoEntrada ? t : new TipoEntrada(t)
    );
  }

  // Método explícito del diagrama de clases
  tuPrecioEstaEntre(min, max) {
    const minP = Number(min);
    const maxP = Number(max);
    return this.tiposEntrada.some((t) => t.precio >= minP && t.precio <= maxP);
  }

  precioMinimo() {
    if (this.tiposEntrada.length === 0) return 0;
    return Math.min(...this.tiposEntrada.map((t) => t.precio));
  }

  obtenerTipoEntrada(tipoEntradaId) {
    return this.tiposEntrada.find((t) => t.id === tipoEntradaId);
  }

  // Calcula rating promedio a partir de las reseñas reales
  get organizadorRating() {
    if (this.resenias.length === 0) return 5.0;
    const suma = this.resenias.reduce((acc, r) => acc + r.puntuacion, 0);
    return Number((suma / this.resenias.length).toFixed(1));
  }

  get totalResenias() {
    return this.resenias.length;
  }

  agregarResenia(resenia) {
    this.resenias.unshift(resenia);
  }

  toJSON() {
    let organizadorJson = this.organizador;
    if (typeof this.organizador?.toJSON === 'function') {
      organizadorJson = this.organizador.toJSON();
    } else if (typeof this.organizador === 'object' && this.organizador !== null) {
      const { email: _email, ...resto } = this.organizador;
      organizadorJson = resto;
    }

    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      categoria: this.categoria,
      categoriaNombre: typeof this.categoria === 'object' && this.categoria !== null ? this.categoria.nombre : (this.categoria || ''),
      fecha: this.fecha,
      apertura: this.apertura,
      ubicacion: this.ubicacion,
      direccion: this.direccion,
      multimedia: this.multimedia,
      imagen: this.imagen,
      destacado: this.destacado,
      organizador: organizadorJson,
      organizadorNombre:
        typeof this.organizador === 'object' && this.organizador !== null
          ? this.organizador.nombreCompleto || this.organizador.nombre
          : this.organizador || '',
      organizadorId: typeof this.organizador === 'object' && this.organizador !== null ? this.organizador.id : '',
      organizadorRating: this.organizadorRating,
      totalResenias: this.totalResenias,
      tiposEntrada: this.tiposEntrada.map((t) => (typeof t?.toJSON === 'function' ? t.toJSON() : t)),
      resenias: this.resenias.map((r) => (typeof r?.toJSON === 'function' ? r.toJSON() : r)),
    };
  }
}
